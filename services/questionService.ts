import { Question, RationalNumber, TestConfig, IntegerLevelConfig, FractionLevelConfig } from '../types';
import { TOTAL_QUESTIONS } from '../constants';
import { Fraction } from '../utils/fraction';
import { db } from './firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

// --- Hardcoded Fallback Configuration ---
// Used if Firestore config is unavailable or offline
const FALLBACK_INTEGER_LEVELS: IntegerLevelConfig[] = [
    { level: 1, addition_threshold: 0.6, subtraction_threshold: 0.8, multiplication_threshold: 0.95, addition_min: 0, addition_max: 25, difference_min: 0, difference_max: 12, mult_factor_min: 1, mult_factor_max: 9, div_factor_min: 1, div_factor_max: 5, div_factor_extra: 2 },
    { level: 2, addition_threshold: 0.4, subtraction_threshold: 0.75, multiplication_threshold: 0.95, addition_min: 0, addition_max: 25, difference_min: 0, difference_max: 12, mult_factor_min: 1, mult_factor_max: 9, div_factor_min: 1, div_factor_max: 5, div_factor_extra: 2 },
    { level: 3, addition_threshold: 0.4, subtraction_threshold: 0.7, multiplication_threshold: 0.9, addition_min: 0, addition_max: 25, difference_min: 0, difference_max: 12, mult_factor_min: 1, mult_factor_max: 9, div_factor_min: 1, div_factor_max: 5, div_factor_extra: 2 },
    { level: 4, addition_threshold: 0.35, subtraction_threshold: 0.6, multiplication_threshold: 0.8, addition_min: 0, addition_max: 35, difference_min: 0, difference_max: 17, mult_factor_min: 1, mult_factor_max: 12, div_factor_min: 1, div_factor_max: 9, div_factor_extra: 1 },
    { level: 5, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: 0, addition_max: 35, difference_min: 0, difference_max: 17, mult_factor_min: 1, mult_factor_max: 12, div_factor_min: 1, div_factor_max: 9, div_factor_extra: 1 },
    { level: 6, addition_threshold: 0.6, subtraction_threshold: 0.8, multiplication_threshold: 0.95, addition_min: -25, addition_max: 25, difference_min: -12, difference_max: 12, mult_factor_min: -9, mult_factor_max: 9, div_factor_min: -9, div_factor_max: 9, div_factor_extra: 1 },
    { level: 7, addition_threshold: 0.45, subtraction_threshold: 0.75, multiplication_threshold: 0.95, addition_min: -25, addition_max: 25, difference_min: -12, difference_max: 12, mult_factor_min: -9, mult_factor_max: 9, div_factor_min: -9, div_factor_max: 9, div_factor_extra: 1 },
    { level: 8, addition_threshold: 0.4, subtraction_threshold: 0.7, multiplication_threshold: 0.9, addition_min: -35, addition_max: 35, difference_min: -20, difference_max: 20, mult_factor_min: -12, mult_factor_max: 12, div_factor_min: -9, div_factor_max: 9, div_factor_extra: 1 },
    { level: 9, addition_threshold: 0.35, subtraction_threshold: 0.6, multiplication_threshold: 0.8, addition_min: -40, addition_max: 40, difference_min: -25, difference_max: 25, mult_factor_min: -12, mult_factor_max: 12, div_factor_min: -9, div_factor_max: 9, div_factor_extra: 1 },
    { level: 10, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -45, addition_max: 45, difference_min: -25, difference_max: 25, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -9, div_factor_max: 9, div_factor_extra: 1 },
    { level: 11, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -50, addition_max: 50, difference_min: -30, difference_max: 30, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 12, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -50, addition_max: 50, difference_min: -30, difference_max: 30, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 13, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -55, addition_max: 55, difference_min: -35, difference_max: 35, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 14, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -55, addition_max: 55, difference_min: -35, difference_max: 35, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 15, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -60, addition_max: 60, difference_min: -40, difference_max: 40, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 16, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -60, addition_max: 60, difference_min: -40, difference_max: 40, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 17, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -65, addition_max: 65, difference_min: -55, difference_max: 55, mult_factor_min: -15, mult_factor_max: 15, div_factor_min: -12, div_factor_max: 12, div_factor_extra: 1 },
    { level: 18, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -70, addition_max: 70, difference_min: -60, difference_max: 60, mult_factor_min: -20, mult_factor_max: 20, div_factor_min: -15, div_factor_max: 15, div_factor_extra: 1 },
    { level: 19, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -70, addition_max: 70, difference_min: -60, difference_max: 60, mult_factor_min: -20, mult_factor_max: 20, div_factor_min: -15, div_factor_max: 15, div_factor_extra: 1 },
    { level: 20, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, addition_min: -75, addition_max: 75, difference_min: -65, difference_max: 65, mult_factor_min: -20, mult_factor_max: 20, div_factor_min: -15, div_factor_max: 15, div_factor_extra: 1 }
];

