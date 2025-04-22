import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BusinessCardProps {
    business: {
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
    };
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 border border-gray-200">
            {/* İşletme Görseli */}
            <div className="h-48 relative bg-gradient-to-br from-indigo-200 to-purple-300">
                {business.photos && business.photos[0] ? (
                    <Image
                        src={business.photos[0]}
                        alt={business.businessName}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl">🏢</span>
                    </div>
                )}
                {business.verified && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Doğrulanmış
                    </div>
                )}
            </div>

            {/* İşletme Bilgileri */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{business.businessName}</h3>
                        <p className="text-sm text-indigo-700 font-medium">{business.businessSubCategory}</p>
                    </div>
                    <div className="flex items-center bg-yellow-200 px-3 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-800 ml-1">{business.rating}</span>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-700 line-clamp-2">{business.description}</p>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-5">
                    <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{business.address}</span>
                    </div>
                    <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{business.phone}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                        <span className="px-3 py-1 bg-indigo-200 text-indigo-900 text-xs rounded-full">
                            {business.location.city}
                        </span>
                        <span className="px-3 py-1 bg-purple-200 text-purple-900 text-xs rounded-full">
                            {business.servicesCount} Hizmet
                        </span>
                    </div>

                    <Link
                        href={`/business/${business.id}`}
                        className="text-indigo-700 hover:text-indigo-900 text-sm font-medium flex items-center group"
                    >
                        Detaylar
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default BusinessCard; 