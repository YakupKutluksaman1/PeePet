'use client';

import { useState } from 'react';
import { NearbyPet } from './PetData';
import PetDetailCard from './PetDetailCard';

interface PetMiniCardProps {
    pet: NearbyPet;
}

const PetMiniCard: React.FC<PetMiniCardProps> = ({ pet }) => {
    const [showDetail, setShowDetail] = useState(false);

    // Metre veya km olarak mesafe gösterimi
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${meters} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    };

    // Hayvan türüne göre emoji
    const getPetEmoji = (type: string): string => {
        switch (type) {
            case 'dog': return '🐕';
            case 'cat': return '🐈';
            case 'rabbit': return '🐇';
            case 'bird': return '🦜';
            default: return '🐾';
        }
    };

    // Cinsiyet için emoji
    const getGenderEmoji = (gender: string): string => {
        return gender === 'male' ? '♂️' : '♀️';
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden min-w-[220px] max-w-[280px] transform transition-all duration-300 hover:scale-105">
                <div className="relative h-32 w-full overflow-hidden">
                    <img
                        src={pet.photos && pet.photos.length > 0 ? pet.photos[0] : `https://placehold.co/300x300/e5e7eb/9ca3af?text=${encodeURIComponent(pet.name)}`}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Resim yüklenemezse varsayılan bir resim göster
                            (e.target as HTMLImageElement).src = `https://placehold.co/300x300/e5e7eb/9ca3af?text=${encodeURIComponent(pet.name)}`;
                        }}
                    />
                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-gray-800 flex items-center">
                        <span className="mr-1">
                            {formatDistance(pet.distance)}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                    </div>
                </div>
                <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center">
                            {pet.name}
                            <span className="ml-1 text-sm text-gray-500">
                                {getGenderEmoji(pet.gender)}
                            </span>
                        </h3>
                        <span className="text-xl" title={pet.type}>
                            {getPetEmoji(pet.type)}
                        </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                        {pet.breed}, {pet.age} yaş
                    </p>
                    <button
                        onClick={() => setShowDetail(true)}
                        className="w-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 text-xs py-1.5 px-3 rounded-lg transition-colors"
                    >
                        Daha Fazla Bilgi
                    </button>
                </div>
            </div>

            {/* Detay Kartı */}
            {showDetail && (
                <PetDetailCard pet={pet} onClose={() => setShowDetail(false)} />
            )}
        </>
    );
};

export default PetMiniCard; 