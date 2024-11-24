<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useEvents } from '../../../../webview/composables/useEvents';



const Events = useEvents();

// Reactive variables to hold character data
const food = ref(20); // Variable for food
const water = ref(25); // Variable for water

// Event listener to update character data
Events.on('updateFoodHud', (data) => {
  food.value = data.food || 0;  // Update food
  water.value = data.water || 0; // Update water
});

// Watchers to react to data changes and update the HUD accordingly
watch([food, water], () => {
  console.log('HUD data updated:', { food, water });
});

// This function calculates the stroke dasharray based on percentage
const strokeDashArray = (value: number) => {
  const radius = 14; // Circle radius
  const circumference = 2 * Math.PI * radius;
  value = Math.min(Math.max(value, 0), 100); // Ensure value is between 0 and 100
  return `${circumference} ${circumference}`; // Full circumference always
};

// This function calculates the stroke dashoffset based on percentage
const strokeDashOffset = (value: number) => {
  const radius = 14; // Circle radius
  const circumference = 2 * Math.PI * radius;
  value = Math.min(Math.max(value, 0), 100); // Ensure value is between 0 and 100
  return `${circumference - (value / 100) * circumference}`; // Offset based on percentage
};
</script>

<template>
  <div class="hud-container">
    <div class="hud-box">
      <!-- Food Circle with Icon -->
      <div class="circle-container">
        <svg class="circle" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <circle class="circle-background" cx="18" cy="18" r="14"></circle>
          <circle class="circle-progress-food" cx="18" cy="18" r="14"
                  :stroke-dasharray="strokeDashArray(food)" 
                  :stroke-dashoffset="strokeDashOffset(food)"></circle>
          <g class="circle-content">
            <!-- Burger Icon -->
            <font-awesome-icon icon="fa-solid fa-hamburger" class="icon" />
          </g>
        </svg>
        <p>Food: <span>{{ food }}%</span></p>
      </div>

      <!-- Water Circle with Icon -->
      <div class="circle-container">
        <svg class="circle" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <circle class="circle-background" cx="18" cy="18" r="14"></circle>
          <circle class="circle-progress-water" cx="18" cy="18" r="14"
                  :stroke-dasharray="strokeDashArray(water)" 
                  :stroke-dashoffset="strokeDashOffset(water)"></circle>
          <g class="circle-content">
            <!-- Water Bottle Icon -->
            <font-awesome-icon icon="fa-solid fa-glass-water" class="icon" />
          </g>
        </svg>
        <p>Water: <span2>{{ water }}%</span2></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');

/* Deine CSS-Stile hier */

.hud-container {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%); /* Vertically center the HUD */
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 1000;
}

.hud-box {
  background: rgba(0, 0, 0, 0.6); 
  padding: 20px;
  border-radius: 10px;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: left;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 160px;
}

.hud-box h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.circle-container {
  margin: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.circle {
  width: 50px; /* Smaller circle */
  height: 50px; /* Smaller circle */
  position: relative;
  transform: rotate(-90deg); /* Start from top */
}

.circle-background {
  fill: none;
  stroke: #ccc;
  stroke-width: 4;
}

.circle-progress-food {
  fill: none;
  stroke: #4caf50; /* Green color for food */
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
}

.circle-progress-water {
  fill: none;
  stroke: #2196f3; /* Blue color for water */
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
}

.circle-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon {
  font-size: 24px; /* Font awesome icon size */
  color: #fff;
}

p {
  margin: 5px 0;
  font-size: 16px;
  font-weight: 500;
}

span {
  font-weight: bold;
  color: #4caf50;
}

span2 {
  font-weight: bold;
  color: #2196f3;
}
</style>