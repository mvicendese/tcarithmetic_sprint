import { app } from './firebaseClient';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { Class, StudentUser } from '../types';

const db = getFirestore(app);

// ============================================================================
// No Class Logic
// ============================================================================

export const NO_CLASS_ID = 'no-class';

const ensureNoClassExists = async (): Promise<Class> => {
    const noClassRef = doc(db, 'classes', NO_CLASS_ID);
    const noClassDoc = await getDoc(noClassRef);

    if (!noClassDoc.exists()) {
        const noClassData: Class = {
            id: NO_CLASS_ID,
            name: 'No Class',
            teacherIds: [], // No specific teachers, but visible to all
            studentIds: [],
            archived: false
        };
        await setDoc(noClassRef, noClassData);
        return noClassData;
    }
    return { id: noClassDoc.id, ...noClassDoc.data() } as Class;
};

export const getNoClass = async (): Promise<Class> => {
    return await ensureNoClassExists();
};

// ============================================================================
// Class Management
// ============================================================================

export const getAllClasses = async (): Promise<Class[]> => {
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    return classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
};

export const getClassesForTeacher = async (teacherId: string): Promise<Class[]> => {
    const classesQuery = query(
        collection(db, 'classes'),
        where('teacherIds', 'array-contains', teacherId)
    );
    const classesSnapshot = await getDocs(classesQuery);
    const teacherClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));

    // Always include "No Class"
    try {
        const noClass = await ensureNoClassExists();
        // Avoid duplicates if for some reason the teacher is explicitly in "No Class" (though they shouldn't be by default logic)
        if (!teacherClasses.find(c => c.id === NO_CLASS_ID)) {
            teacherClasses.push(noClass);
        }
    } catch (e) {
        console.error("Error fetching No Class:", e);
    }

    return teacherClasses;
};

export const getClassById = async (classId: string): Promise<Class> => {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) {
        throw new Error('Class not found');
    }
    return { id: classDoc.id, ...classDoc.data() } as Class;
};

export const createClass = async (
    className: string,
    teacherId: string
): Promise<Class> => {
    const newClassRef = doc(collection(db, 'classes'));
    const newClass: Omit<Class, 'id'> = {
        name: className,
        teacherIds: [teacherId],
        studentIds: [],
        archived: false
    };
    await setDoc(newClassRef, newClass);

    // Add class to teacher's classIds
    await updateDoc(doc(db, 'users', teacherId), {
        classIds: arrayUnion(newClassRef.id)
    });

    return { id: newClassRef.id, ...newClass };
};

export const updateClass = async (
    classId: string,
    updates: Partial<Omit<Class, 'id'>>
): Promise<void> => {
    await updateDoc(doc(db, 'classes', classId), updates);
};

export const archiveClass = async (classId: string): Promise<void> => {
    await updateDoc(doc(db, 'classes', classId), { archived: true });
};

export const addStudentToClass = async (
    classId: string,
    studentId: string
): Promise<void> => {
    await updateDoc(doc(db, 'classes', classId), {
        studentIds: arrayUnion(studentId)
    });
    await updateDoc(doc(db, 'users', studentId), {
        classIds: arrayUnion(classId)
    });

    // If adding to a real class, remove from "No Class"
    if (classId !== NO_CLASS_ID) {
        await updateDoc(doc(db, 'classes', NO_CLASS_ID), {
            studentIds: arrayRemove(studentId)
        });
        await updateDoc(doc(db, 'users', studentId), {
            classIds: arrayRemove(NO_CLASS_ID)
        });
    }
};

export const removeStudentFromClass = async (
    classId: string,
    studentId: string
): Promise<void> => {
    await updateDoc(doc(db, 'classes', classId), {
        studentIds: arrayRemove(studentId)
    });
    await updateDoc(doc(db, 'users', studentId), {
        classIds: arrayRemove(classId)
    });

    // Check if student has any other classes
    const studentDoc = await getDoc(doc(db, 'users', studentId));
    if (studentDoc.exists()) {
        const studentData = studentDoc.data() as StudentUser;
        const remainingClasses = studentData.classIds || [];

        // If no classes left (or only "No Class" which shouldn't happen if we just removed a class), add to "No Class"
        if (remainingClasses.length === 0) {
            await updateDoc(doc(db, 'classes', NO_CLASS_ID), {
                studentIds: arrayUnion(studentId)
            });
            await updateDoc(doc(db, 'users', studentId), {
                classIds: arrayUnion(NO_CLASS_ID)
            });
        }
    }
};

export const removeTeacherFromClass = async (
    classId: string,
    teacherId: string
): Promise<void> => {
    const classData = await getClassById(classId);

    // Remove teacher from class
    await updateDoc(doc(db, 'classes', classId), {
        teacherIds: arrayRemove(teacherId)
    });

    // Remove class from teacher's classIds
    await updateDoc(doc(db, 'users', teacherId), {
        classIds: arrayRemove(classId)
    });

    // If no teachers left, archive the class
    if (classData.teacherIds.length === 1) {
        await archiveClass(classId);
    }
};

export const addTeacherToClass = async (
    classId: string,
    teacherId: string
): Promise<void> => {
    await updateDoc(doc(db, 'classes', classId), {
        teacherIds: arrayUnion(teacherId)
    });
    await updateDoc(doc(db, 'users', teacherId), {
        classIds: arrayUnion(classId)
    });
};

// ============================================================================
// Delete Class (with student cleanup)
// ============================================================================

/**
 * Deletes a class and properly cleans up all references.
 * - Removes class from all students' classIds
 * - Students with no remaining classes are added to "No Class"
 * - Removes class from all teachers' classIds
 * - Deletes the class document
 * 
 * Students are NOT deleted - only their class association is removed.
 */
export const deleteClass = async (classId: string): Promise<void> => {
    // Prevent deleting the special "No Class"
    if (classId === NO_CLASS_ID) {
        throw new Error('Cannot delete the "No Class" placeholder.');
    }

    // Get class data
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) {
        throw new Error('Class not found');
    }
    const classData = classDoc.data() as Omit<Class, 'id'>;

    // 1. Remove class from all students and handle "No Class" fallback
    const studentIds = classData.studentIds || [];
    for (const studentId of studentIds) {
        // Remove this class from student's classIds
        await updateDoc(doc(db, 'users', studentId), {
            classIds: arrayRemove(classId)
        });

        // Check if student has any remaining classes
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
            const studentData = studentDoc.data() as StudentUser;
            const remainingClasses = (studentData.classIds || []).filter(id => id !== classId);

            // If no classes left, add to "No Class"
            if (remainingClasses.length === 0) {
                await updateDoc(doc(db, 'classes', NO_CLASS_ID), {
                    studentIds: arrayUnion(studentId)
                });
                await updateDoc(doc(db, 'users', studentId), {
                    classIds: arrayUnion(NO_CLASS_ID)
                });
            }
        }
    }

    // 2. Remove class from all teachers' classIds
    const teacherIds = classData.teacherIds || [];
    for (const teacherId of teacherIds) {
        await updateDoc(doc(db, 'users', teacherId), {
            classIds: arrayRemove(classId)
        });
    }

    // 3. Delete the class document
    await deleteDoc(doc(db, 'classes', classId));
};
