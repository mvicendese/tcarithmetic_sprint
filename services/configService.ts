import { app } from './firebaseClient';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { TestConfig } from '../types';

const db = getFirestore(app);

// ============================================================================
// Test Configuration
// ============================================================================

export const getTestConfig = async (): Promise<TestConfig> => {
    const configDoc = await getDoc(doc(db, 'system_settings', 'test_config'));
    if (!configDoc.exists()) {
        throw new Error('Test configuration not found');
    }
    return configDoc.data() as TestConfig;
};

export const updateTestConfig = async (config: TestConfig): Promise<void> => {
    await setDoc(doc(db, 'system_settings', 'test_config'), {
        ...config,
        updatedAt: Timestamp.now()
    });
};
