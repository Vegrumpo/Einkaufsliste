import { fetchWithAuth } from './api.js';

// Supermärkte laden
export async function ladeSupermaerkte() {
    try {
        const supermaerkte = await fetchWithAuth('supermarkt');
        const table = document.getElementById('supermarktListe');
        table.innerHTML = '';

        supermaerkte.forEach((supermarkt) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supermarkt.name}</td>
                <td>${supermarkt.adresse}</td>
                <td>${supermarkt.oeffnungszeiten}</td>
                <td>
                    <button onclick="supermarktBearbeiten(${supermarkt.id})">Bearbeiten</button>
                    <button onclick="supermarktLoeschen(${supermarkt.id})">Löschen</button>
                </td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Supermärkte:', error.message);
    }
}

// Supermarkt hinzufügen
document.getElementById('supermarktForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('supermarktName').value.trim();
    const adresse = document.getElementById('supermarktAdresse').value.trim();
    const oeffnungszeiten = document.getElementById('supermarktOeffnungszeiten').value.trim();

    try {
        await fetchWithAuth('supermarkt', 'POST', { name, adresse, oeffnungszeiten });
        ladeSupermaerkte();
        document.getElementById('supermarktForm').reset();
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Supermarktes:', error.message);
    }
});

// Supermarkt bearbeiten
export async function supermarktBearbeiten(id) {
    try {
        const [supermarkt] = await fetchWithAuth(`supermarkt?id=eq.${id}`);
        const neuerName = prompt('Neuer Name:', supermarkt.name);
        const neueAdresse = prompt('Neue Adresse:', supermarkt.adresse);
        const neueOeffnungszeiten = prompt('Neue Öffnungszeiten:', supermarkt.oeffnungszeiten);

        if (!neuerName || !neueAdresse || !neueOeffnungszeiten) return;

        await fetchWithAuth(`supermarkt?id=eq.${id}`, 'PATCH', {
            name: neuerName,
            adresse: neueAdresse,
            oeffnungszeiten: neueOeffnungszeiten,
        });

        ladeSupermaerkte();
    } catch (error) {
        console.error('Fehler beim Bearbeiten des Supermarktes:', error.message);
    }
}

// Supermarkt löschen
export async function supermarktLoeschen(id) {
    if (!confirm('Möchtest du diesen Supermarkt wirklich löschen?')) return;

    try {
        await fetchWithAuth(`supermarkt?id=eq.${id}`, 'DELETE');
        ladeSupermaerkte();
    } catch (error) {
        console.error('Fehler beim Löschen des Supermarktes:', error.message);
    }
}

// Globale Funktionen verfügbar machen
window.supermarktBearbeiten = supermarktBearbeiten;
window.supermarktLoeschen = supermarktLoeschen;
