'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { getDatabase, ref as dbRef, get, update, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import { Pet } from '@/types/pet';
import { breeds } from '@/data/breeds';

interface PetFormData {
    name: string;
    type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'guinea-pig' | 'ferret' | 'turtle' | 'fish' | 'snake' | 'lizard' | 'hedgehog' | 'exotic';
    breed: string;
    age: string;
    gender: 'male' | 'female';
    description?: string;
}

const EMOJIS = ['🐶', '🐱', '🐰', '🐹', '🐦', '🐢', '🐠', '🦜', '🐾', '❤️', '✨'];

function EditPetProfileContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const petId = searchParams.get('id');
    const [pet, setPet] = useState<Pet | null>(null);
    const [formData, setFormData] = useState<PetFormData>({
        name: '',
        type: 'dog',
        breed: '',
        age: '',
        gender: 'male',
        description: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Arka plan emojileri için effect
    useEffect(() => {
        // İlk emoji setini oluştur
        const emojis = Array.from({ length: 15 }, () => ({
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`
            }
        }));
        setBackgroundEmojis(emojis);

        // Her 3 saniyede bir yeni emoji ekle
        const interval = setInterval(() => {
            setBackgroundEmojis(prev => {
                if (prev.length >= 25) {
                    return [...prev.slice(1), {
                        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                        style: {
                            left: `${Math.random() * 100}%`,
                            top: '-10%',
                            animationDelay: '0s'
                        }
                    }];
                }
                return [...prev, {
                    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    style: {
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animationDelay: '0s'
                    }
                }];
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth');
            return;
        }

        if (user && petId) {
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${petId}`);

            const fetchPetData = async () => {
                try {
                    const snapshot = await get(petRef);
                    const petData = snapshot.val();
                    if (petData) {
                        setPet(petData);
                        setFormData({
                            name: petData.name || '',
                            type: petData.type || 'dog',
                            breed: petData.breed || '',
                            age: petData.age || '',
                            gender: petData.gender || 'male',
                            description: petData.description || ''
                        });
                    } else {
                        toast.error('Evcil hayvan bulunamadı! ⚠️');
                        setTimeout(() => {
                            router.push('/dashboard');
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Minik dostumuz verileri alınırken hata:', error);
                    toast.error('Minik dostumuz bilgileri yüklenirken bir hata oluştu! ⚠️');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchPetData();
        } else if (!petId) {
            toast.error('Evcil hayvan ID\'si bulunamadi! ⚠️');
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        }
    }, [user, loading, router, petId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !pet || !petId) return;

        setIsSaving(true);
        const loadingToast = toast.loading('Minik dostumuz profili güncelleniyor... 🐾', {
            position: 'top-center'
        });

        setIsLoading(true);
        try {
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${petId}`);

            // Sadece değişen alanları güncelle
            const updates = {
                ...pet, // Mevcut tüm veriyi koru
                ...formData, // Değişen form verilerini ekle
                updatedAt: new Date().toISOString()
            };

            await update(petRef, updates);

            toast.success('Minik dostumuz profili başarıyla güncellendi! 🎉', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#DCFCE7',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                }
            });

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            toast.error('Minik dostumuz profili güncellenirken bir hata oluştu. Lütfen tekrar deneyin. ⚠️', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                }
            });
        } finally {
            toast.dismiss(loadingToast);
            setIsSaving(false);
            setIsLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pet || !petId) return;

        const loadingToast = toast.loading('Fotoğraf yükleniyor... 📸', {
            position: 'top-center'
        });

        try {
            const storage = getStorage();
            const photoRef = storageRef(storage, `pet-photos/${user?.uid}/${petId}/${file.name}`);
            await uploadBytes(photoRef, file);
            const photoUrl = await getDownloadURL(photoRef);

            const currentPhotos = Array.isArray(pet.photos) ? pet.photos : [];
            const updatedPhotos = [...currentPhotos, photoUrl];

            if (user) {
                const db = getDatabase();
                const petRef = dbRef(db, `pets/${user.uid}/${petId}`);
                await update(petRef, {
                    photos: updatedPhotos,
                    updatedAt: new Date().toISOString()
                });
            }

            setPet(prev => prev ? { ...prev, photos: updatedPhotos } : null);

            toast.success('Fotoğraf başarıyla yüklendi! 🖼️', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#DCFCE7',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                }
            });
        } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            toast.error('Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin. ⚠️', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                }
            });
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleDeletePet = async () => {
        if (!user || !petId) return;
        setDeleting(true);
        try {
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${petId}`);
            await remove(petRef);
            toast.success('Evcil hayvan başarıyla silindi!');
            setShowDeleteModal(false);
            setDeleting(false);
            router.push('/dashboard');
        } catch (error) {
            toast.error('Silme işlemi sırasında bir hata oluştu!');
            setDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 opacity-50" />
                {backgroundEmojis.map((item, index) => (
                    <div
                        key={index}
                        className="absolute text-4xl animate-float opacity-10"
                        style={item.style}
                    >
                        {item.emoji}
                    </div>
                ))}
            </div>

            {/* Ana İçerik */}
            <div className="relative z-10 py-12">
                <Toaster />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white/90 rounded-2xl shadow-xl p-6 md:p-10 backdrop-blur-sm border border-white/20">
                        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-indigo-50 transition-all duration-300 hover:shadow-lg text-indigo-700"
                                aria-label="Geri dön"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span>Minik Dostumuzun Profilini Düzenle</span>
                                <span className="text-2xl">🐾</span>
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Temel Bilgiler */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🏷️ İsim</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🐾 Tür</span>
                                    </label>
                                    <select
                                        id="type"
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PetFormData['type'] }))}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm appearance-none"
                                    >
                                        <option value="dog">Köpek</option>
                                        <option value="cat">Kedi</option>
                                        <option value="rabbit">Tavşan</option>
                                        <option value="bird">Kuş</option>
                                        <option value="hamster">Hamster</option>
                                        <option value="guinea-pig">Guinea Pig</option>
                                        <option value="ferret">Gelincik</option>
                                        <option value="turtle">Kaplumbağa</option>
                                        <option value="fish">Balık</option>
                                        <option value="snake">Yılan</option>
                                        <option value="lizard">Kertenkele</option>
                                        <option value="hedgehog">Kirpi</option>
                                        <option value="exotic">Egzotik Hayvan</option>
                                    </select>
                                </div>
                            </div>

                            {/* Detay Bilgileri */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🧬 Irk</span>
                                    </label>
                                    <select
                                        id="breed"
                                        value={formData.breed}
                                        onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm appearance-none"
                                        required
                                    >
                                        <option value="">Irk seçin</option>
                                        {breeds[formData.type].map((breed) => (
                                            <option key={breed} value={breed}>
                                                {breed}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🗓️ Yaş</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="age"
                                        value={formData.age}
                                        onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Cinsiyet */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <span>⚤ Cinsiyet</span>
                                </label>
                                <div className="flex gap-6">
                                    <label className="flex items-center bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-indigo-50">
                                        <input
                                            type="radio"
                                            value="male"
                                            checked={formData.gender === 'male'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2">👨 Erkek</span>
                                    </label>
                                    <label className="flex items-center bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-indigo-50">
                                        <input
                                            type="radio"
                                            value="female"
                                            checked={formData.gender === 'female'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2">👩 Dişi</span>
                                    </label>
                                </div>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <span>📝 Açıklama</span>
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                    placeholder="Evcil hayvanınız hakkında bilgi verin..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span>Fotoğraflar</span>
                                    <span className="text-lg">📸</span>
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                    {pet?.photos?.map((photo: string, index: number) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={photo}
                                                alt={`${pet.name} fotoğrafı ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (pet?.photos) {
                                                        const updatedPhotos = pet.photos.filter((_: string, i: number) => i !== index);
                                                        setPet(prev => prev ? { ...prev, photos: updatedPhotos } : null);
                                                    }
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                    />
                                </div>
                            </div>

                            {/* Butonlar */}
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    className="px-6 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors shadow-sm border border-red-200 font-medium"
                                    disabled={isSaving || deleting}
                                >
                                    {deleting ? 'Siliniyor...' : 'Sil'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-8 py-3 rounded-xl text-white font-medium transition-all duration-200 shadow-md ${isSaving
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5'
                                        }`}
                                >
                                    {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Stil tanımlamaları */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0);
                        opacity: 0.1;
                    }
                    50% {
                        transform: translateY(400px) rotate(180deg);
                        opacity: 0.2;
                    }
                    100% {
                        transform: translateY(800px) rotate(360deg);
                        opacity: 0;
                    }
                }
                .animate-float {
                    animation: float 15s linear infinite;
                }
            `}</style>

            {/* Silme Onay Modali */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Evcil Hayvanı Sil</h3>
                        <p className="text-gray-600 mb-6">Bu işlemi geri alamazsınız. Emin misiniz?</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                disabled={deleting}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeletePet}
                                className={`px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={deleting}
                            >
                                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EditPetProfile() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        }>
            <EditPetProfileContent />
            <Toaster position="top-right" />
        </Suspense>
    );
} 