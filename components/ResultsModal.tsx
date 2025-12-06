import React from 'react';
import { TestAttempt } from '../types';
import ResultsScreen from './ResultsScreen';

interface ResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    attempt: TestAttempt | null;
}

const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, onClose, attempt }) => {
    if (!isOpen || !attempt) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] border border-slate-200 dark:border-slate-700 relative flex flex-col">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white z-10 p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="flex-1 overflow-hidden rounded-2xl">
                    <ResultsScreen attempt={attempt} onHome={onClose} />
                </div>
            </div>
        </div>
    );
};

export default ResultsModal;
