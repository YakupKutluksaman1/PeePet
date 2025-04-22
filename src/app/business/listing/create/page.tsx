'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';
import { getDatabase, ref, push, set, onValue, DataSnapshot } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

export default function CreateBusinessListing() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Form alanları için state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [listingImages, setListingImages] = useState<{ file1: File | null, file2: File | null, file3: File | null }>({ file1: null, file2: null, file3: null });
    const [imagePreview, setImagePreview] = useState<{ preview1: string, preview2: string, preview3: string }>({ preview1: '', preview2: '', preview3: '' });
    const [petTypes, setPetTypes] = useState<string[]>([]);
    const [validUntil, setValidUntil] = useState('');
    const [categoryFields, setCategoryFields] = useState<{ [key: string]: string | string[] }>({});

    // Firebase
    const db = getDatabase(app);
    const storage = getStorage(app);

    // İşletme profilini yükle
    useEffect(() => {
        if (!user || loading) return;

        const businessProfileRef = ref(db, `businesses/${user.uid}/profile`);
        const unsubscribe = onValue(businessProfileRef, (snapshot: DataSnapshot) => {
            const profileData = snapshot.val();
            if (profileData) {
                setBusinessProfile(profileData);
            }
            setProfileLoading(false);
        });

        return () => unsubscribe();
    }, [user, loading, db]);

    // Yükleniyor durumu
    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
                <p className="text-gray-600">Bilgiler yükleniyor...</p>
            </div>
        );
    }

    // Kullanıcı giriş yapmamışsa
    if (!user) {
        router.push('/isletmeler');
        return null;
    }

    // İşletme profili bulunamadıysa
    if (!businessProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">İşletme Profili Bulunamadı</h1>
                    <p className="text-gray-600 mb-6">İşletme profilinize erişilemiyor. Lütfen tekrar giriş yapmayı deneyin.</p>
                    <div className="flex justify-center">
                        <Link href="/isletmeler" className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                            Giriş Sayfasına Dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Resim değişikliği
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2 | 3) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                if (imageNumber === 1) {
                    setListingImages(prev => ({ ...prev, file1: file }));
                    setImagePreview(prev => ({ ...prev, preview1: event.target?.result as string }));
                } else if (imageNumber === 2) {
                    setListingImages(prev => ({ ...prev, file2: file }));
                    setImagePreview(prev => ({ ...prev, preview2: event.target?.result as string }));
                } else {
                    setListingImages(prev => ({ ...prev, file3: file }));
                    setImagePreview(prev => ({ ...prev, preview3: event.target?.result as string }));
                }
            };

            reader.readAsDataURL(file);
        }
    };

    // Form gönderimi
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) {
            toast.error('İlan başlığı gereklidir');
            return;
        }

        setIsSubmitting(true);
        try {
            // Yeni ilan ID'si oluştur
            const newListingRef = push(ref(db, `business-listings`));
            const businessListingRef = ref(db, `businesses/${user.uid}/listings/${newListingRef.key}`);

            // Resimleri yükle
            const uploadPromises = [];
            let image1Url = '';
            let image2Url = '';
            let image3Url = '';

            if (listingImages.file1) {
                const image1Ref = storageRef(storage, `businesses/${user.uid}/listings/${newListingRef.key}/image1`);
                uploadPromises.push(
                    uploadBytes(image1Ref, listingImages.file1)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image1Url = url; })
                );
            }

            if (listingImages.file2) {
                const image2Ref = storageRef(storage, `businesses/${user.uid}/listings/${newListingRef.key}/image2`);
                uploadPromises.push(
                    uploadBytes(image2Ref, listingImages.file2)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image2Url = url; })
                );
            }

            if (listingImages.file3) {
                const image3Ref = storageRef(storage, `businesses/${user.uid}/listings/${newListingRef.key}/image3`);
                uploadPromises.push(
                    uploadBytes(image3Ref, listingImages.file3)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image3Url = url; })
                );
            }

            await Promise.all(uploadPromises);

            // İlan verisini oluştur
            const currentTime = Date.now();
            const expiryDate = validUntil ? new Date(validUntil).getTime() : currentTime + (30 * 24 * 60 * 60 * 1000); // 30 gün varsayılan

            const listingData = {
                id: newListingRef.key,
                businessId: user.uid,
                title,
                description,
                price: price || null,
                discountPrice: discountPrice || null,
                images: {
                    image1: image1Url,
                    image2: image2Url,
                    image3: image3Url
                },
                petTypes: petTypes.length > 0 ? petTypes : null,
                validUntil: expiryDate,
                status: 'active',
                categorySpecificFields: Object.keys(categoryFields).length > 0 ? categoryFields : null,
                category: businessProfile.businessCategory,
                subCategory: businessProfile.businessSubCategory,
                businessName: businessProfile.businessName,
                location: businessProfile.location,
                createdAt: currentTime,
                updatedAt: currentTime
            };

            // Veritabanına kaydet
            await Promise.all([
                set(newListingRef, listingData),
                set(businessListingRef, listingData)
            ]);

            toast.success('İlan başarıyla oluşturuldu');
            // 2 saniye sonra dashboard'a yönlendir
            setTimeout(() => {
                router.push('/business/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error('İlan oluşturulurken hata:', error);
            toast.error(`İlan oluşturulurken bir hata oluştu: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 py-10">
            <div className="max-w-5xl mx-auto px-4">
                <Toaster position="top-right" />

                {/* Header - Sol kenarlıklı beyaz kutu */}
                <div className="mb-8 bg-gradient-to-r from-indigo-50 via-white to-purple-50 rounded-lg shadow-md overflow-hidden border-l-4 border-indigo-500">
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center">
                            <div className="mr-4 bg-indigo-100 p-3 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    Yeni <span className="text-indigo-600">İlan Oluştur</span>
                                </h1>
                                <p className="text-gray-600 mt-1">İşletmeniz için yeni bir ilan oluşturun</p>
                            </div>
                        </div>
                        <Link
                            href="/business/dashboard"
                            className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 flex items-center justify-center hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Panele Dön
                        </Link>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                    <div className="p-6 border-b bg-gradient-to-br from-white via-white to-indigo-50">
                        <h2 className="text-lg font-semibold flex items-center mb-5 text-indigo-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            İlan Bilgileri
                        </h2>

                        {/* İlan Başlığı */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                İlan Başlığı <span className="text-indigo-600 ml-1">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 pl-3 pr-12"
                                placeholder="İlanınızın için en etkili başlığı giriniz..."
                                required
                            />
                        </div>

                        {/* İlan Açıklaması */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                İlan Açıklaması
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 h-32"
                                placeholder="İlan hakkında detaylı bilgi verin..."
                            />
                        </div>

                        {/* Fiyat Bilgileri */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Normal Fiyat
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 pl-3 pr-12"
                                        placeholder="Örn: 100"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₺</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                    İndirimli Fiyat
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        value={discountPrice}
                                        onChange={(e) => setDiscountPrice(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300 pl-3 pr-12"
                                        placeholder="Örn: 80"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₺</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* İlan Süresi */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                İlan Bitiş Tarihi (Opsiyonel - Varsayılan 30 gün)
                            </label>
                            <input
                                type="date"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:border-indigo-300"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Hayvan Türleri */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                                </svg>
                                Hangi Hayvanlar İçin?
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Balık', 'Sürüngen', 'Diğer'].map((pet) => (
                                    <label key={pet} className="inline-flex items-center bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all duration-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value={pet}
                                            checked={petTypes.includes(pet)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setPetTypes([...petTypes, pet]);
                                                } else {
                                                    setPetTypes(petTypes.filter(p => p !== pet));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 mr-2"
                                        />
                                        <span>{pet}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Görsel Yükleme */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                İlan Görselleri <span className="text-indigo-600 ml-1">*</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div
                                    onClick={() => document.getElementById('image1')?.click()}
                                    className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-all duration-300 h-48 flex flex-col items-center justify-center relative overflow-hidden group"
                                >
                                    {imagePreview.preview1 ? (
                                        <>
                                            <img
                                                src={imagePreview.preview1}
                                                alt="Önizleme"
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-indigo-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium">Değiştir</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-indigo-600 font-medium">Ana Görsel</p>
                                            <p className="text-xs text-gray-500 mt-1">Tıkla ve Yükle</p>
                                        </>
                                    )}
                                    <input
                                        id="image1"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageChange(e, 1)}
                                        className="hidden"
                                    />
                                </div>

                                <div
                                    onClick={() => document.getElementById('image2')?.click()}
                                    className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-all duration-300 h-48 flex flex-col items-center justify-center relative overflow-hidden group"
                                >
                                    {imagePreview.preview2 ? (
                                        <>
                                            <img
                                                src={imagePreview.preview2}
                                                alt="Önizleme"
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-indigo-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium">Değiştir</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-indigo-600 font-medium">Ek Görsel 1</p>
                                            <p className="text-xs text-gray-500 mt-1">Opsiyonel</p>
                                        </>
                                    )}
                                    <input
                                        id="image2"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageChange(e, 2)}
                                        className="hidden"
                                    />
                                </div>

                                <div
                                    onClick={() => document.getElementById('image3')?.click()}
                                    className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-all duration-300 h-48 flex flex-col items-center justify-center relative overflow-hidden group"
                                >
                                    {imagePreview.preview3 ? (
                                        <>
                                            <img
                                                src={imagePreview.preview3}
                                                alt="Önizleme"
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-indigo-900 bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium">Değiştir</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-indigo-600 font-medium">Ek Görsel 2</p>
                                            <p className="text-xs text-gray-500 mt-1">Opsiyonel</p>
                                        </>
                                    )}
                                    <input
                                        id="image3"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageChange(e, 3)}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Butonlar */}
                    <div className="px-6 py-4 bg-gradient-to-br from-white to-indigo-50 flex justify-end space-x-3">
                        <Link
                            href="/business/dashboard"
                            className="px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-300"
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title || !listingImages.file1}
                            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transform hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                    İlan Oluşturuluyor...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    İlanı Oluştur
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 