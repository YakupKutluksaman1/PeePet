'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';
import { getDatabase, ref, onValue, DataSnapshot, remove } from 'firebase/database';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

export default function BusinessListings() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [listings, setListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'expired'
    const [search, setSearch] = useState('');

    const db = getDatabase(app);

    // Kullanıcı kimlik doğrulama kontrolü - mobil görünüm için geliştirildi
    useEffect(() => {
        if (loading) return; // Yükleme devam ediyorsa bekle

        if (!user) {
            // Kullanıcı giriş yapmamışsa, işletmeler sayfasına yönlendir
            router.push('/isletmeler');
        }
    }, [user, loading, router]);

    // İlan verilerini yükle
    useEffect(() => {
        if (!user || loading) return;

        const listingsRef = ref(db, `businesses/${user.uid}/listings`);
        const unsubscribe = onValue(listingsRef, (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            const listingsArray: any[] = [];

            if (data) {
                // Object.values yerine Object.entries kullan - key (id) değerini korumak için
                Object.entries(data).forEach(([key, value]: [string, any]) => {
                    listingsArray.push({
                        ...value,
                        id: key
                    });
                });
            }

            // En yeni tarihten eskiye sırala
            listingsArray.sort((a, b) => b.createdAt - a.createdAt);
            setListings(listingsArray);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, loading, db]);

    // İlan silme işlemi
    const handleDeleteListing = async (listingId: string) => {
        if (!user) return;

        if (window.confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
            try {
                // Her iki veritabanından da sil
                await remove(ref(db, `businesses/${user.uid}/listings/${listingId}`));
                await remove(ref(db, `business-listings/${listingId}`));

                toast.success('İlan başarıyla silindi');
            } catch (error: any) {
                console.error('İlan silinirken hata:', error);
                toast.error(`İlan silinirken bir hata oluştu: ${error.message}`);
            }
        }
    };

    // Filtreleme
    const getFilteredListings = () => {
        const currentTime = Date.now();

        // Önce arama filtresi uygula
        let filtered = listings;
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(listing =>
                listing.title?.toLowerCase().includes(searchLower) ||
                listing.description?.toLowerCase().includes(searchLower)
            );
        }

        // Sonra durum filtresi uygula
        if (filter === 'active') {
            return filtered.filter(listing =>
                listing.status === 'active' && listing.validUntil > currentTime
            );
        } else if (filter === 'expired') {
            return filtered.filter(listing =>
                listing.status === 'inactive' || listing.validUntil <= currentTime
            );
        }

        return filtered;
    };

    // Kullanıcı giriş yapmamışsa, bekle ve yükleniyor göster
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // Kullanıcı giriş yapmamışsa, artık router.push işleminin tamamlanmasını bekle
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const filteredListings = getFilteredListings();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 py-10">
            <div className="max-w-6xl mx-auto px-4">
                <Toaster position="top-right" />

                {/* Header - Sol kenarlıklı beyaz kutu */}
                <div className="mb-8 bg-gradient-to-r from-indigo-50 via-white to-purple-50 rounded-lg shadow-md overflow-hidden border-l-4 border-indigo-500">
                    <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center">
                            <div className="mr-4 bg-indigo-100 p-3 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    İşletme <span className="text-indigo-600">İlanlarım</span>
                                </h1>
                                <p className="text-gray-600 mt-1">Tüm ilanlarınızı buradan yönetebilirsiniz</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/business/dashboard"
                                className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 flex items-center justify-center hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow hover:text-indigo-600 hover:border-indigo-300 group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Panel
                            </Link>
                            <Link
                                href="/business/listing/create"
                                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center transform hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Yeni İlan Oluştur
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Filtreleme ve Arama - Geliştirilmiş kart */}
                <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-xl shadow-md p-6 mb-8 border border-gray-100 transition-all duration-300 hover:shadow-lg">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    İlan Ara
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="search"
                                    placeholder="İlan başlığı veya açıklaması ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="md:w-64">
                            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
                                <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    Durum Filtresi
                                </span>
                            </label>
                            <select
                                id="filter"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-3 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                            >
                                <option value="all">Tüm İlanlar</option>
                                <option value="active">Aktif İlanlar</option>
                                <option value="expired">Süresi Dolan İlanlar</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* İçerik */}
                {isLoading ? (
                    <div className="min-h-[400px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                    </div>
                ) : filteredListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredListings.map((listing) => {
                            const isExpired = listing.validUntil < Date.now();
                            // İndirim yüzdesi hesaplama
                            let discountPercentage = 0;
                            if (listing.price && listing.discountPrice) {
                                discountPercentage = Math.round(((listing.price - listing.discountPrice) / listing.price) * 100);
                            }

                            return (
                                <div key={listing.id} className={`bg-gradient-to-tl from-white to-indigo-50 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border border-gray-100 ${isExpired ? 'opacity-70' : ''}`}>
                                    <div className="relative h-52 overflow-hidden">
                                        {listing.images?.image1 ? (
                                            <img
                                                src={listing.images.image1}
                                                alt={listing.title}
                                                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Durum etiketi - Hareketli nokta indikatörü */}
                                        <div className="absolute top-3 right-3">
                                            {isExpired ? (
                                                <span className="bg-red-100 text-red-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-red-200 flex items-center">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                                                    Süresi Doldu
                                                </span>
                                            ) : (
                                                <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border border-indigo-200 flex items-center">
                                                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1.5 animate-pulse"></span>
                                                    Aktif
                                                </span>
                                            )}
                                        </div>

                                        {/* İndirim yüzdesi */}
                                        {discountPercentage > 0 && (
                                            <div className="absolute bottom-3 left-3">
                                                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold shadow-md">
                                                    %{discountPercentage} İndirim
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 hover:text-indigo-600 transition-colors">{listing.title}</h3>

                                        {/* Fiyat bilgisi */}
                                        <div className="mt-3 flex items-center">
                                            {listing.discountPrice ? (
                                                <>
                                                    <span className="text-xl font-bold text-indigo-600">{listing.discountPrice}₺</span>
                                                    <span className="ml-2 text-sm text-gray-500 line-through">{listing.price}₺</span>
                                                </>
                                            ) : listing.price ? (
                                                <span className="text-xl font-bold text-indigo-600">{listing.price}₺</span>
                                            ) : (
                                                <span className="text-sm text-gray-500">Fiyat belirtilmemiş</span>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            {/* Alt bilgiler */}
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <div>
                                                    {listing.petTypes && listing.petTypes.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {listing.petTypes.slice(0, 3).map((pet: string) => (
                                                                <span key={pet} className="bg-indigo-50 px-2.5 py-1 rounded-full text-xs border border-indigo-100 shadow-sm text-indigo-700">
                                                                    {pet}
                                                                </span>
                                                            ))}
                                                            {listing.petTypes.length > 3 && (
                                                                <span className="bg-indigo-50 px-2.5 py-1 rounded-full text-xs border border-indigo-100 shadow-sm text-indigo-700">
                                                                    +{listing.petTypes.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="text-xs">
                                                        {new Date(listing.createdAt).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Butonlar */}
                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                <Link
                                                    href={`/business/listing/edit/${listing.id}`}
                                                    className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center justify-center text-sm font-medium transition-all duration-300 border border-indigo-100 group"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Düzenle
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteListing(listing.id)}
                                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center text-sm font-medium transition-all duration-300 border border-red-100 group"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100 transition-all duration-300 hover:shadow-lg">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-medium text-gray-800 mb-3">Henüz İlanınız Bulunmuyor</h3>
                        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
                            İşletmeniz için ilk ilanınızı oluşturarak potansiyel müşterilerinize ulaşabilirsiniz. İlanlarınız ile hizmetlerinizi tanıtabilir ve daha fazla hayvan severe ulaşabilirsiniz.
                        </p>
                        <Link
                            href="/business/listing/create"
                            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center transform hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni İlan Oluştur
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
} 