import React, { useState } from 'react';
import * as api from '../services/firebaseService';
import { TeacherUser } from '../types';

const CreateClassForm: React.FC<{ onClassCreated: () => void; teachers?: TeacherUser[]; teacherId?: string }> = ({ onClassCreated, teachers, teacherId }) => {
    const [className, setClassName] = useState('');
    const [selectedTeacherId, setSelectedTeacherId] = useState(teacherId || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        if (!selectedTeacherId) {
            setError('Please select a teacher.');
            setIsSubmitting(false);
            return;
        }

        try {
            await api.createClass(className, selectedTeacherId);
            setSuccess(`Successfully created class: ${className}.`);
            setClassName('');
            onClassCreated();
        } catch (err: any) {
            setError(err.message || 'Failed to create class.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold mb-4">Create New Class</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={className} onChange={e => setClassName(e.target.value)} placeholder="Class Name" required className="w-full p-3 rounded bg-slate-700 text-white" />
                {teachers && (
                    <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="w-full p-3 rounded bg-slate-700 text-white">
                        <option value="">Select a teacher</option>
                        {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.surname}</option>
                        ))}
                    </select>
                )}
                {error && <p className="text-red-500">{error}</p>}
                {success && <p className="text-green-500">{success}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                    {isSubmitting ? 'Creating...' : 'Create Class'}
                </button>
            </form>
        </div>
    );
};

export default CreateClassForm;