const FALLBACK_FRACTION_LEVELS: FractionLevelConfig[] = [
    { level: 11, integer_operation_threshold: 0.8, addition_threshold: 0.15, subtraction_threshold: 0.3, multiplication_threshold: 0.8, numerator_max: 5 },
    { level: 12, integer_operation_threshold: 0.8, addition_threshold: 0.20, subtraction_threshold: 0.35, multiplication_threshold: 0.75, numerator_max: 5 },
    { level: 13, integer_operation_threshold: 0.75, addition_threshold: 0.20, subtraction_threshold: 0.35, multiplication_threshold: 0.75, numerator_max: 6 },
    { level: 14, integer_operation_threshold: 0.75, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, numerator_max: 6 },
    { level: 15, integer_operation_threshold: 0.7, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, numerator_max: 7 },
    { level: 16, integer_operation_threshold: 0.7, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, numerator_max: 8 },
    { level: 17, integer_operation_threshold: 0.65, addition_threshold: 0.25, subtraction_threshold: 0.5, multiplication_threshold: 0.75, numerator_max: 9 },
    { level: 18, integer_operation_threshold: 0.65, addition_threshold: 0.3, subtraction_threshold: 0.6, multiplication_threshold: 0.8, numerator_max: 10 },
    { level: 19, integer_operation_threshold: 0.6, addition_threshold: 0.3, subtraction_threshold: 0.6, multiplication_threshold: 0.8, numerator_max: 12 },
    { level: 20, integer_operation_threshold: 0.6, addition_threshold: 0.35, subtraction_threshold: 0.7, multiplication_threshold: 0.8, numerator_max: 15 }
];

let cachedConfig: TestConfig | null = null;

// --- Helper Functions ---

const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomNonZeroInt = (min: number, max: number): number => {
    if (min > 0 || max < 0 || (min === 0 && max === 0)) {
        return getRandomInt(min, max);
    }
    let num;
    do {
        num = getRandomInt(min, max);
    } while (num === 0);
    return num;
};

// --- Configuration Fetching ---

export const getTestConfig = async (): Promise<TestConfig> => {
    if (cachedConfig) return cachedConfig;

    try {
        const configDoc = await getDoc(doc(db, 'system_settings', 'test_config'));
        if (configDoc.exists()) {
            cachedConfig = configDoc.data() as TestConfig;
            console.log('Loaded test config from Firestore');
        } else {
            console.warn('Test config not found in Firestore, using fallback');
            cachedConfig = { integerLevels: FALLBACK_INTEGER_LEVELS, fractionLevels: FALLBACK_FRACTION_LEVELS };
        }
    } catch (error) {
        console.error('Error fetching test config:', error);
        cachedConfig = { integerLevels: FALLBACK_INTEGER_LEVELS, fractionLevels: FALLBACK_FRACTION_LEVELS };
    }
    return cachedConfig;
};

// --- Question Generators ---

const addInteger = (params: IntegerLevelConfig): Omit<Question, 'id'> => {
    const n1 = getRandomNonZeroInt(params.addition_min, params.addition_max);
    const n2 = getRandomNonZeroInt(params.addition_min, params.addition_max);
    const answer = n1 + n2;
    return { questionText: `${n1} + ${n2}`, type: 'integer', correctAnswer: answer.toString(), rawAnswer: answer, operationType: 'add', operands: [n1, n2] };
};

