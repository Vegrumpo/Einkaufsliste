import { fetchWithAuth } from './api.js';

const markeSelect = document.getElementById('marke');
const artikelSelect = document.getElementById('artikel');
const einkaufszettelContainer = document.getElementById('einkaufszettelListen');

// Marken und Artikel laden
export async function ladeMarkenUndArtikel() {
    try {
        const artikel = await fetchWithAuth('artikel');
        const markenSet = new Set();

        artikel.forEach((a) => markenSet.add(a.marke));

        markeSelect.innerHTML = '<option value="">Marke auswählen</option>';
        markenSet.forEach((marke) => {
            const option = document.createElement('option');
            option.value = marke;
            option.textContent = marke;
            markeSelect.appendChild(option);
        });

        artikelSelect.innerHTML = '<option value="">Bitte zuerst Marke auswählen</option>';
        markeSelect.addEventListener('change', () => {
            const ausgewählteMarke = markeSelect.value;
            artikelSelect.innerHTML = '<option value="">Artikel auswählen</option>';
            artikel
                .filter((a) => a.marke === ausgewählteMarke)
                .forEach((a) => {
                    const option = document.createElement('option');
                    option.value = a.id;
                    option.textContent = a.name;
                    artikelSelect.appendChild(option);
                });
        });
    } catch (error) {
        console.error('Fehler beim Laden der Marken und Artikel:', error);
    }
}

// Artikel zur Einkaufsliste hinzufügen
document.getElementById('direktHinzufuegenButton').addEventListener('click', async () => {
    await artikelHinzufuegen(false); // Ohne Vorschlag
});

document.getElementById('vorschlagHinzufuegenButton').addEventListener('click', async () => {
    await artikelHinzufuegen(true); // Mit Vorschlag
});

async function artikelHinzufuegen(mitVorschlag) {
    const artikelId = artikelSelect.value;
    let menge = parseInt(document.getElementById('menge').value);

    if (!artikelId || isNaN(menge)) {
        alert('Bitte alle Felder ausfüllen.');
        return;
    }

    try {
        let vorschlagMenge = null;

        if (mitVorschlag) {
            const rhythmusDaten = await berechneRhythmus(artikelId);

            if (rhythmusDaten.durchschnittIntervall && rhythmusDaten.durchschnittMenge) {
                const vorschlag = confirm(
                    `Dieser Artikel wird im Schnitt alle ${rhythmusDaten.durchschnittIntervall} Tage gekauft. ` +
                    `Durchschnittliche Menge: ${rhythmusDaten.durchschnittMenge}. Möchtest du die empfohlene Menge übernehmen?`
                );

                if (vorschlag) {
                    vorschlagMenge = rhythmusDaten.durchschnittMenge;
                }
            }
        }

        if (vorschlagMenge !== null) {
            menge = vorschlagMenge;
            document.getElementById('menge').value = menge; // Eingabefeld aktualisieren
        }

        const heute = new Date().toISOString().split('T')[0];
        const angebote = await fetchWithAuth(`angebote?artikel_id=eq.${artikelId}&gueltig_bis=gte.${heute}`);
        const preistyp = angebote.length > 0 ? 'Angebotspreis' : 'Regulärer Preis';
        const preis = angebote.length > 0
            ? angebote[0].angebotspreis
            : (await fetchWithAuth(`supermarkt_artikel_preise?artikel_id=eq.${artikelId}&order=regulaerer_preis.asc`))[0]?.regulaerer_preis;

        if (!preis) {
            alert('Kein Preis für diesen Artikel gefunden.');
            return;
        }

        const existierenderEintrag = await fetchWithAuth(`einkaufsliste?artikel_id=eq.${artikelId}`);
        if (existierenderEintrag.length > 0) {
            const neueMenge = existierenderEintrag[0].menge + menge;
            await fetchWithAuth(`einkaufsliste?id=eq.${existierenderEintrag[0].id}`, 'PATCH', { menge: neueMenge });
        } else {
            await fetchWithAuth('einkaufsliste', 'POST', {
                supermarkt_id: angebote.length > 0 ? angebote[0].supermarkt_id : preis.supermarkt_id,
                artikel_id: artikelId,
                menge,
                preis,
                preistyp,
                status: false
            });
        }

        await ladeEinkaufszettel();
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Artikels zur Einkaufsliste:', error);
    }
}

