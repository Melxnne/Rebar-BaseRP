import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import * as Utility from '@Shared/utility/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const getter = Rebar.get.usePlayerGetter();
import { useApi } from '@Server/api/index.js';
const { get, create, getMany, update } = Rebar.database.useDatabase();
const messenger = Rebar.messenger.useMessenger();

declare module '@Shared/types/character.js' {
    export interface Character {
        jobs?: { name: string; grade: number }[];  // Array von Jobnamen und Rangnummern
        black_money: number;
        health: number;
        armor: number;
        position: { x: number; y: number; z: number };
        inventory: Item[];  // inventory ist eine Liste von Item-Objekten
    }
}

// Job-Registry zur Speicherung von Jobs und deren Rängen
const jobRegistry = new Map<string, { name: string; ranks: { name: string, level: number }[] }>(); 

// Funktion zum Registrieren eines Jobs mit seinen Rängen
export function registerJob(jobName: string, ranks: { name: string, level: number }[]): void {
    jobRegistry.set(jobName, { name: jobName, ranks });
}

// Funktion zum Abrufen eines Jobs und seiner Ränge
export function getJob(jobName: string): { name: string; ranks: { name: string, level: number }[] } | undefined {
    return jobRegistry.get(jobName);
}

// Funktion zum Überprüfen, ob ein Job existiert
export function jobExists(jobName: string): boolean {
    return jobRegistry.has(jobName);
}

// Konfiguration: Gibt an, ob ein Spieler mehr als einen Job haben darf
const config = {
    doubleJobAllowed: false,  // Wenn auf false, kann der Spieler nur einen Job haben
    maxJobs: 2,               // Maximal 2 Jobs, wenn Double-Job erlaubt
};

// Funktion zum Zuweisen eines Jobs zu einem Charakter
async function assignJob(player: alt.Player, characterName: string, jobName: string, grade: number): Promise<void> {
    console.log(`Assigning job ${jobName} with grade ${grade} to ${characterName}`);

    let characterDocument = getter.byName(characterName);
    const document = Rebar.document.character.useCharacter(characterDocument);
    const characterData = document.get();

    if (!characterData) {
        alt.log(`Character ${fixName(characterName)} not found.`);
        return;
    }

    try {
        // Überprüfen, ob der Job im Registry existiert
        const job = jobRegistry.get(jobName);
        if (!job) {
            alt.log(`Job ${jobName} does not exist in the registry.`);
            return;
        }

        // Überprüfen, ob der angegebene grade für den Job gültig ist
        const validGrade = job.ranks.some(rank => rank.level === grade);
        if (!validGrade) {
            alt.log(`Invalid grade ${grade} for job ${jobName}.`);
            return;
        }

        // Konfiguration: Wenn Double-Job nicht erlaubt, entfernen wir den alten Job
        if (!config.doubleJobAllowed) {
            if (characterData.jobs && characterData.jobs.length > 0) {
                // Wenn der Charakter bereits einen Job hat, diesen ersetzen
                const existingJobIndex = characterData.jobs.findIndex(job => job.name === jobName);
                if (existingJobIndex !== -1) {
                    characterData.jobs[existingJobIndex] = { name: jobName, grade };  // Job ersetzen
                } else {
                    // Wenn kein Job mit diesem Namen vorhanden ist, fügen wir ihn hinzu
                    characterData.jobs = [{ name: jobName, grade }];
                }
            } else {
                // Falls noch kein Job existiert, fügen wir den neuen Job hinzu
                characterData.jobs = [{ name: jobName, grade }];
            }
        } else {
            // Wenn Double-Job erlaubt ist, können wir den Job einfach hinzufügen
            if (!characterData.jobs) {
                characterData.jobs = [];
            }
            const existingJob = characterData.jobs.find(job => job.name === jobName);
            if (existingJob) {
                existingJob.grade = grade; // Nur den Grad aktualisieren, wenn der Job bereits existiert
            } else {
                characterData.jobs.push({ name: jobName, grade });
            }
        }

        await document.set("jobs", characterData.jobs);
        await update({ _id: characterData._id, jobs: characterData.jobs }, 'Characters');
        console.log(`Job ${jobName} with grade ${grade} successfully assigned to ${characterName}`);
        alt.log(`Job ${jobName} has been assigned to ${fixName(characterName)} with grade ${grade}.`);

        // Aktualisiere das HUD mit den neuen Jobdaten
        const { jobName: updatedJobName, jobGradeName: updatedJobGradeName } = await getJobData(characterName);
        updateHud(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money, updatedJobName, updatedJobGradeName);
    } catch (error) {
        console.error(`Error assigning job: ${error.message}`);
    }
}

