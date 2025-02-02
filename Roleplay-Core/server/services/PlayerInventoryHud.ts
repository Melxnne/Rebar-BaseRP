import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
const Rebar = useRebar();

const rPlayer = (player) => Rebar.usePlayer(player);
import * as Utility from '@Shared/utility/index.js';
import { config } from '@Plugins/Roleplay-Core/shared/config.js'; // Config importieren
import * as utils from '@Plugins/Roleplay-Core/server/services/utlits.js';

const api = Rebar.useApi();
const Keybinder = Rebar.useKeybinder();
// Hole beide APIs
const [moneyAPI, inventoryAPI, JobApi, VehicleAPI] = await Promise.all([
    api.getAsync('rebar-rp-money-api'),
    api.getAsync('rebar-rp-inventory-api'), 
    api.getAsync('rebar-rp-job-api'),  
    api.getAsync('rebar-rp-vehicles-api')
]);

// Kombiniere alle Funktionen beider APIs in ein einzelnes Objekt
const esr = {
    ...moneyAPI,
    ...inventoryAPI,
    ...JobApi,
    ...VehicleAPI
};

// Aktualisieren der Inventardaten
export function updateInventory(player, maxWeight, inventory) {
    alt.emit('inventory:update', player, inventory, maxWeight);
}

alt.on('inventory:update', (player, inventory, maxWeight) => {
    rPlayer(player).webview.emit('updateInventory', {
        type: 'update',
        player,
        inventory,
        maxWeight,
    });
});


// Inventory Handling 

// Funktion zur Nutzung eines Items
function useItemHandler(player, { itemId, amount, imagepath}) {
    const document = Rebar.document.character.useCharacter(player);
    let character = document.get();
   
    if (!character) {
        alt.logWarning(`Charakter für Spieler ${player.name} nicht gefunden.`);
        return;
    }

    const item = character.inventory.find((i) => i.id === itemId);
    if (!item) {
        alt.log(`[ERROR] Item nicht gefunden für Spieler ${player.name}.`);
        return;
    }

    const callback = esr.itemCallbacks.get(item.name);
    if (callback) {
        callback(player, character._id, item, amount); // Menge an den Callback übergeben
    } else {
        alt.log(`[ERROR] Keine Aktion für ${item.name} definiert.`);
    }

    // Optional: Bestätigung an den Webview senden
    alt.emitClient(player, 'inventory:itemUsed', { itemId, amount });
}


// Funktion zum Übergeben eines Items
function giveItemHandler(player, { itemId, amount }) {
    const target = getNearestPlayer(player); // Nächstgelegenen Spieler finden
    if (!target) {
        alt.log(`[ERROR] Kein Spieler in der Nähe von ${player.name} gefunden.`);
        return;
    }

    const document = Rebar.document.character.useCharacter(player);
    let character = document.get();
    if (!character) {
        alt.logWarning(`Charakter für Spieler ${player.name} nicht gefunden.`);
        return;
    }

    const itemIndex = character.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
        alt.log(`[ERROR] Item nicht gefunden für Spieler ${player.name}.`);
        return;
    }

    const item = character.inventory[itemIndex];
    esr.addInventoryItem(target._id, item.id, item.quantity); // Item zum Inventar des Ziels hinzufügen
    character.inventory.splice(itemIndex, 1); // Entfernen aus dem Inventar des Gebers
    const maxWeight = character.maxWeight;
    updateInventory(player, maxWeight, character.inventory); // Inventar des Gebers aktualisieren

    // Bestätigung an den Webview senden
    alt.emitClient(player, 'inventory:itemGiven', { itemId, amount });
}

// Funktion zum Droppen eines Items
function dropItemHandler(player, { itemId, amount }) {
    const document = Rebar.document.character.useCharacter(player);
    let character = document.get();
    if (!character) {
        alt.logWarning(`Charakter für Spieler ${player.name} nicht gefunden.`);
        return;
    }

    const itemIndex = character.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
        alt.log(`[ERROR] Item nicht gefunden für Spieler ${player.name}.`);
        return;
    }

    const item = character.inventory[itemIndex];
    if (item.quantity < amount) {
        alt.log(`[ERROR] Nicht genügend Menge für ${item.name} zum Droppen.`);
        return;
    }

    esr.removeInventoryItem(character._id, item.id, amount); // Item zum Inventar des Ziels hinzufügen

    // Reduziere die Menge des Items im Inventar
    item.quantity -= amount;
    if (item.quantity <= 0) {
        character.inventory.splice(itemIndex, 1); // Entferne das Item, wenn keine Menge mehr übrig ist
    }

    const maxWeight = character.maxWeight;

    updateInventory(player, maxWeight, character.inventory); // Inventar des Spielers aktualisieren

    // Optional: Spawnen des Items in der Welt (Je nach deiner Logik)
    // spawnDroppedItem(player.pos, item); 

    // Bestätigung an den Webview senden
    alt.emitClient(player, 'inventory:itemDropped', { itemId, amount });
}

alt.onClient('inventory:use', useItemHandler);
alt.onClient('inventory:give', giveItemHandler);
alt.onClient('inventory:drop', dropItemHandler);

function getNearestPlayer(player) {
    let nearest = null;
    let minDistance = 5;

    alt.Player.all.forEach((target) => {
        if (target === player) return;
        const distance = Utility.vector.distance2d(player.pos, target.pos);
        if (distance < minDistance) {
            nearest = target;
            minDistance = distance;
        }
    });

    return nearest;
}

alt.onClient('updateinventorynow', async (player) => {
    try {
        const characterData = await utils.waitForCharacterData(player);

        if (!characterData) {
            console.error(`Character data not found for player: ${player.name}`);
            return;
        }
             
        // Überprüfen, ob Inventardaten vorhanden sind und die Inventardaten senden
        if (characterData.inventory && Array.isArray(characterData.inventory)) {
            updateInventory(player, characterData.maxWeight, characterData.inventory,);
        } else {
            console.warn(`No inventory data found for player: ${player.name}`);
        }
    } catch (error) {
        console.error(`Error in 'updateinventorynow':`, error);
    }
});


export function initfunc() {
    alt.log('Player Handler is Called');
}