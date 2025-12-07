import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClassDetailView from './ClassDetailView';
import * as api from '../services/firebaseService';
import { Class } from '../types';

const ClassDetailRoute: React.FC = () => {
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
                        onClick={() => navigate('/teacher')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
            <ClassDetailView
                aClass={classData}
                onBack={() => navigate('/teacher')}
                onDataUpdate={loadClass}
            />
        </div>
    );
};

export default ClassDetailRoute;
