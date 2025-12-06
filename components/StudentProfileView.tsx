import React, { useState, useEffect } from 'react';
import { StudentUser, TestAttempt, Class } from '../types';
import * as api from '../services/firebaseService';
import ResultsScreen from './ResultsScreen';
import ProgressChart from './ProgressChart';
import ErrorBoundary from './ErrorBoundary';
import ResultsModal from './ResultsModal';

interface StudentProfileViewProps {
    student: StudentUser;
    onBack: () => void;
}

const StudentProfileView: React.FC<StudentProfileViewProps> = ({ student, onBack }) => {
    const [gameState, setGameState] = useState<'idle' | 'results'>('idle');
    const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);
    const [testHistory, setTestHistory] = useState<TestAttempt[]>([]);
    const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const RESULTS_PER_PAGE = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const history = await api.getStudentTestResults(student.id);
                setTestHistory(history);

                const allClasses = await api.getAllClasses();
                const studentClasses = allClasses.filter(c => c.studentIds && Array.isArray(c.studentIds) && c.studentIds.includes(student.id));
                setEnrolledClasses(studentClasses);
            } catch (error) {
                console.error("Failed to load student data:", error);
            }
        };

        fetchData();
    }, [student.id]);

    // Calculate score: correctAnswers + (level - 1) * 25
    const calculateScore = (attempt: TestAttempt, level: number) => {
        if (!attempt.answeredQuestions || !Array.isArray(attempt.answeredQuestions)) {
            return (level - 1) * 25;
        }
        const correctAnswers = attempt.answeredQuestions.filter(q => q.isCorrect).length || 0;
        return correctAnswers + (level - 1) * 25;
    };

    const formatTimeRemaining = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Prepare data
    const testResults = testHistory.map((attempt) => {
        const level = attempt.level || 1;
        const score = calculateScore(attempt, level);

        let date: Date;
        try {
            // Handle Firestore Timestamp (if it slipped through) or string/Date
            if (attempt.date && typeof (attempt.date as any).toDate === 'function') {
                date = (attempt.date as any).toDate();
            } else if (attempt.date) {
                date = new Date(attempt.date);
            } else {
                date = new Date();
            }

            // Validate date
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date found for attempt ${attempt.id}: ${attempt.date}`);
                date = new Date();
            }
        } catch (e) {
            console.error("Error parsing date:", e);
            date = new Date();
        }

        const timeRemaining = attempt.timeRemaining || 0;
        const correct = (attempt.answeredQuestions && Array.isArray(attempt.answeredQuestions))
            ? attempt.answeredQuestions.filter(q => q && q.isCorrect).length // Check for q validity
            : 0;

        return {
            date,
            level,
            score,
            correct,
            timeRemaining,
            dateStr: date.toLocaleDateString(),
            shortDate: date.toLocaleString('en-AU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Australia/Melbourne'
            }),
            fullDate: date,
            attempt // Keep original attempt for detailed view
        };
    }) || [];

    // Sort by date descending for table
    const sortedResults = [...testResults].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Pagination
    const totalPages = Math.ceil(sortedResults.length / RESULTS_PER_PAGE);
    const paginatedResults = sortedResults.slice(
        (currentPage - 1) * RESULTS_PER_PAGE,
        currentPage * RESULTS_PER_PAGE
    );

    // Chart Data (Ascending by date)
    // Use timestamp for X-axis to allow proper time-series plotting
    const chartData = testResults
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(r => ({
            ...r,
            timestamp: r.date.getTime(),
            score: r.score,
            date: r.shortDate,
            level: r.level,
            uniqueId: r.attempt.id || Math.random().toString(36)
        }));

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <ResultsModal
                isOpen={gameState === 'results'}
                onClose={() => setGameState('idle')}
                attempt={lastAttempt}
            />

            {/* Header */}
            <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
                <div>
                    <button
                        onClick={onBack}
                        className="text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Back to Class
                    </button>
                    <h1 className="text-3xl font-bold text-white">
                        {student.firstName} {student.surname}
                    </h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-8 gap-6 mb-6">
                {/* Left Column: Student Info (replaces Start Test) */}
                <div className="space-y-6 lg:col-span-3">
                    <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-6">Student Information</h2>

                        {/* Current Level */}
                        <div className="mb-6">
                            <p className="text-lg text-slate-200">Current Level {student.currentLevel || 1}</p>
                        </div>

                        {/* Enrolled Classes */}
                        <div>
                            <h3 className="text-lg text-slate-200 mb-3">Enrolled class(es)</h3>
                            {enrolledClasses.length === 0 ? (
                                <p className="text-slate-500 text-lg italic">Not enrolled in any classes</p>
                            ) : (
                                <div className="space-y-2">
                                    {enrolledClasses.map(c => (
                                        <p key={c.id} className="text-lg text-slate-200">
                                            {c.name}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Test Results Table */}
                <div className="lg:col-span-5">
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-200">Results</h3>
                            <div className="flex gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                >
                                    &lt;
                                </button>
                                <span className="text-slate-400">{currentPage} / {Math.max(1, totalPages)}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-600">
                                        <th className="text-left py-2 font-medium">Date</th>
                                        <th className="text-left py-2 font-medium">Level</th>
                                        <th className="text-left py-2 font-medium">Score</th>
                                        <th className="text-left py-2 font-medium">Time Left</th>
                                        <th className="text-left py-2 font-medium">Summary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedResults.length === 0 ? (
                                        <tr><td colSpan={5} className="py-4 text-center text-slate-500">No results yet</td></tr>
                                    ) : (
                                        paginatedResults.map((result, idx) => (
                                            <React.Fragment key={idx}>
                                                <tr
                                                    onClick={() => {
                                                        setLastAttempt(result.attempt);
                                                        setGameState('results');
                                                    }}
                                                    className="border-b border-slate-700/50 text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="py-3">{result.dateStr}</td>
                                                    <td className="py-3">Level {result.level}</td>
                                                    <td className="py-3 font-bold text-white">{result.score}</td>
                                                    <td className="py-3">{formatTimeRemaining(result.timeRemaining)}</td>
                                                    {/*                                                 <td className="py-3">
                                                        {result.attempt.summary ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                                AI
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-600">-</span>
                                                        )}
                                                    </td> */}
                                                </tr>
                                                {/* {result.attempt.summary && (
                                                    <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                                        <td colSpan={5} className="py-2 px-4 text-sm text-slate-300 italic">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-purple-400 mt-0.5">✨</span>
                                                                <p>{result.attempt.summary}</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )} */}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="max-w-7xl mx-auto bg-slate-800 rounded-xl p-6 border border-slate-700 h-80">
                <ErrorBoundary fallback={<div className="text-white">Chart failed to load.</div>}>
                    <ProgressChart data={chartData} />
                </ErrorBoundary>
            </div>
        </div >
    );
};

export default StudentProfileView;
