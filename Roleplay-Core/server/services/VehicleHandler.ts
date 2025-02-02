import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
const Rebar = useRebar();
import { config } from '@Plugins/Roleplay-Core/shared/config.js'; // Config importieren

declare module 'alt-server' {
    export interface Player {
        vehicleInterval?: number; // Optionale Eigenschaft hinzufügen
    }
}

import { Vehicle } from '@Shared/types/vehicle.js';

import { useDatabase } from '@Server/database/index.js';
const db = useDatabase();

// Variablen für regelmäßige Aktualisierungen
let isUpdatingVehicles = false;


// Event, wenn der Spieler in ein Fahrzeug einsteigt
alt.onClient('updateVehicleData', (player, vehicle, vehicleData) => {
    try {
        const { id, engineStatus, speed, locked } = vehicleData;

        const vehicledocument = Rebar.document.vehicle.useVehicle(vehicle);
        const vehicleget = vehicledocument.get();
        
        // Fahrzeugdaten protokollieren (optional)
        //alt.log(`[INFO] Fahrzeugdaten von Spieler ${player.name}: ID=${id}, Fuel=${vehicleget.fuel}, Engine=${engineStatus}, Speed=${speed}, Locked=${locked}`);

        // Fahrzeug-HUD aktualisieren
        if (config.UseVehicleHUD) {
            updateVehicleHud(player, vehicleget.fuel, engineStatus, speed, locked);
        }
    } catch (error) {
        alt.logError(`[SERVER ERROR] Fehler im 'updateVehicleData'-Handler: ${error.message}`);
    }
});

// Funktion zum regelmäßigen Spawnen und Aktualisieren von Fahrzeugen und Spielern
async function initializeServerVehicles() {
    // Alle Fahrzeuge beim Serverstart laden und spawnen
    await loadVehicles();

    alt.setInterval(updateVehicles, 5000);  // Alle 5 Sekunden Fahrzeuge aktualisieren
}

// Funktion zum Laden und Spawnen aller Fahrzeuge
async function loadVehicles() {
    try {
        const vehicles = await getAllVehiclesFromDB();  // Fahrzeugdaten aus der DB abrufen
        //alt.log("Das sind die vehicles" + vehicles);

        // Alle Fahrzeuge spawnen
        vehicles.forEach(vehicleData => {
            spawnVehicle(vehicleData);  // Fahrzeug mit gespeicherten Daten spawnen
            //alt.log(`Fahrzeug ${vehicleData._id} wurde erfolgreich gespawnt. mit dem Kennzeichen: ${vehicleData.numberPlateText}`);
        });
    } catch (error) {
        alt.logError(`Fehler beim Laden der Fahrzeuge: ${error.message}`);
    }
}

// Funktion zum Spawnen eines Fahrzeugs basierend auf den gespeicherten Daten
async function spawnVehicle(vehicleData) {
    try {
        // VehicleData vollständig loggen
        //alt.log(`Vehicledata (komplett): ${JSON.stringify(vehicleData, null, 2)}`);

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
       // alt.log(`Vehicledata (nach Anwendung): ${JSON.stringify(vehicleData, null, 2)}`);

        alt.log(`Fahrzeug ${newVehicle.id} erfolgreich gespawnt.`, model, position.x, position.y, position.z, rotation.x, rotation.y, rotation.z);
    } catch (error) {
        alt.logError(`Fehler beim Spawnen des Fahrzeugs: ${error.message}`);
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
    }

    isUpdatingVehicles = false;
}

// Funktion zum Aktualisieren des Fahrzeug-HUDs
function updateVehicleHud(player, fuel, engineStatus, speed, locked) {
    if (!player) {
        alt.logWarning(`Cannot update HUD for player: ${player.name}`);
        return;
    }

    const rPlayer = Rebar.usePlayer(player);
    // Werte an das Webview des Spielers senden
    rPlayer.webview.emit('updateVehicleHUD', {
        type: 'update',
        fuel: fuel,
        engineStatus: engineStatus ? 'An' : 'Aus',
        speed: Math.round(speed), // Geschwindigkeit runden
        locked: locked,
    });
}

// Funktion zum Abrufen aller Fahrzeugdaten aus der DB
async function getAllVehiclesFromDB() {
    try {
        const vehicles = await db.getAll('Vehicles');

        if (!vehicles || vehicles.length === 0) {
            throw new Error('Keine Fahrzeugdaten gefunden.');
        }

        //alt.log('Fahrzeuge aus der DB:', vehicles);

        const enrichedVehicles = await Promise.all(
            vehicles.map(async (vehicle) => {
                const dbVehicle = await db.get<Vehicle>({ _id: vehicle._id }, 'Vehicles');
                if (!dbVehicle) {
                    alt.logWarning(`Kein Fahrzeug mit der ID ${vehicle._id} in der DB gefunden.`);
                    return null;
                }

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

        return enrichedVehicles.filter((vehicle) => vehicle !== null);
    } catch (error) {
        alt.logError('Fehler beim Abrufen der Fahrzeugdaten:', error);
        return [];
    }
}

export function initfunc() {
    alt.log('Vehicle Handler is Called');
    initializeServerVehicles();
}
