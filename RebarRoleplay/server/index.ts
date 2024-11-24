import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { Character } from '@Shared/types/character.js';
import * as Utility from '@Shared/utility/index.js';
import { Db } from 'mongodb';
import * as MoneyApi from '@Plugins/RebarRoleplay/server/MoneyApi.js';
import * as InventoryApi from '@Plugins/RebarRoleplay/server/InventoryApi.js';
import * as RPJobApi from '@Plugins/RebarRoleplay/server/JobApi.js'; // Importiere JobApi
import * as RPFoodApi from '@Plugins/RebarRoleplay/server/FoodApi.js'; // Importiere FoodApi
import * as RPVehiclesApi from '@Plugins/RebarRoleplay/server/VehiclesApi.js'; // Importiere FoodApi
import { config } from '@Plugins/RebarRoleplay/shared/config.js'; // Config importieren
import { useVehicle } from '@Server/vehicle/index.js';




MoneyApi.initfunc();
RPFoodApi.initfunc();
InventoryApi.initfunc();
RPJobApi.initfunc();
RPVehiclesApi.initfunc();

const Rebar = useRebar();
const { get, create, getMany, update } = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();
let isUpdatingPlayers = false;

const api = Rebar.useApi();
// Hole beide APIs
const [moneyAPI, inventoryAPI, JobApi] = await Promise.all([
    api.getAsync('rebar-rp-money-api'),
    api.getAsync('rebar-rp-inventory-api'), 
    api.getAsync('rebar-rp-job-api')  
]);

// Kombiniere alle Funktionen beider APIs in ein einzelnes Objekt
const esr = {
    ...moneyAPI,
    ...inventoryAPI,
    ...JobApi
};

// Event-Handler für Spieler-Spawn
alt.on('playerSpawn', async (player: alt.Player) => {
    const characterData = await waitForCharacterData(player);
    
    if (characterData) {
        // Überprüfen, ob UseSaveCharacterService aktiv ist
        if (config.UseSaveCharacterService) {
            // Spielerposition und Statusdaten setzen
            // Intervall zur Aktualisierung der Spieler-Daten
            alt.setInterval(updatePlayers, 5000);
            if (characterData.position) {
                player.pos = new alt.Vector3(characterData.position.x, characterData.position.y, characterData.position.z);
            }
            
            if (characterData.health) {
                player.health = characterData.health;
            }
            if (characterData.armor) {
                player.armour = characterData.armor;
            }

            // Jobdaten abrufen
            const { jobName, jobGradeName } = await esr.getJobData(characterData.name);

            // Aktualisieren der HUD-Daten für den Charakter
            updateHud(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money, jobName, jobGradeName);
        }
    }
});

async function updatePlayers() {
    if (isUpdatingPlayers) {
        return;
    }

    isUpdatingPlayers = true;

    for (const player of alt.Player.all) {
        if (!player.valid) {
            continue;
        }

        const document = Rebar.document.character.useCharacter(player);
        const characterData = document.get();

        if (!characterData || !characterData._id) {
            alt.logWarning(`Keine Charakterdaten für Spieler ${player.id} gefunden.`);
            continue;
        }

        const _id = characterData._id;
        const newHealth = player.health;
        const newArmor = player.armour;
        const newPosition = { x: player.pos.x, y: player.pos.y, z: player.pos.z };

        try {
            const didUpdate = await update(
                { _id, health: newHealth, armor: newArmor, position: newPosition },
                'Characters'
            );

            if (didUpdate) {
                //alt.log(`Charakter ${characterData.name} - Gesundheit: ${newHealth}, Rüstung: ${newArmor}, Position: ${JSON.stringify(newPosition)} erfolgreich aktualisiert.`);
                //let characterDocument2 = getter.byName("Jong_Pong"); // Verwendung von getter.byName
                //const document2 = Rebar.document.character.useCharacter(characterDocument2);
               // const characterData2 = document2.get();
                //alt.log('charakter:' + characterData2._id)
                //updateMoney(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money);
            } else {
                alt.logWarning(`Fehler beim Aktualisieren der Daten für Spieler ${player.id}.`);
            }
        } catch (error) {
            alt.logError(`Fehler beim Speichern der Daten für Spieler ${player.id}: ${error.message}`);
        }
    }

    isUpdatingPlayers = false;
}



