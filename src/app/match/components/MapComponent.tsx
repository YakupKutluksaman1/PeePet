'use client';

import { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { NearbyPet, calculateDistance } from './PetData';

// MapController bileşeni - haritayı yönetir
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);

    return null;
};

// Çoklu hayvan seçim modalı
type MultiPetSelectionType = {
    isOpen: boolean;
    location: [number, number] | null;
    pets: NearbyPet[];
};

// Evcil hayvan işaretçileri bileşeni
const PetMarkers = memo(({ pets, onSelectPet, onMultiPetLocation }: {
    pets: NearbyPet[];
    onSelectPet: (pet: NearbyPet | null) => void;
    onMultiPetLocation: (location: [number, number], petsAtLocation: NearbyPet[]) => void;
}) => {
    // Türe göre ikon oluşturma
    const getPetIcon = (petType: string) => {
        // Türe göre renk
        const getColor = (type: string): string => {
            switch (type) {
                case 'dog': return '#4f46e5'; // indigo
                case 'cat': return '#7e22ce'; // purple
                case 'bird': return '#16a34a'; // green
                case 'rabbit': return '#ca8a04'; // amber
                default: return '#ef4444'; // red
            }
        };

        // Ikon oluştur
        return L.divIcon({
            className: 'pet-marker-icon',
            html: `
                <div style="background-color: ${getColor(petType)}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    <span style="font-size: 18px;">
                        ${petType === 'dog' ? '🐕' : petType === 'cat' ? '🐈' : petType === 'rabbit' ? '🐇' : petType === 'bird' ? '🦜' : '🐾'}
                    </span>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    };

    // Konum gruplarını oluştur - aynı/yakın konumdaki hayvanları grupla
    const locationGroups = new Map<string, NearbyPet[]>();

    pets.forEach(pet => {
        // Lokasyon için bir anahtar oluştur (yaklaşık 10 metre hassasiyetle)
        const precision = 5; // 5 basamak hassasiyet (yaklaşık 1 metre)
        const locationKey = `${pet.location[0].toFixed(precision)},${pet.location[1].toFixed(precision)}`;

        if (!locationGroups.has(locationKey)) {
            locationGroups.set(locationKey, []);
        }

        locationGroups.get(locationKey)!.push(pet);
    });

    return (
        <>
            {Array.from(locationGroups.entries()).map(([locationKey, petsAtLocation]) => {
                const firstPet = petsAtLocation[0];

                // Konum grubu için marker oluştur
                return (
                    <Marker
                        key={locationKey}
                        position={firstPet.location}
                        icon={petsAtLocation.length > 1
                            ? createClusterIcon(petsAtLocation)
                            : getPetIcon(firstPet.type)
                        }
                        eventHandlers={{
                            click: () => {
                                if (petsAtLocation.length === 1) {
                                    // Tek hayvan varsa direkt göster
                                    onSelectPet(firstPet);
                                } else {
                                    // Birden fazla hayvan varsa seçim ekranı göster
                                    onMultiPetLocation(firstPet.location, petsAtLocation);
                                }
                            }
                        }}
                    />
                );
            })}
        </>
    );
});

// Aynı konumdaki hayvanlar için küme ikonu oluştur
const createClusterIcon = (pets: NearbyPet[]) => {
    return L.divIcon({
        className: 'pet-cluster-icon',
        html: `
            <div style="background-color: #6366F1; width: 44px; height: 44px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <span style="font-size: 14px; color: white; font-weight: bold;">${pets.length}</span>
                <span style="font-size: 11px; color: white;">hayvan</span>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
    });
};

// MapComponent props
interface MapComponentProps {
    center: [number, number];
    zoom: number;
    radius: number;
    userLocation: [number, number];
    pets: NearbyPet[];
    onSelectPet: (pet: NearbyPet | null) => void;
}

// Ana Harita Bileşeni - Bu, dynamic import ile çağrılacak
const MapComponent = ({
    center,
    zoom,
    radius,
    userLocation,
    pets,
    onSelectPet
}: MapComponentProps) => {
    const [defaultIcon, setDefaultIcon] = useState<L.Icon | null>(null);
    const [multiPetSelection, setMultiPetSelection] = useState<MultiPetSelectionType>({
        isOpen: false,
        location: null,
        pets: []
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Leaflet için icon oluşturma - sadece client tarafında
    useEffect(() => {
        const icon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        setDefaultIcon(icon);
    }, []);

    // Aynı konumdaki birden fazla hayvan görünce çağrılır
    const handleMultiPetLocation = (location: [number, number], petsAtLocation: NearbyPet[]) => {
        setMultiPetSelection({
            isOpen: true,
            location,
            pets: petsAtLocation
        });
    };

    // Çoklu hayvanlı modal - basitleştirilmiş
    const renderMultiPetModal = () => {
        if (!mounted || !multiPetSelection.isOpen) return null;

        return createPortal(
            <div className="fixed inset-0 flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-xl" style={{ position: 'relative', zIndex: 9999999 }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">
                            Bu konumda {multiPetSelection.pets.length} hayvan var
                        </h3>
                        <button
                            onClick={() => setMultiPetSelection({ ...multiPetSelection, isOpen: false })}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Detaylarını görmek istediğiniz hayvanı seçin
                    </p>

                    <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                        {multiPetSelection.pets.map(pet => (
                            <div
                                key={pet.id}
                                className="border border-gray-200 hover:border-indigo-300 rounded-lg p-3 flex flex-col items-center cursor-pointer hover:bg-indigo-50 transition-colors"
                                onClick={() => {
                                    onSelectPet(pet);
                                    setMultiPetSelection({ ...multiPetSelection, isOpen: false });
                                }}
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-indigo-100">
                                    <img
                                        src={pet.profilePhoto || (pet.photos && pet.photos[0]) || `https://via.placeholder.com/100?text=${encodeURIComponent(pet.name)}`}
                                        alt={pet.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/100?text=${encodeURIComponent(pet.name)}`;
                                        }}
                                    />
                                </div>
                                <p className="font-medium text-gray-900 text-center">{pet.name}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                    <span>
                                        {pet.type === 'dog' ? '🐕' :
                                            pet.type === 'cat' ? '🐈' :
                                                pet.type === 'rabbit' ? '🐇' :
                                                    pet.type === 'bird' ? '🦜' : '🐾'}
                                    </span>
                                    <span>{pet.breed}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {pet.gender === 'male' ? 'Erkek' : 'Dişi'}, {pet.age} yaş
                                </p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setMultiPetSelection({ ...multiPetSelection, isOpen: false })}
                        className="w-full mt-4 py-2.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                    >
                        Kapat
                    </button>
                </div>
            </div>,
            document.body
        );
    };

    if (!defaultIcon) {
        return <div className="flex items-center justify-center h-full">Harita yükleniyor...</div>;
    }

    return (
        <>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={center} zoom={zoom} />

                {/* Kullanıcı konumu */}
                <Marker position={userLocation} icon={defaultIcon}>
                    <Popup>
                        Şu an buradasınız
                    </Popup>
                </Marker>

                {/* Mesafe halkası */}
                <Circle
                    center={userLocation}
                    radius={radius}
                    pathOptions={{
                        fillColor: '#4f46e5',
                        fillOpacity: 0.1,
                        color: '#4f46e5',
                        weight: 1
                    }}
                />

                {/* Evcil Hayvan İşaretleri */}
                <PetMarkers
                    pets={pets}
                    onSelectPet={onSelectPet}
                    onMultiPetLocation={handleMultiPetLocation}
                />
            </MapContainer>

            {/* Çoklu Hayvan Seçim Modalı - Portal ile render */}
            {renderMultiPetModal()}

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default memo(MapComponent); 