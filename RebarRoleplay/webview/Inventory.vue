<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useEvents } from '../../../../webview/composables/useEvents';

const Events = useEvents();

const inventory = ref<{ id: string, name: string, quantity: number, icon: string, slot: number }[]>([]);
const selectedItem = ref<{ id: string, name: string, quantity: number, icon: string, slot: number } | null>(null);
const amount = ref(1); // Menge, die ausgewählt wird
const isAmountBoxVisible = ref(false); // Steuerung, ob das Amount-Menu sichtbar ist
const interactionType = ref<"use" | "give" | "drop" | null>(null); // Interaktionsstatus

// Zufälliges Bild für ein Item basierend auf dem Namen
function getItemIcon(itemName: string): string {
    const itemIcons: { [key: string]: string } = {
        'item_apple': 'https://peterpane.de/wp-content/uploads/2020/10/klassik-landhaehnchenburger.png',
        'banana': 'https://example.com/icons/banana.png',
        'sword': 'https://example.com/icons/sword.png',
        'shield': 'https://example.com/icons/shield.png',
        // Weitere Items hier hinzufügen
    };

    // Fallback für unbekannte Items
    return itemIcons[itemName.toLowerCase()] || 'https://example.com/icons/default.png';
}

// Event listener to update inventory data
Events.on('updateInventory', (data) => {
    inventory.value = data.inventory;
});

// Funktionen für Item-Interaktionen
function useItem() {
    if (selectedItem.value) {
        Events.emitServer('inventory:use', { itemId: selectedItem.value.id, amount: amount.value });
        closeAmountBox();
    }
}

function giveItem() {
    if (selectedItem.value) {
        Events.emitServer('inventory:give', { itemId: selectedItem.value.id, amount: amount.value });
        closeAmountBox();
    }
}

function dropItem() {
    if (selectedItem.value) {
        Events.emitServer('inventory:drop', { itemId: selectedItem.value.id, amount: amount.value });
        closeAmountBox();
    }
}

// Wählt ein Item aus und bereitet die Interaktion vor
function prepareItemInteraction(item: { id: string, name: string, quantity: number, icon: string, slot: number }) {
    selectedItem.value = item;
    selectedItem.value.icon = getItemIcon(item.name); // Setzt das zufällige Icon basierend auf dem Namen
    interactionType.value = null; // Keine Interaktion ausgewählt zu Beginn
}

// Wählt eine Interaktion aus (Use, Give oder Drop)
function selectInteraction(type: "use" | "give" | "drop") {
    if (selectedItem.value) {
        interactionType.value = type; // Setzt die ausgewählte Interaktion
        isAmountBoxVisible.value = true; // Amount-Box sichtbar machen
    }
}

// Zeigt das Amount-Menu an, wenn eine Interaktion gewählt wird
function openAmountBox() {
    isAmountBoxVisible.value = true;
}

// Schließt das Amount-Menu
function closeAmountBox() {
    isAmountBoxVisible.value = false;
    selectedItem.value = null;
    amount.value = 1;
    interactionType.value = null;
}

// Watch inventory changes
watch(inventory, (newInventory) => {
    console.log('Inventory updated:', newInventory);
});
</script>

<template>
    <div class="inventory-container">
        <div class="inventory-box">
            <h2>My Inventory</h2>
            <div class="inventory-grid">
                <div v-for="item in inventory" :key="item.id" class="inventory-item">
                    <div 
                        class="item-card"
                        :class="{'selected-item': selectedItem && selectedItem.id === item.id}"
                        @click="prepareItemInteraction(item)"
                        :style="{ pointerEvents: interactionType ? 'none' : 'auto' }">
                        <div class="item-icon">
                            <img :src="item.icon" alt="item-icon" class="icon-img">
                        </div>
                        <div class="item-details">
                            <span class="item-name">{{ item.name }}</span>
                            <span class="item-quantity">{{ item.quantity }}</span>
                            <!--<span class="item-slot">Slot: {{ item.slot }}</span>-->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Use, Give, and Drop buttons below the inventory -->
            <div v-if="selectedItem" class="action-buttons">
                <button @click="selectInteraction('use')" class="action-button">Use</button>
                <button @click="selectInteraction('give')" class="action-button">Give</button>
                <button @click="selectInteraction('drop')" class="action-button">Drop</button>
            </div>
        </div>
        <!-- Amount Box -->
        <div v-if="isAmountBoxVisible && selectedItem" class="amount-box">
            <div class="amount-box-content">
                <h3>Amount for {{ selectedItem.name }}</h3>
                <input type="number" v-model="amount" :max="selectedItem.quantity" min="1" class="amount-input" />
                <div class="amount-buttons">
                    <button @click="closeAmountBox" class="amount-button cancel">Cancel</button>
                    <button @click="interactionType === 'use' ? useItem() : interactionType === 'give' ? giveItem() : dropItem()" class="amount-button confirm">Confirm</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Main inventory container */
