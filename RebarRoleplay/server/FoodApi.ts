import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
import { useApi } from '@Server/api/index.js';
const getter = Rebar.get.usePlayerGetter();
const { get, create, getMany, update } = Rebar.database.useDatabase();
import { foodconfig } from '@Plugins/RebarRoleplay/shared/config.js'; // Config importieren

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


declare module '@Shared/types/character.js' {
    export interface Character {
        cash?: number;
        bank?: number;
        black_money: number;
        health: number;
        armor: number;
        position: { x: number; y: number; z: number };
        inventory: Item[];  // inventory ist eine Liste von Item-Objekten
        food?: number;
        water?: number;
    }
}



const updateCharacterData = async (characterDocument, food: number, water: number) => {
    const document = Rebar.document.character.useCharacter(characterDocument);
    const characterData = document.get();
    characterData.food = food;
    characterData.water = water;
    await document.set("food", food);
    await document.set("water", water);
    await update({ _id: characterData._id, food: food, water: water }, 'Characters');
    alt.log(`Character data updated: Food = ${food}, Water = ${water}`);
};




export function useFoodAPI() {

    // Funktion zum Abrufen der Food- und Water-Werte eines Charakters
    async function getCharacterFoodAndWater(characterName: string) {
        const characterDocument = getter.byName(characterName);
        if (!characterDocument) {
            alt.log(`Character ${characterName} not found.`);
            return null;
        }

        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        return { food: characterData.food ?? 0, water: characterData.water ?? 0 };
    }

    async function addFoodAndWater(characterName: string, foodAmount: number, waterAmount: number): Promise<void> {
        const characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
    
        // Berechnen, wie viel zugefügt werden soll
        let newFood: number;
        let newWater: number;
    
        // Berechnung für Food
        if (foodAmount === -1) {
            newFood = foodconfig.maxFood; // Wenn -1, dann auf Maximum setzen
        } else {
            newFood = characterData.food + foodAmount;
            newFood = Math.min(foodconfig.maxFood, Math.max(foodconfig.minFood, newFood)); // Sicherstellen, dass es innerhalb des Bereichs bleibt
        }
    
        // Berechnung für Water
        if (waterAmount === -1) {
            newWater = foodconfig.maxWater; // Wenn -1, dann auf Maximum setzen
        } else {
            newWater = characterData.water + waterAmount;
            newWater = Math.min(foodconfig.maxWater, Math.max(foodconfig.minWater, newWater)); // Sicherstellen, dass es innerhalb des Bereichs bleibt
        }
    
        alt.log(`Adding Food: ${foodAmount} and Water: ${waterAmount} to character: ${characterName}`);
        await updateCharacterData(characterDocument, newFood, newWater);
        updateFoodHud(characterDocument, newFood, newWater);
    }

    // Funktion zum Entfernen von Food und Water
    // Funktion zum Entfernen von Food und Water
async function removeFoodAndWater(characterName: string): Promise<void> {
    const characterDocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterDocument);
    const characterData = document.get();

    // Zufällige Auswahl von Food und Water Abnahmen
    const randomFoodDecrease = Math.floor(Math.random() * (foodconfig.foodDecreaseRange.max - foodconfig.foodDecreaseRange.min + 1)) + foodconfig.foodDecreaseRange.min;
    const randomWaterDecrease = Math.floor(Math.random() * (foodconfig.waterDecreaseRange.max - foodconfig.waterDecreaseRange.min + 1)) + foodconfig.waterDecreaseRange.min;

    let newFood = characterData.food - randomFoodDecrease;
    let newWater = characterData.water - randomWaterDecrease;

    // Verhindern, dass die Werte unter das Minimum fallen
    newFood = Math.max(foodconfig.minFood, newFood);
    newWater = Math.max(foodconfig.minWater, newWater);

    alt.log(`Removing ${randomFoodDecrease} Food and ${randomWaterDecrease} Water from character: ${characterName}`);
    await updateCharacterData(characterDocument, newFood, newWater);
    updateFoodHud(characterDocument, characterData.food ?? 100, characterData.water ?? 100);
}
    // Funktion, die alle 10 Minuten aufgerufen wird, um Food und Water zu reduzieren
    async function startFoodWaterTimer() {
        alt.setInterval(() => {
            alt.Player.all.forEach(player => {
                const document = Rebar.document.character.useCharacter(player);
                const characterData = document.get();
                
        
        
                removeFoodAndWater(characterData.name);
                updateFoodHud(player, characterData.food ?? 100, characterData.water ?? 100);
            });
        }, foodconfig.decreaseInterval);
    }

    // Funktion, die prüft, ob das Food und Water System aktiviert ist
    function isFoodWaterEnabled(): boolean {
        return foodconfig.useFood;
    }

    // Rückgabe der API-Methoden
    return {
        addFoodAndWater,
        removeFoodAndWater,
        getCharacterFoodAndWater,
        startFoodWaterTimer,
        isFoodWaterEnabled
    };
}

// Register the API globally
declare global {
    export interface ServerPlugin {
        ['rebar-rp-food-water-api']: ReturnType<typeof useFoodAPI>;
    }
}

useApi().register('rebar-rp-food-water-api', useFoodAPI());

// Beispiel für das Starten des Timers, der regelmäßig Food und Water reduziert
const foodWaterAPI = useFoodAPI();
if (foodWaterAPI.isFoodWaterEnabled()) {
    foodWaterAPI.startFoodWaterTimer();
}



export function initfunc() {
    alt.log('Food Api is Called');
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