import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';
import { Character, Item } from '@Shared/types/character.js';

const Rebar = useRebar();
const api = Rebar.useApi();
import { useApi } from '@Server/api/index.js';
const getter = Rebar.get.usePlayerGetter();
const { get, create, getMany, update } = Rebar.database.useDatabase();

const messenger = Rebar.messenger.useMessenger();

const CHAT_DISTANCE = 10;
const CHAT_DISTANCES = {
    normal: CHAT_DISTANCE,
    low: CHAT_DISTANCE * 0.5,
    shout: CHAT_DISTANCE * 1.5,
    megaphone: CHAT_DISTANCE * 2
};

declare module '@Shared/types/character.js' {
    export interface Character {
        cash?: number;
        bank?: number;
        black_money: number;
        health: number;
        armor: number;
        position: { x: number; y: number; z: number };
        inventory: Item[];  // inventory ist eine Liste von Item-Objekten
    }

    // Item-Interface
    export interface Item {
        id: string;           // Eindeutige Identifikation des Items
        name: string;         // Name des Items
        quantity: number;     // Anzahl des Items
        type: string;         // Art des Items (z.B. 'Waffe', 'Medizin', etc.)
        description?: string; // Optionale Beschreibung des Items
    }
}

const sendMessageToNearbyPlayers = (player, message, distance = CHAT_DISTANCE) => {
    alt.Player.all.forEach(target => {
        if (target.valid && Utility.vector.distance2d(player.pos, target.pos) <= distance) {
            messenger.message.send(target, { type: 'player', content: message, author: player.name });
        }
    });
};

type ItemUseCallback = (player: alt.Player, characterName: string, item: Item, quantity: number) => void;



// Zwei Maps für unterschiedliche Zwecke
const itemRegistry = new Map<string, Item>(); // Speichert die Items mit ihren IDs
const itemCallbacks = new Map<string, ItemUseCallback>(); // Speichert die Callbacks anhand von Item-Namen

