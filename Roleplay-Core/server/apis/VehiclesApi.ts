import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { useApi } from '@Server/api/index.js';
import { useVehicle } from '@Server/vehicle/index.js';
import * as Utility from '@Shared/utility/index.js';
import { config } from '@Plugins/Roleplay-Core/shared/config.js'; // Config importieren

import { useDatabase } from '@Server/database/index.js';
import { Vehicle as Vehicles } from 'alt-client';
import { Vehicle } from '@Shared/types/vehicle.js';

const db = useDatabase();



const Rebar = useRebar();
const { get, create, getMany, update } = Rebar.database.useDatabase();
const getter = Rebar.get.useVehicleGetter();

const vehicleRegistry = new Map<string, ReturnType<typeof Rebar.vehicle.useVehicle>>();






async function createVehicle(
    ownerId: string,
    model: string,
    pos: alt.Vector3 = new alt.Vector3(0, 0, 0),
    rot: alt.Vector3 = new alt.Vector3(0, 0, 0),
    dimension: number = 0,
    keys: string[] = [],
    fuel: number,
    numberPlateText: string,
    color: { primary: number; primaryCustom: alt.RGBA; secondary: number; secondaryCustom: alt.RGBA; wheel: number; pearl: number; xenon: number } = {
        primary: 0,
        primaryCustom: new alt.RGBA( 255, 255, 255, 255),
        secondary: 0,
        secondaryCustom: new alt.RGBA(255, 255, 255, 255),
        wheel: 0,
        pearl: 0,
        xenon: 0,
    },
    stateProps: { dirtLevel: number; lockState: number; engineHealth: number; engineOn: boolean; bodyHealth: number; lightState: number } = {
        dirtLevel: 0,
        lockState: 0,
        engineHealth: 1000,
        engineOn: false,
        bodyHealth: 1000,
        lightState: 0,
    },
    neon: { color: alt.RGBA; placement: { front: boolean; back: boolean; left: boolean; right: boolean } } = {
        color: new alt.RGBA(255, 255, 255, 255),
        placement: { front: false, back: false, left: false, right: false },
    },
) {
    const vehicleData: Vehicle = {
        owner: ownerId,
        model: model,
        pos: pos,
        rot: rot,
        dimension: dimension,
        keys: keys,
        fuel: fuel,
        color: color,
        stateProps: stateProps,
        neon: neon,
        numberPlateText: numberPlateText,
    };

    // Fahrzeug erstellen
    const rVehicle = Rebar.vehicle.useVehicle(new alt.Vehicle(model, pos, rot));
    const document = await rVehicle.create(ownerId);

    // Wenn das Dokument nicht erstellt werden konnte, abbrechen
    if (!document) {
        alt.logWarning(`Fahrzeug konnte nicht erstellt werden für Besitzer ${ownerId}`);
        return null;
    }

    

    // Dokumentdaten setzen
    document.color = vehicleData.color;
    document.neon = vehicleData.neon;   
    document.numberPlateText = vehicleData.numberPlateText;
    document.dimension = vehicleData.dimension;
    document.fuel = vehicleData.fuel;

    const vehicleDocument = Rebar.document.vehicle.useVehicle(rVehicle.vehicle);

    vehicleDocument.setBulk( {color: vehicleData.color, neon: vehicleData.neon, numberPlateText: vehicleData.numberPlateText, dimension: vehicleData.dimension, fuel: vehicleData.fuel});
    // Fahrzeugdaten anwenden
    rVehicle.apply(vehicleData);
    rVehicle.bind(vehicleData);
    

    // Fahrzeug im Fahrzeug-Register speichern
    vehicleRegistry.set(document._id, rVehicle);

    alt.log(`Fahrzeug erstellt: ID ${document._id}, Modell ${model}`);
    return document._id;
}



// Fahrzeug abrufen
function getVehicleById(id: string) {
    return vehicleRegistry.get(id) || null;
}

// Fahrzeug entfernen
async function deleteVehicle(id: string) {
    const rVehicle = vehicleRegistry.get(id);
    if (!rVehicle) {
        alt.logWarning(`Fahrzeug mit ID ${id} nicht gefunden.`);
        return false;
    }

    //await rVehicle.delete(); // Fahrzeug korrekt entfernen
    vehicleRegistry.delete(id);
    alt.log(`Fahrzeug entfernt: ID ${id}`);
    return true;
}

