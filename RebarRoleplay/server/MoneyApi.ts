import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
import { useApi } from '@Server/api/index.js';
const getter = Rebar.get.usePlayerGetter();
const { get, create, getMany, update } = Rebar.database.useDatabase();


const messenger = Rebar.messenger.useMessenger();

const CHAT_DISTANCE = 10;
const CHAT_DISTANCES = {
    normal: CHAT_DISTANCE,
    low: CHAT_DISTANCE * 0.5,
    shout: CHAT_DISTANCE * 1.5,
    megaphone: CHAT_DISTANCE * 2
};

const sendMessageToNearbyPlayers = (player, message, distance = CHAT_DISTANCE) => {
    alt.Player.all.forEach(target => {
        if (target.valid && Utility.vector.distance2d(player.pos, target.pos) <= distance) {
            messenger.message.send(target, { type: 'player', content: message, author: player.name });
        }
    });
};

export const fixName = name => name.replace('_', ' ');

const registerCommand = (name, desc, callback, distanceType = 'normal') => {
    messenger.commands.register({
        name,
        desc,
        callback: async (player, ...args) => {
            if (args.length < 2) return; // Mindestens 2 Argumente erforderlich
            await callback(player, ...args);
        }
    });
};


export function useRebarRP() {
    // Funktion zum Hinzufügen von Geld
     async function addMoney(characterName: string, amount: number, type: 'cash' | 'bank' | 'black_money'): Promise<void> {
        if (amount < 0) throw new Error("Betrag muss positiv sein.");
    
        console.log(`Adding ${amount} to ${type} for character ${characterName}`);
        let characterDocument = getter.byName(characterName); // Verwendung von getter.byName
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        alt.log("Dies sind Characterdaten: " + characterData);
    
        const filter = { _id: characterData._id }; // Sicherstellen, dass die _id korrekt gesetzt ist
    
        // Geldbetrag aktualisieren und direkt in der Datenbank aktualisieren
        try {
            let newAmount: number;
    
            switch (type) {
                case 'cash':
                    newAmount = characterData.cash + amount;
                    characterData.cash = newAmount;
                    await document.set("cash", newAmount);
                    await update({ _id: characterData._id, cash: newAmount }, 'Characters');
                    break;
                case 'bank':
                    newAmount = characterData.bank + amount;
                    characterData.bank = newAmount;
                    await document.set("bank", newAmount);
                    await update({ _id: characterData._id, bank: newAmount }, 'Characters');
                    break;
                case 'black_money':
                    newAmount = characterData.black_money + amount;
                    characterData.black_money = newAmount;
                    await document.set("black_money", newAmount);
                    await update({ _id: characterData._id, black_money: newAmount }, 'Characters');
                    break;
                default:
                    throw new Error("Ungültiger Geldtyp.");
            }
    
            updateMoney(characterDocument, characterData.cash, characterData.bank, characterData.black_money);
            console.log(`Geld erfolgreich in der Datenbank aktualisiert: ${type} = ${newAmount}`);
        } catch (error) {
            console.error(`Fehler beim Aktualisieren des Charakters in der Datenbank: ${error.message}`);
        }
    }
    
    // Funktion zum Abziehen von Geld
     async function removeMoney(characterName: string, amount: number, type: 'cash' | 'bank' | 'black_money'): Promise<void> {
        if (amount < 0) throw new Error("Betrag muss positiv sein.");
    
        console.log(`Removing ${amount} from ${type} for character ${characterName}`);
        let characterDocument = getter.byName(characterName); // Verwendung von getter.byName
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
    
        const filter = { _id: characterData._id }; // Sicherstellen, dass die _id korrekt gesetzt ist
    
        // Geldbetrag aktualisieren und direkt in der Datenbank aktualisieren
        try {
            let newAmount: number;
    
            switch (type) {
                case 'cash':
                    if (characterData.cash < amount) throw new Error("Nicht genügend Bargeld.");
                    newAmount = characterData.cash - amount;
                    characterData.cash = newAmount;
                    await document.set("cash", newAmount);
                    await update({ _id: characterData._id, cash: newAmount }, 'Characters');
                    break;
                case 'bank':
                    if (characterData.bank < amount) throw new Error("Nicht genügend Bankguthaben.");
                    newAmount = characterData.bank - amount;
                    characterData.bank = newAmount;
                    await document.set("bank", newAmount);
                    await update({ _id: characterData._id, bank: newAmount }, 'Characters');
                    break;
                case 'black_money':
                    if (characterData.black_money < amount) throw new Error("Nicht genügend Schwarzgeld.");
                    newAmount = characterData.black_money - amount;
                    characterData.black_money = newAmount;
                    await document.set("black_money", newAmount);
                    await update({ _id: characterData._id, black_money: newAmount }, 'Characters');
                    break;
                default:
                    throw new Error("Ungültiger Geldtyp.");
            }
    
            updateMoney(characterDocument, characterData.cash, characterData.bank, characterData.black_money);
            console.log(`Geld erfolgreich aus der Datenbank entfernt: ${type} = ${newAmount}`);
        } catch (error) {
            console.error(`Fehler beim Aktualisieren des Charakters in der Datenbank: ${error.message}`);
        }
    }

    // Funktion zum Überprüfen, ob ein Charakter existiert
     function doesCharacterExist(characterName: string): boolean {
        try {
            const characterDocument = getter.byName(characterName);
            const document = Rebar.document.character.useCharacter(characterDocument);
            const characterData = document.get();
            return characterData !== null && characterData !== undefined;
        } catch (error) {
            console.error(`Fehler beim Abrufen des Charakters ${characterName}:`, error);
            return false;
        }
    }

    // Funktion zum Abrufen von Charakterdaten
     async function getCharacterData(characterName: string) {
        const characterDocument = getter.byName(characterName);

        if (!characterDocument) {
            throw new Error(`Character ${characterName} not found.`);
        }

        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        alt.log("Dies sind die Characterdaten: " + characterData);

        return characterData;
    }

    // Funktion zum Überprüfen, ob ein Charakter genug Geld hat
     async function hasCharacterEnough(player: alt.Player, characterName: string, amount: number, type: string): Promise<void> {
        const amountNum = parseFloat(amount.toString());
        if (isNaN(amountNum) || amountNum <= 0) {
            sendMessageToNearbyPlayers(player, `Invalid amount specified.`, CHAT_DISTANCES.normal);
            return;
        }

        const characterExists = doesCharacterExist(characterName);
        if (!characterExists) {
            sendMessageToNearbyPlayers(player, `Character ${fixName(characterName)} not found.`, CHAT_DISTANCES.normal);
            return;
        }

        const characterData = await getCharacterData(characterName);
        alt.log("Charakterdaten:", characterData);
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
                sendMessageToNearbyPlayers(player, `Invalid account type specified.`, CHAT_DISTANCES.normal);
                return;
        }

        if (hasEnough) {
            sendMessageToNearbyPlayers(player, `${fixName(characterName)} has enough ${type}.`, CHAT_DISTANCES.normal);
        } else {
            sendMessageToNearbyPlayers(player, `${fixName(characterName)} does not have enough ${type}.`, CHAT_DISTANCES.normal);
        }
    }

    // Funktion zum Abrufen des Geldes
     async function getMoney(player: alt.Player, characterName: string, type: string): Promise<void> {
        const characterExists = doesCharacterExist(characterName);
        if (!characterExists) {
            sendMessageToNearbyPlayers(player, `Character ${fixName(characterName)} not found.`, CHAT_DISTANCES.normal);
            return;
        }

        const characterData = await getCharacterData(characterName);
        const cash = characterData.cash ?? 0;
        const bank = characterData.bank ?? 0;
        const blackMoney = characterData.black_money ?? 0;

        switch (type.toLowerCase()) {
            case 'cash':
                sendMessageToNearbyPlayers(player, `${fixName(characterName)} has Cash: $${cash}`, CHAT_DISTANCES.normal);
                break;
            case 'bank':
                sendMessageToNearbyPlayers(player, `${fixName(characterName)} has Bank: $${bank}`, CHAT_DISTANCES.normal);
                break;
            case 'black_money':
                sendMessageToNearbyPlayers(player, `${fixName(characterName)} has Black Money: $${blackMoney}`, CHAT_DISTANCES.normal);
                break;
            default:
                sendMessageToNearbyPlayers(player, `Invalid account type specified. Please use 'cash', 'bank', or 'black_money'.`, CHAT_DISTANCES.normal);
                break;
        }
    }

    // Rückgabe der API-Methoden
    return {
        addMoney,
        removeMoney,
        doesCharacterExist,
        getCharacterData,
        hasCharacterEnough,
        getMoney
    };
}

// Register the API globally
declare global {
    export interface ServerPlugin {
        ['rebar-rp-money-api']: ReturnType<typeof useRebarRP>;
    }
}

useApi().register('rebar-rp-money-api', useRebarRP());


// Event, um die Geldwerte zu aktualisieren
alt.on('money:update', (player, cash, bank, black_money) => {
    const rPlayer = Rebar.usePlayer(player);
    rPlayer.webview.emit('updateHUD', {
        type: 'update',
        player,
        cash,
        bank,
        black_money,
    });
});

// Beispiel für das Aktualisieren der Geldwerte
function updateMoney(player: alt.Player, cash: number, bank: number, black_money: number) {
    alt.emit('money:update', player, cash, bank, black_money);
}

export function initfunc() {
    alt.log('Money Api is Called');
}