const subtractInteger = (level: number, params: IntegerLevelConfig): Omit<Question, 'id'> => {
    let n1 = getRandomNonZeroInt(params.difference_min, params.difference_max);
    let n2 = getRandomNonZeroInt(params.difference_min, params.difference_max);

    if (level < 6) {
        const originalN1 = n1;
        n1 = n1 + n2;
        const answer = originalN1;
        return { questionText: `${n1} - ${n2}`, type: 'integer', correctAnswer: answer.toString(), rawAnswer: answer, operationType: 'sub', operands: [n1, n2] };
    }

    const answer = n1 - n2;
    return { questionText: `${n1} - ${n2}`, type: 'integer', correctAnswer: answer.toString(), rawAnswer: answer, operationType: 'sub', operands: [n1, n2] };
};

const multiplyInteger = (params: IntegerLevelConfig): Omit<Question, 'id'> => {
    let n1 = getRandomInt(params.mult_factor_min, params.mult_factor_max);
    let n2 = getRandomInt(params.mult_factor_min, params.mult_factor_max);
    const answer = n1 * n2;
    return { questionText: `${n1} \\times ${n2}`, type: 'integer', correctAnswer: answer.toString(), rawAnswer: answer, operationType: 'mul', operands: [n1, n2] };
};

const divideInteger = (level: number, params: IntegerLevelConfig): Omit<Question, 'id'> => {
    const y = (Math.random() < 0.45 && level > 5) ? -1 : 1;
    let bBase = getRandomInt(1, params.div_factor_max);
    const randInt = getRandomInt(params.div_factor_min, params.div_factor_max);

    const n1 = bBase * params.div_factor_extra * randInt;
    const n2 = bBase * y;
    const answer = n1 / n2; // Should be integer

    return { questionText: `${n1} \\div ${n2}`, type: 'integer', correctAnswer: answer.toString(), rawAnswer: answer, operationType: 'div', operands: [n1, n2] };
};

// --- Fraction Generators ---

const generateFraction = (max: number): Fraction => {
    const num = getRandomInt(1, max);
    const den = num + getRandomInt(1, max);
    return new Fraction(num, den);
};

const addFraction = (params: FractionLevelConfig): Omit<Question, 'id'> => {
    const max = params.numerator_max;
    const f1 = generateFraction(max);
    const f2 = generateFraction(max);
    const result = f1.add(f2);

    return {
        questionText: `${f1.toLatex()} + ${f2.toLatex()}`,
        type: 'fraction',
        correctAnswer: result.toString(),
        rawAnswer: { num: result.numerator, den: result.denominator },
        operationType: 'add',
        operands: [{ num: f1.numerator, den: f1.denominator }, { num: f2.numerator, den: f2.denominator }]
    };
};

const subtractFraction = (params: FractionLevelConfig): Omit<Question, 'id'> => {
    const max = params.numerator_max;
    const f1 = generateFraction(max);
    const f2 = generateFraction(max);
    const result = f1.sub(f2);

    return {
        questionText: `${f1.toLatex()} - ${f2.toLatex()}`,
        type: 'fraction',
        correctAnswer: result.toString(),
        rawAnswer: { num: result.numerator, den: result.denominator },
        operationType: 'sub',
        operands: [{ num: f1.numerator, den: f1.denominator }, { num: f2.numerator, den: f2.denominator }]
    };
};

const multiplyFraction = (params: FractionLevelConfig): Omit<Question, 'id'> => {
    const max = params.numerator_max;
    const f1 = generateFraction(max);
    const f2 = generateFraction(max);
    const result = f1.mul(f2);

    return {
        questionText: `${f1.toLatex()} \\times ${f2.toLatex()}`,
        type: 'fraction',
        correctAnswer: result.toString(),
        rawAnswer: { num: result.numerator, den: result.denominator },
        operationType: 'mul',
        operands: [{ num: f1.numerator, den: f1.denominator }, { num: f2.numerator, den: f2.denominator }]
    };
};