async function toggleVehicleLock(vehicleId: number): Promise<boolean | null> {
    alt.logWarning('Bum BUm'); // Debug-Log

    // Schritt 1: Abrufen des Fahrzeugs aus der DB mit dem Getter
    const document = getter.byAltvId(vehicleId);
    if (!document) {
        alt.logWarning(`Kein Fahrzeug-Dokument für ID ${vehicleId} gefunden.`);
        return null;
    }

    alt.log(`Fahrzeug mit ID ${vehicleId} wurde aus der Datenbank abgerufen.`);

    // Schritt 2: Fahrzeug aus dem Registry abrufen
    const rVehicle = Rebar.vehicle.useVehicle(document);
    if (!rVehicle) {
        alt.logWarning(`Fahrzeug mit ID ${vehicleId} konnte nicht aus dem Fahrzeug-Registry abgerufen werden.`);
        return null;
    }

    if (!rVehicle.vehicle || rVehicle.vehicle.destroyed == true) {
        alt.logWarning(`Fahrzeug mit ID ${vehicleId} ist nicht in einem gültigen Zustand.`);
        return null;
    }

    alt.log(`Fahrzeug mit ID ${vehicleId} aus dem Registry gefunden.`);

    // Schritt 3: Abrufen des aktuellen Lockstates aus dem Fahrzeug
    const currentLockState = rVehicle.vehicle.lockState;
    alt.log(`Aktueller Lockstate: ${currentLockState}`); // Debug-Log

    // Schritt 4: Lockstate umschalten
    alt.log(`Wechsle den Lockstate für Fahrzeug mit ID ${vehicleId}.`);
    rVehicle.toggleLock();

    // Nach dem Umschalten den neuen Zustand abrufen
    const newLockState = rVehicle.vehicle.lockState;
    const isLocked = newLockState === 2; // 2 = LOCKED

    alt.log(`Fahrzeug mit ID ${vehicleId} wurde ${isLocked ? 'gesperrt' : 'entsperrt'}.`);
    return isLocked;
}

// Fahrzeug reparieren
async function repairVehicle(id: string) {
    const rVehicle = vehicleRegistry.get(id);
    if (!rVehicle) return false;

    await rVehicle.repair();
    alt.log(`Fahrzeug mit ID ${id} repariert.`);
    return true;
}

// Fahrzeugposition aktualisieren
async function updateVehiclePosition(id: string, position: alt.Vector3) {
    const rVehicle = vehicleRegistry.get(id);
    if (!rVehicle) return false;

    rVehicle.vehicle.pos = position;
    alt.log(`Position von Fahrzeug ID ${id} aktualisiert.`);
    return true;
}



// Fahrzeugstatus abrufen
function getVehicleStatus(id: string) {
    const rVehicle = vehicleRegistry.get(id);
    if (!rVehicle) return null;
    

    return {
        
        id,
        model: rVehicle.vehicle.model,
        position: rVehicle.vehicle.pos,
        locked: rVehicle.vehicle?.lockState,
        health: rVehicle.vehicle?.engineHealth,
    };
}

// API exportieren
export function useVehiclesApi() {
    return {
        createVehicle,
        getVehicleById,
        deleteVehicle,
        toggleVehicleLock,
        repairVehicle,
        updateVehiclePosition,
        getVehicleStatus,
    };
}

declare global {
    export interface ServerPlugin {
        ['rebar-rp-vehicles-api']: ReturnType<typeof useVehiclesApi>;
    }
}

useApi().register('rebar-rp-vehicles-api', useVehiclesApi());



export function initfunc() {
    alt.log('Fahrzeug-API initialisiert.');
}

const Keybinder = Rebar.useKeybinder();
const vehicleLockKey = config.VehicleLockKey || 85; // Hole den Key aus der Konfig oder nutze Standardwert 85 (U)