// Event-Handler für Spieler-Connect
alt.on('playerConnect', async (player) => {
    const characterData = await waitForCharacterData(player);

    if (characterData) {
        const rPlayer = Rebar.usePlayer(player);

        // HUD nur anzeigen, wenn UseHUD true ist
        if (config.UseHUD) {
            rPlayer.webview.show('Hud', 'persistent');
        }

        rPlayer.webview.show('VehicleHud', 'persistent');

        // Food HUD nur anzeigen, wenn UseFoodHud true ist
        if (config.UseFoodHud) {
            // Initialisiere das Food HUD (Nahrungs- und Wasserwerte)
            rPlayer.webview.show('FoodHud', 'persistent');
            updateFoodHud(player, characterData.food ?? 100, characterData.water ?? 100);
            //alt.log("Food geupdatet mit" + characterData.food);
        }

        // Jobdaten abrufen
        const { jobName, jobGradeName } = await esr.getJobData(characterData.name);

        // Aktualisieren der Geldwerte im HUD
        updateHud(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money, jobName, jobGradeName);

        // Überprüfen, ob Inventardaten vorhanden sind und die Inventardaten senden
        if (characterData.inventory) {
            updateInventory(player, characterData.inventory);
        }
    }
});
alt.onClient('updateinventorynow', async (player) => {
    try {
        const characterData = await waitForCharacterData(player);

        if (!characterData) {
            console.error(`Character data not found for player: ${player.name}`);
            return;
        }

        
        // Überprüfen, ob Inventardaten vorhanden sind und die Inventardaten senden
        if (characterData.inventory && Array.isArray(characterData.inventory)) {
            updateInventory(player, characterData.inventory);
        } else {
            console.warn(`No inventory data found for player: ${player.name}`);
        }
    } catch (error) {
        console.error(`Error in 'updateinventorynow':`, error);
    }
});





// Event, um die HUD-Daten zu aktualisieren
alt.on('hud:update', (player: alt.Player, cash: number, bank: number, black_money: number, jobName: string, jobGrade: string) => {
    const rPlayer = Rebar.usePlayer(player);
    rPlayer.webview.emit('updateHUD', {
        type: 'update',
        player,
        cash,
        bank,
        black_money,
        jobName,
        jobGrade,
    });
});

// Beispiel für das Aktualisieren der HUD-Daten
function updateHud(player: alt.Player, cash: number, bank: number, black_money: number, jobName: string, jobGrade: string) {
    alt.emit('hud:update', player, cash, bank, black_money, jobName, jobGrade);
}

// Event, um die HUD-Daten für Nahrung und Wasser zu aktualisieren
alt.on('hud:updateFood', (player: alt.Player, food: number, water: number) => {
    const rPlayer = Rebar.usePlayer(player);
    rPlayer.webview.emit('updateFoodHud', {
        type: 'update',
        player,
        food,
        water,
    });
});

