'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useListing } from '@/context/ListingContext';
import { Listing } from '@/types/listing';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { cities } from '@/data/cities';
import { breeds } from '@/data/breeds';
import Image from 'next/image';

interface FormData {
    title: string;
    description: string;
    petType: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
    petName: string;
    petAge: string;
    petGender: 'male' | 'female';
    breed: string;
    city: string;
    district: string;
    phone: string;
    email: string;
    photos: string[];
}

export default function CreateListingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { createListing } = useListing();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        petType: 'dog',
        petName: '',
        petAge: '',
        petGender: 'male',
        breed: '',
        city: '',
        district: '',
        phone: '',
        email: user?.email || '',
        photos: []
    });

    useEffect(() => {
        if (!user) {
            router.push('/auth');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setError(null);
        setLoading(true);

        try {
            const listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'> = {
                ...formData,
                ownerId: user!.uid,
                status: 'active',
                photos: formData.photos
            };

            await createListing(listingData);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bir hata oluştu');
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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (formData.photos.length >= 2) {
            setError('En fazla 2 fotoğraf yükleyebilirsiniz');
            return;
        }

        setUploadingPhoto(true);
        setError(null);

        try {
            const fileExtension = file.name.split('.').pop();
            const fileName = `${user.uid}/${Date.now()}.${fileExtension}`;
            const fileRef = storageRef(storage, `pet-photos/${fileName}`);
            await uploadBytes(fileRef, file);
            const photoURL = await getDownloadURL(fileRef);

            setFormData(prev => ({
                ...prev,
                photos: [...prev.photos, photoURL]
            }));
        } catch (err) {
            setError('Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
            console.error('Fotoğraf yükleme hatası:', err);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const removePhoto = (photoToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(photo => photo !== photoToRemove)
        }));
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 relative overflow-hidden">
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
                        {['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰'][Math.floor(Math.random() * 9)]}
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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Yeni İlan Oluştur</h1>
                            <p className="text-gray-600 mb-0">Minik dostunuz için yeni bir yuva bulun</p>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="petType" className="block text-sm font-medium text-gray-700 mb-1">
                                    🐾 Dostumuzun Türü
                                </label>
                                <select
                                    id="petType"
                                    name="petType"
                                    value={formData.petType}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                >
                                    <option value="dog">Köpek</option>
                                    <option value="cat">Kedi</option>
                                    <option value="rabbit">Tavşan</option>
                                    <option value="bird">Kuş</option>
                                    <option value="other">Diğer</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
                                    🧬 Irk
                                </label>
                                <select
                                    id="breed"
                                    name="breed"
                                    value={formData.breed}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                >
                                    <option value="">Irk Seçin</option>
                                    {formData.petType !== 'other' && breeds[formData.petType]?.map((breed: string) => (
                                        <option key={breed} value={breed}>
                                            {breed}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">
                                    📛 İsim
                                </label>
                                <input
                                    type="text"
                                    id="petName"
                                    name="petName"
                                    value={formData.petName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="petAge" className="block text-sm font-medium text-gray-700 mb-1">
                                    📅 Yaş
                                </label>
                                <input
                                    type="text"
                                    id="petAge"
                                    name="petAge"
                                    value={formData.petAge}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ♂️ Cinsiyet
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="petGender"
                                        value="male"
                                        checked={formData.petGender === 'male'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    Erkek
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="petGender"
                                        value="female"
                                        checked={formData.petGender === 'female'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    Dişi
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📸 Fotoğraflar (En fazla 2)
                            </label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-3">
                                    {formData.photos.map((photo, index) => (
                                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                                            <Image
                                                src={photo}
                                                alt={`İlan fotoğrafı ${index + 1}`}
                                                width={96}
                                                height={96}
                                                className="object-cover w-full h-full"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(photo)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                                aria-label="Fotoğrafı kaldır"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {formData.photos.length < 2 && (
                                        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative hover:border-indigo-500 transition-all duration-200">
                                            <input
                                                type="file"
                                                id="photo-upload"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                disabled={uploadingPhoto || formData.photos.length >= 2}
                                            />
                                            {uploadingPhoto ? (
                                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></span>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    İlan için 1-2 fotoğraf ekleyin (JPEG, PNG, WebP)
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🏙️ Şehir
                                </label>
                                <select
                                    value={formData.city}
                                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Şehir Seçin</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.name}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🏘️ İlçe
                                </label>
                                <input
                                    type="text"
                                    value={formData.district}
                                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="İlçe girin"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    required
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
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-700 flex items-center gap-2">
                                <span className="text-xl">🔒</span>
                                <span>
                                    İletişim bilgileriniz gizli tutulacak ve diğer kullanıcılara gösterilmeyecektir. İlgilenen kişiler sizinle mesajlaşma sistemi üzerinden iletişime geçebilecek.
                                </span>
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Oluşturuluyor...
                                    </span>
                                ) : (
                                    'İlanı Oluştur'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 