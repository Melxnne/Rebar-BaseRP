import * as alt from 'alt-client';
import { useWebview } from '@Client/webview/index.js';
import { config } from '@Plugins/RebarRoleplay/shared/config.js'; // Config importieren

alt.on('keydown', (key) => {
    if (key === 113 && config.UseInventory) { // Nur ausführen, wenn UseInventory true ist
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

