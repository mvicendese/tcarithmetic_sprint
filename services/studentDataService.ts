import { app } from './firebaseClient';
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
    Timestamp,
    arrayUnion
} from 'firebase/firestore';
import { StudentUser, TestAttempt, TestResultDocument, RecentTestResult } from '../types';
import { getUserProfile } from './userService';

const db = getFirestore(app);

// ============================================================================
// Student Data & Test Attempts
// ============================================================================

/**
 * Saves a test result to the 'test_results' collection and updates the student's
 * profile (level, history, fast track count) in the 'users' collection.
 */
export const saveTestResult = async (
    studentId: string,
    attempt: TestAttempt
): Promise<{ newLevel: number; leveledUp: boolean }> => {
    console.log(`[saveTestResult] Starting save for student: ${studentId}, Score: ${attempt.score}`);

    try {
        // 1. Fetch current student profile
        const studentProfile = await getUserProfile(studentId) as StudentUser;

        if (studentProfile.role !== 'student') {
            console.error(`[saveTestResult] User ${studentId} is not a student. Role: ${studentProfile.role}`);
            throw new Error('User is not a student');
        }

        const currentLevel = studentProfile.currentLevel || 1;
        let newLevel = currentLevel;
        let newConsecutiveCount = studentProfile.consecutiveFastTrackCount || 0;
        let leveledUp = false;

        // 2. Calculate Progression Logic
        const PASS_THRESHOLD = 22; // > 21 correct
        const SUPER_FAST_TRACK_TIME = 60; // > 60s remaining
        const FAST_TRACK_TIME = 20; // > 20s remaining

        if (attempt.correctCount >= PASS_THRESHOLD) {
            if (attempt.timeRemaining > SUPER_FAST_TRACK_TIME) {
                // Super Fast Track: +2 Levels
                newLevel = Math.min(currentLevel + 2, 20);
                newConsecutiveCount = 0;
                leveledUp = true;
            } else if (attempt.timeRemaining > FAST_TRACK_TIME) {
                // Fast Track: +1 Level
                newLevel = Math.min(currentLevel + 1, 20);
                newConsecutiveCount = 0;
                leveledUp = true;
            } else {
                // Standard Pass: Need 3 in a row
                newConsecutiveCount++;
                if (newConsecutiveCount >= 3) {
                    newLevel = Math.min(currentLevel + 1, 20);
                    newConsecutiveCount = 0;
                    leveledUp = true;
                }
            }
        } else {
            // Failed to pass, reset streak
            newConsecutiveCount = 0;
        }

        console.log(`[saveTestResult] Logic calculated. New Level: ${newLevel}, LeveledUp: ${leveledUp}`);

        // 3. Create Test Result Document
        const testResultDoc: TestResultDocument = {
            studentId,
            level: attempt.level,
            score: attempt.score,
            correctCount: attempt.correctCount,
            totalQuestions: attempt.totalQuestions,
            timeTaken: attempt.timeTaken,
            timeRemaining: attempt.timeRemaining,
            questions: attempt.answeredQuestions,
            date: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'test_results'), testResultDoc);
        console.log(`[saveTestResult] Test result saved with ID: ${docRef.id}`);

        // 4. Update Student Profile
        const recentResult: RecentTestResult = {
            level: attempt.level,
            score: attempt.score,
            correctCount: attempt.correctCount,
            timeRemaining: attempt.timeRemaining,
            date: new Date().toISOString()
        };

        // Keep only last 3 results
        const currentRecentTests = studentProfile.recentTests || [];
        const updatedRecentTests = [recentResult, ...currentRecentTests].slice(0, 3);

        await updateDoc(doc(db, 'users', studentId), {
            currentLevel: newLevel,
            consecutiveFastTrackCount: newConsecutiveCount,
            recentTests: updatedRecentTests
        });
        console.log(`[saveTestResult] Student profile updated for ${studentId}`);

        return { newLevel, leveledUp };
    } catch (error) {
        console.error("[saveTestResult] CRITICAL ERROR:", error);
        throw error;
    }
};

import { query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export const getStudentTestResults = async (studentId: string): Promise<TestAttempt[]> => {
    try {
        const q = query(
            collection(db, 'test_results'),
            where('studentId', '==', studentId),
            orderBy('date', 'desc'),
            limit(50) // Limit to last 50 results for performance
        );

        const querySnapshot = await getDocs(q);
        const results: TestAttempt[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data() as TestResultDocument;
            // Map TestResultDocument to TestAttempt
            results.push({
                id: doc.id,
                date: data.date,
                level: data.level,
                score: data.score,
                totalScore: data.correctCount, // Assuming totalScore maps to correctCount in this context or derived
                correctCount: data.correctCount,
                totalQuestions: data.totalQuestions,
                timeTaken: data.timeTaken || 0, // Default to 0 if missing in old data
                timeRemaining: data.timeRemaining,
                answeredQuestions: data.questions
            });
        });

        return results;
    } catch (error) {
        console.error("Error fetching student test results:", error);
        return [];
    }
};
