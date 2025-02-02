import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';
import { Character, Item } from '@Shared/types/character.js';

const Rebar = useRebar();
const api = Rebar.useApi();
import { useApi } from '@Server/api/index.js';
const getter = Rebar.get.usePlayerGetter();
const { get, create, getMany, update } = Rebar.database.useDatabase();
import { config } from '@Plugins/Roleplay-Core/shared/config.js'; // Config importieren



declare module '@Shared/types/character.js' {
    export interface Character {
        cash?: number;
        bank?: number;
        black_money: number;
        health: number;
        armor: number;
        position: { x: number; y: number; z: number };
        inventory: Item[];  // inventory ist eine Liste von Item-Objekten
        maxWeight?: number;   // Maximales Gewicht des Charakters
    }

    // Item-Interface
    export interface Item {
        id: string;           // Eindeutige Identifikation des Items
        name: string;         // Name des Items
        quantity: number;     // Anzahl des Items
        type: string;         // Art des Items (z.B. 'Waffe', 'Medizin', etc.)
        description?: string; // Optionale Beschreibung des Items
        weight: number;       // Gewicht des Items
        
    }
}



type ItemUseCallback = (player: alt.Player, characterid: string, item: Item, quantity: number) => void;



// Zwei Maps für unterschiedliche Zwecke
const itemRegistry = new Map<string, Item>(); // Speichert die Items mit ihren IDs
const itemCallbacks = new Map<string, ItemUseCallback>(); // Speichert die Callbacks anhand von Item-Namen

function registerItemUse(
    itemData: Omit<Item, 'quantity'>,
    callback: (player: any, characterid: string, item: Item, quantity: number) => void 
): void {
    const { id, name } = itemData;

    // Item registrieren
    if (itemRegistry.has(id)) {
        alt.logWarning(`Item "${name}" mit ID "${id}" wird überschrieben.`);
    }
    itemRegistry.set(id, { ...itemData, quantity: 0 }); // Standard-Quantity auf 0 setzen
    alt.log(`Item "${name}" wurde erfolgreich registriert.`);

    // Callback registrieren
    if (itemCallbacks.has(name)) {
        alt.logWarning(`Die Callback-Funktion für "${name}" wird überschrieben.`);
    }
    itemCallbacks.set(name, callback);
}

// Funktion zum Abrufen eines Items aus dem Registry
export function getItemById(itemId: string): Item | undefined {
    return itemRegistry.get(itemId);
}

// Funktion, um alle registrierten Items zu bekommen
function getAllItems(): Item[] {
    return Array.from(itemRegistry.values());
}

// Funktion zur Verwendung eines Items
function handleItemUse(player: alt.Player, characterid: string, itemId: string, quantity: number): void {
    try {
        // Beispiel für Charakter- und Inventardaten (anpassen nach System)
        const characterDocument = getter.byCharacter(characterid);
        if (!characterDocument) {
            alt.logWarning(`Charakter "${characterid}" nicht gefunden.`);
            return;
        }

        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get()?.inventory || []; // Annahme: `inventory` enthält die Items

        // Item anhand der ID finden
        const item = characterData.find((i: Item) => i.id === itemId);
        if (!item) {
            alt.logWarning(`Item mit der ID "${itemId}" im Inventar von "${document.getField('name')}" nicht gefunden.`);
            return;
        }

        // Callback für das Item abrufen
        const itemCallback = itemCallbacks.get(item.name); // Nach Item-Namen suchen
        if (itemCallback) {
            try {
                itemCallback(player, characterid, item, quantity);
                alt.log(`Item "${item.name}" erfolgreich verwendet.`);
            } catch (error) {
                alt.logError(`Fehler bei der Verwendung von "${item.name}": ${error.message}`);
            }
        } else {
            alt.logWarning(`Keine Funktion für das Item "${item.name}" registriert.`);
        }
    } catch (error) {
        alt.logError(`Fehler in handleItemUse: ${error.message}`);
    }
}

// Funktion zur Berechnung des Gesamtgewichts im Inventar eines Charakters
function calculateTotalInventoryWeight(characterid: string): number {
    const characterDocument = getter.byCharacter(characterid);
    const document = Rebar.document.character.useCharacter(characterDocument);
    const characterData = document.get();

    if (!characterData.inventory || characterData.inventory.length === 0) {
        return 0;
    }

    return characterData.inventory.reduce((totalWeight, item) => {
        return totalWeight + item.weight * item.quantity;
    }, 0);
}



/// Funktion zum Hinzufügen eines Items zum Inventar eines Charakters, mit Gewichtskontrolle
async function addInventoryItem(characterid: string, itemId: string, quantity: number) {
    try {
        const characterDocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        const item = getItemById(itemId);
        if (!item) {
            alt.log(`[addInventoryItem] Item mit ID ${itemId} nicht gefunden.`);
            return;
        }

        const itemToAdd = { ...item, quantity };
        
        // Berechne das Gesamtgewicht des Inventars
        const totalWeight = calculateTotalInventoryWeight(characterid);
        const itemWeight = itemToAdd.weight * itemToAdd.quantity;
        
        alt.log('[addInventoryItem] Try Weight info:', totalWeight, itemWeight, characterData.maxWeight);
        // Prüfe, ob das Hinzufügen des Items das maximale Gewicht überschreiten würde
        if (totalWeight + itemWeight > characterData.maxWeight) {
            alt.log(`[addInventoryItem] Das Hinzufügen des Items ${item.name} würde das maximale Inventargewicht überschreiten.`);
            return;
        }

        // Inventory aktualisieren
        if (!characterData.inventory) {
            characterData.inventory = [];
        }

        const existingItem = characterData.inventory.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            characterData.inventory.push(itemToAdd);
        }

        await document.set('inventory', characterData.inventory);
        await update({ _id: characterData._id, inventory: characterData.inventory }, 'Characters');
        updateInventory(characterDocument, characterData.maxWeight, characterData.inventory);

        alt.log(`[addInventoryItem] Item ${item.name} wurde dem Inventar hinzugefügt.`);
    } catch (error) {
        alt.log(`[addInventoryItem] Fehler: ${error.message}`);
    }
}

