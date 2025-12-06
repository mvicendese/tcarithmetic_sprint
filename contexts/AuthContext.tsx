import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, TeacherUser, StudentUser } from '../types';
import * as api from '../services/firebaseService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    changePassword: () => void;
    // We expose these for the UI to bind to
    showPasswordReset: boolean;
    setShowPasswordReset: (show: boolean) => void;
    resetEmail: string;
    setResetEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await api.onAuthStateChangedPromise();
                if (currentUser) {
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const loggedInUser = await api.loginWithEmailPassword(email, password);
            setUser(loggedInUser);
        } catch (error) {
            throw error; // Re-throw for UI to handle
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.logout();
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const refreshUser = async () => {
        if (user) {
            try {
                const updatedUser = await api.getUserProfile(user.id);
                setUser(updatedUser);
            } catch (error) {
                console.error('Failed to refresh user:', error);
            }
        }
    };

    const changePassword = () => {
        if (user) {
            setResetEmail(user.email);
            setShowPasswordReset(true);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        refreshUser,
        changePassword,
        showPasswordReset,
        setShowPasswordReset,
        resetEmail,
        setResetEmail
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
