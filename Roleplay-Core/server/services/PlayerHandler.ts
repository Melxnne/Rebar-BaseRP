import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { config } from '@Plugins/Roleplay-Core/shared/config.js';
import { updateHud } from '@Plugins/Roleplay-Core/server/services/PlayerHud.js';
import { updateFoodHud } from '@Plugins/Roleplay-Core/server/services/PlayerFoodHud.js';
import { updateInventory } from '@Plugins/Roleplay-Core/server/services/PlayerInventoryHud.js';
import { waitForCharacterData } from '@Plugins/Roleplay-Core/server/services/utlits.js';


const Rebar = useRebar();
const { update } = Rebar.database.useDatabase();
const api = Rebar.useApi();
let isUpdatingPlayers = false;

const [moneyAPI, inventoryAPI, JobApi, VehicleAPI] = await Promise.all([
    api.getAsync('rebar-rp-money-api'),
    api.getAsync('rebar-rp-inventory-api'), 
    api.getAsync('rebar-rp-job-api'),  
    api.getAsync('rebar-rp-vehicles-api'),
]);

alt.on('playerConnect', async (player) => {
    const characterData = await waitForCharacterData(player);

    if (characterData) {
        const rPlayer = Rebar.usePlayer(player);
        rPlayer.webview.hide('VehicleHud');

        if (config.UseHUD) {
            rPlayer.webview.show('Hud', 'persistent');
        }

        if (config.UseFoodHud) {
            rPlayer.webview.show('FoodHud', 'persistent');
            updateFoodHud(player, characterData.food ?? 100, characterData.water ?? 100);
        }

        const { jobName, jobGradeName } = await JobApi.getJobData(characterData._id);
        updateHud(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money, jobName, jobGradeName);

        if (characterData.inventory) {
            updateInventory(player, characterData.maxWeight, characterData.inventory);
        }
    }
});

alt.setInterval(async () => {
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
}, 5000);



export function initfunc() {
    alt.log('Player Handler is Called');
}