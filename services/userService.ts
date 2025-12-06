import { app, functions } from './firebaseClient';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
    User,
    TeacherUser,
    StudentUser
} from '../types';
import { addStudentToClass, NO_CLASS_ID } from './classService';

const db = getFirestore(app);

// ============================================================================
// User Management
// ============================================================================

export const getUserProfile = async (userId: string): Promise<User> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
        throw new Error('User not found');
    }
    const data = userDoc.data();
    if (data?.role === 'student') {
        return {
            id: userDoc.id,
            locked: data.locked ?? false,
            enrolled: data.enrolled ?? true,
            currentLevel: data.currentLevel ?? 1,
            aiApproved: data.aiApproved ?? false,
            ...data
        } as unknown as StudentUser;
    }
    return { id: userDoc.id, ...data } as User;
};

export const getAllUsers = async (): Promise<User[]> => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const usersQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const usersSnapshot = await getDocs(usersQuery);
    if (usersSnapshot.empty) return null;
    const match = usersSnapshot.docs[0];
    return { id: match.id, ...match.data() } as User;
};

export const getAllTeachers = async (): Promise<TeacherUser[]> => {
    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const teachersSnapshot = await getDocs(teachersQuery);
    return teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherUser));
};

export const getAllStudents = async (): Promise<StudentUser[]> => {
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    return studentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            locked: data.locked ?? false,
            enrolled: data.enrolled ?? true,
            currentLevel: data.currentLevel ?? 1,
            aiApproved: data.aiApproved ?? false,
            ...data
        } as unknown as StudentUser;
    });
};

export const updateTeacherAdminStatus = async (
    teacherId: string,
    isAdmin: boolean
): Promise<void> => {
    await updateDoc(doc(db, 'users', teacherId), { isAdmin });
};

export const updateStudentEnrollment = async (
    studentId: string,
    enrolled: boolean
): Promise<void> => {
    await updateDoc(doc(db, 'users', studentId), { enrolled });
};

export const updateStudentLocked = async (
    studentId: string,
    locked: boolean
): Promise<void> => {
    await updateDoc(doc(db, 'users', studentId), { locked });
};

export const updateUser = async (
    userId: string,
    updates: Partial<User>
): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), updates);
};

export const createTeacher = async (
    email: string,
    firstName: string,
    surname: string,
    isAdmin: boolean
): Promise<TeacherUser> => {
    const createUser = httpsCallable(functions, 'createUserAU');
    const result = await createUser({
        email,
        password: 'password', // Default password per user request
        firstName,
        surname,
        role: 'teacher',
        isAdmin
    });
    return result.data as TeacherUser;
};

export const createStudentAndAddToClass = async (
    student: { firstName: string; surname: string; password: string; email?: string },
    classId: string,
    yearLevel = 7
): Promise<StudentUser> => {
    const createUser = httpsCallable(functions, 'createUserAU');
    const result = await createUser({
        email: student.email || `${student.firstName.toLowerCase()}.${student.surname.toLowerCase()}@example.com`, // Fallback email if none provided
        password: student.password,
        firstName: student.firstName,
        surname: student.surname,
        role: 'student',
        classIds: [classId],
        yearLevel
    });

    const newStudent = result.data as StudentUser;

    // Explicitly save the password to the Firestore document for display purposes
    // (createUserAU might not be doing this, or we want to be double sure)
    if (student.password) {
        await updateDoc(doc(db, 'users', newStudent.id), {
            password: student.password
        });
        newStudent.password = student.password;
    }

    // We still need to add the student to the class document (client-side is fine if teacher/admin)
    await addStudentToClass(classId, newStudent.id);

    return newStudent;
};

// ============================================================================
// Bulk Operations
// ============================================================================

export const bulkCreateStudents = async (
    students: Array<{
        email: string;
        firstName: string;
        surname: string;
        yearLevel: number;
    }>,
    classId?: string
): Promise<{ created: StudentUser[]; errors: Array<{ email: string; error: string }> }> => {
    const created: StudentUser[] = [];
    const errors: Array<{ email: string; error: string }> = [];
    const createUser = httpsCallable(functions, 'createUserAU');

    for (const student of students) {
        try {
            const result = await createUser({
                email: student.email,
                password: 'password', // Default password for bulk creation
                firstName: student.firstName,
                surname: student.surname,
                role: 'student',
                yearLevel: student.yearLevel,
                classIds: classId ? [classId] : [NO_CLASS_ID]
            });

            const newStudent = result.data as StudentUser;

            // Explicitly save the password to the Firestore document
            await updateDoc(doc(db, 'users', newStudent.id), {
                password: 'password'
            });
            newStudent.password = 'password';

            if (classId) {
                // Add to class document
                await addStudentToClass(classId, newStudent.id);
            } else {
                // Add to "No Class"
                await addStudentToClass(NO_CLASS_ID, newStudent.id);
            }

            created.push(newStudent);
        } catch (error: any) {
            errors.push({ email: student.email, error: error.message });
        }
    }

    return { created, errors };
};

export const syncUserClaims = async (): Promise<{ success: boolean; results: any[] }> => {
    const syncClaims = httpsCallable(functions, 'syncUserClaimsAU');
    const result = await syncClaims();
    return result.data as { success: boolean; results: any[] };
};

export const changePassword = async (newPassword: string): Promise<void> => {
    const changePasswordFn = httpsCallable(functions, 'changePasswordAU');
    await changePasswordFn({ newPassword });
};
