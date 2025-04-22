'use client';

import { User } from '@/app/types/user';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDatabase, ref as dbRef, get } from 'firebase/database';

export default function ProfileCard() {
    const { user } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }

        const fetchProfile = async () => {
            try {
                const db = getDatabase();
                const userRef = dbRef(db, `users/${user.uid}`);
                const snapshot = await get(userRef);
                const userData = snapshot.val();

                if (userData) {
                    setProfile({
                        id: user.uid,
                        email: userData.email || '',
                        firstName: userData.firstName || '',
                        lastName: userData.lastName || '',
                        phone: userData.phone || '',
                        location: userData.location || '',
                        photoURL: userData.photoURL || '',
                        createdAt: userData.createdAt || new Date().toISOString(),
                        updatedAt: userData.updatedAt || new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Profil bilgileri alınırken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, router]);

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-500">
                {profile.photoURL ? (
                    <img
                        src={profile.photoURL}
                        alt="Profil fotoğrafı"
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white object-cover"
                    />
                ) : (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white bg-white flex items-center justify-center">
                        <span className="text-4xl">👤</span>
                    </div>
                )}
            </div>
            <div className="p-6 pt-16 text-center">
                <h2 className="text-xl font-semibold text-gray-800">
                    {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-gray-600 mt-1">{profile.email}</p>
                <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-500">
                        <span className="font-medium">Telefon:</span> {profile.phone}
                    </p>
                    {profile.location && (
                        <p className="text-sm text-gray-500">
                            <span className="font-medium">Konum:</span> {profile.location}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => router.push('/user/edit')}
                    className="mt-6 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                    Profili Düzenle
                </button>
            </div>
        </div>
    );
} 