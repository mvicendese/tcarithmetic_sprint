const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Locate service account key (copied from seed_test_config.cjs)
const serviceAccountPathLocal = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccountPathResearch = path.join(__dirname, '../../_research/tcarithmetic-firebase-adminsdk-fbsvc-8321dc2ddc.json');

let serviceAccount;

if (fs.existsSync(serviceAccountPathLocal)) {
    serviceAccount = require(serviceAccountPathLocal);
    console.log('Using local serviceAccountKey.json');
} else if (fs.existsSync(serviceAccountPathResearch)) {
    serviceAccount = require(serviceAccountPathResearch);
    console.log('Using service account from _research folder');
} else {
    console.error('Error: serviceAccountKey.json not found in firebase-studio-app/ or _research/ folder.');
    process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = getFirestore();

async function verifyConfig() {
    try {
        console.log('Fetching test configuration from Firestore...');
        const docRef = db.collection('system_settings').doc('test_config');
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('No test_config document found!');
        } else {
            const data = docSnap.data();
            console.log('Found test_config document.');

            if (data.integerLevels) {
                console.log(`Found ${data.integerLevels.length} integer levels.`);
                // Check Level 1 and Level 9 specifically
                const level1 = data.integerLevels.find(l => l.level === 1);
                const level9 = data.integerLevels.find(l => l.level === 9);

                console.log('\n--- Level 1 Config ---');
                console.log(JSON.stringify(level1, null, 2));

                console.log('\n--- Level 9 Config ---');
                console.log(JSON.stringify(level9, null, 2));

                if (JSON.stringify(level1) === JSON.stringify(level9)) {
                    console.error('\nCRITICAL: Level 1 and Level 9 configurations are IDENTICAL!');
                } else {
                    console.log('\nLevel 1 and Level 9 configurations are distinct.');
                }
            } else {
                console.error('No integerLevels array found in data!');
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error verifying config:', error);
        process.exit(1);
    }
}

verifyConfig();
