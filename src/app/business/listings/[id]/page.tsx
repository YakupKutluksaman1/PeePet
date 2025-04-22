'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useBusinessListing } from '@/context/BusinessListingContext';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/lib/firebase';
import Link from 'next/link';

export default function ListingDetail() {
    const { id } = useParams();
    const { businessListings } = useBusinessListing();
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const db = getDatabase(app);
        const listingRef = ref(db, `business-listings/${id}`);

        const unsubscribe = onValue(listingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setListing({ ...data, id });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">İlan Bulunamadı</h1>
                    <Link href="/business/listings" className="text-indigo-600 hover:text-indigo-800">
                        İlanlara Geri Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 py-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* İlan Resmi */}
                    <div className="relative h-96">
                        {listing.images?.image1 ? (
                            <img
                                src={listing.images.image1}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* İlan Detayları */}
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">{listing.title}</h1>
                                <p className="text-gray-600">{listing.businessName}</p>
                            </div>
                            <div className="text-right">
                                {listing.discountPrice ? (
                                    <>
                                        <span className="text-3xl font-bold text-indigo-600">{listing.discountPrice}₺</span>
                                        <span className="ml-2 text-lg text-gray-500 line-through">{listing.price}₺</span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-bold text-indigo-600">{listing.price}₺</span>
                                )}
                            </div>
                        </div>

                        <div className="prose max-w-none mb-8">
                            <p className="text-gray-700">{listing.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">İletişim Bilgileri</h3>
                                <div className="space-y-2">
                                    {listing.phone && (
                                        <p className="flex items-center text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {listing.phone}
                                        </p>
                                    )}
                                    {listing.email && (
                                        <p className="flex items-center text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {listing.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Konum</h3>
                                <div className="space-y-2">
                                    <p className="flex items-center text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {listing.city}, {listing.district}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/business/listings"
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Geri Dön
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 