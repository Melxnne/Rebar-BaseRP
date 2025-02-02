import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();
const messenger = Rebar.messenger.useMessenger();
const api = Rebar.useApi();




const [JobAPI] = await Promise.all([
    api.getAsync('rebar-rp-job-api'),

]);

export function initfunc() {
    alt.log('Player Handler is Called');
}

// Kombiniere nur die Funktionen von moneyAPI in esr
const esr = { ...JobAPI};
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

// Beispiel Job: Police Officer
esr.registerJob('police', [
    { name: 'Cadet', level: 1 },
    { name: 'Officer', level: 2 },
    { name: 'Sergeant', level: 3 },
    { name: 'Lieutenant', level: 4 },
    { name: 'Captain', level: 5 }
]);

// Beispiel Job: Medic
esr.registerJob('medic', [
    { name: 'Paramedic', level: 1 },
    { name: 'Medic', level: 2 },
    { name: 'Senior Medic', level: 3 }
]);