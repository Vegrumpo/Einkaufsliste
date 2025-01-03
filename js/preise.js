import { fetchWithAuth } from './api.js';

// Felder für reguläre Preise
const preiseArtikelSelect = document.getElementById('preiseArtikel');
const preiseMarkeSelect = document.getElementById('preiseMarke');
const preiseSupermarktSelect = document.getElementById('preiseSupermarkt');
const preiseListe = document.getElementById('preiseListe');

// Reguläre Preise laden
export async function ladePreise() {
    try {
        console.log('Starte API-Request für Preise...');

        // Hole alle Daten mit den Beziehungen zu Artikel und Supermarkt
        const preise = await fetchWithAuth(
            'supermarkt_artikel_preise?select=*,artikel(name,marke),supermarkt(name)'
        );

        console.log('Geladene Daten:', preise);

        // Sortieren nach Marke, Name und Supermarkt
        preise.sort((a, b) => {
            if (a.artikel.marke.toLowerCase() < b.artikel.marke.toLowerCase()) return -1;
            if (a.artikel.marke.toLowerCase() > b.artikel.marke.toLowerCase()) return 1;

            if (a.artikel.name.toLowerCase() < b.artikel.name.toLowerCase()) return -1;
            if (a.artikel.name.toLowerCase() > b.artikel.name.toLowerCase()) return 1;

            if (a.supermarkt.name.toLowerCase() < b.supermarkt.name.toLowerCase()) return -1;
            if (a.supermarkt.name.toLowerCase() > b.supermarkt.name.toLowerCase()) return 1;

            return 0;
        });

        preiseListe.innerHTML = '';
        preise.forEach((preis) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${preis.artikel.marke || '-'}</td>
                <td>${preis.artikel.name}</td>
                <td>${preis.supermarkt.name}</td>
                <td>${preis.regulaerer_preis.toFixed(2)} €</td>
                <td>
                    <button onclick="preiseBearbeiten(${preis.id})">Bearbeiten</button>
                    <button onclick="preiseLoeschen(${preis.id})">Löschen</button>
                </td>
            `;
            preiseListe.appendChild(row);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Preise:', error.message);
        alert(`Fehler beim Laden der Preise: ${error.message}`);
    }
}

// Marken und Artikel laden
export async function ladeMarkenUndArtikel() {
    try {
        const artikel = await fetchWithAuth('artikel');
        const markenSet = new Set();

        // Extrahiere einzigartige Marken
        artikel.forEach((a) => markenSet.add(a.marke));

        preiseMarkeSelect.innerHTML = '<option value="">Marke auswählen</option>';
        markenSet.forEach((marke) => {
            const option = document.createElement('option');
            option.value = marke;
            option.textContent = marke;
            preiseMarkeSelect.appendChild(option);
        });

        // Artikel-Dropdown initial leeren
        preiseArtikelSelect.innerHTML = '<option value="">Bitte zuerst Marke auswählen</option>';

        // Event-Listener für Marken-Änderung
        preiseMarkeSelect.addEventListener('change', () => {
            const ausgewählteMarke = preiseMarkeSelect.value;
            preiseArtikelSelect.innerHTML = '<option value="">Artikel auswählen</option>';

            // Filtere Artikel basierend auf der ausgewählten Marke
            artikel
                .filter((a) => a.marke === ausgewählteMarke)
                .forEach((a) => {
                    const option = document.createElement('option');
                    option.value = a.id;
                    option.textContent = a.name;
                    preiseArtikelSelect.appendChild(option);
                });
        });
    } catch (error) {
        console.error('Fehler beim Laden der Marken und Artikel:', error);
    }
}

// Supermärkte laden
export async function ladeSupermaerktePreise() {
    try {
        const supermaerkte = await fetchWithAuth('supermarkt');
        preiseSupermarktSelect.innerHTML = '<option value="">Supermarkt auswählen</option>';

        supermaerkte.forEach((s) => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            preiseSupermarktSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Supermärkte:', error);
    }
}

// Regulären Preis hinzufügen
document.getElementById('preiseForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const artikelId = preiseArtikelSelect.value;
    const supermarktId = preiseSupermarktSelect.value;
    const regulaererPreis = parseFloat(document.getElementById('preiseRegulaer').value);

    if (!artikelId || !supermarktId || isNaN(regulaererPreis)) {
        alert('Bitte fülle alle Felder aus und gib einen gültigen Preis ein.');
        return;
    }

    try {
        // Prüfen, ob ein Duplikat existiert
        const vorhandeneEinträge = await fetchWithAuth(
            `supermarkt_artikel_preise?artikel_id=eq.${artikelId}&supermarkt_id=eq.${supermarktId}`
        );
        if (vorhandeneEinträge.length > 0) {
            alert('Dieser Preis für die Kombination aus Marke, Artikel und Supermarkt existiert bereits.');
            return;
        }

        // Daten an API senden
        await fetchWithAuth('supermarkt_artikel_preise', 'POST', {
            artikel_id: artikelId,
            supermarkt_id: supermarktId,
            regulaerer_preis: regulaererPreis,
        });

        ladePreise();
        document.getElementById('preiseForm').reset();
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Preises:', error);
        alert('Fehler beim Hinzufügen des Preises.');
    }
});

// Regulären Preis bearbeiten
export async function preiseBearbeiten(id) {
    try {
        const [preis] = await fetchWithAuth(
            `supermarkt_artikel_preise?id=eq.${id}&select=*,artikel(name),supermarkt(name)`
        );

        const neuerPreis = prompt(
            `Regulärer Preis für ${preis.artikel.name} im ${preis.supermarkt.name}:`,
            preis.regulaerer_preis.toFixed(2)
        );

        if (!neuerPreis) return;

        const formatiertesPreis = parseFloat(neuerPreis.replace(',', '.'));
        if (isNaN(formatiertesPreis)) {
            alert('Bitte gib einen gültigen Preis ein.');
            return;
        }

        await fetchWithAuth(`supermarkt_artikel_preise?id=eq.${id}`, 'PATCH', {
            regulaerer_preis: formatiertesPreis,
        });

        ladePreise();
    } catch (error) {
        console.error('Fehler beim Bearbeiten des Preises:', error);
        alert('Fehler beim Bearbeiten des Preises.');
    }
}

// Regulären Preis löschen
export async function preiseLoeschen(id) {
    if (!confirm('Möchtest du diesen Eintrag wirklich löschen?')) return;

    try {
        await fetchWithAuth(`supermarkt_artikel_preise?id=eq.${id}`, 'DELETE');
        ladePreise();
    } catch (error) {
        console.error('Fehler beim Löschen des Preises:', error);
        alert('Fehler beim Löschen des Preises.');
    }
}

// Initialisiere Dropdowns beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    ladeMarkenUndArtikel(); // Marken und Artikel für das Dropdown laden
    ladeSupermaerktePreise(); // Supermärkte für das Dropdown laden
    ladePreise(); // Preise laden und Tabelle füllen
});


// Globale Funktionen verfügbar machen
window.preiseBearbeiten = preiseBearbeiten;
window.preiseLoeschen = preiseLoeschen;
