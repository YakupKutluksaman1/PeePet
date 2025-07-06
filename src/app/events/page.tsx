'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessListing } from '@/context/BusinessListingContext';
import Link from 'next/link';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/lib/firebase';
import BusinessCard from '@/components/BusinessCard';

// İşletme tipi tanımlaması
interface Business {
    id: string;
    businessName: string;
    businessCategory: string;
    businessSubCategory: string;
    address: string;
    location: {
        city: string;
        district: string;
    };
    phone: string;
    rating: number;
    verified: boolean;
    photos: string[];
    description: string;
    servicesCount: number;
}

interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    businessId: string;
    businessName: string;
    createdAt: string;
}

// İşletme kategorileri
const BUSINESS_CATEGORIES = [
    { id: 'all', name: 'Tüm İşletmeler' },
    { id: 'veterinary', name: 'Veteriner Klinikleri ve Hastaneler' },
    { id: 'petshop', name: 'Pet Shop ve Malzeme Satıcıları' },
    { id: 'grooming', name: 'Bakım ve Güzellik Hizmetleri' },
    { id: 'boarding', name: 'Konaklama ve Bakım Hizmetleri' },
    { id: 'training', name: 'Eğitim ve Aktivite Merkezleri' },
    { id: 'entertainment', name: 'Eğlence ve Etkinlik İşletmeleri' },
    { id: 'transport', name: 'Ulaşım ve Seyahat Hizmetleri' },
    { id: 'health_products', name: 'Hayvan Sağlığı Ürünleri' },
    { id: 'shelter', name: 'Barınaklar ve Rehabilitasyon Merkezleri' },
    { id: 'special', name: 'Özel Hizmetler' },
    { id: 'farm', name: 'Çiftlik ve Büyük Hayvan Hizmetleri' },
    { id: 'tech', name: 'Teknoloji ve Yenilikçi Çözümler' }
];

const LISTING_CATEGORIES = [
    { id: 'all', name: 'Tüm İlanlar' },
    { id: 'health', name: 'Sağlık Hizmetleri' },
    { id: 'grooming', name: 'Bakım Hizmetleri' },
    { id: 'food', name: 'Mama ve Beslenme' },
    { id: 'boarding', name: 'Konaklama' },
    { id: 'training', name: 'Eğitim' },
    { id: 'other', name: 'Diğer' }
];

// Şehirler listesi
const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana"];

// Kategori türü
type CategoryType = 'all' | 'veterinary' | 'petshop' | 'grooming' | 'boarding' | 'training' |
    'entertainment' | 'transport' | 'health_products' | 'shelter' | 'special' |
    'farm' | 'tech';

type ListingCategoryType = 'all' | 'health' | 'grooming' | 'food' | 'boarding' | 'training' | 'other';

// Sayfa başına gösterilecek öğe sayısı
const ITEMS_PER_PAGE = 9;

