'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Pet } from '@/app/types/pet';
import { User } from '@/app/types/user';
import { getPetWithOwner } from '@/lib/pets';
import Image from 'next/image';

export default function PetDetail() {
    const { id } = useParams();
    const [pet, setPet] = useState<Pet | null>(null);
    const [owner, setOwner] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPetData = async () => {
            if (!id) return;

            const result = await getPetWithOwner(id as string);
            if (result) {
                setPet(result.pet);
                setOwner(result.owner);
            }
            setLoading(false);
        };

        fetchPetData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!pet) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Evcil hayvan bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="relative h-96">
                        <Image
                            src={pet.profilePhoto}
                            alt={pet.name}
                            fill
                            className="object-cover"
                        />
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                                {pet.type}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>
                                <div className="space-y-3">
                                    <p><span className="font-medium">Cins:</span> {pet.breed}</p>
                                    <p><span className="font-medium">Yaş:</span> {pet.age}</p>
                                    <p><span className="font-medium">Cinsiyet:</span> {pet.gender === 'male' ? 'Erkek' : 'Dişi'}</p>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sahibi</h2>
                                {owner && (
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                                            {owner.photoURL ? (
                                                <Image
                                                    src={owner.photoURL}
                                                    alt={`${owner.firstName} ${owner.lastName}`}
                                                    width={48}
                                                    height={48}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">
                                                    👤
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{owner.firstName} {owner.lastName}</p>
                                            <p className="text-sm text-gray-500">{owner.location}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Açıklama</h2>
                            <p className="text-gray-600">{pet.description}</p>
                        </div>

                        {pet.photos && pet.photos.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fotoğraflar</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {pet.photos.map((photo, index) => (
                                        <div key={index} className="relative h-48 rounded-lg overflow-hidden">
                                            <Image
                                                src={photo}
                                                alt={`${pet.name} - Fotoğraf ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 