.inventory-container {
    position: fixed;
    top: 50%; /* Vertikal zentrieren */
    left: 50%; /* Horizontal zentrieren */
    transform: translate(-50%, -50%); /* Position auf den Bildschirm zentrieren */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

/* Inventory box with transparent background */
.inventory-box {
    background: rgba(0, 0, 0, 0.6); /* Dunkler Hintergrund mit Transparenz */
    padding: 25px 40px; /* Vergrößerte Polsterung */
    border-radius: 10px;
    color: #fff;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 250%; /* Breitere Box */
    height: 250%; /* Höhere Box */
    max-width: 2500px; /* Maximale Breite */
    max-height: 2000px; /* Maximale Höhe */
    overflow-x: auto; /* Horizontal scroll für große Inventare */
    overflow-y: hidden; /* Kein vertikales Scrollen */
    border: 1px solid rgba(255, 255, 255, 0.3); /* Subtile Umrandung */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); /* Subtle shadow for depth */
}

/* Inventory box header */
.inventory-box h2 {
    font-size: 32px; /* Größere Schriftgröße */
    font-weight: 600;
    text-align: center;
    margin-bottom: 30px;
    color: #fff; /* Weißer Text */
}

/* Flex container for items */
.inventory-grid {
    display: flex;
    justify-content: center; /* Items zentrieren */
    gap: 20px; /* Vergrößerter Abstand */
    flex-wrap: wrap;
}

/* Styling for each item card */
.inventory-item {
    background: rgba(255, 255, 255, 0.1); /* Leicht transparenter Hintergrund */
    padding: 25px;
    border-radius: 10px;
    width: 150px; /* Breitere Item-Karten */
    text-align: center;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.3); /* Graue Umrandung */
}

/* Selected item border color */
.selected-item {
    border: 2px solid rgba(255, 255, 255, 0.3); /* Graue Umrandung für ausgewählte Items */
}

/* Icon for items */
.item-icon {
    margin-bottom: 15px; /* Mehr Abstand */
}

.icon-img {
    width: 70px; /* Größeres Item-Icon */
    height: 70px;
    object-fit: contain;
}

/* Item details */
.item-details {
    margin-bottom: 15px;
}

.item-name {
    font-size: 18px; /* Größere Schrift */
    font-weight: 500;
    color: #fff;
}

.item-quantity, .item-slot {
    margin-left: 5px;
    font-size: 14px;
    color: #bbb;
}

/* Action buttons below the inventory */
.action-buttons {
    display: flex;
    justify-content: space-between;
    gap: 15px; /* Mehr Abstand zwischen den Buttons */
    margin-top: 20px;
}

/* General button styling */
.action-button {
    padding: 10px 20px;
    font-size: 16px;
    background-color: rgba(255, 255, 255, 0.3);
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
}

.action-button:hover {
    background-color: rgba(255, 255, 255, 0.5);
}

/* Amount Box styling */
.amount-box {
    background-color: rgba(0, 0, 0, 0.6);
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 30px;
    border-radius: 10px;
    color: #fff;
    font-family: 'Roboto', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1100;
}

.amount-box-content h3 {
    color: #FFFFFFFF;
    margin-bottom: 20px;
}

.amount-input {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border-radius: 5px;
    margin-bottom: 30px;
    border: 1px solid rgba(255, 255, 255, 0.3); /* Subtle border for clean look */
    background: none;
}

.amount-buttons {
    display: flex;
    justify-content: space-between;
    width: 100%;
    gap: 40px
}

.amount-button {
    padding: 10px 20px;
    font-size: 16px;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
    border: none;
}

.cancel {
    background-color: #f44336;
}

.confirm {
    background-color: #4CAF50;
}

.cancel:hover {
    background-color: #e53935;
}

.confirm:hover {
    background-color: #45a049;
}
</style>
