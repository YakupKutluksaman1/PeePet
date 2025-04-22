'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { getDatabase, ref, onValue, set } from 'firebase/database'
import { Pet } from '@/types/pet'
import { breeds } from '@/data/breeds'

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰']

interface UserProfile {
    phone: string;
    city: string;
    district: string;
}

export default function EditUserProfilePage() {
    const [profile, setProfile] = useState<UserProfile>({
        phone: '',
        city: '',
        district: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }

        const db = getDatabase();
        const userRef = ref(db, `users/${user.uid}`);

        const unsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setProfile({
                    phone: data.phone || '',
                    city: data.city || '',
                    district: data.district || ''
                });
            }
        });

        return () => unsubscribe();
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!user) throw new Error('Kullanıcı bulunamadı');

            const db = getDatabase();
            const userRef = ref(db, `users/${user.uid}`);

            await set(userRef, {
                ...profile,
                updatedAt: new Date().toISOString()
            });

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 relative overflow-hidden">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-white/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Profil Bilgilerini Düzenle</h1>
                            <p className="mt-2 text-gray-600">İletişim ve konum bilgilerinizi güncelleyin</p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-800 rounded-xl p-4 flex items-center gap-2 mb-6">
                            <span>⚠️</span>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefon
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                        📱
                                    </span>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={profile.phone}
                                        onChange={handleChange}
                                        placeholder="Örn: 0555 555 55 55"
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                        Şehir
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                            🏙️
                                        </span>
                                        <input
                                            type="text"
                                            id="city"
                                            name="city"
                                            value={profile.city}
                                            onChange={handleChange}
                                            placeholder="Örn: İstanbul"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                                        İlçe
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                            🏘️
                                        </span>
                                        <input
                                            type="text"
                                            id="district"
                                            name="district"
                                            value={profile.district}
                                            onChange={handleChange}
                                            placeholder="Örn: Kadıköy"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:shadow-md"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 hover:shadow-md disabled:hover:shadow-none"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Kaydediliyor...
                                    </span>
                                ) : (
                                    'Kaydet'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 