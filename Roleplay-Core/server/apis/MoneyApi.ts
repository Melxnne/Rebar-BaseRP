import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
import { useApi } from '@Server/api/index.js';
const getter = Rebar.get.usePlayerGetter();
const { get, create, getMany, update } = Rebar.database.useDatabase();






export const fixName = name => name.replace('_', ' ');




export function useRebarRP() {
    // Funktion zum Hinzufügen von Geld
     async function addMoney(characterid: string, amount: number, type: 'cash' | 'bank' | 'black_money'): Promise<void> {
        if (amount < 0) throw new Error("Betrag muss positiv sein.");
    
        console.log(`Adding ${amount} to ${type} for character ${characterid}`);
        let characterDocument = getter.byCharacter(characterid);
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
     async function removeMoney(characterid: string, amount: number, type: 'cash' | 'bank' | 'black_money'): Promise<void> {
        if (amount < 0) throw new Error("Betrag muss positiv sein.");
    
        console.log(`Removing ${amount} from ${type} for character ${characterid}`);
        let characterDocument = getter.byCharacter(characterid);
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
     function doesCharacterExist(characterid: string): boolean {
        try {
            const characterDocument = getter.byCharacter(characterid);
            const document = Rebar.document.character.useCharacter(characterDocument);
            const characterData = document.get();
            return characterData !== null && characterData !== undefined;
        } catch (error) {
            console.error(`Fehler beim Abrufen des Charakters ${characterid}:`, error);
            return false;
        }
    }

    // Funktion zum Abrufen von Charakterdaten
     async function getCharacterData(characterid: string) {
        let characterDocument = getter.byCharacter(characterid);

        if (!characterDocument) {
            throw new Error(`Character ${characterid} not found.`);
        }

        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();

        alt.log("Dies sind die Characterdaten: " + characterData);

        return characterData;
    }

    // Funktion zum Überprüfen, ob ein Charakter genug Geld hat
    async function hasCharacterEnough(
    characterid: string,
    amount: number,
    type: string
): Promise<boolean> {
    const amountNum = parseFloat(amount.toString());
    if (isNaN(amountNum) || amountNum <= 0) {
        return false; // Ungültige Menge
    }

    const characterExists = doesCharacterExist(characterid);
    if (!characterExists) {
        return false; // Charakter existiert nicht
    }

    const characterData = await getCharacterData(characterid);
    if (!characterData) {
        return false; // Charakterdaten konnten nicht abgerufen werden
    }

    switch (type) {
        case 'cash':
            return characterData.cash >= amountNum;
        case 'bank':
            return characterData.bank >= amountNum;
        case 'black_money':
            return characterData.black_money >= amountNum;
        default:
            return false; // Ungültiger Kontotyp
    }
}

    // Funktion zum Abrufen des Geldes
     async function getMoney(player: alt.Player, characterid: string, type: string): Promise<void> {
        const characterExists = doesCharacterExist(characterid);
        if (!characterExists) {
            alt.log(`Character ${fixName(characterid)} not found.`);
            return;
        }

        const characterData = await getCharacterData(characterid);
        const cash = characterData.cash ?? 0;
        const bank = characterData.bank ?? 0;
        const blackMoney = characterData.black_money ?? 0;

        switch (type.toLowerCase()) {
            case 'cash':
                alt.log(`${fixName(characterData.name)} has Cash: $${cash}`);
                break;
            case 'bank':
                alt.log(`${fixName(characterData.name)} has Bank: $${bank}`);
                break;
            case 'black_money':
                alt.log(`${fixName(characterData.name)} has Black Money: $${blackMoney}`);
                break;
            default:
                alt.log(`Invalid account type specified. Please use 'cash', 'bank', or 'black_money'.`);
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
