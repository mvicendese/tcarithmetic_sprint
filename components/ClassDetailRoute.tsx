import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClassDetailView from './ClassDetailView';
import * as api from '../services/firebaseService';
import { Class } from '../types';

interface ClassDetailRouteProps {
    backTo?: string; // Default: '/teacher'
}

const ClassDetailRoute: React.FC<ClassDetailRouteProps> = ({ backTo = '/teacher' }) => {
    const { classId } = useParams<{ classId: string }>();
    const navigate = useNavigate();
    const [classData, setClassData] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadClass = useCallback(async () => {
        if (!classId) return;
        setLoading(true);
        setError(null);
        try {
            let data: Class;
            if (classId === 'no-class') {
                data = await api.getNoClass();
            } else {
                data = await api.getClassById(classId);
            }
            setClassData(data);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Failed to load class');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        loadClass();
    }, [loadClass]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-slate-500 dark:text-slate-400">Loading class...</div>
            </div>
        );
    }

    if (error || !classData) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-red-500 font-bold text-lg mb-2">Error</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">{error || 'Class not found'}</p>
                    <button
                        onClick={() => navigate(backTo)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Determine ribbon color based on context
    const ribbonClass = backTo === '/admin'
        ? 'h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500'
        : 'h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Gradient Ribbon Bar */}
            <div className={ribbonClass} />
            <div className="p-4 md:p-8">
                <ClassDetailView
                    aClass={classData}
                    onBack={() => navigate(backTo)}
                    onDataUpdate={loadClass}
                />
            </div>
        </div>
    );
};

export default ClassDetailRoute;