// Einkaufszettel laden und anzeigen
export async function ladeEinkaufszettel() {
    try {
        const daten = await fetchWithAuth('einkaufsliste?select=*,artikel(name,marke),supermarkt(name)');
        einkaufszettelContainer.innerHTML = '';

        daten.forEach((eintrag) => {
            // Wenn kein Supermarkt vorhanden ist
            if (!eintrag.supermarkt) {
                console.warn('Eintrag ohne Supermarkt gefunden:', eintrag);

                // Zeige eine allgemeine Kategorie für Artikel ohne Supermarkt
                let tabelle = document.getElementById(`supermarkt-ohne-zuordnung`);
                if (!tabelle) {
                    tabelle = document.createElement('div');
                    tabelle.id = `supermarkt-ohne-zuordnung`;
                    tabelle.innerHTML = `
                        <h3>Ohne Supermarkt</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Menge</th>
                                    <th>Marke</th>
                                    <th>Artikel</th>
                                    <th>Preis</th>
                                    <th>Preisart</th>
                                    <th>Erledigt</th>
                                </tr>
                            </thead>
                            <tbody id="liste-ohne-zuordnung"></tbody>
                        </table>
                    `;
                    einkaufszettelContainer.appendChild(tabelle);
                }

                const tbody = document.getElementById(`liste-ohne-zuordnung`);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${eintrag.menge}</td>
                    <td>${eintrag.artikel?.marke || 'Unbekannt'}</td>
                    <td>${eintrag.artikel?.name || 'Unbekannt'}</td>
                    <td>${eintrag.preis?.toFixed(2) || 'N/A'} €</td>
                    <td>${eintrag.preistyp || 'N/A'}</td>
                `;

                const checkboxCell = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = eintrag.status;
                checkbox.addEventListener('change', async () => {
                    await fetchWithAuth(`einkaufsliste?id=eq.${eintrag.id}`, 'PATCH', { status: checkbox.checked });
                });

                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);
                tbody.appendChild(row);
                return;
            }

            // Wenn Supermarkt vorhanden ist, normal anzeigen
            let tabelle = document.getElementById(`supermarkt-${eintrag.supermarkt_id}`);
            if (!tabelle) {
                tabelle = document.createElement('div');
                tabelle.id = `supermarkt-${eintrag.supermarkt_id}`;
                tabelle.innerHTML = `
                    <h3>${eintrag.supermarkt.name}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Menge</th>
                                <th>Marke</th>
                                <th>Artikel</th>
                                <th>Preis</th>
                                <th>Preisart</th>
                                <th>Erledigt</th>
                            </tr>
                        </thead>
                        <tbody id="liste-${eintrag.supermarkt_id}"></tbody>
                    </table>
                `;
                einkaufszettelContainer.appendChild(tabelle);
            }

            const tbody = document.getElementById(`liste-${eintrag.supermarkt_id}`);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${eintrag.menge}</td>
                <td>${eintrag.artikel.marke}</td>
                <td>${eintrag.artikel.name}</td>
                <td>${eintrag.preis.toFixed(2)} €</td>
                <td>${eintrag.preistyp}</td>
            `;

            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = eintrag.status;
            checkbox.addEventListener('change', async () => {
                await fetchWithAuth(`einkaufsliste?id=eq.${eintrag.id}`, 'PATCH', { status: checkbox.checked });
            });

            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Einkaufsliste:', error);
    }
}

//Kaufhistorie
async function berechneRhythmus(artikelId) {
    try {
        const daten = await fetchWithAuth(`einkaufshistorie?artikel_id=eq.${artikelId}&order=kaufdatum.asc`);

        if (daten.length < 2) return { durchschnittIntervall: null, durchschnittMenge: null };

        let gesamtIntervall = 0;
        let gesamtMenge = 0;

        for (let i = 1; i < daten.length; i++) {
            const differenz = (new Date(daten[i].kaufdatum) - new Date(daten[i - 1].kaufdatum)) / (1000 * 60 * 60 * 24);
            gesamtIntervall += differenz;
        }

        gesamtMenge = daten.reduce((summe, eintrag) => summe + eintrag.menge, 0);

        return {
            durchschnittIntervall: Math.round(gesamtIntervall / (daten.length - 1)),
            durchschnittMenge: Math.round(gesamtMenge / daten.length)
        };
    } catch (error) {
        console.error('Fehler beim Berechnen des Kauf-Rhythmus:', error);
        return { durchschnittIntervall: null, durchschnittMenge: null };
    }
}




// Erledigte Artikel entfernen
document.getElementById('bereinigenButton').addEventListener('click', async () => {
    try {
        const erledigteArtikel = await fetchWithAuth('einkaufsliste?status=eq.true');

        for (const eintrag of erledigteArtikel) {
            // Speichere erledigte Artikel in der Historie
            await fetchWithAuth('einkaufshistorie', 'POST', {
                artikel_id: eintrag.artikel_id,
                menge: eintrag.menge,
                kaufdatum: new Date().toISOString().split('T')[0]
            });

            // Entferne den Artikel aus der Einkaufsliste
            await fetchWithAuth(`einkaufsliste?id=eq.${eintrag.id}`, 'DELETE');
        }

        ladeEinkaufszettel();
    } catch (error) {
        console.error('Fehler beim Entfernen erledigter Artikel:', error);
    }
});



// Einkaufszettel leeren
document.getElementById('einkaufszettelLeerenButton').addEventListener('click', async () => {
    try {
        await fetchWithAuth('einkaufsliste?status=not.is.null', 'DELETE');
        await ladeEinkaufszettel();
    } catch (error) {
        console.error('Fehler beim Leeren des Einkaufszettels:', error);
    }
});

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await ladeMarkenUndArtikel();
        await ladeEinkaufszettel();
    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
    }
});
