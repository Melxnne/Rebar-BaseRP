import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [inventoryAPI, MoneyAPI] = await Promise.all([
    api.getAsync('rebar-rp-inventory-api'),
    api.getAsync('rebar-rp-money-api'),
]);

export function initfunc() {
    alt.log('Player Handler is Called');
}

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...inventoryAPI, ...MoneyAPI};
const fixName = (name: string) => name.replace('_', ' ');

const registerCommand = (name: string, desc: string, callback: Function, distanceType = 'normal') => {
    messenger.commands.register({
        name,
        desc,
        callback: async (player: alt.Player, ...args: string[]) => {
            if (args.length < 2) return; // Mindestens 2 Argumente erforderlich
            await callback(player, ...args);
        }
    });
};

//Inventory 

registerCommand('addItem', 'Add item to a character\'s inventory', async (player, characterName, itemName, quantity) => {
    alt.log(`[addItem Command] Called by player: ${player.name}, characterName: ${characterName}, itemName: ${itemName}, quantity: ${quantity}`);

    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);


    

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
        alt.log(`[addItem Command] Invalid quantity: ${quantity}. Must be a positive integer.`);
        rPlayer.notify.showNotification(`Invalid quantity specified.`);
        return;
    }

    alt.log(`[addItem Command] Parsed quantity: ${quantityNum}`);

    // Überprüfe, ob das Item existiert
    const itemData = esr.itemRegistry.get(itemName);
    if (!itemData) {
        alt.logError(`[addItem Command] Item "${itemName}" not found in registry.`);
        rPlayer.notify.showNotification(`Item "${itemName}" does not exist.`);
        return;
    }

    alt.log(`[addItem Command] Item "${itemName}" found in registry.`);

    // Überprüfe, ob der Charakter existiert
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        alt.log(`[addItem Command] Character "${characterName}" not found.`);
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    alt.log(`[addItem Command] Character "${characterName}" exists. Proceeding to add item.`);

    // Item zum Charakter-Inventar hinzufügen
    try {
        await esr.addInventoryItem( characterData._id, itemName, quantityNum);
        alt.log(`[addItem Command] Added ${quantityNum}x ${itemName} to ${characterName}'s inventory.`);
        rPlayer.notify.showNotification(`${fixName(characterName)} has received ${quantityNum}x ${itemName}.`);
    } catch (error) {
        alt.logError(`[addItem Command] Error while adding item: ${error.message}`);
        rPlayer.notify.showNotification(`Failed to add ${quantityNum}x ${itemName} to ${characterName}'s inventory.`);
    }
});

// /removeItem Command: Ein Item aus dem Inventar eines Charakters entfernen
registerCommand('removeItem', 'Remove item from a character\'s inventory', async (player, characterName, itemName, quantity) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
        rPlayer.notify.showNotification(`Invalid quantity specified.`);
        return;
    }

    // Überprüfen, ob das Item existiert
    const itemData = esr.itemRegistry.get(itemName);
    if (!itemData) {
        alt.logError(`[removeItem Command] Item "${itemName}" not found in registry.`);
        rPlayer.notify.showNotification(`Item "${itemName}" does not exist.`);
        return;
    }

    // Überprüfen, ob der Charakter existiert
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Item aus dem Charakter-Inventar entfernen
    const itemRemoved = await esr.removeInventoryItem(characterData._id, itemName, quantityNum);
    if (itemRemoved) {
        rPlayer.notify.showNotification(`${fixName(characterName)} has lost ${quantityNum}x ${itemName}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} doesn't have enough ${itemName}.`);
    }
});

// /getInventory Command: Das Inventar eines Charakters anzeigen
registerCommand('getInventory', 'Get a character\'s inventory', async (player, characterName) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    // Überprüfen, ob der Charakter existiert
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Das Inventar des Charakters abrufen
    const inventory = await esr.getInventoryItems(characterData._id);
    if (inventory && inventory.length > 0) {
        const inventoryList = inventory.map(item => `${item.quantity}x ${item.name}`).join(', ');
        rPlayer.notify.showNotification(`${fixName(characterName)}'s inventory: ${inventoryList}`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)}'s inventory is empty.`);
    }
});

// /hasItem Command: Überprüfen, ob ein Charakter ein bestimmtes Item hat
registerCommand('hasItem', 'Check if a character has a specific item', async (player, characterName, itemName, quantity) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
        rPlayer.notify.showNotification(`Invalid quantity specified.`);
        return;
    }

    // Überprüfen, ob das Item existiert
    const itemData = esr.itemRegistry.get(itemName);
    if (!itemData) {
        alt.logError(`[hasItem Command] Item "${itemName}" not found in registry.`);
        rPlayer.notify.showNotification(`Item "${itemName}" does not exist.`);
        return;
    }

    // Überprüfen, ob der Charakter existiert
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Überprüfen, ob der Charakter das Item hat
    const inventory = await esr.getInventoryItems(characterData._id);
    const item = inventory.find(i => i.name === itemName);
    if (item && item.quantity >= quantityNum) {
        rPlayer.notify.showNotification(`${fixName(characterName)} has enough ${itemName}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} does not have enough ${itemName}.`);
    }
});

registerCommand('useItem', 'Use an item from the inventory', async (player, characterName, itemId, quantity) => {

    try {
        const characterdocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        // Überprüfen, ob der Charakter existiert
        const characterExists = await esr.doesCharacterExist(characterData._id);
        if (!characterExists) {
            rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
            return;
        }

        // Charakterdaten abrufen

        if (!characterdocument) {
            rPlayer.notify.showNotification(`Character data for ${fixName(characterName)} not found.`);
            return;
        }



        // Item im Inventar des Charakters suchen
        const item = characterData.inventory.find(i => i.id === itemId);
        if (!item) {
            rPlayer.notify.showNotification(`Item with ID ${itemId} not found in inventory.`);
            return;
        }

        // Überprüfen, ob das Item verwendet werden kann
        const itemCallback = esr.itemCallbacks.get(item.name);
        if (!itemCallback) {
            rPlayer.notify.showNotification(`No use function registered for item ${item.name}.`);
            return;
        }

        // Item verwenden
        itemCallback(player, characterData._id, item, quantity);

        // Feedback an Spieler senden
        rPlayer.notify.showNotification(`${fixName(characterName)} used ${item.name}.`);

        
            // Item aus dem Inventar entfernen, wenn Menge <= 0
            
        

        
    } catch (error) {
        alt.logError(`Error in /useItem command for ${characterName}: ${error.message}`);
        //rPlayer.notify.showNotification(`An error occurred while using the item.`);
    }
});

