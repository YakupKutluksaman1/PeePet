'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getDatabase, ref as dbRef, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { User } from '@/app/types/user';
import { cities } from '@/data/cities';

const EMOJIS = ['✨', '🌟', '💫', '⭐️', '🎯', '🎨', '🎭', '🎪', '🔮', '🧙‍♂️', '🧿'];
const NOTIFICATION_EMOJIS = {
    success: '✅',
    error: '❌',
    loading: '⏳'
};

export default function EditUserProfile() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toastShownRef = useRef(false);
    const [formData, setFormData] = useState<User>({
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        location: '',
        photoURL: '',
        createdAt: '',
        updatedAt: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [selectedCity, setSelectedCity] = useState('');
    const [district, setDistrict] = useState('');
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([]);
    const [formChanged, setFormChanged] = useState(false);
    const [dataFetched, setDataFetched] = useState(false);

    // Arka plan animasyonları
    useEffect(() => {
        // Arka plan emojilerini oluştur
        const emojis = Array.from({ length: 12 }, () => ({
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: 0.05 + Math.random() * 0.1,
                fontSize: `${1 + Math.random() * 1.5}rem`,
                transform: `rotate(${Math.random() * 360}deg)`
            }
        }));
        setBackgroundEmojis(emojis);

        // Her 5 saniyede bir yeni emoji ekle
        const interval = setInterval(() => {
            setBackgroundEmojis(prev => {
                if (prev.length >= 20) {
                    return [...prev.slice(1), {
                        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                        style: {
                            left: `${Math.random() * 100}%`,
                            top: '-10%',
                            animationDelay: '0s',
                            opacity: 0.05 + Math.random() * 0.1,
                            fontSize: `${1 + Math.random() * 1.5}rem`,
                            transform: `rotate(${Math.random() * 360}deg)`
                        }
                    }];
                }
                return [...prev, {
                    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    style: {
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animationDelay: '0s',
                        opacity: 0.05 + Math.random() * 0.1,
                        fontSize: `${1 + Math.random() * 1.5}rem`,
                        transform: `rotate(${Math.random() * 360}deg)`
                    }
                }];
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth');
            return;
        }

        if (user && !dataFetched) {
            const db = getDatabase();
            const userRef = dbRef(db, `users/${user.uid}`);

            const fetchUserData = async () => {
                let loadingToastId: string | undefined;

                if (!toastShownRef.current) {
                    loadingToastId = toast.loading('Bilgileriniz yükleniyor...', {
                        icon: '🔄',
                        style: {
                            background: '#F0F9FF',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                        }
                    });
                }

                try {
                    const snapshot = await get(userRef);
                    const userData = snapshot.val();
                    if (userData) {
                        setFormData({
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

                        // Konum bilgisini parçala
                        if (userData.location && typeof userData.location === 'string') {
                            const [city, district] = userData.location.split(', ');
                            setSelectedCity(city || '');
                            setDistrict(district || '');
                        } else {
                            setSelectedCity('');
                            setDistrict('');
                        }
                    }

                    if (!toastShownRef.current) {
                        toast.success('Bilgileriniz başarıyla yüklendi!', {
                            icon: NOTIFICATION_EMOJIS.success,
                            style: {
                                background: '#ECFDF5',
                                color: '#047857',
                                border: '1px solid #A7F3D0',
                            }
                        });
                        toastShownRef.current = true;
                    }

                    setDataFetched(true);
                } catch (error) {
                    console.error('Kullanıcı verileri alınırken hata:', error);

                    if (!toastShownRef.current) {
                        toast.error('Bilgileriniz yüklenirken bir hata oluştu.', {
                            icon: NOTIFICATION_EMOJIS.error,
                            style: {
                                background: '#FEF2F2',
                                color: '#B91C1C',
                                border: '1px solid #FECACA',
                            }
                        });
                        toastShownRef.current = true;
                    }
                } finally {
                    if (loadingToastId) {
                        toast.dismiss(loadingToastId);
                    }
                    setIsLoading(false);
                }
            };

            fetchUserData();
        }
    }, [user, loading, router, dataFetched]);

    useEffect(() => {
        return () => {
            toastShownRef.current = false;
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormChanged(true);
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingPhoto(true);
        const loadingToast = toast.loading('Fotoğrafınız yükleniyor...', {
            icon: '📷',
            style: {
                background: '#F0F9FF',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
            }
        });

        try {
            const fileExtension = file.name.split('.').pop();
            const fileName = `${user.uid}/profile/${Date.now()}.${fileExtension}`;
            const fileRef = storageRef(storage, `profile-photos/${fileName}`);

            await uploadBytes(fileRef, file);
            const photoURL = await getDownloadURL(fileRef);

            setFormData(prev => ({ ...prev, photoURL }));
            setFormChanged(true);
            toast.success('Fotoğraf başarıyla yüklendi!', {
                icon: '🖼️',
                style: {
                    background: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                }
            });
        } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            toast.error('Fotoğraf yüklenirken bir hata oluştu!', {
                icon: NOTIFICATION_EMOJIS.error,
                style: {
                    background: '#FEF2F2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA',
                }
            });
        } finally {
            toast.dismiss(loadingToast);
            setUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formChanged) return;

        setIsSaving(true);
        const loadingToast = toast.loading('Profiliniz güncelleniyor...', {
            icon: '⚙️',
            style: {
                background: '#F0F9FF',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
            }
        });

        try {
            const db = getDatabase();
            const userRef = dbRef(db, `users/${user.uid}`);

            const updatedData = {
                ...formData,
                location: `${selectedCity}, ${district}`,
                updatedAt: new Date().toISOString()
            };

            await set(userRef, updatedData);

            toast.success('Profiliniz başarıyla güncellendi!', {
                icon: '🎉',
                style: {
                    background: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                }
            });

            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            toast.error('Profiliniz güncellenirken bir hata oluştu!', {
                icon: '❗',
                style: {
                    background: '#FEF2F2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA',
                }
            });
        } finally {
            toast.dismiss(loadingToast);
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
                <p className="text-indigo-700 font-medium animate-pulse">Bilgileriniz yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-12 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {backgroundEmojis.map((item, index) => (
                    <div
                        key={index}
                        className="absolute text-4xl animate-float"
                        style={item.style}
                    >
                        {item.emoji}
                    </div>
                ))}
            </div>

            <Toaster position="top-center" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Başlık ve Kısa Açıklama */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 inline-block">
                        Profilinizi Güncelleyin
                    </h1>
                    <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                        Kişisel bilgilerinizi güncelleyerek profilinizi tamamlayın ve evcil dostlarınız için en iyi deneyimi yaşayın.
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 md:p-10 transform transition-all duration-300 hover:shadow-2xl border border-white/50">
                    <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full bg-gray-100 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-all transform hover:scale-110 duration-200"
                            aria-label="Geri dön"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent flex items-center">
                            <span>Profil Bilgileriniz</span>
                            <span className="ml-2 animate-pulse">✨</span>
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Profil Fotoğrafı */}
                        <div className="flex flex-col items-center mb-6">
                            <div
                                className="w-36 h-36 rounded-full bg-gradient-to-r from-indigo-200 to-purple-200 p-1 mb-4 relative group cursor-pointer transform transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                                onClick={triggerFileInput}
                            >
                                <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden">
                                    {formData.photoURL ? (
                                        <img
                                            src={formData.photoURL}
                                            alt="Profil fotoğrafı"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-indigo-50 to-purple-50">
                                            👤
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    id="profile-photo"
                                    disabled={uploadingPhoto}
                                />
                            </div>
                            <p className="text-sm text-indigo-500 font-medium">
                                {uploadingPhoto ? 'Fotoğraf yükleniyor...' : 'Fotoğrafı değiştirmek için tıklayın'}
                            </p>
                        </div>

                        {/* Kişisel Bilgiler */}
                        <div className="bg-white/50 rounded-xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                                <span className="text-xl mr-2">👤</span> Kişisel Bilgiler
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        Ad
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                        required
                                    />
                                </div>
                                <div className="group">
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        Soyad
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* İletişim Bilgileri */}
                        <div className="bg-white/50 rounded-xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                                <span className="text-xl mr-2">📞</span> İletişim Bilgileri
                            </h3>

                            <div className="space-y-6">
                                <div className="group">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        E-posta Adresi
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                        required
                                    />
                                </div>
                                <div className="group">
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        Telefon Numarası
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                        placeholder="(5XX) XXX XX XX"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Konum Bilgisi */}
                        <div className="bg-white/50 rounded-xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                                <span className="text-xl mr-2">📍</span> Konum Bilgisi
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group">
                                    <label htmlFor="selectedCity" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        Şehir
                                    </label>
                                    <select
                                        id="selectedCity"
                                        value={selectedCity}
                                        onChange={(e) => {
                                            setSelectedCity(e.target.value);
                                            setFormChanged(true);
                                        }}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                    >
                                        <option value="">Seçiniz</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.name}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="group">
                                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                                        İlçe
                                    </label>
                                    <input
                                        type="text"
                                        id="district"
                                        value={district}
                                        onChange={(e) => {
                                            setDistrict(e.target.value);
                                            setFormChanged(true);
                                        }}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all group-hover:border-indigo-300"
                                        placeholder="İlçe adını giriniz"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Butonlar */}
                        <div className="flex justify-between pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard')}
                                className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-200 hover:shadow-md flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                                İptal
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving || !formChanged}
                                className={`px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 shadow-md flex items-center ${!formChanged
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : isSaving
                                        ? 'bg-indigo-400 cursor-wait'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:-translate-y-0.5'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Değişiklikleri Kaydet
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Altbilgi */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>Bilgileriniz güvenle saklanır ve sizin izniniz olmadan paylaşılmaz.</p>
                </div>
            </div>

            {/* Stil tanımlamaları */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0);
                        opacity: 0.05;
                    }
                    50% {
                        transform: translateY(400px) rotate(180deg);
                        opacity: 0.1;
                    }
                    100% {
                        transform: translateY(800px) rotate(360deg);
                        opacity: 0;
                    }
                }
                .animate-float {
                    animation: float 25s linear infinite;
                }
            `}</style>
        </div>
    );
} 