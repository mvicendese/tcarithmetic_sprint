import React, { useState, useEffect, useCallback } from 'react';
import { Class, StudentUser, User, TeacherUser } from '../types';
import * as api from '../services/firebaseService';
import { analyzeClassForGroupings } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import BulkAddModal from './BulkAddModal';
import BulkStudentEdit from './BulkStudentEdit';
import TeacherDashboard from './TeacherDashboard';
import StudentProfileView from './StudentProfileView';
import ErrorBoundary from './ErrorBoundary';

const ClassDetailView: React.FC<{
    aClass: Class;
    onBack: () => void;
    onDataUpdate?: () => void;
}> = ({
    aClass,
    onBack,
    onDataUpdate
}) => {
        const { logout, changePassword } = useAuth();
        const onLogout = logout;
        const onChangePassword = changePassword;

        const [selectedTeacher, setSelectedTeacher] = useState<TeacherUser | null>(null);
        const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);

        const [allUsers, setAllUsers] = useState<User[]>([]);
        const [students, setStudents] = useState<StudentUser[]>([]);
        const [teachers, setTeachers] = useState<TeacherUser[]>([]);
        const [isLoading, setIsLoading] = useState(true);

        const [searchTerm, setSearchTerm] = useState('');
        const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
        const [classGroupings, setClassGroupings] = useState('');
        const [isLoadingGroupings, setIsLoadingGroupings] = useState(false);
        const [showCreateStudent, setShowCreateStudent] = useState(false);
        const [showBulkAddModal, setShowBulkAddModal] = useState(false);
        const [bulkAddInitialData, setBulkAddInitialData] = useState<Partial<StudentUser>[]>([]);
        const [showBulkEdit, setShowBulkEdit] = useState(false);
        const [newStudentForm, setNewStudentForm] = useState({ firstName: '', surname: '', email: '', yearLevel: '' });

        const fetchData = useCallback(async (showLoading = true) => {
            if (showLoading) setIsLoading(true);
            try {
                const users = await api.getAllUsers();
                setAllUsers(users);

                // Source of Truth: User documents (more reliable than class.studentIds)
                const studentUsers = users.filter(u =>
                    u.role === 'student' && (u.classIds || []).includes(aClass.id)
                ) as StudentUser[];
                setStudents(studentUsers);

                const teacherIds = aClass.teacherIds || [];
                const teacherUsers = users.filter(u => u.role === 'teacher' && teacherIds.includes(u.id)) as TeacherUser[];
                setTeachers(teacherUsers);
            } catch (e) {
                console.error('Failed to fetch class details:', e);
            } finally {
                if (showLoading) setIsLoading(false);
            }
        }, [aClass.id, aClass.teacherIds]);

        useEffect(() => {
            fetchData();
        }, [fetchData]);

        const availableStudents = allUsers.filter(
            u =>
                u.role === 'student' &&
                !(aClass.studentIds || []).includes(u.id) &&
                `${u.firstName} ${u.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const availableTeachers = allUsers.filter(
            u =>
                u.role === 'teacher' &&
                !(aClass.teacherIds || []).includes(u.id) &&
                `${u.firstName} ${u.surname}`.toLowerCase().includes(teacherSearchTerm.toLowerCase())
        );

        const toggleLock = async (studentId: string) => {
            const student = students.find(s => s.id === studentId);
            if (!student) return;
            try {
                await api.updateUser(studentId, { locked: !student.locked });
                setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, locked: !s.locked } : s)));
            } catch (e) {
                console.error(e);
            }
        };

        const toggleAIApproval = async (studentId: string) => {
            const student = students.find(s => s.id === studentId);
            if (!student) return;
            try {
                await api.updateUser(studentId, { aiApproved: !student.aiApproved });
                setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, aiApproved: !s.aiApproved } : s)));
            } catch (e) {
                console.error(e);
            }
        };

        const addStudent = async (studentId: string) => {
            try {
                await api.addStudentToClass(aClass.id, studentId);

                // Find the student in allUsers and add to local state
                const studentToAdd = allUsers.find(u => u.id === studentId && u.role === 'student') as StudentUser;
                if (studentToAdd) {
                    setStudents(prev => [...prev, studentToAdd]);
                }
                if (onDataUpdate) onDataUpdate();
            } catch (e) {
                console.error(e);
                alert('Failed to add student. Ensure they are enrolled.');
            }
        };

        const removeStudent = async (studentId: string) => {
            if (!window.confirm('Remove student from this class?')) return;
            try {
                await api.removeStudentFromClass(aClass.id, studentId);
                fetchData();
                if (onDataUpdate) onDataUpdate();
            } catch (e) {
                console.error(e);
            }
        };

        const addTeacher = async (teacherId: string) => {
            try {
                await api.addTeacherToClass(aClass.id, teacherId);
                fetchData();
                if (onDataUpdate) onDataUpdate();
            } catch (e) {
                console.error(e);
            }
        };

        const removeTeacher = async (teacherId: string) => {
            if (!window.confirm('Remove teacher from this class?')) return;
            try {
                await api.removeTeacherFromClass(aClass.id, teacherId);
                fetchData();
                if (onDataUpdate) onDataUpdate();
            } catch (e) {
                console.error(e);
            }
        };

        const toggleLockAll = async (lock: boolean) => {
            try {
                const promises = students.map(s => api.updateUser(s.id, { locked: lock }));
                await Promise.all(promises);
                setStudents(prev => prev.map(s => ({ ...s, locked: lock })));
            } catch (e) {
                console.error(e);
            }
        };

        const handleCreateAndAddStudent = async (e: React.FormEvent) => {
            e.preventDefault();
            const { firstName, surname, email, yearLevel } = newStudentForm;
            if (!firstName.trim() || !surname.trim()) return;
            try {
                const newStudent = await api.createStudentAndAddToClass({
                    firstName,
                    surname,
                    password: 'password',
                    email
                }, aClass.id, yearLevel ? parseInt(yearLevel) : 7);

                // Add the new student to local state instead of reloading
                setStudents(prev => [...prev, newStudent]);

                setNewStudentForm({ firstName: '', surname: '', email: '', yearLevel: '' });
                setShowCreateStudent(false);
            } catch (e) {
                console.error(e);
                console.error(e);
                alert(`Failed to create student: ${(e as Error).message}`);
            }
        };

        const handleGetGroupings = async () => {
            setIsLoadingGroupings(true);
            setClassGroupings('');
            try {
                const studentDataForClass = students
                    .map(s => ({
                        studentName: `${s.firstName} ${s.surname}`,
                        data: s
                    }));
                await analyzeClassForGroupings(studentDataForClass, chunk => {
                    setClassGroupings(prev => prev + chunk);
                });
            } catch (e) {
                console.error(e);
                setClassGroupings('Could not analyze groupings at this time.');
            } finally {
                setIsLoadingGroupings(false);
            }
        };

        if (isLoading) return <div>Loading class details...</div>;

        if (selectedTeacher) {
            return (
                <div className="space-y-4">
                    <button
                        onClick={() => setSelectedTeacher(null)}
                        className="mb-4 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                        Back to Class Detail
                    </button>
                    <TeacherDashboard user={selectedTeacher} />
                </div>
            );
        }

        if (selectedStudent) {
            return (
                <ErrorBoundary>
                    <StudentProfileView student={selectedStudent} onBack={() => setSelectedStudent(null)} />
                </ErrorBoundary>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg min-h-[80vh] flex flex-col">
                {showBulkAddModal && (
                    <BulkAddModal
                        classId={aClass.id}
                        onClose={() => setShowBulkAddModal(false)}
                        onProceedToEdit={(newStudents) => {
                            setBulkAddInitialData(newStudents);
                            setShowBulkAddModal(false);
                            setShowBulkEdit(true);
                        }}
                    />
                )}

                {showBulkEdit && (
                    <BulkStudentEdit
                        students={students}
                        classId={aClass.id}
                        initialNewStudents={bulkAddInitialData}
                        onClose={() => {
                            setShowBulkEdit(false);
                            setBulkAddInitialData([]); // Reset
                        }}
                        onSave={() => {
                            setShowBulkEdit(false);
                            setBulkAddInitialData([]);
                            fetchData(false); // Refresh data gracefully
                            if (onDataUpdate) onDataUpdate();
                        }}
                    />
                )}

                <div className="mb-8">
                    <button
                        onClick={onBack}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mb-4 flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Back to Dashboard
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white">{aClass.name}</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => toggleLockAll(true)}
                                className="bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/50 font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Lock All
                            </button>
                            <button
                                onClick={() => toggleLockAll(false)}
                                className="bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-500 border border-green-200 dark:border-green-500/50 font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                </svg>
                                Unlock All
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
                    <div className="space-y-6">
                        {aClass.id !== 'no-class' && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-semibold text-slate-600 dark:text-slate-400 mb-2 text-sm uppercase tracking-wider">
                                    Teachers
                                </h4>
                                <div className="space-y-2">
                                    {teachers.map(t => (
                                        <div key={t.id} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-700 dark:text-slate-300">
                                                {t.firstName} {t.surname}
                                            </span>
                                            <button
                                                onClick={() => removeTeacher(t.id)}
                                                className="text-slate-400 hover:text-red-500"
                                                aria-label="Remove teacher"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <input
                                            type="text"
                                            placeholder="Add teacher..."
                                            value={teacherSearchTerm}
                                            onChange={e => setTeacherSearchTerm(e.target.value)}
                                            className="w-full p-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                        />
                                        {teacherSearchTerm && (
                                            <div className="mt-1 max-h-24 overflow-y-auto bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 shadow-lg">
                                                {availableTeachers.map(t => (
                                                    <div
                                                        key={t.id}
                                                        className="flex justify-between items-center p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                        onClick={() => addTeacher(t.id)}
                                                    >
                                                        <span className="text-xs text-slate-900 dark:text-slate-200">
                                                            {t.firstName} {t.surname}
                                                        </span>
                                                        <span className="text-blue-500 text-xs">+</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-600 transition-colors duration-200">
                            <h4 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Student Search
                            </h4>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full p-3 pl-10 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-slate-400 absolute left-3 top-3.5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>

                            {searchTerm && (
                                <div className="mt-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                    {availableStudents.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-2">No students found.</p>
                                    ) : (
                                        availableStudents.map(s => (
                                            <div
                                                key={s.id}
                                                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 transition-colors"
                                            >
                                                <button
                                                    onClick={() => setSelectedStudent(s as StudentUser)}
                                                    className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                                >
                                                    {s.firstName} {s.surname}
                                                </button>
                                                <button
                                                    onClick={() => addStudent(s.id)}
                                                    className="px-3 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 font-bold transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-700 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-600 transition-colors duration-200">
                            <button
                                onClick={() => setShowCreateStudent(!showCreateStudent)}
                                className="flex items-center justify-between w-full text-left font-bold text-lg text-slate-800 dark:text-white mb-2"
                            >
                                <span className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    Add Student
                                </span>
                                <span className="font-mono">{showCreateStudent ? '-' : '+'}</span>
                            </button>

                            {showCreateStudent && (
                                <form onSubmit={handleCreateAndAddStudent} className="space-y-3 mt-4">
                                    <input
                                        type="email"
                                        placeholder="Email (Optional)"
                                        value={newStudentForm.email}
                                        onChange={e => setNewStudentForm(s => ({ ...s, email: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={newStudentForm.firstName}
                                        onChange={e => setNewStudentForm(s => ({ ...s, firstName: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Surname"
                                        value={newStudentForm.surname}
                                        onChange={e => setNewStudentForm(s => ({ ...s, surname: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Year Level (Default: 7)"
                                        value={newStudentForm.yearLevel}
                                        onChange={e => setNewStudentForm(s => ({ ...s, yearLevel: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        min="1"
                                        max="12"
                                    />
                                    <button
                                        type="submit"
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95"
                                    >
                                        Create & Add
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowBulkEdit(true)}
                                className="w-full py-4 px-6 bg-white dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-xl text-slate-500 dark:text-slate-300 font-bold hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Bulk Edit
                            </button>
                            <button
                                onClick={() => setShowBulkAddModal(true)}
                                className="w-full py-4 px-6 bg-white dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-xl text-slate-500 dark:text-slate-300 font-bold hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Bulk Add
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200 dark:border-slate-600 flex-grow">
                            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200 flex justify-between items-center">
                                <span className="text-sm font-normal text-slate-500 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-full">
                                    {students.length} Enrolled
                                </span>
                            </h3>

                            <div className="space-y-3">
                                {students.length === 0 && (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                                        <p>No students in this class yet.</p>
                                        <p className="text-sm mt-2">Use the tools on the left to add students.</p>
                                    </div>
                                )}
                                {students.map(s => (
                                    <div
                                        key={s.id}
                                        className="group flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50"
                                    >
                                        <button onClick={() => setSelectedStudent(s)} className="text-left flex-grow flex flex-col">
                                            <span className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-400 transition-colors">
                                                {s.firstName} {s.surname}
                                            </span>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                <span>
                                                    Level: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{s.currentLevel || 1}</span>
                                                </span>
                                                <span>
                                                    Year: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{s.yearLevel || 'N/A'}</span>
                                                </span>
                                                {s.password && (
                                                    <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{s.password}</code>
                                                )}
                                            </div>
                                            {s.recentTests && s.recentTests.length > 0 && (
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                                    <span>Last: {s.recentTests[0].score}% (L{s.recentTests[0].level})</span>
                                                    {s.recentTests[0].timeRemaining > 60 && <span className="text-green-500 font-bold">⚡ Super Fast</span>}
                                                </div>
                                            )}
                                        </button>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleAIApproval(s.id)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${s.aiApproved
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                                    : 'bg-slate-100 dark:bg-slate-700 opacity-50 hover:opacity-100'
                                                    }`}
                                                title={s.aiApproved ? `Turn off ai analysis for ${s.firstName}` : `Turn on ai analysis for ${s.firstName}`}
                                            >
                                                <img src="/favicon.svg" alt="AI Ready" className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => toggleLock(s.id)}
                                                className={`p-2 rounded-lg transition-colors ${s.locked
                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600 dark:bg-slate-700 dark:hover:bg-green-900/30 dark:hover:text-green-400'
                                                    }`}
                                                title={s.locked ? `Turn on access to tests for ${s.firstName}` : `Turn off access to tests for ${s.firstName}`}
                                            >
                                                {s.locked ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => removeStudent(s.id)}
                                                className="p-2 rounded-lg transition-colors bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                                title={`Remove ${s.firstName} from ${aClass.name}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-slate-800 dark:text-white">Class Groupings (AI)</h4>
                                <button
                                    onClick={handleGetGroupings}
                                    disabled={isLoadingGroupings}
                                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {isLoadingGroupings ? 'Analyzing...' : 'Generate'}
                                </button>
                            </div>
                            <div className="min-h-[120px] rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                {classGroupings || 'Run an analysis to get suggested groupings.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

export default ClassDetailView;
