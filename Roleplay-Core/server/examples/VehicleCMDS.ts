import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [VehicleAPI, MoneyAPI] = await Promise.all([
    api.getAsync('rebar-rp-vehicles-api'),
    api.getAsync('rebar-rp-money-api'),
]);

export function initfunc() {
    alt.log('Player Handler is Called');
}

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...VehicleAPI, ...MoneyAPI};
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


//Vehicles APi test

// /createVehicle Command: Fahrzeug für einen Spieler spawnen und ihn hineinsetzen
registerCommand('createVehicle', 'Erstellt und spawnt ein Fahrzeug für einen Charakter', async (player, characterName, vehicleModel, numberplate) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    if (!characterName || !vehicleModel) {
        alt.log('Usage: /createVehicle [Character Name] [Vehicle Model]');
        return;
    }

    try {
        // Hier solltest du die Logik für das Abrufen von Charakterdaten anpassen.
        const character = await esr.getCharacterData(characterData._id);
        if (!character) {
            alt.log(`Character ${characterName} not found.`);
            return;
        }

        const spawnPosition = player.pos;
        const spawnRotation = new alt.Vector3(0, 0, 0);

        // Fahrzeug erstellen
// Fahrzeug erstellen
const vehicleId = await esr.createVehicle(
    character._id, 
    vehicleModel, 
    spawnPosition, 
    spawnRotation, 
    0, 
    [], 
    100, 
    numberplate, 
    {
        primary: 2,
        primaryCustom: new  alt.RGBA(255, 0, 0, 255),  // Beispiel für rot
        secondary: 2,
        secondaryCustom: new  alt.RGBA(255, 0, 0, 255),  // Beispiel für grün
        wheel: 2,
        pearl: 2,
        xenon: 1,
    }
);

if (!vehicleId) {
    alt.log('Fahrzeug konnte nicht erstellt werden.');
    return;
}

        const vehicle = esr.getVehicleById(vehicleId)?.vehicle;
        if (!vehicle) {
            alt.log('Fahrzeug konnte nicht gefunden werden.');
            return;
        }

        // Spieler ins Fahrzeug setzen
        player.setIntoVehicle(vehicle, 1); // 1 = Fahrerposition

        // Rückmeldung an den Spieler
        alt.log(`Fahrzeug ${vehicleModel} wurde erstellt und gespawnt. Fahrzeug-ID: ${vehicleId}`);
    } catch (error) {
        alt.logError(`Fehler beim Erstellen eines Fahrzeugs: ${error.message}`);
        alt.log('Es gab ein Problem beim Erstellen des Fahrzeugs. Bitte versuche es später erneut.');
    }
});

registerCommand('toggleVehicleLock', 'Sperrt oder entsperrt ein Fahrzeug', async (player, characterName, argument) => {
    alt.log(`Charaktername: ${characterName}, Argument: ${argument}`);

    const getter = Rebar.get.useVehicleGetter();
    const vehicle = getter.closestVehicle(player);

    if (!vehicle) {
        alt.logWarning(`Kein Fahrzeug in der Nähe von Spieler ${player.name} gefunden.`);
        return;
    }

    const distance = player.pos.distanceTo(vehicle.pos); // Beispiel für Distanzberechnung
    alt.log(`Nächstgelegenes Fahrzeug: ID ${vehicle.id}, Entfernung: ${distance.toFixed(2)}m`);

    const success = await esr.toggleVehicleLock(vehicle.id);
    if (success) {
        alt.log(`Fahrzeug ${vehicle.id} wurde gesperrt/entsperrt.`);
    } else {
        alt.log(`Fahrzeug ${vehicle.id} konnte nicht gefunden werden.`);
    }
});

registerCommand('repairVehicle', 'Repariert ein Fahrzeug', async (player, vehicleId, arg2) => {
    if (!vehicleId) {
        alt.log('Usage: /repairVehicle [Vehicle ID]');
        return;
    }

    const success = await esr.repairVehicle(vehicleId);
    if (success) {
        alt.log(`Fahrzeug ${vehicleId} wurde repariert.`);
    } else {
        alt.log(`Fahrzeug ${vehicleId} konnte nicht gefunden werden.`);
    }
});

registerCommand('deleteVehicle', 'Entfernt ein Fahrzeug', async (player, vehicleId) => {
    if (!vehicleId) {
        alt.log('Usage: /deleteVehicle [Vehicle ID]');
        return;
    }

    const success = await esr.deleteVehicle(vehicleId);
    if (success) {
        alt.log(`Fahrzeug ${vehicleId} wurde entfernt.`);
    } else {
        alt.log(`Fahrzeug ${vehicleId} konnte nicht gefunden werden.`);
    }
});

registerCommand('vehicleStatus', 'Zeigt den Status eines Fahrzeugs an', (player, vehicleId, arg) => {
    if (!vehicleId) {
        alt.log('Usage: /vehicleStatus [Vehicle ID]');
        return;
    }

    const status = esr.getVehicleStatus(vehicleId);
    if (!status) {
        alt.log(`Fahrzeug ${vehicleId} konnte nicht gefunden werden.`);
        return;
    }

    alt.log(`Status von Fahrzeug ${vehicleId}:\n` +
        `Modell: ${status.model}\n` +
        `Position: ${status.position}\n` +
        `Gesperrt: ${status.locked ? 'Ja' : 'Nein'}\n` +
        `Zustand: ${status.health}`);
});
