'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useListing } from '@/context/ListingContext';
import { useAuth } from '@/context/AuthContext';
import { Listing } from '@/types/listing';

type FormData = {
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'sold';
    city: string;
    district: string;
    phone: string;
    email: string;
};

export default function EditListingPage() {
    const { id } = useParams();
    const router = useRouter();
    const { listings, updateListing } = useListing();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listing = listings.find(l => l.id === id);

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        status: 'active',
        city: '',
        district: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        if (listing) {
            setFormData({
                title: listing.title || '',
                description: listing.description || '',
                status: listing.status || 'active',
                city: listing.city || '',
                district: listing.district || '',
                phone: listing.phone || '',
                email: listing.email || ''
            });
        }
    }, [listing]);

    if (!listing) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 flex items-center justify-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center gap-2">
                    <span>⚠️</span>
                    <span>İlan bulunamadı</span>
                </div>
            </div>
        );
    }

    if (!user || user.uid !== listing.ownerId) {
        router.push('/listings');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await updateListing(id as string, formData);
            router.push('/listings');
        } catch (err) {
            setError('İlan güncellenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-70" />
                {Array.from({ length: 15 }).map((_, index) => (
                    <div
                        key={index}
                        className="absolute text-4xl animate-float opacity-10"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    >
                        {['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰', '✏️', '✨'][Math.floor(Math.random() * 11)]}
                    </div>
                ))}
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <button
                            onClick={() => router.push('/listings')}
                            className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-300 hover:shadow-lg text-indigo-700 mt-1"
                            aria-label="Geri dön"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">İlanı Düzenle</h1>
                            <p className="text-gray-600 mb-0">Minik dostunuz için en uygun bilgileri güncelleyin</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                ✏️ Başlık
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                📝 Açıklama
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                🔄 Durum
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            >
                                <option value="active">Aktif</option>
                                <option value="inactive">Pasif</option>
                                <option value="sold">Sahiplendirildi</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                    🏙️ Şehir
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                                    🏘️ İlçe
                                </label>
                                <input
                                    type="text"
                                    id="district"
                                    name="district"
                                    value={formData.district}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    📱 Telefon
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    ✉️ E-posta
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 flex items-center gap-2"
                            >
                                <span>↩️</span> Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Güncelleniyor...
                                    </span>
                                ) : (
                                    <><span>✨</span> İlanı Güncelle</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 