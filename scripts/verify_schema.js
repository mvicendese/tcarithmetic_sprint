import { db } from '../../_secrets/adminClient.js';

async function verifySchema() {
    console.log('Checking recent users for new schema fields...');
    // Get users, maybe just a few
    const usersSnap = await db.collection('users').limit(5).get();

    if (usersSnap.empty) {
        console.log('No users found.');
        return;
    }

    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${data.email} (${data.role})`);
        console.log(`  - currentLevel: ${data.currentLevel}`);
        console.log(`  - aiApproved: ${data.aiApproved}`);
        console.log('------------------------------------------------');
    });
}

verifySchema().catch(console.error).then(() => process.exit());
