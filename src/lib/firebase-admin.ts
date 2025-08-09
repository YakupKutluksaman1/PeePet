import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Private key'i düzgün formatla
const getPrivateKey = () => {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
        console.warn('Firebase private key not found in environment variables');
        return null;
    }

    // Eğer key zaten doğru formattaysa olduğu gibi döndür
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        return privateKey.replace(/\\n/g, '\n');
    }

    // Yoksa base64 decode et
    try {
        return Buffer.from(privateKey, 'base64').toString('utf8');
    } catch {
        return privateKey.replace(/\\n/g, '\n');
    }
};

function createFirebaseAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0]!;
    }

    const privateKey = getPrivateKey();
    if (!privateKey) {
        console.warn('Firebase Admin SDK not initialized - missing private key');
        return null;
    }

    const firebaseAdminConfig = {
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    };

    return initializeApp(firebaseAdminConfig);
}

const adminApp = createFirebaseAdminApp();
export const adminDb = adminApp ? getDatabase(adminApp) : null;