// Funktion zum Entfernen eines Jobs von einem Charakter
async function removeJob(player: alt.Player, characterName: string, jobName: string): Promise<void> {
    try {
        let characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        
        if (!characterData) {
            alt.log(`Character ${fixName(characterName)} not found.`);
            return;
        }
        
        // Job aus dem Array entfernen
        if (characterData.jobs) {
            characterData.jobs = characterData.jobs.filter(job => job.name !== jobName);
            await document.set("jobs", characterData.jobs);
            await update({ _id: characterData._id, jobs: characterData.jobs }, 'Characters');
            console.log(`Job ${jobName} has been removed from ${characterName}.`);
            alt.log(`Job ${jobName} has been removed from ${fixName(characterName)}.`);

            // Aktualisiere das HUD, falls der Job entfernt wurde
            const { jobName: updatedJobName, jobGradeName: updatedJobGradeName } = await getJobData(characterName);
            updateHud(player, characterData.cash ?? 0, characterData.bank ?? 0, characterData.black_money, updatedJobName, updatedJobGradeName);
        } else {
            alt.log(`No jobs found for ${fixName(characterName)}.`);
        }
    } catch (error) {
        console.error(`Error removing job for character ${characterName}:`, error);
    }
}

// Funktion zur Aktualisierung des HUDs
function updateHud(player: alt.Player, cash: number, bank: number, black_money: number, jobName: string, jobGrade: string) {
    alt.emit('hud:update', player, cash, bank, black_money, jobName, jobGrade);
}

// Funktion zum Überprüfen, ob ein Charakter einen bestimmten Job hat
async function doesCharacterHaveJob(characterName: string, jobName: string, grade: number): Promise<boolean> {
    try {
        let characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        
        if (!characterData || !characterData.jobs || characterData.jobs.length === 0) {
            alt.log(`Character ${fixName(characterName)} has no jobs.`);
            return false;
        }

        // Überprüfen, ob der Charakter den angegebenen Job und Rang hat
        const job = characterData.jobs.find(job => job.name === jobName && job.grade === grade);
        if (job) {
            return true;
        } else {
            alt.log(`Character ${fixName(characterName)} does not have the job ${jobName} with grade ${grade}.`);
            return false;
        }
    } catch (error) {
        console.error(`Error checking if character ${characterName} has job ${jobName} with grade ${grade}:`, error);
        return false;
    }
}

// Funktion zum Abrufen eines Jobs eines Charakters (inklusive Rang)
async function getCharacterJob(characterName: string): Promise<{ name: string; grade: number } | null> {
    try {
        let characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        
        if (!characterData || !characterData.jobs || characterData.jobs.length === 0) {
            alt.log(`No jobs found for character ${fixName(characterName)}.`);
            return null;
        }

        // Hier wird der Job des Charakters abgerufen, wenn er einen hat
        const job = characterData.jobs[0]; // Wenn es mehrere Jobs gibt, wird der erste Job verwendet
        return job ? { name: job.name, grade: job.grade } : null;
    } catch (error) {
        console.error(`Error getting job for character ${characterName}:`, error);
        return null;
    }
}

// Funktion zum Überprüfen, ob ein Charakter einen Job mit einem bestimmten Rang hat
async function doesCharacterHaveJobGrade(characterName: string, jobName: string, grade: number): Promise<boolean> {
    try {
        let characterDocument = getter.byName(characterName);
        const document = Rebar.document.character.useCharacter(characterDocument);
        const characterData = document.get();
        
        if (!characterData || !characterData.jobs) {
            alt.log(`Character ${fixName(characterName)} has no jobs.`);
            return false;
        }

        const job = characterData.jobs.find(job => job.name === jobName && job.grade === grade);
        return job !== undefined;
    } catch (error) {
        console.error(`Error checking job grade for character ${characterName}:`, error);
        return false;
    }
}

// Funktion zum Abrufen der Jobdaten
async function getJobData(characterName: string): Promise<{ jobName: string, jobGradeName: string }> {
    try {
        // Abrufen der Jobdaten des Spielers
        const jobData = await getCharacterJob(characterName);
        
        // Abrufen der Job-Registry für den Job des Spielers
        const job = jobRegistry.get(jobData.name);

        if (job) {
            // Suche nach dem Rangnamen anhand des Grades
            const jobRank = job.ranks.find(rank => rank.level === jobData.grade);
            const jobGradeName = jobRank ? jobRank.name : 'Unknown Rank'; // Falls der Rang nicht gefunden wird

            return { 
                jobName: jobData.name, 
                jobGradeName: jobGradeName 
            };
        } else {
            return { 
                jobName: 'Unemployed', 
                jobGradeName: 'N/A' 
            }; // Fallback, falls der Job nicht gefunden wird
        }
    } catch (error) {
        alt.logError(`Fehler beim Abrufen der Jobdaten für Spieler ${characterName}: ${error.message}`);
        return { 
            jobName: 'Unemployed', 
            jobGradeName: 'N/A' 
        }; // Standardwert im Fehlerfall
    }
}

// Funktion zur Formatierung des Charakternamens
const fixName = (name: string): string => name.replace('_', ' ');

// Register-API für globale Verwendung
export function useRebarRPJobs() {
    return {
        assignJob,
        getCharacterJob,
        doesCharacterHaveJob,
        doesCharacterHaveJobGrade,
        removeJob,
        registerJob,
        getJob,
        jobExists, 
        jobRegistry,
        getJobData
    };
}

// Register the API globally
declare global {
    export interface ServerPlugin {
        ['rebar-rp-job-api']: ReturnType<typeof useRebarRPJobs>;
    }
}

useApi().register('rebar-rp-job-api', useRebarRPJobs());

// Beispiel für das Erstellen eines Jobs
export function initfunc() {
    alt.log('Job API is Called');
}