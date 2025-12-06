import React, { useState } from 'react';
import * as api from '../services/firebaseService';
import { StudentUser } from '../types';

interface BulkAddModalProps {
    classId: string;
    onClose: () => void;
    onProceedToEdit: (newStudents: Partial<StudentUser>[]) => void;
}

const BulkAddModal: React.FC<BulkAddModalProps> = ({ classId, onClose, onProceedToEdit }) => {
    const [pasteText, setPasteText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleProcess = async () => {
        setIsProcessing(true);
        setLogs([]);

        // 1. Parse Emails
        const emails = pasteText.split(/[\s,;\n]+/).filter(e => e.includes('@'));
        const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];

        if (uniqueEmails.length === 0) {
            addLog("No valid emails found.");
            setIsProcessing(false);
            return;
        }

        addLog(`Processing ${uniqueEmails.length} emails...`);

        const studentsForEdit: Partial<StudentUser>[] = [];
        let addedToClassCount = 0;
        let alreadyInClassCount = 0;

        // 2. Check each email
        for (const email of uniqueEmails) {
            try {
                const user = await api.getUserByEmail(email);

                if (user) {
                    if (user.role !== 'student') {
                        addLog(`⚠️ Skipped ${email}: User exists but is a ${user.role}.`);
                        continue;
                    }

                    // Check if already in this class
                    if ((user.classIds || []).includes(classId)) {
                        addLog(`ℹ️ Skipped ${user.firstName} ${user.surname}: Already in this class.`);
                        alreadyInClassCount++;
                    } else {
                        // Add to class immediately
                        await api.addStudentToClass(classId, user.id);
                        addLog(`✅ Added ${user.firstName} ${user.surname} to class.`);
                        addedToClassCount++;
                    }
                } else {
                    // New Student -> Add to list for Bulk Edit
                    studentsForEdit.push({
                        email: email,
                        firstName: '',
                        surname: '',
                        yearLevel: 7
                    });
                }
            } catch (error) {
                console.error(error);
                addLog(`❌ Error checking ${email}: ${(error as Error).message}`);
            }
        }

        addLog('---');
        addLog(`Summary:`);
        addLog(`- Added to Class: ${addedToClassCount}`);
        addLog(`- Already in Class: ${alreadyInClassCount}`);
        addLog(`- New Students to Create: ${studentsForEdit.length}`);

        // Wait a moment for user to read logs if there were actions
        if (studentsForEdit.length > 0) {
            setTimeout(() => {
                onProceedToEdit(studentsForEdit);
            }, 1500);
        } else {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 dark:border-slate-700 max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Bulk Add Students</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Paste a list of emails. We'll check if they exist and add them to the class.
                        For new students, you'll be prompted to enter their details.
                    </p>
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                    <textarea
                        className="w-full h-48 p-4 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                        placeholder="student1@school.edu, student2@school.edu..."
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        disabled={isProcessing}
                    />

                    {logs.length > 0 && (
                        <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700">
                            {logs.map((log, i) => <div key={i}>{log}</div>)}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white font-semibold"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={!pasteText.trim() || isProcessing}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProcessing ? 'Processing...' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkAddModal;
