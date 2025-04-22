'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/lib/firebase';
import Image from 'next/image';

interface Service {
    id: string;
    serviceName: string;
    price: string | null;
    images: {
        image1: string;
        image2?: string;
    };
    description: string;
    category: string;
    subCategory?: string;
    createdAt: number;
    updatedAt: number;
    status: 'active' | 'inactive' | 'passive';
    categorySpecificFields?: Record<string, string>;
}

interface BusinessProfile {
    businessName: string;
    businessCategory: string;
    businessSubCategory: string | null;
    phone: string;
    address: string;
    location: {
        city: string;
        district: string;
    };
    status: string;
    verified: boolean;
    photos: string[];
    description: string;
}

export default function BusinessDetailPage() {
    const params = useParams();
    const businessId = params.id as string;
    const [business, setBusiness] = useState<BusinessProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const db = getDatabase(app);
        const businessRef = ref(db, `businesses/${businessId}`);

        const unsubscribe = onValue(businessRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBusiness(data.profile);

                // Hizmetleri dönüştür
                if (data.services) {
                    const servicesArray = Object.entries(data.services).map(([id, service]: [string, any]) => ({
                        id,
                        serviceName: service.serviceName,
                        price: service.price,
                        images: service.images,
                        description: service.description || '',
                        category: service.category || '',
                        subCategory: service.subCategory,
                        createdAt: service.createdAt,
                        updatedAt: service.updatedAt,
                        status: service.status || 'active',
                        categorySpecificFields: service.categorySpecificFields
                    }));
                    setServices(servicesArray);
                }
            }
            setIsLoading(false);
        }, (error) => {
            console.error('Veri yüklenirken hata:', error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [businessId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white via-indigo-100 to-purple-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white via-indigo-100 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">İşletme Bulunamadı</h1>
                    <p className="text-gray-600">Aradığınız işletme bulunamadı veya silinmiş olabilir.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-indigo-100 to-purple-100">
            {/* Başlık Bölümü */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-200 rounded-xl p-6 shadow-lg border border-indigo-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{business.businessName}</h1>
                            <p className="mt-2 text-gray-700">{business.description}</p>
                        </div>
                        {business.verified && (
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Doğrulanmış İşletme
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{business.address}</span>
                        </div>
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{business.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hizmetler Listesi */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Hizmetler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border border-gray-200">
                            <div className="h-48 relative">
                                {service.images?.image1 ? (
                                    <Image
                                        src={service.images.image1}
                                        alt={service.serviceName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-purple-300 flex items-center justify-center">
                                        <span className="text-6xl">💼</span>
                                    </div>
                                )}
                                {service.images?.image2 && (
                                    <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                                        <Image
                                            src={service.images.image2}
                                            alt={`${service.serviceName} - 2`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{service.serviceName}</h3>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <p className="text-sm text-indigo-700 font-medium">{service.category}</p>
                                            {service.subCategory && (
                                                <span className="text-xs text-gray-500">• {service.subCategory}</span>
                                            )}
                                        </div>
                                    </div>
                                    {service.price && (
                                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                            {service.price} TL
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Hizmet Detayları</h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-line">{service.description}</p>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Oluşturulma: {new Date(service.createdAt).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Son Güncelleme: {new Date(service.updatedAt).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.status === 'active' ? 'bg-green-100 text-green-800' :
                                                service.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {service.status === 'active' ? 'Aktif' :
                                                service.status === 'inactive' ? 'Pasif' : 'Geçici Olarak Kapalı'}
                                        </span>
                                        {service.categorySpecificFields && Object.keys(service.categorySpecificFields).length > 0 && (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                Özel Alanlar
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 