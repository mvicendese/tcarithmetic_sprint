import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PasswordResetModal from './PasswordResetModal';

const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        let loginEmail = email.trim();
        if (!loginEmail.includes('@')) {
            loginEmail += '@tc.vic.edu.au';
        }
        try {
            await login(loginEmail, password);
        } catch (e: any) {
            console.error(e);
            setError(e.message ?? 'Login failed.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 transition-colors duration-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-8 border border-slate-200 dark:border-slate-700 animate-fade-in transition-colors duration-200">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent mb-2">
                        Arithmetic Sprint
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Sign in to continue</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email or Username</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="text"
                            placeholder="username or name@school.edu"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setResetEmail('');
                                    setShowPasswordReset(true);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02]"
                    >
                        Sign In
                    </button>
                </form>

                <div className="text-center text-xs text-slate-500 mt-6">
                    &copy; 2025 Arithmetic Sprint. All rights reserved.
                </div>
            </div>

            <PasswordResetModal
                isOpen={showPasswordReset}
                onClose={() => setShowPasswordReset(false)}
                initialEmail={resetEmail}
            />
        </div>
    );
};

export default LoginScreen;
