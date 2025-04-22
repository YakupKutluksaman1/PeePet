'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    UserCredential
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { getDatabase, ref, set, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Kullanıcı türleri
export type UserType = 'standard' | 'business';

// Genişletilmiş kullanıcı tipi
interface ExtendedUser extends FirebaseUser {
    userType?: UserType;
}

interface AuthContextType {
    user: ExtendedUser | null;
    loading: boolean;
    userType: UserType | null;
    signUp: (email: string, password: string, type?: UserType) => Promise<{ user: FirebaseUser }>;
    signIn: (email: string, password: string) => Promise<UserCredential | void>;
    registerBusiness: (email: string, password: string, businessData: any) => Promise<{ user: FirebaseUser }>;
    logout: () => Promise<void>;
    isBusinessUser: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    userType: null,
    signUp: async () => ({ user: null as any }),
    signIn: async () => { return undefined; },
    registerBusiness: async () => ({ user: null as any }),
    logout: async () => { },
    isBusinessUser: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<ExtendedUser | null>(null);
    const [userType, setUserType] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth(app);
    const db = getDatabase();
    const functions = getFunctions(app);

    // Kullanıcı tipini belirle
    const checkUserType = async (userUID: string): Promise<UserType> => {
        // Önce businesses koleksiyonunda kontrol et
        try {
            console.log("İşletme profili kontrol ediliyor: ", userUID);
            const businessSnapshot = await get(ref(db, `businesses/${userUID}/profile`));

            if (businessSnapshot.exists()) {
                console.log("İşletme profili bulundu:", userUID);
                const businessData = businessSnapshot.val();
                console.log("İşletme profil verisi:", businessData);

                if (businessData.userType === 'business') {
                    return 'business';
                }
            }
        } catch (error) {
            console.error("İşletme profili kontrol edilirken hata:", error);
        }

        // Sonra users koleksiyonunda kontrol et
        try {
            const userSnapshot = await get(ref(db, `users/${userUID}`));
            if (userSnapshot.exists()) {
                return 'standard';
            }
        } catch (error) {
            console.error("Kullanıcı profili kontrol edilirken hata:", error);
        }

        // Varsayılan olarak standard dön
        return 'standard';
    };

    useEffect(() => {
        setLoading(true);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Kullanıcı tipini kontrol et
                    const type = await checkUserType(firebaseUser.uid);
                    console.log(`Kullanıcı tipi belirlendi: ${type}`, firebaseUser.uid);

                    setUserType(type);

                    // Genişletilmiş kullanıcıyı ayarla
                    const extendedUser = { ...firebaseUser } as ExtendedUser;
                    extendedUser.userType = type;
                    setUser(extendedUser);
                } catch (error) {
                    console.error("Kullanıcı tipi belirlenirken hata:", error);
                    setUserType('standard');
                    setUser(firebaseUser as ExtendedUser);
                }
            } else {
                setUser(null);
                setUserType(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, [auth, db]);

    // Standart kullanıcılar için kayıt
    const signUp = async (email: string, password: string, type: UserType = 'standard') => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Kullanıcı veritabanı kaydını oluştur
        await set(ref(db, `users/${userCredential.user.uid}`), {
            email: email,
            displayName: email.split('@')[0], // Varsayılan olarak
            userType: type,
            createdAt: new Date().toISOString()
        });

        return { user: userCredential.user };
    };

    // İşletmeler için kayıt
    const registerBusiness = async (email: string, password: string, businessData: any) => {
        // Önce Firebase Auth'da kullanıcı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        console.log("İşletme hesabı kaydediliyor:", userId);

        // İşletme profil bilgilerini veritabanına kaydet
        await set(ref(db, `businesses/${userId}/profile`), {
            ...businessData,
            email: email,
            userType: 'business', // Açıkça business olarak belirt
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log("İşletme profili kaydedildi:", userId);
        setUserType('business');

        return { user: userCredential.user };
    };

    // Giriş işlemi
    const signIn = async (email: string, password: string) => {
        try {
            console.log("Giriş denemesi:", email);
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log("Giriş başarılı:", result.user.uid);

            // Kullanıcı tipi hemen burada kontrol edilemez çünkü oturum henüz açıldı
            // userType AuthEffect tarafından güncellenecek

            return result;
        } catch (error: any) {
            // Konsol hatasını kaldırıyorum, hatayı yine fırlatacağız
            throw error;
        }
    };

    // Çıkış işlemi
    const logout = async () => {
        await signOut(auth);
    };

    // İşletme kullanıcısı kontrolü - basitleştirilmiş ve daha güvenilir
    const isBusinessUser = () => {
        const currentType = userType;
        console.log(`isBusinessUser fonksiyonu çağrıldı. Mevcut tip: ${currentType}`);
        return currentType === 'business';
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            userType,
            signUp,
            signIn,
            registerBusiness,
            logout,
            isBusinessUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext); 