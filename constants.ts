
export const TEST_DURATION_SECONDS = 180; // 3 minutes
export const TOTAL_QUESTIONS = 25;

// Parameters for integer questions, translated from the Python script
export const DEFAULT_LEVEL_PARAMS_INT = [
    // P(add), P(sub), P(mul), P(div), min_add, max_add, min_sub, max_sub, min_mul, max_mul, min_div_num, max_div_num, div_factor
    // Note: Python script has P(div) as the 4th param (index 3), but it's always 0 in the first few levels.
    // Python params: [pAdd, pSub, pMul, pDiv, addMin, addMax, subMin, subMax, mulMin, mulMax, divNumMin, divNumMax, divFactor]
    // Wait, Python list has 12 items. Let's map them carefully.
    // Python: [0.6,0.8,0.95,0,25,0,12,1,9,1,5,2] -> 12 items.
    // TS expected: same structure.

    [0.6, 0.8, 0.95, 0, 25, 0, 12, 1, 9, 1, 5, 2],       // Level 1
    [0.4, 0.75, 0.95, 0, 25, 0, 12, 1, 9, 1, 5, 2],      // Level 2
    [0.4, 0.7, 0.9, 0, 25, 0, 12, 1, 9, 1, 5, 2],        // Level 3
    [0.35, 0.6, 0.8, 0, 35, 0, 17, 1, 12, 1, 9, 1],      // Level 4
    [0.25, 0.5, 0.75, 0, 35, 0, 17, 1, 12, 1, 9, 1],     // Level 5
    [0.6, 0.8, 0.95, -25, 25, -12, 12, -9, 9, -9, 9, 1], // Level 6
    [0.45, 0.75, 0.95, -25, 25, -12, 12, -9, 9, -9, 9, 1], // Level 7
    [0.4, 0.7, 0.9, -35, 35, -20, 20, -12, 12, -9, 9, 1], // Level 8
    [0.35, 0.6, 0.8, -40, 40, -25, 25, -12, 12, -9, 9, 1], // Level 9
    [0.25, 0.5, 0.75, -45, 45, -25, 25, -15, 15, -9, 9, 1], // Level 10
    [0.25, 0.5, 0.75, -50, 50, -30, 30, -15, 15, -12, 12, 1], // Level 11
    [0.25, 0.5, 0.75, -50, 50, -30, 30, -15, 15, -12, 12, 1], // Level 12
    [0.25, 0.5, 0.75, -55, 55, -35, 35, -15, 15, -12, 12, 1], // Level 13
    [0.25, 0.5, 0.75, -55, 55, -35, 35, -15, 15, -12, 12, 1], // Level 14
    [0.25, 0.5, 0.75, -60, 60, -40, 40, -15, 15, -12, 12, 1], // Level 15
    [0.25, 0.5, 0.75, -60, 60, -40, 40, -15, 15, -12, 12, 1], // Level 16
    [0.25, 0.5, 0.75, -65, 65, -55, 55, -15, 15, -12, 12, 1], // Level 17
    [0.25, 0.5, 0.75, -70, 70, -60, 60, -20, 20, -15, 15, 1], // Level 18
    [0.25, 0.5, 0.75, -70, 70, -60, 60, -20, 20, -15, 15, 1], // Level 19
    [0.25, 0.5, 0.75, -75, 75, -65, 65, -20, 20, -15, 15, 1], // Level 20
];


// Parameters for fraction questions, translated from the Python script
export const DEFAULT_LEVEL_PARAMS_FRAC = [
    // P(integer), P(add), P(sub), P(mul), max_val
    [0.8, 0.15, 0.3, 0.8, 5],   // Level 11
    [0.8, 0.20, 0.35, 0.75, 5],  // Level 12
    [0.75, 0.20, 0.35, 0.75, 6], // Level 13
    [0.75, 0.25, 0.5, 0.75, 6],  // Level 14
    [0.7, 0.25, 0.5, 0.75, 7],   // Level 15
    [0.7, 0.25, 0.5, 0.75, 8],   // Level 16
    [0.65, 0.25, 0.5, 0.75, 9],  // Level 17
    [0.65, 0.3, 0.6, 0.8, 10],  // Level 18
    [0.6, 0.3, 0.6, 0.8, 12],  // Level 19
    [0.6, 0.35, 0.7, 0.8, 15],  // Level 20
];