import { app } from './firebaseClient';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';
import { getUserProfile } from './userService';

const auth = getAuth(app);

export const onAuthStateChangedPromise = (): Promise<User | null> => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            async (firebaseUser) => {
                unsubscribe();
                if (firebaseUser) {
                    try {
                        const user = await getUserProfile(firebaseUser.uid);
                        resolve(user);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve(null);
                }
            },
            reject
        );
    });
};

export const loginWithEmailPassword = async (
    email: string,
    password: string
): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = await getUserProfile(userCredential.user.uid);
    return user;
};

export const logout = async (): Promise<void> => {
    await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
};
