<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useEvents } from '../../../../webview/composables/useEvents';

const Events = useEvents();

// Reactive variables for vehicle HUD
const speed = ref(0);
const health = ref(100);
const fuel = ref(100);
const motorStatus = ref(false);
const lockStatus = ref(true);

// Listen for updates from the server
Events.on('updateVehicleHUD', (data) => {
    speed.value = data.speed || 0;
    health.value = data.health || 100;
    fuel.value = data.fuel || 100;
    motorStatus.value = data.engineStatus || false;
    lockStatus.value = data.lockStatus || true;
});

// Optional: Debug watcher for HUD updates
watch([speed, health, fuel, motorStatus, lockStatus], () => {
    console.log('Vehicle HUD updated:', {
        speed: speed.value,
        health: health.value,
        fuel: fuel.value,
        motorStatus: motorStatus.value,
        lockStatus: lockStatus.value,
    });
});
</script>

<template>
    <div class="hud-container">
        <!-- Speed Display -->
        <div class="speed-display">
            <span>{{ speed }} km/h</span>
        </div>

        <!-- Status Bars -->
        <div class="status-bars">
            <!-- Health -->
            <div class="status-bar health">
                <div class="bar" :style="{ width: health + '%' }"></div>
            </div>

            <!-- Fuel -->
            <div class="status-bar fuel">
                <div class="bar" :style="{ width: fuel + '%' }"></div>
            </div>
        </div>

        <!-- Icons -->
        <div class="status-icons">
            <i class="fas fa-car" :class="motorStatus ? 'active' : 'inactive'"></i>
            <i class="fas fa-lock" :class="lockStatus ? 'active' : 'inactive'"></i>
        </div>
    </div>
</template>

<style scoped>
.hud-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.7);
    padding: 20px;
    border-radius: 10px;
    color: white;
    z-index: 1000;
    width: 300px;
}

.speed-display {
    font-size: 30px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
}

.status-bars {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.status-bar {
    position: relative;
    height: 10px;
    background: #555;
    border-radius: 5px;
    overflow: hidden;
}

.status-bar .bar {
    height: 100%;
    background: #4caf50;
}

.status-bar.health .bar {
    background: red;
}

.status-bar.fuel .bar {
    background: orange;
}

.status-icons {
    display: flex;
    justify-content: space-around;
    margin-top: 15px;
}

.status-icons i {
    font-size: 24px;
}

.status-icons i.active {
    color: green;
}

.status-icons i.inactive {
    color: red;
}
</style>
