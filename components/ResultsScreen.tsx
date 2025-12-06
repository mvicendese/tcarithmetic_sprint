import React from 'react';
import { TestAttempt } from '../types';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const ResultsScreen: React.FC<{ attempt: TestAttempt, onHome: () => void }> = ({ attempt, onHome }) => {
    const percentage = Math.round((attempt.correctCount / attempt.totalQuestions) * 100);
    let message = "Good effort!";
    let color = "text-blue-500";

    if (percentage >= 90) {
        message = "Outstanding!";
        color = "text-green-500";
    } else if (percentage >= 70) {
        message = "Great job!";
        color = "text-blue-500";
    } else if (percentage < 50) {
        message = "Keep practicing!";
        color = "text-red-500";
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
            <h2 className={`text-5xl font-bold mb-4 ${color}`}>{message}</h2>
            <div className="text-8xl font-bold mb-8 text-slate-800 dark:text-white">
                {attempt.correctCount}/{attempt.totalQuestions}
            </div>
            <p className="text-2xl text-slate-600 dark:text-slate-300 mb-8">
                Score: {percentage}%
            </p>

            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg p-6 mb-8 shadow-inner max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold mb-4 text-left text-slate-700 dark:text-slate-300">Review:</h3>
                {attempt.answeredQuestions.map((q, i) => (
                    <div key={i} className={`flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 ${q.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        <div className="flex items-center gap-4 flex-1">
                            <span className="text-lg font-medium min-w-[150px]">
                                <Latex>{`$${q.questionText.replace(' = ?', '')} = ${q.submittedAnswer}$`}</Latex>
                            </span>
                            <span className="font-bold text-xl w-8">
                                {q.isCorrect ? '✓' : '✗'}
                            </span>
                        </div>

                        {/* Time Taken (Centered) */}
                        <div className="flex-1 text-center text-slate-400 text-sm font-mono">
                            {q.timeTakenSeconds ? `${Math.round(q.timeTakenSeconds)}s` : '-'}
                        </div>

                        <div className="flex-1 text-right">
                            {!q.isCorrect && (
                                <span className="text-green-500 font-bold opacity-100">
                                    (<Latex>{`$${q.correctAnswer}$`}</Latex>)
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onHome}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105"
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default ResultsScreen;