// Registriere den Keybind
Keybinder.on(vehicleLockKey, async (player) => {
    const getter = Rebar.get.useVehicleGetter();
    const closestVehicle = getter.closestVehicle(player); // Nächstgelegenes Fahrzeug basierend auf Spielerposition
    const rPlayer = Rebar.usePlayer(player);

    if (!closestVehicle) {
        alt.logWarning(`Kein Fahrzeug in der Nähe von Spieler ${player.name} gefunden.`);
        rPlayer.notify.showNotification(`Kein Fahrzeug in der Nähe gefunden.`);
        return;
    }

    // Reichweitenprüfung: Ist das Fahrzeug innerhalb der Lock-Range?
    const distance = Utility.vector.distance(closestVehicle.pos, player.pos);
    if (distance > (config.Lockkeyrange || 15)) {
        alt.logWarning(
            `Fahrzeug ${closestVehicle.id} ist außerhalb der Reichweite (${distance.toFixed(2)}m > ${(config.Lockkeyrange || 15)}m).`
        );
        rPlayer.notify.showNotification(`Fahrzeug ${closestVehicle.id} ist außerhalb der Lock-Range.`);
        return;
    }

    // Fahrzeugdokument abrufen
    const document = getter.byAltvId(closestVehicle.id);
    const rVehicle = Rebar.vehicle.useVehicle(document);

    if (!document) {
        alt.logWarning(`Kein Fahrzeug-Dokument für Fahrzeug-ID ${closestVehicle.id} gefunden.`);
        return;
    }

    // Lockstate umschalten mit Fehlerbehandlung
    try {
        await rVehicle.toggleLockAsPlayer(player);
        alt.log(`[Keybind] Fahrzeug ${closestVehicle.id} wurde erfolgreich gesperrt/entsperrt.`);

        const notifylockstate = closestVehicle.lockState;
const lockStateText = notifylockstate === 2 ? 'gesperrt' : notifylockstate === 1 ? 'entsperrt' : 'unbekannt';

// Benachrichtigung anzeigen
rPlayer.notify.showNotification(`Fahrzeug ${closestVehicle.model} wurde erfolgreich ${lockStateText}.`);
    } catch (error) {
        alt.logError(
            `Fehler beim Sperren/Entsperren von Fahrzeug ${closestVehicle.numberPlateText} durch Spieler ${player.name}: ${error.message}`
        );
    }
});


