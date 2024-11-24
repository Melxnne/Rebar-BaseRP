<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useEvents } from '../../../../webview/composables/useEvents';

const Events = useEvents();

// Reactive variables to hold character data
const characterName = ref('');
const cash = ref(0);
const bank = ref(0);
const blackMoney = ref(0);
const jobName = ref(''); // Variable to store the job name
const jobGrade = ref(0); // Variable to store the job grade

// Event listener to update character data
Events.on('updateHUD', (data) => {
    characterName.value = data.name;
    cash.value = data.cash;
    bank.value = data.bank;
    blackMoney.value = data.black_money;
    jobName.value = data.jobName || '';
    jobGrade.value = data.jobGrade || 0;
});

// Watchers to react to data changes and update the HUD accordingly
watch([characterName, cash, bank, blackMoney, jobName, jobGrade], () => {
    console.log('HUD data updated:', { characterName, cash, bank, blackMoney, jobName, jobGrade });
});
</script>

<template>
    <div class="hud-container">
        <div class="hud-box">
            <h2>{{ characterName }}</h2>
            <p>💵 Cash: <span>{{ cash }}</span></p>
            <p>🏦 Bank: <span>{{ bank }}</span></p>
            <p>🖤 Black Money: <span>{{ blackMoney }}</span></p>
            
            <!-- Display job name and grade -->
            <p v-if="jobName">💼 Job: {{ jobName }} - Grade: {{ jobGrade }}</p>
            <p v-else>No job assigned.</p>
        </div>
    </div>
</template>

<style scoped>
.hud-container {
    position: fixed;
    top: 20px; /* Changed to top right */
    right: 20px; /* Positioned to the right */
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    z-index: 1000;
}

.hud-box {
    background: rgba(0, 0, 0, 0.6); /* Dark background with some transparency */
    padding: 15px 25px;
    border-radius: 10px;
    color: #fff;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    text-align: left; /* Align text to the left */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); /* Subtle shadow for depth */
    border: 1px solid rgba(255, 255, 255, 0.3); /* Subtle border for clean look */
}

.hud-box h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
}

.hud-box p {
    margin: 5px 0;
    font-size: 16px;
    font-weight: 500;
}

.hud-box span {
    font-weight: bold;
    color: #4caf50; /* Green color for positive values */
}
</style>
