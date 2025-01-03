import { fetchWithAuth } from './api.js';

// Elemente im DOM referenzieren
const angeboteMarkeSelect = document.getElementById('angeboteMarke');
const angeboteArtikelSelect = document.getElementById('angeboteArtikel');
const angeboteSupermarktSelect = document.getElementById('angeboteSupermarkt');
const angeboteListe = document.getElementById('angeboteListe');

// Hilfsfunktion: Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Angebote laden und Tabelle aktualisieren
export async function ladeAngebote() {
    try {
        const angebote = await fetchWithAuth(
            'angebote?select=id,artikel(name,marke),supermarkt(name),angebotspreis,gueltig_bis'
        );

        console.log('Geladene Angebote:', angebote);

        // Sortiere die Angebote
        angebote.sort((a, b) => {
            const markeA = a.artikel.marke.toLowerCase();
            const markeB = b.artikel.marke.toLowerCase();
            if (markeA < markeB) return -1;
            if (markeA > markeB) return 1;

            const nameA = a.artikel.name.toLowerCase();
            const nameB = b.artikel.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            const supermarktA = a.supermarkt.name.toLowerCase();
            const supermarktB = b.supermarkt.name.toLowerCase();
            if (supermarktA < supermarktB) return -1;
            if (supermarktA > supermarktB) return 1;

            return 0;
        });

        angeboteListe.innerHTML = '';
        angebote.forEach((angebot) => {
            console.log('Angebot ID:', angebot.id); // Debugging
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${angebot.artikel.marke}</td>
                <td>${angebot.artikel.name}</td>
                <td>${angebot.supermarkt.name}</td>
                <td>${angebot.angebotspreis.toFixed(2)} €</td>
                <td>${formatDate(angebot.gueltig_bis)}</td>
                <td>
                    <button onclick="angeboteBearbeiten(${angebot.id})">Bearbeiten</button>
                    <button onclick="angeboteLoeschen(${angebot.id})">Löschen</button>
                </td>
            `;
            angeboteListe.appendChild(row);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Angebote:', error);
    }
}

// Marken und Artikel für Angebote laden
export async function ladeMarkenUndArtikelAngebote() {
    try {
        const artikel = await fetchWithAuth('artikel');
        const markenSet = new Set();

        artikel.forEach((a) => markenSet.add(a.marke));

        angeboteMarkeSelect.innerHTML = '<option value="">Marke auswählen</option>';
        markenSet.forEach((marke) => {
            const option = document.createElement('option');
            option.value = marke;
            option.textContent = marke;
            angeboteMarkeSelect.appendChild(option);
        });

        angeboteArtikelSelect.innerHTML = '<option value="">Bitte zuerst Marke auswählen</option>';

        angeboteMarkeSelect.addEventListener('change', () => {
            const ausgewählteMarke = angeboteMarkeSelect.value;
            angeboteArtikelSelect.innerHTML = '<option value="">Artikel auswählen</option>';

            artikel
                .filter((a) => a.marke === ausgewählteMarke)
                .forEach((a) => {
                    const option = document.createElement('option');
                    option.value = a.id;
                    option.textContent = a.name;
                    angeboteArtikelSelect.appendChild(option);
                });
        });
    } catch (error) {
        console.error('Fehler beim Laden der Marken und Artikel für Angebote:', error);
    }
}

// Supermärkte für Angebote laden
export async function ladeSupermaerkteAngebote() {
    try {
        const supermaerkte = await fetchWithAuth('supermarkt');
        angeboteSupermarktSelect.innerHTML = '<option value="">Supermarkt auswählen</option>';

        supermaerkte.forEach((s) => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            angeboteSupermarktSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Supermärkte für Angebote:', error);
    }
}

// Angebot hinzufügen
document.getElementById('angeboteForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const artikelId = angeboteArtikelSelect.value;
    const supermarktId = angeboteSupermarktSelect.value;
    const angebotspreis = parseFloat(document.getElementById('angebotePreis').value.replace(',', '.'));
    const gueltigBis = document.getElementById('angeboteGueltigBis').value;

    if (!artikelId || !supermarktId || isNaN(angebotspreis) || !gueltigBis) {
        alert('Bitte alle Felder ausfüllen.');
        return;
    }

    try {
        await fetchWithAuth('angebote', 'POST', {
            artikel_id: artikelId,
            supermarkt_id: supermarktId,
            angebotspreis,
            gueltig_bis: gueltigBis,
        });
        ladeAngebote();
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Angebots:', error);
    }
});

// Angebot bearbeiten
export async function angeboteBearbeiten(id) {
    console.log('Bearbeiten aufgerufen für ID:', id); // Debugging
    if (!id) {
        console.error('Ungültige ID übergeben:', id);
        return;
    }
    try {
        const [angebot] = await fetchWithAuth(`angebote?id=eq.${id}&select=id,artikel(name),supermarkt(name),angebotspreis,gueltig_bis`);

        const neuerPreis = prompt(`Neuer Angebotspreis für ${angebot.artikel.name} im ${angebot.supermarkt.name}:`, angebot.angebotspreis.toFixed(2));
        const neuesDatum = prompt(`Neues Ablaufdatum für das Angebot (TT.MM.JJJJ):`, formatDate(angebot.gueltig_bis));

        if (!neuerPreis || !neuesDatum) return;

        // Umwandlung des Datums aus TT.MM.JJJJ zurück in JJJJ-MM-TT für die API
        const [day, month, year] = neuesDatum.split('.');
        const apiDatum = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        await fetchWithAuth(`angebote?id=eq.${id}`, 'PATCH', {
            angebotspreis: parseFloat(neuerPreis.replace(',', '.')),
            gueltig_bis: apiDatum,
        });
        ladeAngebote();
    } catch (error) {
        console.error('Fehler beim Bearbeiten des Angebots:', error);
    }
}


// Angebot löschen
export async function angeboteLoeschen(id) {
    console.log('Löschen aufgerufen für ID:', id); // Debugging
    if (!id) {
        console.error('Ungültige ID übergeben:', id);
        return;
    }
    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
        await fetchWithAuth(`angebote?id=eq.${id}`, 'DELETE');
        ladeAngebote();
    } catch (error) {
        console.error('Fehler beim Löschen des Angebots:', error);
    }
}

// Globale Verfügbarkeit sicherstellen
window.angeboteBearbeiten = angeboteBearbeiten;
window.angeboteLoeschen = angeboteLoeschen;

// Initialisiere Dropdowns beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    ladeMarkenUndArtikelAngebote();
    ladeSupermaerkteAngebote();
    ladeAngebote();
});
