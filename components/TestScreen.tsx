import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StudentUser, Question, AnsweredQuestion, TestAttempt, RationalNumber } from '../types';
import { TEST_DURATION_SECONDS, TOTAL_QUESTIONS } from '../constants';
import { generateTestQuestions } from '../services/questionService';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { Delete } from 'lucide-react';

// ---------- TestScreen component ----------
interface TestScreenProps {
    user: StudentUser;
    currentLevel: number;
    onComplete: (attempt: TestAttempt) => void;
    isSubmitting?: boolean;
}

const TestScreen: React.FC<TestScreenProps> = ({ user, currentLevel, onComplete, isSubmitting = false }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
    const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);

    // Input state
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [numerator, setNumerator] = useState('');
    const [denominator, setDenominator] = useState('');
    const [activeField, setActiveField] = useState<'main' | 'num' | 'den'>('main');

    const [questionStart, setQuestionStart] = useState(Date.now());
    const [loading, setLoading] = useState(true);

    // Refs for focus management
    const mainInputRef = useRef<HTMLInputElement>(null);
    const numInputRef = useRef<HTMLInputElement>(null);
    const denInputRef = useRef<HTMLInputElement>(null);

    // Initialise questions when component mounts or level changes
    useEffect(() => {
        const loadQuestions = async () => {
            console.log(`[TestScreen] Loading questions for level: ${currentLevel}`);
            setLoading(true);
            try {
                const qs = await generateTestQuestions(currentLevel);
                setQuestions(qs);
            } catch (error) {
                console.error("Failed to generate questions:", error);
            } finally {
                setLoading(false);
            }
        };
        loadQuestions();
    }, [currentLevel]);

    // Keep a ref to the latest finishTest to avoid stale closures in the timer interval
    const finishTestRef = useRef<(overrideTimeLeft?: number) => void>(() => { });

    const finishTest = useCallback((overrideTimeLeft?: number) => {
        const totalTime = (Date.now() - questionStart) / 1000;
        const correct = answers.filter(a => a.isCorrect).length;
        const finalTimeLeft = overrideTimeLeft !== undefined ? overrideTimeLeft : timeLeft;

        const attempt: TestAttempt = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            level: currentLevel,
            score: correct + (currentLevel - 1) * 25,
            totalScore: correct,
            correctCount: correct,
            totalQuestions: TOTAL_QUESTIONS,
            timeTaken: totalTime,
            timeRemaining: finalTimeLeft,
            answeredQuestions: answers,
        };
        onComplete(attempt);
    }, [answers, currentLevel, timeLeft, onComplete, questionStart]);

    // Update ref whenever finishTest changes
    useEffect(() => {
        finishTestRef.current = finishTest;
    }, [finishTest]);

    // Global countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Call the latest finishTest via ref
                    finishTestRef.current(0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Focus management when question changes
    useEffect(() => {
        if (!loading && questions.length > 0) {
            const q = questions[currentIdx];
            const useIntegerInput = q.type === 'integer' || !q.correctAnswer.includes('/');

            if (!useIntegerInput) {
                setActiveField('num');
                // Small timeout to ensure render
                setTimeout(() => numInputRef.current?.focus(), 50);
            } else {
                setActiveField('main');
                setTimeout(() => mainInputRef.current?.focus(), 50);
            }
        }
    }, [currentIdx, loading, questions]);

    const submitAnswer = () => {
        if (isSubmitting) return;
        const q = questions[currentIdx];
        let submitted = '';
        let isCorrect = false;

        // Check if we should use integer input (either type is integer OR answer is integer)
        const useIntegerInput = q.type === 'integer' || !q.correctAnswer.includes('/');

        if (!useIntegerInput) {
            if (!numerator || !denominator) return; // Prevent empty submission
            submitted = `${numerator}/${denominator}`;
            // Basic fraction comparison (string based for now, ideally should reduce)
            // The generator returns simplified answers, so we expect simplified inputs
            isCorrect = submitted === q.correctAnswer;
        } else {
            if (!currentAnswer) return;
            submitted = currentAnswer;
            isCorrect = submitted.trim() === q.correctAnswer;
        }

        const answered: AnsweredQuestion = {
            ...q,
            submittedAnswer: submitted,
            isCorrect,
            timeTakenSeconds: (Date.now() - questionStart) / 1000,
        };

        const newAnswers = [...answers, answered];
        setAnswers(newAnswers);

        // Reset inputs
        setCurrentAnswer('');
        setNumerator('');
        setDenominator('');
        setQuestionStart(Date.now());

        if (currentIdx < TOTAL_QUESTIONS - 1) {
            setCurrentIdx(i => i + 1);
        } else {
            // Final question logic
            const totalTime = (Date.now() - questionStart) / 1000;
            const correct = newAnswers.filter(a => a.isCorrect).length;
            const attempt: TestAttempt = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString(),
                level: currentLevel,
                score: correct + (currentLevel - 1) * 25,
                totalScore: correct,
                correctCount: correct,
                totalQuestions: TOTAL_QUESTIONS,
                timeTaken: totalTime,
                timeRemaining: timeLeft,
                answeredQuestions: newAnswers,
            };
            onComplete(attempt);
        }
    };

    // Handle Numpad Input
    const handleNumpadPress = (key: string) => {
        if (key === 'DEL') {
            if (activeField === 'main') setCurrentAnswer(prev => prev.slice(0, -1));
            if (activeField === 'num') setNumerator(prev => prev.slice(0, -1));
            if (activeField === 'den') setDenominator(prev => prev.slice(0, -1));
        } else if (key === 'SUBMIT') {
            submitAnswer();
        } else {
            // Digits or negative sign
            if (activeField === 'main') setCurrentAnswer(prev => prev + key);
            if (activeField === 'num') setNumerator(prev => prev + key);
            if (activeField === 'den') setDenominator(prev => prev + key);
        }
    };

    // Handle Keyboard Input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const key = e.key;

        // Allow standard navigation keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

        if (key === 'Enter') {
            submitAnswer();
        } else if (key === 'Tab') {
            e.preventDefault();
            const useIntegerInput = questions[currentIdx].type === 'integer' || !questions[currentIdx].correctAnswer.includes('/');

            if (!useIntegerInput) {
                if (activeField === 'num') {
                    setActiveField('den');
                    // denInputRef.current?.focus(); // Focus is managed by state + effect/render, but ref focus helps
                } else {
                    setActiveField('num');
                    // numInputRef.current?.focus();
                }
            }
        } else if (key === 'Backspace') {
            handleNumpadPress('DEL');
        } else if (/^[0-9]$/.test(key) || key === '-') {
            handleNumpadPress(key);
        }
    };

    if (loading || questions.length === 0) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Preparing your test…</div>;
    }

    if (currentIdx >= questions.length) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Finishing test...</div>;
    }

    const currentQ = questions[currentIdx];
    // Strip " = ?" from question text for inline display
    const displayQuestion = currentQ.questionText.replace(' = ?', '').replace('=', '');

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col text-white font-sans" onKeyDown={handleKeyDown}>
            {/* Header */}
            <div className="w-full max-w-4xl mx-auto p-6 flex justify-between items-end border-b border-slate-700 mb-8">
                <div className="text-4xl font-bold text-slate-200">
                    {currentIdx + 1}<span className="text-2xl text-slate-500">/{TOTAL_QUESTIONS}</span>
                </div>
                <div className={`text-3xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col md:flex-row items-start justify-center w-full max-w-6xl mx-auto px-4 gap-8 pt-12">

                {/* Question & Input Area */}
                <div className="bg-slate-800 rounded-3xl p-12 shadow-2xl border border-slate-700 w-full md:w-auto flex items-center justify-center gap-6 min-h-[300px] px-16">

                    {/* Question Text */}
                    <div className="text-4xl md:text-5xl font-bold text-slate-200 tracking-wide">
                        <Latex>{`$\\displaystyle ${displayQuestion}$`}</Latex>
                    </div>

                    {/* Equals Sign */}
                    <div className="text-4xl md:text-5xl font-bold text-slate-400">=</div>

                    {/* Input(s) */}
                    {currentQ.type === 'integer' || !currentQ.correctAnswer.includes('/') ? (
                        <input
                            ref={mainInputRef}
                            type="text"
                            value={currentAnswer}
                            onChange={e => setCurrentAnswer(e.target.value)}
                            onFocus={() => setActiveField('main')}
                            className="w-32 h-20 bg-slate-900 border-2 border-slate-600 rounded-xl text-center text-3xl font-bold text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                            placeholder="?"
                            readOnly // Prevent mobile keyboard
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <input
                                ref={numInputRef}
                                type="text"
                                value={numerator}
                                onChange={e => setNumerator(e.target.value)}
                                onFocus={() => setActiveField('num')}
                                className={`w-24 h-16 bg-slate-900 border-2 ${activeField === 'num' ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-600'} rounded-xl text-center text-3xl font-bold text-white outline-none transition-all`}
                                readOnly
                            />
                            <div className="w-full h-1 bg-slate-400 rounded-full"></div>
                            <input
                                ref={denInputRef}
                                type="text"
                                value={denominator}
                                onChange={e => setDenominator(e.target.value)}
                                onFocus={() => setActiveField('den')}
                                className={`w-24 h-16 bg-slate-900 border-2 ${activeField === 'den' ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-600'} rounded-xl text-center text-3xl font-bold text-white outline-none transition-all`}
                                readOnly
                            />
                        </div>
                    )}
                </div>

                {/* Number Pad */}
                <div className="w-full max-w-sm md:w-1/3 flex flex-col gap-6">
                    <div className="grid grid-cols-3 gap-2 w-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0].map((key) => (
                            <button
                                key={key}
                                onClick={() => handleNumpadPress(key.toString())}
                                className="h-14 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-xl text-xl font-bold text-white shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                            >
                                {key}
                            </button>
                        ))}
                        <button
                            onClick={() => handleNumpadPress('DEL')}
                            className="h-14 bg-red-900/50 hover:bg-red-900/70 active:bg-red-900 rounded-xl text-white shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            <Delete size={24} />
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={submitAnswer}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] rounded-xl text-xl font-bold text-white shadow-lg shadow-blue-600/20 transition-all"
                    >
                        Submit Answer
                    </button>
                </div>

            </div>

            {/* Submission Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                    <h2 className="text-2xl font-bold text-white">Saving Results...</h2>
                    <p className="text-slate-400 mt-2">Please do not close this window.</p>
                </div>
            )}
        </div>
    );
};

export default TestScreen;
