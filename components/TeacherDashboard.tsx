import React, { useState, useEffect } from 'react';
import { TeacherUser, StudentUser, Class, TestAttempt } from '../types';
import * as api from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import ClassDetailView from './ClassDetailView';
import StudentTest from './StudentTest';
import ResultsScreen from './ResultsScreen';
import { ThemeToggle } from './ThemeToggle';

import { useNavigate } from 'react-router-dom';

interface TeacherDashboardProps {
    user?: TeacherUser;
    onSwitchToAdminView?: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onSwitchToAdminView }) => {
    const { user: authUser, logout, changePassword } = useAuth();
    const currentUser = (user || authUser) as TeacherUser;
    const navigate = useNavigate();

    const onLogout = logout;
    const onChangePassword = changePassword;

    // State
    const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<StudentUser[]>([]);
    // selectedClassId removed in favor of routing
    const [isLoading, setIsLoading] = useState(true);

    const [newClassName, setNewClassName] = useState('');
    const [isCreatingClass, setIsCreatingClass] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Test Drive State
    const [showTestDrive, setShowTestDrive] = useState(false);
    const [testDriveLevel, setTestDriveLevel] = useState(1);
    const [isTestDriving, setIsTestDriving] = useState(false);
    const [testAttempt, setTestAttempt] = useState<TestAttempt | null>(null);

    // Student Search UI
    const [studentQuery, setStudentQuery] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);

    // UI for Test Drive
    const [testDriveUser, setTestDriveUser] = useState<StudentUser | null>(null);

    useEffect(() => {
        if (currentUser?.id) {
            fetchData();
        }
    }, [currentUser?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch teacher's classes
            const classes = await api.getClassesForTeacher(currentUser.id);
            setTeacherClasses(classes);

            // Fetch all students for search
            const allUsers = await api.getAllUsers();
            const studentUsers = allUsers.filter((u) => u.role === 'student') as StudentUser[];
            setStudents(studentUsers);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim()) return;
        setIsCreatingClass(true);
        try {
            const newClass = await api.createClass(newClassName, currentUser.id);
            setTeacherClasses((prev) => [...prev, newClass]);
            setNewClassName('');
        } catch (error) {
            console.error('Failed to create class:', error);
        } finally {
            setIsCreatingClass(false);
        }
    };

    const handleLeaveClass = async (classId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to leave this class?')) return;
        try {
            await api.removeTeacherFromClass(classId, currentUser.id);
            setTeacherClasses((prev) => prev.filter((c) => c.id !== classId));
        } catch (error) {
            console.error('Failed to leave class:', error);
            alert('Failed to leave class. Please try again.');
        }
    };

    const handleDeleteClass = async (classId: string, className: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete "${className}"?\n\nStudents will NOT be deleted - they will be moved to "No Class".`)) {
            return;
        }
        try {
            await api.deleteClass(classId);
            setTeacherClasses((prev) => prev.filter((c) => c.id !== classId));
        } catch (error) {
            console.error('Failed to delete class:', error);
            alert(`Failed to delete class: ${(error as Error).message}`);
        }
    };

    const startTestDrive = () => {
        const testUser: StudentUser = {
            ...currentUser,
            role: 'student',
            classIds: [],
            yearLevel: 0,
            locked: false,
            currentLevel: testDriveLevel,
            consecutiveFastTrackCount: 0,
            aiApproved: false,
            firstName: currentUser.firstName,
            surname: currentUser.surname,
            email: currentUser.email,
            id: currentUser.id
        } as unknown as StudentUser;

        setTestDriveUser(testUser);
        setIsTestDriving(true);
        setShowTestDrive(true);
    };

    const handleTestComplete = (attempt: TestAttempt) => {
        setTestAttempt(attempt);
        setIsTestDriving(false);
        setShowTestDrive(false);
    };

    const closeTestDrive = () => {
        setShowTestDrive(false);
        setIsTestDriving(false);
        setTestAttempt(null);
        setTestDriveLevel(1);
        setTestDriveUser(null);
    };

    const handleStudentSelect = (student: StudentUser) => {
        setSelectedStudent(student);
        setShowStudentDropdown(false);
        setStudentQuery('');
    };

    // Loading / error handling
    if (isLoading) {
        return <div className="p-8 text-center text-slate-400 animate-pulse">Loading dashboard...</div>;
    }

    // Removed: Class Detail View Rendering (now handled by Router)

    // Test Drive UI
    if (showTestDrive && isTestDriving && testDriveUser) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto animate-fade-in">
                <div className="p-4 h-full flex flex-col">
                    <button onClick={() => setIsTestDriving(false)} className="mb-4 text-blue-400 hover:underline flex items-center gap-2">
                        &larr; Back to Level Selection
                    </button>
                    <div className="flex-grow">
                        <StudentTest
                            level={testDriveLevel}
                            onComplete={handleTestComplete}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (showTestDrive && testAttempt) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto animate-fade-in">
                <ResultsScreen attempt={testAttempt} onHome={closeTestDrive} />
            </div>
        );
    }

    if (showTestDrive) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
                    <h2 className="text-3xl font-bold mb-6 text-white">Test Drive</h2>
                    <p className="mb-6 text-slate-400">Select a level to test. Results will not be saved.</p>
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Level</label>
                        <select
                            value={testDriveLevel}
                            onChange={(e) => setTestDriveLevel(Number(e.target.value))}
                            className="w-full p-4 rounded-xl border border-slate-600 bg-slate-900 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        >
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((l) => (
                                <option key={l} value={l}>Level {l}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={startTestDrive}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02]"
                        >
                            Start Test
                        </button>
                        <button
                            onClick={closeTestDrive}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main Teacher Dashboard Layout
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-200">
            {/* Gradient Ribbon Bar */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            {/* Header Banner */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-6 sticky top-0 z-10 transition-colors duration-200">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-500 bg-clip-text text-transparent">
                            {currentUser.firstName} {currentUser.surname}
                        </h1>
                        {onSwitchToAdminView && (
                            <button
                                onClick={onSwitchToAdminView}
                                className="px-4 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white text-sm transition-all font-medium"
                            >
                                Switch to Admin
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 items-center">
                        <ThemeToggle />
                        <button
                            className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105 flex items-center gap-2"
                            onClick={() => setShowTestDrive(true)}
                        >
                            <span>🚗 Test Drive</span>
                        </button>
                        <button
                            onClick={onChangePassword}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium ml-2"
                        >
                            Change Password
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                            onClick={onLogout}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: My Classes */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full transition-colors duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Classes</h2>
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className="text-sm px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                {showArchived ? 'Hide Archived' : 'Show Archived'}
                            </button>
                        </div>

                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {teacherClasses
                                .filter((c) => (showArchived ? c.archived : !c.archived))
                                .map((c) => (
                                    <div key={c.id} className="group relative">
                                        <div
                                            onClick={() => navigate(`/teacher/class/${c.id}`)}
                                            className="w-full text-left p-5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-600/20 border border-slate-200 dark:border-slate-600 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">{c.name}</h3>
                                                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{(c.studentIds || []).length} Students</p>
                                                </div>
                                                {/* Green arrow removed as per user request */}
                                            </div>
                                        </div>
                                        <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {c.id !== 'no-class' && (c.teacherIds || []).includes(currentUser.id) && (
                                                <button
                                                    onClick={(e) => handleDeleteClass(c.id, c.name, e)}
                                                    title="Delete Class"
                                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleLeaveClass(c.id, e)}
                                                className="px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 border border-slate-500/30 rounded-lg text-xs font-bold transition-all"
                                            >
                                                Leave
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            {teacherClasses.length === 0 && (
                                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                                    <p>You haven't joined any classes yet.</p>
                                    <p className="text-sm mt-2">Create one on the right!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Add Class & Student Search */}
                    <div className="space-y-8">
                        {/* Add Class */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-200">Add Class</h2>
                            <form onSubmit={handleCreateClass} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Class Name</label>
                                    <input
                                        type="text"
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        placeholder="e.g. 9B Science"
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreatingClass || !newClassName.trim()}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreatingClass ? 'Creating Class...' : 'Create Class'}
                                </button>
                            </form>
                        </div>

                        {/* Student Search */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Student Search</h2>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search students by name or email..."
                                    value={studentQuery}
                                    onChange={(e) => {
                                        setStudentQuery(e.target.value);
                                        setShowStudentDropdown(!!e.target.value);
                                    }}
                                    className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all pl-11"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>

                                {showStudentDropdown && (
                                    <div className="absolute w-full mt-2 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-20 custom-scrollbar">
                                        {students
                                            .filter((s) => {
                                                const q = studentQuery.toLowerCase();
                                                return (
                                                    s.firstName.toLowerCase().includes(q) ||
                                                    s.surname.toLowerCase().includes(q) ||
                                                    s.email.toLowerCase().includes(q)
                                                );
                                            })
                                            .slice(0, 10)
                                            .map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                                                    onClick={() => handleStudentSelect(s)}
                                                >
                                                    <div className="font-bold text-slate-900 dark:text-white">{s.firstName} {s.surname}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.email}</div>
                                                </div>
                                            ))}
                                        {students.filter(s => s.firstName.toLowerCase().includes(studentQuery.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-slate-500">No students found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all font-medium">
                                + Add New Student (via Class View)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;