function registerItemUse(
    itemData: Omit<Item, 'quantity'>,
    callback: (player: any, characterName: string, item: Item, quantity: number) => void
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
function getItemById(itemId: string): Item | undefined {
    return itemRegistry.get(itemId);
}

// Funktion, um alle registrierten Items zu bekommen
function getAllItems(): Item[] {
    return Array.from(itemRegistry.values());
}

// Funktion zur Verwendung eines Items
function handleItemUse(player: alt.Player, characterName: string, itemId: string, quantity: number): void {
    try {
        // Beispiel für Charakter- und Inventardaten (anpassen nach System)
        const characterDocument = getter.byName(characterName); // `getter` ist hier nur ein Platzhalter
        if (!characterDocument) {
            alt.logWarning(`Charakter "${characterName}" nicht gefunden.`);
            return;
        }

        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get()?.inventory || []; // Annahme: `inventory` enthält die Items

        // Item anhand der ID finden
        const item = characterData.find((i: Item) => i.id === itemId);
        if (!item) {
            alt.logWarning(`Item mit der ID "${itemId}" im Inventar von "${characterName}" nicht gefunden.`);
            return;
        }

        // Callback für das Item abrufen
        const itemCallback = itemCallbacks.get(item.name); // Nach Item-Namen suchen
        if (itemCallback) {
            try {
                itemCallback(player, characterName, item, quantity);
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

// Funktion zum Erstellen der Inventory Collection für einen Charakter
async function createInventory(characterName: string) {
    try {
        const characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        // Initialisiere das Inventar, falls es noch nicht existiert
        if (!characterData.inventory) {
            characterData.inventory = [];
            await document.set('inventory', characterData.inventory);
            await update({ _id: characterData._id, inventory: characterData.inventory }, 'Characters');
        }

        return characterData.inventory;
    } catch (error) {
        alt.log(`Fehler beim Erstellen des Inventars für ${characterName}: ${error.message}`);
        throw error;
    }
}

/// Funktion zum Hinzufügen eines Items zum Inventar eines Charakters
async function addInventoryItem(characterName: string, itemId: string, quantity: number) {
    try {
        alt.log(`[addInventoryItem] Called for character: ${characterName}, itemId: ${itemId}, quantity: ${quantity}`);

        const characterDocument = getter.byName(characterName);
        alt.log(`[addInventoryItem] Character document retrieved: ${JSON.stringify(characterDocument)}`);
        
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        alt.log(`[addInventoryItem] Character data: ${JSON.stringify(characterData)}`);

        // Hole das Item aus der verfügbaren Liste
        const item = getItemById(itemId);
        if (!item) {
            alt.log(`[addInventoryItem] Item with ID ${itemId} not found.`);
            //sendMessageToNearbyPlayers(characterName, `Item mit der ID ${itemId} wurde nicht gefunden.`, CHAT_DISTANCES.normal);
            return;
        }

        alt.log(`[addInventoryItem] Item found: ${JSON.stringify(item)}`);

        // Kopiere das Item und setze die Menge
        const itemToAdd = { ...item, quantity };

        if (!characterData.inventory) {
            alt.log(`[addInventoryItem] Inventory is empty, initializing.`);
            characterData.inventory = [];
        }

        // Überprüfe, ob das Item bereits im Inventar ist
        const existingItem = characterData.inventory.find(i => i.id === itemId);
        if (existingItem) {
            alt.log(`[addInventoryItem] Item already exists, increasing quantity.`);
            // Wenn das Item schon im Inventar ist, erhöhe die Menge
            existingItem.quantity += quantity;
            //sendMessageToNearbyPlayers(characterName, `Die Menge von ${item.name} wurde um ${quantity} erhöht.`, CHAT_DISTANCES.normal);
        } else {
            alt.log(`[addInventoryItem] Item not found in inventory, adding new item.`);
            // Wenn das Item noch nicht im Inventar ist, füge es hinzu
            characterData.inventory.push(itemToAdd);
            //sendMessageToNearbyPlayers(characterName, `Item ${item.name} wurde dem Inventar hinzugefügt.`, CHAT_DISTANCES.normal);
        }

        alt.log(`[addInventoryItem] Updated inventory: ${JSON.stringify(characterData.inventory)}`);

        // Speichere das aktualisierte Inventar
        await document.set('inventory', characterData.inventory);
        await update({ _id: characterData._id, inventory: characterData.inventory }, 'Characters');

        alt.log(`[addInventoryItem] Inventory updated for character ${characterName}.`);
        updateInventory(characterDocument, characterData.inventory);

    } catch (error) {
        alt.log(`[addInventoryItem] Fehler beim Hinzufügen des Items zum Inventar von ${characterName}: ${error.message}`);
    }
}

async function removeInventoryItem(characterName: string, itemId: string, quantity: number): Promise<boolean> {
    try {
        // Hole das Charakterdokument
        alt.log(`[removeInventoryItem] Getting character document for: ${characterName}`);
        const characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        // Überprüfe, ob das Inventar existiert
        if (!characterData.inventory) {
            alt.log(`[removeInventoryItem] Kein Inventar gefunden für ${characterName}.`);
            return false;
        }

        // Suche nach dem Item im Inventar
        const itemIndex = characterData.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            alt.log(`[removeInventoryItem] Item mit der ID ${itemId} wurde nicht im Inventar von ${characterName} gefunden.`);
            return false;
        }

        const item = characterData.inventory[itemIndex];

        // Überprüfe, ob genug von diesem Item vorhanden ist
        if (item.quantity < quantity) {
            alt.log(`[removeInventoryItem] Nicht genug ${item.name} im Inventar von ${characterName}.`);
            return false;
        }

        if (item.quantity <= quantity) {
            // Entferne das Item vollständig, wenn die gesamte Menge entfernt wird
            const itemName = item.name;
            characterData.inventory.splice(itemIndex, 1);
            alt.log(`[removeInventoryItem] Item ${itemName} wurde vollständig aus dem Inventar von ${characterName} entfernt.`);
        } else {
            // Verringere die Menge des Items
            item.quantity -= quantity;
            alt.log(`[removeInventoryItem] Die Menge von ${item.name} wurde um ${quantity} reduziert. Verbleibende Menge: ${item.quantity}`);
        }

        // Aktualisiere das Inventar in der Datenbank
        await document.set('inventory', characterData.inventory);
        await update({ _id: characterData._id, inventory: characterData.inventory }, 'Characters');
        updateInventory(characterDocument, characterData.inventory);

        return true; // Erfolgreiches Entfernen des Items
    } catch (error) {
        alt.log(`[removeInventoryItem] Fehler beim Entfernen des Items aus dem Inventar von ${characterName}: ${error.message}`);
        return false; // Fehler beim Entfernen des Items
    }
}

async function getInventoryItems(characterName: string) {
    try {
        alt.log(`[getInventoryItems] Getting inventory for character: ${characterName}`);
        const characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        if (!characterData.inventory || characterData.inventory.length === 0) {
            alt.log(`[getInventoryItems] Das Inventar von ${characterName} ist leer.`);
            return [];
        }

        alt.log(`[getInventoryItems] Inventar von ${characterName}: ${JSON.stringify(characterData.inventory)}`);
        return characterData.inventory; // Gibt alle Items im Inventar zurück
    } catch (error) {
        alt.log(`[getInventoryItems] Fehler beim Abrufen der Inventargegenstände für ${characterName}: ${error.message}`);
        return [];
    }
}



// Register the API
export function useRebarInventory() {
    return {
        createInventory,
        addInventoryItem,
        removeInventoryItem,
        handleItemUse,
        getInventoryItems,
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
alt.on('inventory:update', (player, inventory) => {
    const rPlayer = Rebar.usePlayer(player);
    rPlayer.webview.emit('updateInventory', {
        type: 'update',
        player,
        inventory,  // Hier werden die Inventardaten übergeben
    });
});

// Beispiel für das Aktualisieren der Inventardaten
function updateInventory(player: alt.Player, inventory: { id: string, name: string, quantity: number }[]) {
    alt.emit('inventory:update', player, inventory);
}






