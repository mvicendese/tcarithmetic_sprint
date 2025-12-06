"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordAU = exports.onUserRoleChange = exports.onUserClassChange = exports.syncUserClaimsAU = exports.createUserAU = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const REGION = 'australia-southeast1';
exports.createUserAU = functions.region(REGION).https.onCall(async (data, context) => {
    // Ensure the request is made by an authenticated user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { email, password, firstName, surname, role: targetRole, classIds, yearLevel, isAdmin: targetIsAdmin } = data;
    // Get caller info
    const callerUid = context.auth.uid;
    const callerRef = admin.firestore().collection('users').doc(callerUid);
    const callerSnap = await callerRef.get();
    const callerData = callerSnap.data();
    const callerRole = callerData === null || callerData === void 0 ? void 0 : callerData.role;
    // 3. Authorization Logic: Check Firestore directly
    // Teachers with isAdmin=true can do anything
    const callerIsAdmin = (callerData === null || callerData === void 0 ? void 0 : callerData.isAdmin) === true;
    const isAuthorized = callerRole === 'teacher' || callerRole === 'admin' || callerIsAdmin;
    if (!isAuthorized) {
        throw new functions.https.HttpsError('permission-denied', 'Only teachers and admins can create users.');
    }
    // 4. Validation
    if (!email || !password || !firstName || !surname || !targetRole) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: email, password, firstName, surname, role');
    }
    try {
        // 5. Create Auth User
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${surname}`,
        });
        // 6. Set Custom Claims (Role)
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: targetRole });
        // 7. Create Firestore Document
        const userDoc = Object.assign(Object.assign({ email: email.toLowerCase(), firstName,
            surname, role: targetRole, classIds: classIds || [] }, (targetRole === 'student' && {
            yearLevel: yearLevel || 7,
            locked: false,
            enrolled: true,
            currentLevel: 1,
            aiApproved: false,
            password: password,
            consecutiveFastTrackCount: 0
        })), (targetRole === 'teacher' && {
            isAdmin: targetIsAdmin || false
        }));
        await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc);
        // [NEW] If creating a teacher, also create their test student account
        if (targetRole === 'teacher') {
            await createFakeStudentAccount({ email, firstName, surname }, password);
        }
        // [NEW] If creating a student, create their studentData document (Level 1)
        if (targetRole === 'student') {
            await admin.firestore().collection('studentData').doc(userRecord.uid).set({
                currentLevel: 1,
                history: [],
                consecutiveFastTrackCount: 0
            });
        }
        return Object.assign({ id: userRecord.uid }, userDoc);
    }
    catch (error) {
        console.error("Error creating user:", error);
        // Handle case where user already exists in Auth but maybe not in Firestore
        if (error.code === 'auth/email-already-exists') {
            try {
                const existingUser = await admin.auth().getUserByEmail(email);
                // Ensure Firestore doc exists
                const userRef = admin.firestore().collection('users').doc(existingUser.uid);
                const userSnap = await userRef.get();
                if (!userSnap.exists) {
                    // Repair: Create missing Firestore doc
                    const userDoc = Object.assign(Object.assign({ email: email.toLowerCase(), firstName,
                        surname, role: targetRole, classIds: classIds || [] }, (targetRole === 'student' && {
                        yearLevel: yearLevel || 7,
                        locked: false,
                        enrolled: true
                    })), (targetRole === 'teacher' && {
                        isAdmin: targetIsAdmin || false
                    }));
                    await userRef.set(userDoc);
                    return Object.assign({ id: existingUser.uid }, userDoc);
                }
                else {
                    // User exists in both, just return existing data (idempotent)
                    if (classIds && classIds.length > 0) {
                        await userRef.update({
                            classIds: admin.firestore.FieldValue.arrayUnion(...classIds)
                        });
                    }
                    return Object.assign({ id: existingUser.uid }, userSnap.data());
                }
            }
            catch (innerError) {
                console.error("Error recovering existing user:", innerError);
                throw new functions.https.HttpsError('internal', `User exists in Auth but failed to recover: ${innerError.message}`);
            }
        }
        throw new functions.https.HttpsError('internal', `Unable to create user: ${error.message}`);
    }
});
// Helper function to ensure "Teachers" class exists
async function ensureTeachersClass() {
    const teachersClassRef = admin.firestore().collection('classes').doc('teachers-class');
    const teachersClassSnap = await teachersClassRef.get();
    if (!teachersClassSnap.exists) {
        await teachersClassRef.set({
            name: 'Teachers',
            teacherId: 'system',
            yearLevel: 0,
            studentIds: []
        });
    }
    return 'teachers-class';
}
// Helper to create the fake student account
async function createFakeStudentAccount(teacherData, password) {
    const studentEmail = `${teacherData.email}.student`;
    const studentPassword = 'password'; // Hardcoded default for safety/visibility
    const studentName = `${teacherData.firstName} (Student View)`;
    try {
        // 1. Create Auth User
        const userRecord = await admin.auth().createUser({
            email: studentEmail,
            password: studentPassword,
            displayName: studentName,
        });
        // 2. Set Custom Claims
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'student' });
        // 3. Ensure Teachers Class Exists
        const classId = await ensureTeachersClass();
        // 4. Create Firestore Document
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email: studentEmail.toLowerCase(),
            firstName: teacherData.firstName,
            surname: '(Student View)',
            role: 'student',
            classIds: [classId],
            yearLevel: 7,
            locked: false,
            enrolled: true,
            currentLevel: 1,
            aiApproved: true // Auto-approve AI for test accounts
        });
        // 5. Add to Class Roster
        await admin.firestore().collection('classes').doc(classId).update({
            studentIds: admin.firestore.FieldValue.arrayUnion(userRecord.uid)
        });
        console.log(`Created fake student account: ${studentEmail}`);
    }
    catch (error) {
        console.error(`Failed to create fake student account for ${teacherData.email}:`, error);
        // Don't throw, just log. We don't want to fail the main teacher creation.
    }
}
// Utility function to sync custom claims for all users
exports.syncUserClaimsAU = functions.region(REGION).https.onCall(async (data, context) => {
    // Only admins can run this
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can sync user claims.');
    }
    try {
        const usersSnapshot = await admin.firestore().collection('users').get();
        const results = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const role = userData.role;
            if (role) {
                await admin.auth().setCustomUserClaims(userId, { role });
                results.push({ userId, role, status: 'updated' });
            }
            else {
                results.push({ userId, role: 'none', status: 'skipped' });
            }
        }
        return { success: true, results };
    }
    catch (error) {
        console.error("Error syncing claims:", error);
        throw new functions.https.HttpsError('internal', `Failed to sync claims: ${error.message}`);
    }
});
// Trigger to automatically sync class enrollments when a user is created or updated
exports.onUserClassChange = functions.region(REGION).firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.exists ? change.before.data() : {};
    const afterData = change.after.exists ? change.after.data() : {};
    const beforeClasses = ((beforeData === null || beforeData === void 0 ? void 0 : beforeData.classIds) || []);
    const afterClasses = ((afterData === null || afterData === void 0 ? void 0 : afterData.classIds) || []);
    // Find classes to add (in after but not before)
    const classesToAdd = afterClasses.filter(c => !beforeClasses.includes(c));
    // Find classes to remove (in before but not after)
    const classesToRemove = beforeClasses.filter(c => !afterClasses.includes(c));
    const promises = [];
    // Add student to new classes
    for (const classId of classesToAdd) {
        console.log(`Adding student ${userId} to class ${classId}`);
        promises.push(admin.firestore().collection('classes').doc(classId).update({
            studentIds: admin.firestore.FieldValue.arrayUnion(userId)
        }));
    }
    // Remove student from old classes
    for (const classId of classesToRemove) {
        console.log(`Removing student ${userId} from class ${classId}`);
        promises.push(admin.firestore().collection('classes').doc(classId).update({
            studentIds: admin.firestore.FieldValue.arrayRemove(userId)
        }));
    }
    try {
        await Promise.all(promises);
        console.log(`Successfully synced classes for user ${userId}`);
    }
    catch (error) {
        console.error(`Error syncing classes for user ${userId}:`, error);
    }
});
// Trigger to automatically sync custom claims when a user's role or admin status changes
exports.onUserRoleChange = functions.region(REGION).firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const afterData = change.after.exists ? change.after.data() : null;
    const beforeData = change.before.exists ? change.before.data() : null;
    // If user was deleted, we don't need to do anything (Auth user might still exist, but claims are less relevant)
    if (!afterData)
        return;
    const newRole = afterData.role;
    const newIsAdmin = afterData.isAdmin === true;
    const oldRole = beforeData === null || beforeData === void 0 ? void 0 : beforeData.role;
    const oldIsAdmin = (beforeData === null || beforeData === void 0 ? void 0 : beforeData.isAdmin) === true;
    // Check if role or admin status changed
    if (newRole !== oldRole || newIsAdmin !== oldIsAdmin) {
        console.log(`Syncing claims for user ${userId}: Role=${newRole}, IsAdmin=${newIsAdmin}`);
        try {
            // We set the role as the main claim
            await admin.auth().setCustomUserClaims(userId, { role: newRole });
            console.log(`Successfully synced claims for ${userId}`);
        }
        catch (error) {
            console.error(`Failed to sync claims for ${userId}:`, error);
        }
    }
});
exports.changePasswordAU = functions.region(REGION).https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { newPassword } = data;
    const uid = context.auth.uid;
    // 2. Validation
    if (!newPassword || newPassword.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
    }
    try {
        // 3. Update Auth Password
        try {
            await admin.auth().updateUser(uid, {
                password: newPassword
            });
        }
        catch (authError) {
            console.error("Auth update failed:", authError);
            throw new functions.https.HttpsError('internal', `Auth Update Failed: ${authError.message}`);
        }
        // 4. Update Firestore Password (for teacher visibility)
        try {
            await admin.firestore().collection('users').doc(uid).update({
                password: newPassword
            });
        }
        catch (firestoreError) {
            console.error("Firestore update failed:", firestoreError);
            // If Firestore fails, we should probably revert Auth? Or just warn?
            // For now, let's fail the whole request so the user knows.
            throw new functions.https.HttpsError('internal', `Firestore Update Failed: ${firestoreError.message}`);
        }
        return { success: true };
    }
    catch (error) {
        // This catches the re-thrown errors above or any other unexpected errors
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error("Unexpected error changing password:", error);
        throw new functions.https.HttpsError('internal', `Unexpected Error: ${error.message}`);
    }
});
__exportStar(require("./aiSummaries"), exports);
//# sourceMappingURL=index.js.map