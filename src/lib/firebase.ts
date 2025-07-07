import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://dummy-project-default-rtdb.firebaseio.com/"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth, Database ve Storage örneklerini oluştur
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const rdb = getDatabase(app);

export { app }; 