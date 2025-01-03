import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivhliiekksjgemxlwtwh.supabase.co'; // Basierend auf deinem Supabase-Projekt
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2aGxpaWVra3NqZ2VteGx3dHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDI2MzQsImV4cCI6MjA1MDg3ODYzNH0.YEjcVQR2bmNaIAV5Rm0z4fAHrGjGu_pbsV7h6ArJaCI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// API-Hilfsfunktion
export async function fetchWithAuth(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY, // Richtig referenzieren
            Authorization: `Bearer ${SUPABASE_KEY}`, // Korrekte Variable verwenden
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Fehler bei ${method} ${endpoint}: ${response.status} - ${response.statusText}`, errorText);
            throw new Error(`Fehler: ${response.statusText} (${response.status})`);
        }

        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return null; // Rückgabe für leere Antworten
    } catch (error) {
        console.error(`Netzwerkfehler bei ${method} ${endpoint}:`, error);
        throw new Error(`Netzwerkfehler: ${error.message}`);
    }
}
