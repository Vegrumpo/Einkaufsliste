import { fetchWithAuth } from './api.js';

// Anzahl der Artikel pro Seite (Pagination)
const artikelProSeite = 10;
let seite = 1; // Aktuelle Seite

// Funktion: Artikel laden und Tabelle aktualisieren
export async function ladeArtikel() {
    try {
        const artikel = await fetchWithAuth(`artikel?order=name.asc&limit=${artikelProSeite}&offset=${(seite - 1) * artikelProSeite}`);
        const kategorienMap = await ladeKategorienMap(); // Kategorie-ID zu Kategorie-Name Mapping
        const table = document.getElementById('artikelListe');
        
        // Tabelle leeren, falls auf der ersten Seite
        if (seite === 1) {
            table.innerHTML = '';
        }

        // Tabelle mit Artikeln auffüllen
        artikel.forEach((a) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.marke || '-'}</td>
                <td>${a.name}</td>
                <td>${kategorienMap[a.kategorie] || 'Unbekannt'}</td>
                <td>
                    <button onclick="artikelBearbeiten(${a.id})">Bearbeiten</button>
                    <button onclick="artikelLoeschen(${a.id})">Löschen</button>
                </td>
            `;
            table.appendChild(row);
        });

        // Scroll-Event entfernen, wenn keine weiteren Artikel verfügbar
        if (artikel.length < artikelProSeite) {
            window.removeEventListener('scroll', handleScroll);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Artikel:', error);
    }
}

// Funktion: Kategorien als Map laden
export async function ladeKategorienMap() {
    try {
        const kategorien = await fetchWithAuth('kategorien');
        const kategorienMap = {};
        kategorien.forEach((kategorie) => {
            kategorienMap[kategorie.id] = kategorie.name;
        });
        return kategorienMap;
    } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
        return {};
    }
}

// Event: Formular zum Hinzufügen eines Artikels
document.getElementById('artikelForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const artikelMarke = document.getElementById('artikelMarke').value.trim();
    const artikelName = document.getElementById('artikelName').value.trim();
    const artikelKategorie = document.getElementById('artikelKategorie').value;

    try {
        // Neuen Artikel erstellen
        await fetchWithAuth('artikel', 'POST', {
            marke: artikelMarke,
            name: artikelName,
            kategorie: artikelKategorie,
        });

        // Artikelliste aktualisieren und Formular zurücksetzen
        ladeArtikel();
        document.getElementById('artikelForm').reset();
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Artikels:', error);
    }
});

// Funktion: Artikel bearbeiten
export async function artikelBearbeiten(id) {
    try {
        const artikel = await fetchWithAuth(`artikel?id=eq.${id}`);
        const aktuellerArtikel = artikel[0];

        const kategorien = await fetchWithAuth('kategorien');
        const aktuelleKategorieName = kategorien.find(k => k.id === aktuellerArtikel.kategorie)?.name || '';

        const neueMarke = prompt('Marke bearbeiten:', aktuellerArtikel.marke || '').trim();
        const neuerName = prompt('Name bearbeiten:', aktuellerArtikel.name || '').trim();
        const neueKategorieName = prompt('Kategorie bearbeiten:', aktuelleKategorieName).trim();

        const neueKategorie = kategorien.find(k => k.name === neueKategorieName)?.id;

        if (!neueMarke || !neuerName || !neueKategorie) {
            alert('Ungültige Eingabe. Änderungen wurden nicht gespeichert.');
            return;
        }

        await fetchWithAuth(`artikel?id=eq.${id}`, 'PATCH', {
            marke: neueMarke,
            name: neuerName,
            kategorie: neueKategorie,
        });

        ladeArtikel();
    } catch (error) {
        console.error('Fehler beim Bearbeiten des Artikels:', error);
    }
}

// Funktion: Artikel löschen
export async function artikelLoeschen(id) {
    if (!confirm('Möchtest du diesen Artikel wirklich löschen?')) return;

    try {
        await fetchWithAuth(`artikel?id=eq.${id}`, 'DELETE');
        ladeArtikel();
    } catch (error) {
        console.error('Fehler beim Löschen des Artikels:', error);
    }
}

// Funktion: Scroll-Event für Pagination
function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        seite++;
        ladeArtikel();
    }
}

// Scroll-Event hinzufügen
window.addEventListener('scroll', handleScroll);

// Globale Verfügbarkeit der Funktionen sicherstellen
window.artikelBearbeiten = artikelBearbeiten;
window.artikelLoeschen = artikelLoeschen;
