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

// Gönderi (post) ekleme ve çekme için yardımcı fonksiyonlar
import { Post } from '@/types/post';
import { ref as dbRef, push, set, get, onValue, DataSnapshot, query, orderByKey, limitToLast, endBefore } from 'firebase/database';

// Realtime Database'e yeni bir gönderi ekle
export async function addPostToDB(post: Omit<Post, 'id'>): Promise<string | null> {
    try {
        const postRef = dbRef(rdb, 'posts');
        const newPostRef = push(postRef);
        await set(newPostRef, post);
        return newPostRef.key;
    } catch (error) {
        console.error('Gönderi eklenirken hata:', error);
        return null;
    }
}

// Tüm public gönderileri çek (eski - performans için kullanmayın)
export async function getPublicPosts(): Promise<Post[]> {
    try {
        const postRef = dbRef(rdb, 'posts');
        const snapshot = await get(postRef);
        if (!snapshot.exists()) return [];
        const postsObj = snapshot.val();
        return Object.entries(postsObj).map(([id, data]: [string, any]) => ({
            id,
            ...data
        })).filter((post: Post) => post.visibility === 'public');
    } catch (error) {
        console.error('Gönderiler çekilirken hata:', error);
        return [];
    }
}

// Sayfalanmış public gönderileri çek (performanslı)
export async function getPaginatedPosts(limit = 20, lastPostKey: string | null = null): Promise<{ posts: Post[], lastKey: string | null, hasMore: boolean }> {
    try {
        const postRef = dbRef(rdb, 'posts');
        let postsQuery;

        if (lastPostKey) {
            // Sonraki sayfa için
            postsQuery = query(postRef, orderByKey(), endBefore(lastPostKey), limitToLast(limit));
        } else {
            // İlk sayfa için
            postsQuery = query(postRef, orderByKey(), limitToLast(limit));
        }

        const snapshot = await get(postsQuery);
        if (!snapshot.exists()) {
            return { posts: [], lastKey: null, hasMore: false };
        }

        const postsObj = snapshot.val();
        const postsArray = Object.entries(postsObj)
            .map(([id, data]: [string, any]) => ({
                id,
                ...data
            }))
            .filter((post: Post) => post.visibility === 'public')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Son key'i ve hasMore durumunu belirle
        const keys = Object.keys(postsObj).sort();
        const newLastKey = keys.length > 0 ? keys[0] : null;
        const hasMore = postsArray.length === limit;

        return {
            posts: postsArray,
            lastKey: newLastKey,
            hasMore
        };
    } catch (error) {
        console.error('Sayfalanmış gönderiler çekilirken hata:', error);
        return { posts: [], lastKey: null, hasMore: false };
    }
} 