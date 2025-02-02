import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
const Rebar = useRebar()

const rPlayer = (player) => Rebar.usePlayer(player);

// Aktualisieren der Food-HUD-Daten
export function updateFoodHud(player, food, water) {
    alt.emit('hud:updateFood', player, food, water);
}

alt.on('hud:updateFood', (player, food, water) => {
    rPlayer(player).webview.emit('updateFoodHud', {
        type: 'update',
        player,
        food,
        water,
    });
});

export function initfunc() {
    alt.log('Player Handler is Called');
}