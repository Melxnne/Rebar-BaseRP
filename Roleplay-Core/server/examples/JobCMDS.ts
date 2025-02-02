import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [JobAPI, MoneyAPI] = await Promise.all([
    api.getAsync('rebar-rp-job-api'),
    api.getAsync('rebar-rp-money-api'),
]);

export function initfunc() {
    alt.log('Player Handler is Called');
}

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...JobAPI, ...MoneyAPI};
const fixName = (name: string) => name.replace('_', ' ');

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

// Job Commands: 

// /assignJob Command: Job einem Charakter zuweisen
registerCommand('assignJob', 'Assign a job to a character', async (player, characterName, jobName, grade) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);

    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum <= 0) {
        rPlayer.notify.showNotification(`Invalid grade specified.`);
        return;
    }

    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Job zuweisen
    await esr.assignJob(player, characterData._id, jobName, gradeNum);
    rPlayer.notify.showNotification(`${fixName(characterName)} has been assigned the job ${jobName} with grade ${gradeNum}.`);
});

// /removeJob Command: Job von einem Charakter entfernen
registerCommand('removeJob', 'Remove a job from a character', async (player, characterName, jobName) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Job entfernen
    await esr.removeJob(player, characterData._id, jobName);
    rPlayer.notify.showNotification(`${fixName(characterName)} has had the job ${jobName} removed.`);
});

// /getJob Command: Abrufen des Jobs eines Charakters
registerCommand('getJob', 'Get the current job of a character', async (player, characterName) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    // Job abrufen
    const job = await esr.getCharacterJob(characterData._id);
    if (job) {
        rPlayer.notify.showNotification(`${fixName(characterName)} currently has the job ${job.name} with grade ${job.grade}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} does not have a job assigned.`);
    }
});

// /hasJob Command: Überprüfen, ob ein Charakter einen bestimmten Job hat
registerCommand('hasJob', 'Check if a character has a specific job', async (player, characterName, jobName, grade) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum <= 0) {
        rPlayer.notify.showNotification(`Invalid grade specified.`);
        return;
    }

    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    const hasJob = await esr.doesCharacterHaveJob(characterData._id, jobName, gradeNum);
    if (hasJob) {
        rPlayer.notify.showNotification(`${fixName(characterName)} has the job ${jobName} with grade ${gradeNum}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} does not have the job ${jobName} with grade ${gradeNum}.`);
    }
});

// /hasJobGrade Command: Überprüfen, ob ein Charakter einen Job mit einem bestimmten Rang hat
registerCommand('hasJobGrade', 'Check if a character has a job with a specific grade', async (player, characterName, jobName, grade) => {
    const characterdocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterdocument);
    const characterData = document.get();
    const rPlayer = Rebar.usePlayer(characterdocument);
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum <= 0) {
        rPlayer.notify.showNotification(`Invalid grade specified.`);
        return;
    }

    const characterExists = await esr.doesCharacterExist(characterData._id);
    if (!characterExists) {
        rPlayer.notify.showNotification(`Character ${fixName(characterName)} not found.`);
        return;
    }

    const hasJobGrade = await esr.doesCharacterHaveJobGrade(characterData._id, jobName, gradeNum);
    if (hasJobGrade) {
        rPlayer.notify.showNotification(`${fixName(characterName)} has the job ${jobName} with grade ${gradeNum}.`);
    } else {
        rPlayer.notify.showNotification(`${fixName(characterName)} does not have the job ${jobName} with grade ${gradeNum}.`);
    }
});