// Beispiel: Funktion, um das maximale Gewicht des Charakters zu setzen (falls erforderlich)
async function setMaxWeight(characterid: string, weight: number) {
    try {
        const characterDocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        characterData.maxWeight = weight;

        await document.set('maxWeight', weight);
        await update({ _id: characterData._id, maxWeight: weight }, 'Characters');

        alt.log(`[setMaxWeight] Maximales Gewicht für Charakter ${characterData.name} auf ${weight} gesetzt.`);
    } catch (error) {
        alt.log(`[setMaxWeight] Fehler: ${error.message}`);
    }
}

async function removeInventoryItem(characterid: string, itemId: string, quantity: number): Promise<boolean> {
    try {
        // Hole das Charakterdokument
        alt.log(`[removeInventoryItem] Getting character document for: ${characterid}`);
        const characterDocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        // Überprüfe, ob das Inventar existiert
        if (!characterData.inventory) {
            alt.log(`[removeInventoryItem] Kein Inventar gefunden für ${characterData.name}.`);
            return false;
        }

        // Suche nach dem Item im Inventar
        const itemIndex = characterData.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            alt.log(`[removeInventoryItem] Item mit der ID ${itemId} wurde nicht im Inventar von ${characterData.name} gefunden.`);
            return false;
        }

        const item = characterData.inventory[itemIndex];

        // Überprüfe, ob genug von diesem Item vorhanden ist
        if (item.quantity < quantity) {
            alt.log(`[removeInventoryItem] Nicht genug ${item.name} im Inventar von ${characterData.name}.`);
            return false;
        }

        if (item.quantity <= quantity) {
            // Entferne das Item vollständig, wenn die gesamte Menge entfernt wird
            const itemName = item.name;
            characterData.inventory.splice(itemIndex, 1);
            alt.log(`[removeInventoryItem] Item ${itemName} wurde vollständig aus dem Inventar von ${characterData.name} entfernt.`);
        } else {
            // Verringere die Menge des Items
            item.quantity -= quantity;
            alt.log(`[removeInventoryItem] Die Menge von ${item.name} wurde um ${quantity} reduziert. Verbleibende Menge: ${item.quantity}`);
        }

        // Aktualisiere das Inventar in der Datenbank
        await document.set('inventory', characterData.inventory);
        await update({ _id: characterData._id, inventory: characterData.inventory }, 'Characters');
        updateInventory(characterDocument, characterData.maxWeight, characterData.inventory);

        return true; // Erfolgreiches Entfernen des Items
    } catch (error) {
        alt.log(`[removeInventoryItem] Fehler beim Entfernen des Items aus dem Inventar von ${CharacterData.name}: ${error.message}`);
        return false; // Fehler beim Entfernen des Items
    }
}

async function getInventoryItems(characterid: string) {
    try {
        alt.log(`[getInventoryItems] Getting inventory for character: ${characterid}`);
        const characterDocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        if (!characterData.inventory || characterData.inventory.length === 0) {
            alt.log(`[getInventoryItems] Das Inventar von ${characterData.name} ist leer.`);
            return [];
        }

        alt.log(`[getInventoryItems] Inventar von ${characterData.name}: ${JSON.stringify(characterData.inventory)}`);
        return characterData.inventory; // Gibt alle Items im Inventar zurück
    } catch (error) {
        alt.log(`[getInventoryItems] Fehler beim Abrufen der Inventargegenstände für ${CharacterData.name}: ${error.message}`);
        return [];
    }
}


// Register the API
export function useRebarInventory() {
    return {
        addInventoryItem,
        removeInventoryItem,
        handleItemUse,
        getInventoryItems,
        getItemById,
        registerItemUse,
        itemRegistry,
        itemCallbacks
        
    };
}

declare global {
    export interface ServerPlugin {
        ['rebar-rp-inventory-api']: ReturnType<typeof useRebarInventory>;
    }
}

useApi().register('rebar-rp-inventory-api', useRebarInventory());

export function initfunc() {
    alt.log('inventory Api is Called');
}


// Event, um die Inventardaten zu aktualisieren
alt.on('inventory:update', (player, maxWeight, inventory) => {
    const rPlayer = Rebar.usePlayer(player);
    rPlayer.webview.emit('updateInventory', {
        type: 'update',
        player,
        maxWeight,
        inventory,  // Hier werden die Inventardaten übergeben
        
    });
});

// Beispiel für das Aktualisieren der Inventardaten
function updateInventory(player: alt.Player, maxWeight: number, inventory: { id: string, name: string, quantity: number }[]) {
    alt.emit('inventory:update', player, maxWeight, inventory);
}






