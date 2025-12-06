import React from 'react';
import TestScreen from './TestScreen';
import { StudentUser, TestAttempt } from '../types';

interface StudentTestProps {
    level: number;
    onComplete: (attempt: TestAttempt) => void;
    isSubmitting?: boolean;
}

const StudentTest: React.FC<StudentTestProps> = ({ level, onComplete, isSubmitting }) => {
    console.log(`[StudentTest] Rendered with level: ${level} (type: ${typeof level})`);
    // Create dummy user since TestScreen requires it
    const dummyUser = {} as StudentUser;

    return (
        <TestScreen
            user={dummyUser}
            currentLevel={level}
            onComplete={onComplete}
            isSubmitting={isSubmitting}
        />
    );
};

export default StudentTest;
