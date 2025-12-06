import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure admin is initialized (it should be in index.ts, but safe to check)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

export const tempCompliance = functions.region('australia-southeast1').https.onRequest(async (req, res) => {
    const db = admin.firestore();
    console.log("🔒 COMPLIANCE: Setting all students to aiApproved: false...");

    try {
        const studentsSnap = await db.collection('users').where('role', '==', 'student').get();
        console.log(`Found ${studentsSnap.size} students.`);

        let updateCount = 0;
        let alreadyDisabledCount = 0;
        const updates = [];

        for (const doc of studentsSnap.docs) {
            const student = doc.data();

            if (student.aiApproved === false) {
                alreadyDisabledCount++;
            } else {
                updates.push(doc.ref.update({ aiApproved: false }));
                updateCount++;
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
        }

        res.json({
            success: true,
            message: "Compliance update complete",
            updated: updateCount,
            alreadyDisabled: alreadyDisabledCount,
            total: studentsSnap.size
        });

    } catch (error) {
        console.error('❌ Error updating students:', error);
        res.status(500).json({ error: error });
    }
});
