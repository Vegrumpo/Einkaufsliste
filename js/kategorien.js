import { fetchWithAuth } from './api.js';

// Funktion zum Laden der Kategorien
export async function ladeKategorien() {
    try {
        const kategorien = await fetchWithAuth('kategorien');
        const kategorieSelect = document.getElementById('artikelKategorie');
        const kategorieTabelle = document.getElementById('kategorieListe');

        // Dropdown-Optionen und Tabelleninhalt leeren
        kategorieSelect.innerHTML = '';
        kategorieTabelle.innerHTML = '';

        // Kategorien in Dropdown und Tabelle einfügen
        kategorien.forEach((kategorie) => {
            const option = document.createElement('option');
            option.value = kategorie.id;
            option.textContent = kategorie.name;
            kategorieSelect.appendChild(option);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${kategorie.name}</td>
                <td>
                    <button onclick="kategorieBearbeiten(${kategorie.id})">Bearbeiten</button>
                    <button onclick="kategorieLoeschen(${kategorie.id})">Löschen</button>
                </td>
            `;
            kategorieTabelle.appendChild(row);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error.message);
    }
}

// Event-Listener für Kategorieformular
document.getElementById('kategorieForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const kategorieName = document.getElementById('kategorieName').value.trim();

    try {
        await fetchWithAuth('kategorien', 'POST', { name: kategorieName });
        ladeKategorien();
        document.getElementById('kategorieForm').reset();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Kategorie:', error.message);
    }
});

// Funktionen zum Bearbeiten und Löschen von Kategorien
export async function kategorieBearbeiten(id) {
    try {
        const [kategorie] = await fetchWithAuth(`kategorien?id=eq.${id}`);
        const neuerName = prompt('Kategoriename bearbeiten:', kategorie.name);

        if (!neuerName) return;

        await fetchWithAuth(`kategorien?id=eq.${id}`, 'PATCH', { name: neuerName });
        ladeKategorien();
    } catch (error) {
        console.error('Fehler beim Bearbeiten der Kategorie:', error.message);
    }
}

export async function kategorieLoeschen(id) {
    if (!confirm('Möchtest du diese Kategorie wirklich löschen?')) return;

    try {
        await fetchWithAuth(`kategorien?id=eq.${id}`, 'DELETE');
        ladeKategorien();
    } catch (error) {
        console.error('Fehler beim Löschen der Kategorie:', error.message);
    }
}

// Globale Verfügbarkeit der Bearbeitungs- und Löschfunktionen
window.kategorieBearbeiten = kategorieBearbeiten;
window.kategorieLoeschen = kategorieLoeschen;
