import React, { useState } from 'react';
import { StudentUser } from '../types';
import * as api from '../services/firebaseService';

interface BulkStudentEditProps {
    students: StudentUser[];
    onClose: () => void;
    onSave: () => void;
    classId: string;
    initialNewStudents?: Partial<StudentUser>[];
}

const BulkStudentEdit: React.FC<BulkStudentEditProps> = ({ students, onClose, onSave, classId, initialNewStudents = [] }) => {
    const [editedStudents, setEditedStudents] = useState<StudentUser[]>(JSON.parse(JSON.stringify(students)));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newStudents, setNewStudents] = useState<Partial<StudentUser>[]>(initialNewStudents);

    const handleChange = (index: number, field: keyof StudentUser, value: any) => {
        const newEditedStudents = [...editedStudents];
        newEditedStudents[index] = { ...newEditedStudents[index], [field]: value };
        setEditedStudents(newEditedStudents);
    };

    const handleNewStudentChange = (index: number, field: keyof StudentUser, value: any) => {
        const updatedNewStudents = [...newStudents];
        updatedNewStudents[index] = { ...updatedNewStudents[index], [field]: value };
        setNewStudents(updatedNewStudents);
    };

    const addNewRow = () => {
        setNewStudents([...newStudents, { firstName: '', surname: '', email: '', yearLevel: 7 }]);
    };

    const removeNewRow = (index: number) => {
        const updatedNewStudents = [...newStudents];
        updatedNewStudents.splice(index, 1);
        setNewStudents(updatedNewStudents);
    };

    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [isProcessingPaste, setIsProcessingPaste] = useState(false);

    const handlePasteProcess = async () => {
        setIsProcessingPaste(true);
        const emails = pasteText.split(/[\s,;\n]+/).filter(e => e.includes('@'));
        const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];

        const addedRows: Partial<StudentUser>[] = [];

        for (const email of uniqueEmails) {
            // 1. Check if already in class (editedStudents)
            if (editedStudents.some(s => s.email.toLowerCase() === email)) continue;

            // 2. Check if already in newStudents list
            if (newStudents.some(s => s.email?.toLowerCase() === email)) continue;

            try {
                // 3. Check if exists in DB
                const existingUser = await api.getUserByEmail(email);

                if (existingUser && existingUser.role === 'student') {
                    // Scenario B: Existing student, not in class -> Pre-fill
                    addedRows.push({
                        email: existingUser.email,
                        firstName: existingUser.firstName,
                        surname: existingUser.surname,
                        yearLevel: (existingUser as any).yearLevel || 7
                    });
                } else {
                    // Scenario C: New student (or non-student email) -> Empty fields, red row
                    addedRows.push({
                        email: email,
                        firstName: '',
                        surname: '',
                        yearLevel: 7
                    });
                }
            } catch (e) {
                // Fallback to empty row if check fails
                addedRows.push({ email, firstName: '', surname: '', yearLevel: 7 });
            }
        }

        setNewStudents(prev => [...prev, ...addedRows]);
        setPasteText('');
        setShowPasteModal(false);
        setIsProcessingPaste(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        const errors: string[] = [];

        try {
            // 1. Update existing students
            const updatePromises = editedStudents.map(async (student, index) => {
                try {
                    const original = students[index];
                    if (
                        student.email !== original.email ||
                        student.firstName !== original.firstName ||
                        student.surname !== original.surname ||
                        student.yearLevel !== original.yearLevel
                    ) {
                        await api.updateUser(student.id, {
                            email: student.email,
                            firstName: student.firstName,
                            surname: student.surname,
                            yearLevel: Number(student.yearLevel)
                        });
                    }
                } catch (e: any) {
                    console.error(`Failed to update student ${student.email}:`, e);
                    errors.push(`Failed to update ${student.firstName} ${student.surname}: ${e.message}`);
                }
            });

            // 2. Create new students
            const createPromises = newStudents.map(async (student, index) => {
                // Skip completely empty rows
                if (!student.firstName && !student.surname && !student.email) return;

                if (!student.firstName) {
                    errors.push(`Row ${index + 1}: First Name is required.`);
                    return;
                }
                if (!student.surname) {
                    errors.push(`Row ${index + 1}: Surname is required.`);
                    return;
                }
                if (!student.email) {
                    errors.push(`Row ${index + 1}: Email is required.`);
                    return;
                }

                try {
                    console.log(`Processing student: ${student.email}`);

                    // Check if user already exists
                    const existingUser = await api.getUserByEmail(student.email);

                    if (existingUser) {
                        if (existingUser.role !== 'student') {
                            errors.push(`User ${student.email} exists but is not a student.`);
                            return;
                        }
                        console.log(`User ${student.email} exists. Adding to class ${classId}...`);
                        await api.addStudentToClass(classId, existingUser.id);
                    } else {
                        console.log(`Creating new student: ${student.firstName} ${student.surname}`);
                        await api.createStudentAndAddToClass({
                            firstName: student.firstName!.trim(),
                            surname: student.surname!.trim(),
                            email: student.email!.trim(),
                            password: 'password', // Default password
                        }, classId, Number(student.yearLevel || 7));
                    }
                } catch (e: any) {
                    console.error(`Failed to process student ${student.firstName} ${student.surname}:`, e);
                    errors.push(`Failed to create/add ${student.firstName} ${student.surname}: ${e.message}`);
                }
            });

            await Promise.all([...updatePromises, ...createPromises]);

            if (errors.length > 0) {
                setError(errors.join('\n'));
            } else {
                onSave();
            }
        } catch (err: any) {
            console.error("Failed to save bulk edits:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Bulk Edit Students</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowPasteModal(true)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-sm flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                            Paste Emails
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Paste Emails Modal */}
                {showPasteModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 dark:border-slate-700">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Paste Student Emails</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Paste a list of emails (separated by commas, spaces, or newlines). We'll auto-fill details for existing students.
                                </p>
                            </div>
                            <div className="p-6">
                                <textarea
                                    className="w-full h-48 p-4 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="student1@school.edu, student2@school.edu..."
                                    value={pasteText}
                                    onChange={e => setPasteText(e.target.value)}
                                />
                            </div>
                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                                <button
                                    onClick={() => setShowPasteModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePasteProcess}
                                    disabled={!pasteText.trim() || isProcessingPaste}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
                                >
                                    {isProcessingPaste ? 'Processing...' : 'Process Emails'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-6 flex-grow overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200 whitespace-pre-wrap">
                            {error}
                        </div>
                    )}
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                                <th className="p-3">Email</th>
                                <th className="p-3">First Name</th>
                                <th className="p-3">Surname</th>
                                <th className="p-3 w-24">Year Level</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {editedStudents.map((student, index) => (
                                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-2">
                                        <input
                                            type="email"
                                            value={student.email}
                                            onChange={(e) => handleChange(index, 'email', e.target.value)}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={student.firstName}
                                            onChange={(e) => handleChange(index, 'firstName', e.target.value)}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            value={student.surname}
                                            onChange={(e) => handleChange(index, 'surname', e.target.value)}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="number"
                                            value={student.yearLevel}
                                            onChange={(e) => handleChange(index, 'yearLevel', e.target.value)}
                                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-2"></td>
                                </tr>
                            ))}
                            {/* New Rows */}
                            {newStudents.map((student, index) => {
                                const isComplete = student.firstName && student.surname && student.email;
                                return (
                                    <tr key={`new-${index}`} className={`${isComplete ? 'bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'} transition-colors`}>
                                        <td className="p-2">
                                            <input
                                                type="email"
                                                placeholder="New Email"
                                                value={student.email}
                                                onChange={(e) => handleNewStudentChange(index, 'email', e.target.value)}
                                                className="w-full p-2 rounded border border-green-200 dark:border-green-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                placeholder="First Name"
                                                value={student.firstName}
                                                onChange={(e) => handleNewStudentChange(index, 'firstName', e.target.value)}
                                                className="w-full p-2 rounded border border-green-200 dark:border-green-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                placeholder="Surname"
                                                value={student.surname}
                                                onChange={(e) => handleNewStudentChange(index, 'surname', e.target.value)}
                                                className="w-full p-2 rounded border border-green-200 dark:border-green-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={student.yearLevel}
                                                onChange={(e) => handleNewStudentChange(index, 'yearLevel', e.target.value)}
                                                className="w-full p-2 rounded border border-green-200 dark:border-green-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => removeNewRow(index)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                                                title="Remove row"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="mt-4">
                        <button
                            onClick={addNewRow}
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Row
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white font-semibold transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkStudentEdit;
