import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/firebaseService';
import { TeacherUser, StudentUser, Class, TestAttempt } from '../types';
import { useAuth } from '../contexts/AuthContext';
import AdminParameterEditor from './AdminParameterEditor';
import { ThemeToggle } from './ThemeToggle';
import StudentTest from './StudentTest';
import ResultsScreen from './ResultsScreen';
import ClassDetailView from './ClassDetailView';
import TeacherDashboard from './TeacherDashboard';

const AdminDashboard: React.FC = () => {
    const { logout, changePassword } = useAuth();
    const navigate = useNavigate();
    const onLogout = logout;
    const onChangePassword = changePassword;

    const onSwitchToTeacherView = () => {
        navigate('/teacher');
    };

    // Data State
    const [teachers, setTeachers] = useState<TeacherUser[]>([]);
    const [students, setStudents] = useState<StudentUser[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherUser | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);

    // Form State - Add Staff
    const [newStaffEmail, setNewStaffEmail] = useState('');
    // Password removed - defaults to "password"
    const [newStaffFirstName, setNewStaffFirstName] = useState('');
    const [newStaffSurname, setNewStaffSurname] = useState('');
    const [newStaffIsAdmin, setNewStaffIsAdmin] = useState(false);
    const [isAddingStaff, setIsAddingStaff] = useState(false);

    // Form State - Add Class
    const [newClassName, setNewClassName] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [isAddingClass, setIsAddingClass] = useState(false);

    // Student Search State
    const [studentQuery, setStudentQuery] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    // Test Drive State
    const [showTestDrive, setShowTestDrive] = useState(false);
    const [testDriveLevel, setTestDriveLevel] = useState(1);
    const [isTestDriving, setIsTestDriving] = useState(false);
    const [testAttempt, setTestAttempt] = useState<TestAttempt | null>(null);

    // Parameter Editor State
    const [showParamEditor, setShowParamEditor] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Load teachers and students first
            const [allTeachers, allStudents] = await Promise.all([
                api.getAllTeachers(),
                api.getAllStudents()
            ]);
            setTeachers(allTeachers);
            setStudents(allStudents);

            // Load classes
            try {
                const allClasses = await api.getAllClasses();
                setClasses(allClasses);
            } catch (error) {
                console.error("Failed to load classes", error);
            }

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAdmin = async (teacher: TeacherUser, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to ${teacher.isAdmin ? 'revoke' : 'grant'} admin rights for ${teacher.firstName}?`)) return;

        try {
            await api.updateTeacherAdminStatus(teacher.id, !teacher.isAdmin);
            setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, isAdmin: !teacher.isAdmin } : t));
        } catch (error) {
            console.error("Failed to toggle admin", error);
            alert("Failed to update admin status");
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaffEmail || !newStaffFirstName || !newStaffSurname) return;

        setIsAddingStaff(true);
        try {
            const newTeacher = await api.createTeacher(newStaffEmail, newStaffFirstName, newStaffSurname, newStaffIsAdmin);
            setTeachers([...teachers, newTeacher]);
            setNewStaffEmail('');
            // Password reset removed
            setNewStaffFirstName('');
            setNewStaffSurname('');
            setNewStaffIsAdmin(false);
        } catch (error) {
            console.error("Failed to add staff", error);
            alert(`Failed to add staff member: ${(error as Error).message}`);
        } finally {
            setIsAddingStaff(false);
        }
    };

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName || !selectedTeacherId) return;

        setIsAddingClass(true);
        try {
            const newClass = await api.createClass(newClassName, selectedTeacherId);
            setClasses([...classes, newClass]);
            setNewClassName('');
            const updatedTeachers = await api.getAllTeachers();
            setTeachers(updatedTeachers);
        } catch (error) {
            console.error("Failed to add class", error);
            alert("Failed to add class");
        } finally {
            setIsAddingClass(false);
        }
    };

    // Test Drive Logic
    const startTestDrive = () => {
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
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse">Loading Admin Dashboard...</div>;
    }

    // View Parameter Editor
    if (showParamEditor) {
        return <AdminParameterEditor onBack={() => setShowParamEditor(false)} />;
    }

    // View Teacher Dashboard
    if (selectedTeacher) {
        return (
            <div className="min-h-screen bg-slate-900">
                <div className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto">
                        <button
                            onClick={() => setSelectedTeacher(null)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors font-medium"
                        >
                            &larr; Back to Admin Dashboard
                        </button>
                    </div>
                </div>
                <TeacherDashboard
                    user={selectedTeacher}
                    onSwitchToAdminView={() => setSelectedTeacher(null)} // Reusing this prop to go back
                />
            </div>
        );
    }

    if (selectedClass) {
        return (
            <div className="min-h-screen bg-slate-900">
                <div className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto">
                        <button
                            onClick={() => setSelectedClass(null)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors font-medium"
                        >
                            &larr; Back to Admin Dashboard
                        </button>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto p-6">
                    <ClassDetailView aClass={selectedClass} onBack={() => setSelectedClass(null)} />
                </div>
            </div>
        );
    }

    // Test Drive Render
    if (showTestDrive && isTestDriving) {
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-200">
            {/* Header */}
            <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-6 sticky top-0 z-10 transition-colors duration-200">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 bg-clip-text text-transparent">
                            Admin
                        </h1>
                        <button
                            onClick={onSwitchToTeacherView}
                            className="px-4 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white text-sm transition-all font-medium"
                        >
                            Switch to Teach
                        </button>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={() => setShowParamEditor(true)}
                            className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold shadow-lg transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-600"
                        >
                            <span>⚙️ Parameters</span>
                        </button>
                        <ThemeToggle />
                        <button
                            onClick={() => setShowTestDrive(true)}
                            className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105 flex items-center gap-2"
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
                <div className="max-w-7xl mx-auto px-6 pb-2 flex justify-end">

                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Top Left: Teachers */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Teachers</h2>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-700 h-[500px] flex flex-col transition-colors duration-200">
                            <div className="overflow-y-auto custom-scrollbar flex-grow pr-2 space-y-3">
                                {teachers.map(teacher => (
                                    <div
                                        key={teacher.id}
                                        onClick={() => setSelectedTeacher(teacher)}
                                        className="group p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-500/50 transition-all duration-200 flex justify-between items-center cursor-pointer"
                                    >
                                        <div>
                                            <div className={`font-bold text-lg ${teacher.isAdmin ? 'text-sky-600 dark:text-sky-400' : 'text-slate-800 dark:text-white'} group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors`}>
                                                {teacher.firstName} {teacher.surname}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">{teacher.email}</div>
                                        </div>
                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                            <span className={`text-sm font-bold transition-colors ${teacher.isAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                ADMIN
                                            </span>
                                            <button
                                                onClick={(e) => handleToggleAdmin(teacher, e)}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${teacher.isAdmin ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${teacher.isAdmin ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Right: Add Staff */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Add Staff</h2>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 h-[500px] overflow-y-auto custom-scrollbar transition-colors duration-200">
                            <form onSubmit={handleAddStaff} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={newStaffEmail}
                                        onChange={e => setNewStaffEmail(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="teacher@school.edu"
                                        required
                                    />
                                </div>
                                {/* Password field removed - defaults to "password" */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={newStaffFirstName}
                                            onChange={e => setNewStaffFirstName(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                            placeholder="Jane"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Surname</label>
                                        <input
                                            type="text"
                                            value={newStaffSurname}
                                            onChange={e => setNewStaffSurname(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                                            placeholder="Doe"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <label className="text-slate-700 dark:text-slate-300 font-medium flex-grow">Grant Admin Privileges?</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewStaffIsAdmin(!newStaffIsAdmin)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${newStaffIsAdmin ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${newStaffIsAdmin ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAddingStaff}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAddingStaff ? 'Adding Staff...' : 'Add Staff Member'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Bottom Left: Classes */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Classes</h2>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-700 h-[500px] flex flex-col transition-colors duration-200">
                            <div className="overflow-y-auto custom-scrollbar flex-grow pr-2 space-y-3">
                                {classes.map(cls => {
                                    const teacher = teachers.find(t => (cls.teacherIds || []).includes(t.id));
                                    return (
                                        <button
                                            key={cls.id}
                                            type="button"
                                            onClick={() => setSelectedClass(cls)}
                                            className="w-full text-left group p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all duration-200 flex justify-between items-center cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-bold px-3 py-1 rounded-lg shadow-sm">
                                                    {cls.name}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                    {teacher ? `${teacher.firstName} ${teacher.surname}` : 'No Teacher'}
                                                </div>
                                                <div className="text-sm text-slate-500">{(cls.studentIds || []).length} students</div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {classes.length === 0 && (
                                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                                        No classes found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right: Add Class & Student Search */}
                    <div className="space-y-8">
                        {/* Add Class */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Add Class</h2>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                                <form onSubmit={handleAddClass} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Class Name</label>
                                        <input
                                            type="text"
                                            value={newClassName}
                                            onChange={e => setNewClassName(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-900 dark:text-white"
                                            placeholder="e.g. 9B Science"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Assign Teacher</label>
                                        <select
                                            value={selectedTeacherId}
                                            onChange={e => setSelectedTeacherId(e.target.value)}
                                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white transition-all"
                                            required
                                        >
                                            <option value="">Select a Teacher...</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.firstName} {t.surname}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isAddingClass}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAddingClass ? 'Creating Class...' : 'Create Class'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Student Search */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Student Search</h2>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-200">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={studentQuery}
                                        onChange={e => {
                                            setStudentQuery(e.target.value);
                                            setShowStudentDropdown(!!e.target.value);
                                        }}
                                        className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all pl-11 text-slate-900 dark:text-white"
                                        placeholder="Search students..."
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>

                                    {showStudentDropdown && (
                                        <div className="absolute w-full mt-2 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-20 custom-scrollbar">
                                            {students
                                                .filter(s => s.firstName.toLowerCase().includes(studentQuery.toLowerCase()) || s.surname.toLowerCase().includes(studentQuery.toLowerCase()))
                                                .map(s => (
                                                    <div key={s.id} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors">
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
                                    + Add Student (via Class View)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
