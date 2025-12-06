import React, { useState, useEffect } from 'react';
import * as api from '../services/firebaseService';

interface PasswordResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialEmail?: string;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose, initialEmail = '' }) => {
    const [email, setEmail] = useState(initialEmail);
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setEmail(initialEmail);
            setStatus('idle');
            setError(null);
        }
    }, [isOpen, initialEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        setError(null);
        try {
            let resetEmail = email.trim();
            if (!resetEmail.includes('@')) {
                resetEmail += '@tc.vic.edu.au';
            }
            await api.sendPasswordReset(resetEmail);
            setStatus('sent');
        } catch (e: any) {
            console.error(e);
            setError(e.message ?? 'Failed to send reset email.');
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {status === 'sent' ? 'Check your email' : 'Reset Password'}
                </h2>

                {status === 'sent' ? (
                    <div className="space-y-6">
                        <p className="text-slate-600 dark:text-slate-300">
                            We've sent a password reset link to <strong>{email}</strong>.
                            Please check your inbox and follow the instructions to reset your password.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <p className="text-slate-600 dark:text-slate-300">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="text"
                                placeholder="username or name@school.edu"
                                required
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                            >
                                {status === 'sending' ? 'Sending...' : 'Send Link'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PasswordResetModal;