const divideFraction = (params: FractionLevelConfig): Omit<Question, 'id'> => {
    const max = params.numerator_max;
    const f1 = generateFraction(max);
    const f2 = generateFraction(max);
    const result = f1.div(f2);

    return {
        questionText: `${f1.toLatex()} \\div ${f2.toLatex()}`,
        type: 'fraction',
        correctAnswer: result.toString(),
        rawAnswer: { num: result.numerator, den: result.denominator },
        operationType: 'div',
        operands: [{ num: f1.numerator, den: f1.denominator }, { num: f2.numerator, den: f2.denominator }]
    };
};

// --- Main Generator ---

const generateSingleQuestion = (level: number, config: TestConfig): Question => {
    let questionData: Omit<Question, 'id'>;
    const isFractionLevel = level > 10;

    // Determine if we should generate an integer question even in fraction levels
    let isIntegerQuestion = true;
    if (isFractionLevel) {
        const fracParams = config.fractionLevels.find(l => l.level === level) || FALLBACK_FRACTION_LEVELS[level - 11];
        if (Math.random() >= fracParams.integer_operation_threshold) {
            isIntegerQuestion = false;
        }
    }

    if (isIntegerQuestion) {
        const params = config.integerLevels.find(l => l.level === level) || FALLBACK_INTEGER_LEVELS[level - 1];
        const x = Math.random();

        // DEBUG LOGGING
        // if (Math.random() < 0.05) { // Log 5% of the time to avoid spam
        console.log(`[Gen] Level: ${level}, x: ${x.toFixed(3)}, Params:`, JSON.stringify(params));
        // }

        if (x < params.addition_threshold) {
            questionData = addInteger(params);
        } else if (x < params.subtraction_threshold) {
            questionData = subtractInteger(level, params);
        } else if (x < params.multiplication_threshold) {
            questionData = multiplyInteger(params);
        } else {
            questionData = divideInteger(level, params);
        }
    } else {
        const params = config.fractionLevels.find(l => l.level === level) || FALLBACK_FRACTION_LEVELS[level - 11];
        const x = Math.random();

        if (x < params.addition_threshold) {
            questionData = addFraction(params);
        } else if (x < params.subtraction_threshold) {
            questionData = subtractFraction(params);
        } else if (x < params.multiplication_threshold) {
            questionData = multiplyFraction(params);
        } else {
            questionData = divideFraction(params);
        }
    }

    return { id: crypto.randomUUID(), ...questionData };
};

// Helper for uniqueness
const getQuestionKey = (q: Question): string => {
    const op = q.operationType;
    const operandsAsStrings = q.operands.map(o => {
        if (typeof o === 'number') return o.toString();
        // Simplify fraction for key to handle 2/4 == 1/2
        // Assuming Fraction class handles simplification in constructor, but here we have raw objects
        // We should ideally use the Fraction class to simplify if needed, but let's assume generated operands are raw.
        // Actually, the generators return simplified operands in some cases? 
        // No, generators return raw operands. 
        // Let's use the Fraction util to simplify for the key.
        try {
            const f = new Fraction(o.num, o.den);
            return f.toString();
        } catch {
            return `${o.num}/${o.den}`;
        }
    });

    if (op === 'add' || op === 'mul') {
        operandsAsStrings.sort();
    }
    return `${op}:${operandsAsStrings.join(',')}`;
};

export const generateTestQuestions = async (level: number): Promise<Question[]> => {
    const config = await getTestConfig();
    const questions: Question[] = [];
    const questionKeys = new Set<string>();
    const maxAttempts = TOTAL_QUESTIONS * 50;
    let attempts = 0;

    console.log(`[QuestionService] Generating questions for level ${level} (type: ${typeof level})...`);

    while (questions.length < TOTAL_QUESTIONS && attempts < maxAttempts) {
        const newQuestion = generateSingleQuestion(level, config);
        const questionKey = getQuestionKey(newQuestion);

        if (!questionKeys.has(questionKey)) {
            questionKeys.add(questionKey);
            questions.push(newQuestion);
        }
        attempts++;
    }

    // Fallback: Allow duplicates if we can't find enough unique ones
    if (questions.length < TOTAL_QUESTIONS) {
        console.warn(`[QuestionService] Could not generate ${TOTAL_QUESTIONS} unique questions. Filling with duplicates.`);
        while (questions.length < TOTAL_QUESTIONS) {
            questions.push(generateSingleQuestion(level, config));
        }
    }

    return questions;
};

