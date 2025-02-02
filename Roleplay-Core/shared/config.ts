export const config = {
    UseInventory: true,      // Inventar-Option
    UseHUD: true,            // HUD-Option
    UseSaveCharacterService: true,
    UseFoodHud: true,
    VehicleLockKey: 85,
    Lockkeyrange: 15,
    UseVehicleHUD: true,
    maxinventoryweight: 40,
    OpenInventorykey: 113,

    
};


export const foodconfig = {
    useFood: true, // Aktiviert die Nahrungs- und Wasserabnahme
    foodDecreaseRange: { min: 3, max: 7 }, // Zufälliger Bereich für Food-Abnahme
    waterDecreaseRange: { min: 3, max: 7 }, // Zufälliger Bereich für Water-Abnahme
    decreaseInterval: 600000, // Intervall von 1 Minute (60 Sekunden)
    maxFood: 100, // Maximale Menge an Food
    maxWater: 100, // Maximale Menge an Water
    minFood: 0, // Minimale Menge an Food (wird nicht unterschritten)
    minWater: 0, // Minimale Menge an Water (wird nicht unterschritten)
};