export default function EventsPage() {
    const router = useRouter();
    const { businessListings, loading } = useBusinessListing();
    const [activeTab, setActiveTab] = useState<'businesses' | 'listings'>('businesses');
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
    const [selectedListingCategory, setSelectedListingCategory] = useState<ListingCategoryType>('all');
    const [selectedCity, setSelectedCity] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sayfalama için state'ler
    const [currentBusinessPage, setCurrentBusinessPage] = useState(1);
    const [currentListingPage, setCurrentListingPage] = useState(1);

    // Firebase'den işletme verilerini çek
    useEffect(() => {
        const db = getDatabase(app);
        const businessesRef = ref(db, 'businesses');

        const unsubscribe = onValue(businessesRef, (snapshot) => {
            const data = snapshot.val();
            const businessesArray: Business[] = [];

            if (data) {
                Object.keys(data).forEach((businessId) => {
                    const businessData = data[businessId];
                    if (businessData.profile) {
                        businessesArray.push({
                            id: businessId,
                            businessName: businessData.profile.businessName || '',
                            businessCategory: businessData.profile.businessCategory || '',
                            businessSubCategory: businessData.profile.businessSubCategory || '',
                            address: businessData.profile.address || '',
                            location: businessData.profile.location || { city: '', district: '' },
                            phone: businessData.profile.phone || '',
                            rating: businessData.profile.rating || 0,
                            verified: businessData.profile.verified || false,
                            photos: businessData.profile.photos || [],
                            description: businessData.profile.description || '',
                            servicesCount: businessData.services ? Object.keys(businessData.services).length : 0
                        });
                    }
                });
            }

            setBusinesses(businessesArray);
            setIsLoading(false);
        }, (error) => {
            if (process.env.NODE_ENV === 'development') {
                console.error('İşletme verileri yüklenirken hata:', error);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Filtre değiştiğinde sayfa numarasını sıfırla
    useEffect(() => {
        setCurrentBusinessPage(1);
    }, [selectedCategory, selectedCity, searchTerm]);

    useEffect(() => {
        setCurrentListingPage(1);
    }, [selectedListingCategory, searchTerm]);

    // Filtreler uygula
    const filteredBusinesses = businesses.filter(business => {
        // Kategori filtresi
        const categoryMatch = selectedCategory === 'all' || business.businessCategory === selectedCategory;

        // Şehir filtresi
        const cityMatch = !selectedCity || business.location.city === selectedCity;

        // Arama filtresi
        const searchMatch = !searchTerm ||
            business.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            business.description.toLowerCase().includes(searchTerm.toLowerCase());

        return categoryMatch && cityMatch && searchMatch;
    });

    // İlanları filtrele
    const filteredListings = businessListings.filter(listing => {
        const categoryMatch = selectedListingCategory === 'all' || listing.category?.toLowerCase() === selectedListingCategory;
        const searchMatch = !searchTerm ||
            listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
    });

    // Sayfalama hesaplamaları
    const businessPageCount = Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE);
    const listingPageCount = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);

    // Sayfalanmış veriler
    const paginatedBusinesses = filteredBusinesses.slice(
        (currentBusinessPage - 1) * ITEMS_PER_PAGE,
        currentBusinessPage * ITEMS_PER_PAGE
    );

    const paginatedListings = filteredListings.slice(
        (currentListingPage - 1) * ITEMS_PER_PAGE,
        currentListingPage * ITEMS_PER_PAGE
    );

    // Kategori emojileri
    const getCategoryEmoji = (category: CategoryType): string => {
        const emojis: Record<CategoryType, string> = {
            veterinary: '🏥',
            petshop: '🛒',
            grooming: '✂️',
            boarding: '🏠',
            training: '🦮',
            entertainment: '🎭',
            transport: '🚗',
            health_products: '💊',
            shelter: '🐾',
            special: '⭐',
            farm: '🐄',
            tech: '📱',
            all: '🏢'
        };
        return emojis[category] || '🏢';
    };

    const getListingCategoryEmoji = (category: ListingCategoryType): string => {
        const emojis: Record<ListingCategoryType, string> = {
            health: '💉',
            grooming: '✂️',
            food: '🍗',
            boarding: '🏠',
            training: '🎓',
            other: '📌',
            all: '📋'
        };
        return emojis[category] || '📋';
    };

    // Sayfalama bileşeni
    const Pagination = ({
        currentPage,
        totalPages,
        onPageChange
    }: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void
    }) => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-center mt-8 space-x-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${currentPage === 1
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                >
                    &laquo; Önceki
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
                    // Sayfa numaralarını hesapla
                    let pageNumber;
                    if (totalPages <= 5) {
                        pageNumber = index + 1;
                    } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                    } else {
                        pageNumber = currentPage - 2 + index;
                    }

                    // İlk ve son sayfa numaralarını da göster
                    if (totalPages > 5) {
                        if (index === 0 && pageNumber > 1) {
                            return (
                                <button
                                    key={`first-page`}
                                    onClick={() => onPageChange(1)}
                                    className={`px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}
                                >
                                    1
                                </button>
                            );
                        }

                        if (index === 4 && pageNumber < totalPages) {
                            return (
                                <button
                                    key={`last-page`}
                                    onClick={() => onPageChange(totalPages)}
                                    className={`px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}
                                >
                                    {totalPages}
                                </button>
                            );
                        }
                    }

                    return (
                        <button
                            key={pageNumber}
                            onClick={() => onPageChange(pageNumber)}
                            className={`px-3 py-1 rounded-md ${currentPage === pageNumber
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                        >
                            {pageNumber}
                        </button>
                    );
                })}

                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${currentPage === totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                >
                    Sonraki &raquo;
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-indigo-100 to-purple-100">
            {/* Başlık */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-200 rounded-xl p-6 shadow-lg border border-indigo-200">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-3 rounded-lg text-2xl mr-3">🏢</span>
                        İşletmeler ve İlanlar
                    </h1>
                    <p className="mt-2 text-gray-700">Evcil hayvanınız için en iyi hizmetleri sunan işletmeleri ve ilanları keşfedin</p>
                </div>
            </div>

            {/* Filtreler */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
                    {/* Tab Menüsü */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'businesses'
                                ? 'text-indigo-700 border-b-2 border-indigo-700'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                            onClick={() => setActiveTab('businesses')}
                        >
                            <span className="mr-2 bg-indigo-200 p-1.5 rounded-lg">🏢</span>
                            İşletmeler
                        </button>
                        <button
                            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'listings'
                                ? 'text-indigo-700 border-b-2 border-indigo-700'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                            onClick={() => setActiveTab('listings')}
                        >
                            <span className="mr-2 bg-indigo-200 p-1.5 rounded-lg">📋</span>
                            İlanlar
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                {activeTab === 'businesses' ? 'İşletme Ara' : 'İlan Ara'}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="search"
                                    placeholder={activeTab === 'businesses' ? "İşletme adı veya hizmet ara..." : "İlan başlığı veya açıklama ara..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {activeTab === 'businesses' ? (
                            <>
                                <div className="w-full md:w-48">
                                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                    <select
                                        id="category"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value as CategoryType)}
                                        className="w-full rounded-lg border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                                    >
                                        {BUSINESS_CATEGORIES.map((category) => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-full md:w-48">
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                                    <select
                                        id="city"
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                                    >
                                        <option value="">Tüm Şehirler</option>
                                        {CITIES.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div className="w-full md:w-48">
                                <label htmlFor="listingCategory" className="block text-sm font-medium text-gray-700 mb-1">İlan Kategorisi</label>
                                <select
                                    id="listingCategory"
                                    value={selectedListingCategory}
                                    onChange={(e) => setSelectedListingCategory(e.target.value as ListingCategoryType)}
                                    className="w-full rounded-lg border border-gray-300 py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 hover:border-indigo-300"
                                >
                                    {LISTING_CATEGORIES.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {getListingCategoryEmoji(category.id as ListingCategoryType)} {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* İçerik Alanı */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                {activeTab === 'businesses' ? (
                    isLoading ? (
                        <div className="min-h-[400px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : filteredBusinesses.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedBusinesses.map((business) => (
                                    <BusinessCard key={business.id} business={business} />
                                ))}
                            </div>

                            <Pagination
                                currentPage={currentBusinessPage}
                                totalPages={businessPageCount}
                                onPageChange={setCurrentBusinessPage}
                            />

                            <div className="text-center mt-4 text-sm text-gray-600">
                                <p>{filteredBusinesses.length} işletme içinden {(currentBusinessPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentBusinessPage * ITEMS_PER_PAGE, filteredBusinesses.length)} arası gösteriliyor</p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg p-10 text-center border border-gray-200">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">İşletme Bulunamadı</h3>
                            <p className="text-gray-700 mb-6">Arama kriterlerinize uygun işletme bulunamadı. Lütfen filtrelerinizi değiştirin.</p>
                            <button
                                onClick={() => {
                                    setSelectedCategory('all');
                                    setSelectedCity('');
                                    setSearchTerm('');
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                Filtreleri Temizle
                            </button>
                        </div>
                    )
                ) : (
                    loading ? (
                        <div className="min-h-[400px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : filteredListings.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedListings.map((listing) => (
                                    <div
                                        key={listing.id}
                                        className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border border-gray-200"
                                    >
                                        <div className="h-48 bg-gradient-to-br from-indigo-200 to-purple-300 relative">
                                            {listing.images?.image1 ? (
                                                <img
                                                    src={listing.images.image1}
                                                    alt={listing.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-6xl transform hover:scale-110 transition-transform duration-300">
                                                        {getListingCategoryEmoji(listing.category?.toLowerCase() as ListingCategoryType)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{listing.title}</h3>
                                                    <p className="text-sm text-indigo-700 font-medium">{listing.businessName}</p>
                                                </div>
                                                {listing.price && (
                                                    <div className="flex items-center bg-green-200 px-3 py-1 rounded-full">
                                                        <span className="text-sm font-medium text-gray-800">{listing.price} TL</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mb-4">
                                                <p className="text-sm text-gray-700 line-clamp-2">{listing.description}</p>
                                            </div>

                                            <div className="space-y-2 text-sm text-gray-600 mb-5">
                                                <div className="flex items-start">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{new Date(listing.createdAt).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => router.push(`/public-listings/${listing.id}`)}
                                                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg"
                                            >
                                                İlanı İncele
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Pagination
                                currentPage={currentListingPage}
                                totalPages={listingPageCount}
                                onPageChange={setCurrentListingPage}
                            />

                            <div className="text-center mt-4 text-sm text-gray-600">
                                <p>{filteredListings.length} ilan içinden {(currentListingPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentListingPage * ITEMS_PER_PAGE, filteredListings.length)} arası gösteriliyor</p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg p-10 text-center border border-gray-200">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">İlan Bulunamadı</h3>
                            <p className="text-gray-700 mb-6">Arama kriterlerinize uygun ilan bulunamadı. Lütfen filtrelerinizi değiştirin.</p>
                            <button
                                onClick={() => {
                                    setSelectedListingCategory('all');
                                    setSearchTerm('');
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                Filtreleri Temizle
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
} 