//Test
/*


let isUpdatingVehicles = false;
let isUpdatingPlayers = false;

export async function initializeServerVehicles() {
    // Alle Fahrzeuge beim Serverstart laden und spawnen
    await loadVehicles();

    // Periodisches Aktualisieren von Spielern und Fahrzeugen
    alt.setInterval(updatePlayers, 5000);  // Alle 5 Sekunden Spieler aktualisieren
    alt.setInterval(updateVehicles, 5000);  // Alle 5 Sekunden Fahrzeuge aktualisieren
}


export async function spawnandupdatevehicles() {
    await loadVehicles();  // Alle Fahrzeuge beim Serverstart laden und spawnen
    alt.setInterval(updatePlayers, 5000);  // Alle 5 Sekunden Spieler aktualisieren
    alt.setInterval(updateVehicles, 5000);  // Alle 5 Sekunden Fahrzeuge aktualisieren
}

// Funktion zum Laden und Spawnen aller Fahrzeuge
async function loadVehicles() {
    try {
        const vehicles = await getAllVehiclesFromDB();  // Fahrzeugdaten aus der DB abrufen
        alt.log("Das sind die vehicles" + vehicles)

        // Alle Fahrzeuge spawnen
        vehicles.forEach(vehicleData => {
            spawnVehicle(vehicleData);  // Fahrzeug mit gespeicherten Daten spawnen
            alt.log(`Fahrzeug ${vehicleData._id} wurde erfolgreich gespawnt. mit dem Kennzeichen: ${vehicleData.numberPlateText}`);
        });
    } catch (error) {
        alt.logError(`Fehler beim Laden der Fahrzeuge: ${error.message}`);
    }
}

// Funktion zum Spawnen eines Fahrzeugs basierend auf den gespeicherten Daten
async function spawnVehicle(vehicleData) {
    try {
        // VehicleData vollständig loggen
        alt.log(`Vehicledata (komplett): ${JSON.stringify(vehicleData, null, 2)}`);

        // Überprüfen, ob die notwendigen Felder vorhanden sind
        if (!vehicleData || !vehicleData.pos || !vehicleData.rot) {
            throw new Error('Fehlende Position oder Rotation in den Fahrzeugdaten.');
        }

        const { model, pos, rot, ownerId } = vehicleData;

        // Standardwerte für Position und Rotation setzen, falls sie nicht vorhanden sind
        const position = pos || { x: 0, y: 0, z: 0 };
        const rotation = rot || { x: 0, y: 0, z: 0 };

        // Fahrzeug erstellen und auf der Karte spawnen
        const newVehicle = new alt.Vehicle(model, position.x, position.y, position.z, rotation.x, rotation.y, rotation.z);

        // Fahrzeug zur Registry oder einem anderen Tracking-System hinzufügen
        const vehicleDocument = Rebar.vehicle.useVehicle(newVehicle);

        await vehicleDocument.bind(vehicleData);
        await vehicleDocument.apply(vehicleData);

        // Erneutes vollständiges Logging nach Anwendung der Daten
        alt.log(`Vehicledata (nach Anwendung): ${JSON.stringify(vehicleData, null, 2)}`);

        alt.log(`Fahrzeug ${newVehicle.id} erfolgreich gespawnt.`, model, position.x, position.y, position.z, rotation.x, rotation.y, rotation.z);
    } catch (error) {
        alt.logError(`Fehler beim Spawnen des Fahrzeugs: ${error.message}`);
    }
}

async function getAllVehiclesFromDB() {
    try {
        // Abrufen aller Fahrzeugdaten aus der Datenbank
        const vehicles = await db.getAll('Vehicles');

        if (!vehicles || vehicles.length === 0) {
            throw new Error('Keine Fahrzeugdaten gefunden.');
        }

        alt.log('Fahrzeuge aus der DB:', vehicles);
        alt.log(`Fahrzeug aus der DB: ${JSON.stringify(vehicles)}`);

        // Fahrzeuge mit allen Attributen zurückgeben
        const enrichedVehicles = await Promise.all(
            vehicles.map(async (vehicle) => {
                const dbVehicle = await db.get<Vehicle>({ _id: vehicle._id }, 'Vehicles');
                if (!dbVehicle) {
                    alt.logWarning(`Kein Fahrzeug mit der ID ${vehicle._id} in der DB gefunden.`);
                    return null;
                }

                // Standardwerte
                const defaultVehicleData = {
                    pos: { x: 0, y: 0, z: 0 },
                    rot: { x: 0, y: 0, z: 0 },
                    numberPlateText: 'Admin',
                    dimension: 0,
                    keys: [],
                    fuel: 100,
                    color: {
                        primary: 0,
                        primaryCustom: new alt.RGBA(255, 255, 255, 255),
                        secondary: 0,
                        secondaryCustom: new alt.RGBA(255, 255, 255, 255),
                        wheel: 0,
                        pearl: 0,
                        xenon: 0,
                    },
                    stateProps: {
                        dirtLevel: 0,
                        lockState: 0,
                        engineHealth: 1000,
                        engineOn: false,
                        bodyHealth: 1000,
                        lightState: 0,
                    },
                    neon: {
                        color: new alt.RGBA(255, 255, 255, 255),
                        placement: { front: false, back: false, left: false, right: false },
                    },
                };

                // Attribute aus der Datenbank holen und mit Standardwerten überschreiben
                const enrichedVehicle = {
                    ...defaultVehicleData,
                    ...dbVehicle,
                    color: { ...defaultVehicleData.color, ...dbVehicle.color },
                    stateProps: { ...defaultVehicleData.stateProps, ...dbVehicle.stateProps },
                    neon: { ...defaultVehicleData.neon, ...dbVehicle.neon },
                };

                return {
                    _id: dbVehicle._id,
                    owner: dbVehicle.owner,
                    model: dbVehicle.model,
                    ...enrichedVehicle,
                };
            })
        );

        // Null-Werte filtern
        return enrichedVehicles.filter((vehicle) => vehicle !== null);
    } catch (error) {
        alt.logError(`Fehler beim Abrufen der Fahrzeuge: ${error.message}`);
        throw error;
    }
}








// Funktion zum regelmäßigen Speichern der Fahrzeugdaten (Position und Rotation)
function updateVehicles() {
    if (isUpdatingVehicles) {
        return;  // Verhindert, dass mehrere Updates gleichzeitig laufen
    }

    isUpdatingVehicles = true;

    for (let vehicle of alt.Vehicle.all) {
        if (!vehicle || !vehicle.valid) {
            continue;  // Überspringt ungültige oder nicht existierende Fahrzeuge
        }

        const document = Rebar.document.vehicle.useVehicle(vehicle);
        if (!document.get()) {
            continue;  // Wenn kein Dokument vorhanden, überspringen
        }

        // Fahrzeugdaten speichern
        const position = { x: vehicle.pos.x, y: vehicle.pos.y, z: vehicle.pos.z };
        const rotation = { x: vehicle.rot.x, y: vehicle.rot.y, z: vehicle.rot.z };
        Rebar.vehicle.useVehicle(vehicle).save();
        alt.log("")
    }

    isUpdatingVehicles = false;
}


// Funktion zum regelmäßigen Speichern der Spielerinformationen
function updatePlayers() {
    if (isUpdatingPlayers) {
        return;  // Verhindert, dass mehrere Updates gleichzeitig laufen
    }

    isUpdatingPlayers = true;

    for (let player of alt.Player.all) {
        if (!player.valid) {
            continue;  // Überspringt ungültige Spieler
        }

        const document = Rebar.document.character.useCharacter(player);
        if (!document.get()) {
            continue;  // Wenn kein Dokument vorhanden, überspringen
        }

        const ammo: { [key: string]: number } = {};
        for (let weapon of player.weapons) {
            ammo[weapon.hash] = player.getAmmo(weapon.hash);
        }

        //Rebar.player.useWeapon(player).saveAmmo(ammo);
        Rebar.player.useState(player).save();
    }

    isUpdatingPlayers = false;
} 
    */