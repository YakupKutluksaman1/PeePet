'use client';

import { useListing } from '@/context/ListingContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰'];

const PET_TYPE_COLORS = {
    dog: {
        bg: 'from-amber-100 to-orange-100',
        border: 'border-amber-200',
        text: 'text-amber-800',
        hover: 'hover:from-amber-200 hover:to-orange-200',
        emoji: '🐕'
    },
    cat: {
        bg: 'from-blue-100 to-indigo-100',
        border: 'border-blue-200',
        text: 'text-blue-800',
        hover: 'hover:from-blue-200 hover:to-indigo-200',
        emoji: '🐈'
    },
    rabbit: {
        bg: 'from-pink-100 to-purple-100',
        border: 'border-pink-200',
        text: 'text-pink-800',
        hover: 'hover:from-pink-200 hover:to-purple-200',
        emoji: '🐇'
    },
    bird: {
        bg: 'from-green-100 to-teal-100',
        border: 'border-green-200',
        text: 'text-green-800',
        hover: 'hover:from-green-200 hover:to-teal-200',
        emoji: '🦜'
    },
    other: {
        bg: 'from-gray-100 to-slate-100',
        border: 'border-gray-200',
        text: 'text-gray-800',
        hover: 'hover:from-gray-200 hover:to-slate-200',
        emoji: '🐾'
    }
};

export default function ListingsPage() {
    const { listings, loading, error } = useListing();
    const { user } = useAuth();
    const router = useRouter();
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([]);

    useEffect(() => {
        // Arka plan emojileri için effect
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Hata!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-70" />
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
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-300 hover:shadow-lg text-indigo-700"
                            aria-label="Geri dön"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">İlanlar</h1>
                            <p className="mt-2 text-gray-600">Minik dostlarınız için yeni arkadaşlar bulun</p>
                        </div>
                    </div>
                    {user && (
                        <Link
                            href="/listings/create"
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                        >
                            Yeni İlan Oluştur
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings
                        .filter(listing => listing.status !== 'sold')
                        .map((listing) => {
                            const petType = listing.petType || 'other';
                            const colors = PET_TYPE_COLORS[petType as keyof typeof PET_TYPE_COLORS] || PET_TYPE_COLORS.other;

                            return (
                                <Link
                                    key={listing.id}
                                    href={`/listings/${listing.id}`}
                                    className={`group relative bg-gradient-to-br ${colors.bg} ${colors.border} rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {listing.photos && listing.photos.length > 0 && (
                                        <div className="aspect-w-16 aspect-h-9">
                                            <img
                                                src={listing.photos[0]}
                                                alt={listing.title}
                                                className="object-cover w-full h-48"
                                            />
                                        </div>
                                    )}

                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{colors.emoji}</span>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                {listing.title}
                                            </h2>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.text} bg-white/50`}>
                                                {petType === 'dog' ? 'Köpek' :
                                                    petType === 'cat' ? 'Kedi' :
                                                        petType === 'rabbit' ? 'Tavşan' :
                                                            petType === 'bird' ? 'Kuş' : 'Diğer'}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                                listing.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                                {listing.status === 'active' ? 'Aktif' :
                                                    listing.status === 'inactive' ? 'Pasif' :
                                                        'Sahiplendirildi'}
                                            </span>
                                        </div>

                                        {/* Evcil hayvan detayları */}
                                        <div className="bg-white/30 rounded-lg p-2 mb-3">
                                            <div className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                                                <span className="text-sm">{colors.emoji}</span>
                                                Dostumuzun Bilgileri
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {listing.petName && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500">İsim:</span>
                                                        <span className="text-xs font-medium text-gray-800">{listing.petName}</span>
                                                    </div>
                                                )}
                                                {listing.petAge && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500">Yaş:</span>
                                                        <span className="text-xs font-medium text-gray-800">{listing.petAge}</span>
                                                    </div>
                                                )}
                                                {listing.petGender && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500">Cinsiyet:</span>
                                                        <span className="text-xs font-medium text-gray-800">
                                                            {listing.petGender === 'male' ? 'Erkek' : 'Dişi'}
                                                        </span>
                                                    </div>
                                                )}
                                                {listing.breed && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500">Irk:</span>
                                                        <span className="text-xs font-medium text-gray-800">{listing.breed}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-gray-600 mb-4 line-clamp-2">
                                            {listing.description}
                                        </p>

                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <span>
                                                {listing.city}, {listing.district}
                                            </span>
                                            <span>
                                                {new Date(listing.createdAt).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                </div>

                {listings.length === 0 && (
                    <div className="text-center py-12">
                        <div className="inline-block p-4 rounded-full bg-white/50 backdrop-blur-sm">
                            <span className="text-4xl">🐾</span>
                        </div>
                        <p className="mt-4 text-gray-500">Henüz ilan bulunmamaktadır.</p>
                    </div>
                )}
            </div>
        </div>
    );
} 