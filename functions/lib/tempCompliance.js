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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tempCompliance = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Ensure admin is initialized (it should be in index.ts, but safe to check)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
exports.tempCompliance = functions.region('australia-southeast1').https.onRequest(async (req, res) => {
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
            }
            else {
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
    }
    catch (error) {
        console.error('❌ Error updating students:', error);
        res.status(500).json({ error: error });
    }
});
//# sourceMappingURL=tempCompliance.js.map