import * as alt from 'alt-client';
import { useWebview } from '@Client/webview/index.js';
import { config } from '@Plugins/Roleplay-Core/shared/config.js'; // Config importieren



alt.on('keydown', (key) => {
    if (key === config.OpenInventorykey && config.UseInventory) { // Nur ausführen, wenn UseInventory true ist
        alt.log('Key triggered');

        const webview = useWebview();

        // Überprüfe, ob irgendeine Seite geöffnet ist
        const isAnyPageOpen = webview.isSpecificPageOpen('Chat');
        const isInventoryOpen = webview.isSpecificPageOpen('Inventory');
        
        alt.log(`isAnyPageOpen: ${isAnyPageOpen}, isInventoryOpen: ${isInventoryOpen}`);

        // Wenn eine andere Seite als Inventory geöffnet ist, nichts tun
        if (isAnyPageOpen && !isInventoryOpen) {
            alt.log('Another page is open, doing nothing.');
            return;
        }

        // Inventar öffnen oder schließen
        if (isInventoryOpen) {
            alt.log('Closing Inventory.');
            webview.hide('Inventory');
            alt.toggleGameControls(true);
        } else {
            alt.log('Opening Inventory.');
            alt.emitServer('updateinventorynow');
            webview.show('Inventory', 'page');
            alt.toggleGameControls(false);
        }
    }
});



let vehicleIntervalId = null; // Variable zum Speichern der Intervall-ID

alt.on('enteredVehicle', (vehicle, seat) => {
    
    try {
        // Falls ein vorheriges Intervall läuft, stoppen
        if (vehicleIntervalId !== null) {
            alt.clearInterval(vehicleIntervalId);
            vehicleIntervalId = null;
        }

        // Starten des Fahrzeugdaten-Intervalls
        vehicleIntervalId = alt.setInterval(() => {
            if (!vehicle || !vehicle.valid) {
                alt.clearInterval(vehicleIntervalId);
                vehicleIntervalId = null;
                return;
            }

            // Fahrzeugdaten erfassen
            const vehicleData = {
                id: vehicle.id,
                //fuel: vehicle.fuelLevel || 100, // Beispielwert, falls `fuelLevel` nicht verfügbar
                engineStatus: vehicle.engineOn,
                speed: vehicle.speed * 3.6,
                locked: vehicle.lockState,
            };

            // Fahrzeugdaten an den Server senden
            alt.emitServer('updateVehicleData', vehicle, vehicleData);
            useWebview().show('VehicleHud', 'persistent');
            
        }, 500); // Aktualisierung alle 500ms
    } catch (error) {
        alt.logError(`[CLIENT ERROR] Fehler im 'enteredVehicle'-Event: ${error.message}`);
    }
});

alt.on('leftVehicle', (vehicle, seat) => {
    try {
        // Intervall stoppen, falls aktiv
        if (vehicleIntervalId !== null) {
            alt.clearInterval(vehicleIntervalId);
            vehicleIntervalId = null;
        }

        // HUD ausblenden
        alt.emitServer('hideVehicleHud');
        useWebview().hide('VehicleHud');
    } catch (error) {
        alt.logError(`[CLIENT ERROR] Fehler im 'leftVehicle'-Event: ${error.message}`);
    }
});






