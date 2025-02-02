import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
const Rebar = useRebar();

const rPlayer = (player) => Rebar.usePlayer(player);

// Aktualisieren der HUD-Daten
export function updateHud(player, cash, bank, black_money, jobName, jobGrade) {
    alt.emit('hud:update', player, cash, bank, black_money, jobName, jobGrade);
}

alt.on('hud:update', (player, cash, bank, black_money, jobName, jobGrade) => {
    rPlayer(player).webview.emit('updateHUD', {
        type: 'update',
        player,
        cash,
        bank,
        black_money,
        jobName,
        jobGrade,
    });
});

export function initfunc() {
    alt.log('Player Handler is Called');
}