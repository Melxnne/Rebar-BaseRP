import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { Character } from '@Shared/types/character.js';

const Rebar = useRebar();


// Hilfsfunktion zum Warten (Wait)
export function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Abrufen der Charakterdaten
export async function waitForCharacterData(player: alt.Player): Promise<Character | null> {
    const document = Rebar.document.character.useCharacter(player);
    let characterData = document.get();

    while (!characterData || !characterData._id) {
        await wait(100);
        characterData = document.get();
    }

    return characterData;
}


export function initfunc() {
    alt.log('Player Handler is Called');
}