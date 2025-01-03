import { initModals } from './modals.js';
import { ladeArtikel } from './artikel.js';
import { ladeKategorien } from './kategorien.js';
import { ladeSupermaerkte } from './supermaerkte.js';
import { ladeAngebote } from './angebote.js';
import { ladePreise } from './preise.js';
import { ladeMarkenUndArtikel } from './einkaufszettel.js';
import { ladeEinkaufszettel } from './einkaufszettel.js';

document.addEventListener('DOMContentLoaded', () => {
    // Modals initialisieren
    initModals();

    // Daten laden
    ladeArtikel();
    ladeKategorien();
    ladeSupermaerkte();
    ladeAngebote();
    ladePreise();
	ladeMarkenUndArtikel();
	ladeEinkaufszettel();
});