// Beispiel für das Aktualisieren der Nahrungs- und Wasserwerte im HUD
function updateFoodHud(player: alt.Player, food: number, water: number) {
    alt.emit('hud:updateFood', player, food, water);
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









// Funktion zum Abrufen der Charakterdaten
async function waitForCharacterData(player: alt.Player): Promise<Character | null> {
    const document = Rebar.document.character.useCharacter(player);
    let characterData = document.get();

    while (!characterData || !characterData._id) {
        await wait(100);
        characterData = document.get();
    }

    return characterData;
}

// Hilfsfunktion zum Warten (Wait)
function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Inventory Handling 

// Funktion zur Nutzung eines Items
function useItemHandler(player, { itemId, amount }) {
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
        callback(player, character.name, item, amount); // Menge an den Callback übergeben
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
    esr.addInventoryItem(target.name, item.id, item.quantity); // Item zum Inventar des Ziels hinzufügen
    character.inventory.splice(itemIndex, 1); // Entfernen aus dem Inventar des Gebers
    updateInventory(player, character.inventory); // Inventar des Gebers aktualisieren

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

    esr.removeInventoryItem(character.name, item.id, amount); // Item zum Inventar des Ziels hinzufügen

    // Reduziere die Menge des Items im Inventar
    item.quantity -= amount;
    if (item.quantity <= 0) {
        character.inventory.splice(itemIndex, 1); // Entferne das Item, wenn keine Menge mehr übrig ist
    }

    updateInventory(player, character.inventory); // Inventar des Spielers aktualisieren

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


// Event, wenn der Spieler in ein Fahrzeug einsteigt
alt.on('playerEnteredVehicle', async (player, vehicle, seat) => {
    alt.log("Player entered vehicle");

    // Charakterdaten abrufen
    const characterData = await waitForCharacterData(player);
    if (!characterData) {
        alt.logWarning(`Character data not found for player: ${player.name}`);
        return;
    }

    const rPlayer = Rebar.usePlayer(player);
    const vehicleGetter = Rebar.get.useVehicleGetter();
    

    const document = vehicleGetter.byAltvId(vehicle.id);
    if (!document) {
        alt.logWarning(`Vehicle data not found for vehicle ID: ${vehicle.id}`);
        return;
    }

    const rVehicle = Rebar.vehicle.useVehicle(document);

    // Fahrzeugdaten initial abrufen
    const fuel = rVehicle.vehicle.fuel ?? 100;
    const engineStatus = rVehicle.vehicle.engineStatus ?? false;
    const speed = rVehicle.vehicle.speed ?? 0;
    const locked = rVehicle.vehicle.lockState ?? false;
    const health = rVehicle.vehicle.health ?? 1000;

    // Fahrzeug-HUD anzeigen, falls aktiviert
    if (config.UseVehicleHUD) {
        rPlayer.webview.show('VehicleHud', 'persistent');

        // Fahrzeugstatus initial im HUD aktualisieren
        updateVehicleHud(player, fuel, engineStatus, speed, locked, health);

        // Fahrzeugdaten in regelmäßigen Abständen aktualisieren
        player.vehicleInterval = alt.setInterval(() => {
            if (!player || !player.valid || !player.vehicle) {
                // Intervall stoppen, wenn Spieler oder Fahrzeug nicht mehr gültig sind
                alt.clearInterval(player.vehicleInterval);
                delete player.vehicleInterval;
                return;
            }

            // Aktualisierte Fahrzeugdaten abrufen
            const updatedFuel = vehicle.fuel ?? 100;
            const updatedEngineStatus = vehicle.engineStatus ?? false;
            const updatedSpeed = vehicle.speed ?? 0;
            const updatedLocked = vehicle.lockState ?? false;
            const updatedHealth = vehicle.health ?? 1000;

            // HUD aktualisieren
            updateVehicleHud(player, updatedFuel, updatedEngineStatus, updatedSpeed, updatedLocked, updatedHealth);
        }, 500); // Aktualisierung alle 500ms
    }
});

// Event, wenn der Spieler ein Fahrzeug verlässt
alt.on('playerLeaveVehicle', (player, vehicle, seat) => {
    const rPlayer = Rebar.usePlayer(player);

    // Fahrzeug-HUD ausblenden
    if (config.UseVehicleHUD) {
        rPlayer.webview.emit('hideVehicleHud');
    }

    // Fahrzeug-Update-Intervall stoppen
    if (player.vehicleInterval) {
        alt.clearInterval(player.vehicleInterval);
        delete player.vehicleInterval;
    }
});

// Funktion zum Aktualisieren des Fahrzeug-HUDs
function updateVehicleHud(player, fuel, engineStatus, speed, locked, health) {
    if (!player || !player.webview) {
        alt.logWarning(`Cannot update HUD for player: ${player.name}`);
        return;
    }

    // Werte an das Webview des Spielers senden
    player.webview.emit('updateVehicleHud', {
        type: 'update',
        fuel,
        engineStatus: engineStatus ? 'An' : 'Aus',
        speed: Math.round(speed), // Geschwindigkeit runden
        locked: locked ? 'Ja' : 'Nein',
        health
    });
}






