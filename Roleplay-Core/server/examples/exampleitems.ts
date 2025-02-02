import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [inventoryAPI, MoneyAPI, FoodAPI] = await Promise.all([
    api.getAsync('rebar-rp-inventory-api'),
    api.getAsync('rebar-rp-money-api'),
    api.getAsync('rebar-rp-food-water-api'),
]);

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...inventoryAPI, ...MoneyAPI, ...FoodAPI};
const fixName = (name: string) => name.replace('_', ' ');

export function initfunc() {
    alt.log('Player Handler is Called');
}


esr.registerItemUse(
    { id: 'item_health_kit', name: 'Health_Kit', description: 'Heals the player.', type: 'consumable', weight: 5, },
    (player, characterid, item, quantity) => {
        const characterdocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        alt.log(`${characterData.name} hat ${quantity} "${item.name}" benutzt.`);

        // Spieler heilen: jede Einheit heilt 50 HP
        const healAmount = 50 * quantity;
        player.health = Math.min(player.health + healAmount, 100);

        // Entferne die verwendete Menge des Items
        esr.removeInventoryItem(characterData._id, item.id, quantity);

        alt.log(`Player ${characterData.name} wurde um ${healAmount} geheilt.`);
    }
);

esr.registerItemUse(
    { id: 'moneybag', name: 'Geldsack', description: 'Hat halt geld nh', type: 'consumable', weight: 3, },
    (player, characterid, item, quantity) => {
        const characterdocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        alt.log(`${characterData.name} hat ${quantity} "${item.name}" benutzt.`);

        esr.addMoney(characterData._id, 100, 'cash');

        // Entferne die verwendete Menge des Items
        esr.removeInventoryItem(characterData._id, item.id, quantity);

        alt.log(`Player ${characterData.name} hat 100$ erhalten`);
    }
);

// Apfel-Item-Registrierung
esr.registerItemUse(
    { id: 'item_apple', name: 'Apfel', description: 'Ein frischer Apfel. Stellt etwas Nahrung wieder her.', type: 'consumable', weight: 1, },
    async (player, characterid, item, quantity) => {
        const characterdocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        alt.log(`${characterData.name} hat einen "${item.name}" gegessen.`);



        await esr.addFoodAndWater(characterData._id, 15 * quantity, 15 * quantity);

        // Entfernt das Apfel-Item nach dem Verzehr
        esr.removeInventoryItem(characterData._id, 'item_apple', quantity);

        alt.log(`Player ${characterData.name} hat einen Apfel gegessen und die Nahrung um 5 erhöht.`);

        rPlayer.notify.showNotification(`${fixName(characterData.name)} hat einen Apfel gegessen und die Nahrung um 5 erhöht.`);
    }
);

// Wasser-Item-Registrierung
esr.registerItemUse(
    { id: 'item_water', name: 'Wasser', description: 'Eine Flasche Wasser. Löscht den Durst.', type: 'consumable', weight: 1, },
    (player, characterid, item, quantity) => {
        const characterdocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        alt.log(`${characterData.name} hat "${item.name}" getrunken.`);

        // Kein direkter Effekt auf Gesundheit, könnte aber Durst auffüllen (wenn ein Durstsystem existiert)
        esr.removeInventoryItem(characterData._id, 'item_water', quantity);
        alt.log(`Player ${player.name} hat Wasser getrunken.`);
    }
);

// Brot-Item-Registrierung
esr.registerItemUse(
    { id: 'item_bread', name: 'Brot', description: 'Ein Stück Brot. Stillt den Hunger.', type: 'consumable', weight: 2, },
    (player, characterid, item, quantity) => {
        const characterdocument = getter.byCharacter(characterid);
        const document = Rebar.document.character.useCharacter(characterdocument);
        const characterData = document.get();
        const rPlayer = Rebar.usePlayer(characterdocument);
        alt.log(`${characterData._id} hat "${item.name}" gegessen.`);

        // Spieler moderat heilen (Beispiel: 20 HP, maximal bis 100 HP)
        player.health = Math.min(player.health + 20, 100);
        esr.removeInventoryItem(characterData._id, 'item_bread', quantity);
        alt.log(`Player ${characterData.name} hat Brot gegessen und wurde moderat geheilt.`);
    }
);