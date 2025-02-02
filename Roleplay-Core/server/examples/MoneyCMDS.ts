import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [moneyAPI] = await Promise.all([
    api.getAsync('rebar-rp-money-api')
]);

export function initfunc() {
    alt.log('Player Handler is Called');
}

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...moneyAPI };
const fixName = (name: string) => name.replace('_', ' ');

// Befehl zum Hinzufügen von Geld zu einem Charakter
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

// /addMoney Command: Geld zu einem Charakter hinzufügen
registerCommand('addMoney', 'Add money to a character', async (player, characterName, amount, type) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        rPlayer.notify.showNotification(`Invalid amount specified.`);
        return;
    }




    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        
        
        return;
    }

    // Geld zum Charakter hinzufügen
    await esr.addMoney(characterData._id, amountNum, type);
    rPlayer.notify.showNotification(`${fixName(characterName)} has received $${amountNum} as ${type}.`);
});

// /removeMoney Command: Geld von einem Charakter entfernen
registerCommand('removeMoney', 'Remove money from a character', async (player, characterName, amount, type) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        rPlayer.notify.showNotification(`Invalid amount specified.`);
        return;
    }

    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Geld vom Charakter abziehen
    await esr.removeMoney(characterData._id, amountNum, type);
    rPlayer.notify.showNotification(`${fixName(characterName)} has lost $${amountNum} from ${type}.`);
});

// /getMoney Command: Geld des Charakters abrufen
registerCommand('getMoney', 'Get the current money of a character', async (player, characterName) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Charakterdaten abrufen
   
    const cash = characterData.cash ?? 0;
    const bank = characterData.bank ?? 0;
    const blackMoney = characterData.black_money ?? 0;

    rPlayer.notify.showNotification(`${fixName(characterName)} has: Cash: $${cash}, Bank: $${bank}, Black Money: $${blackMoney}`);
});

// /hasCharacterEnough Command: Überprüfen, ob ein Charakter genug Geld hat
registerCommand('hasCharacterEnough', 'Check if a character has enough money', async (player, characterName, amount, type) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        rPlayer.notify.showNotification(`Invalid amount specified.`);
        return;
    }

    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }


    let hasEnough = false;

    switch (type) {
        case 'cash':
            hasEnough = characterData.cash >= amountNum;
            break;
        case 'bank':
            hasEnough = characterData.bank >= amountNum;
            break;
        case 'black_money':
            hasEnough = characterData.black_money >= amountNum;
            break;
        default:
            rPlayer.notify.showNotification(`Invalid account type specified.`);
            return;
    }

    if (hasEnough) {
        rPlayer.notify.showNotification(`${fixName(characterName)} has enough ${type}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} does not have enough ${type}.`);
    }
});