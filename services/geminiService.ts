import { StudentUser, TestAttempt } from '../types';

export async function analyzeStudentHistory(
    history: TestAttempt[],
    onChunk: (chunk: string) => void
): Promise<void> {
    onChunk("AI analysis is not currently enabled in this environment.");
}

export async function analyzeClassForGroupings(
    classStudentsData: { studentName: string; data: StudentUser }[],
    onChunk: (chunk: string) => void
): Promise<void> {
    onChunk("AI analysis is not currently enabled in this environment.");
}

export async function analyzeSchoolTrends(
    allStudentsData: { studentName: string; data: StudentUser }[],
    onChunk: (chunk: string) => void
): Promise<void> {
    onChunk("AI analysis is not currently enabled in this environment.");
}
