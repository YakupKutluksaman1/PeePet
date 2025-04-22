'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { generateNearbyPets, NearbyPet } from './components/PetData';
import PetDetailCard from './components/PetDetailCard';
import { getDatabase, ref as dbRef, update, get, onValue } from 'firebase/database';
import { Pet, UserPets } from '@/types/pet';

// Leaflet bileşenleri SSR'de çalışmadığı için dynamic import kullanıyoruz
const MapWithNoSSR = dynamic(
    () => import('../match/components/MapComponent').then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-100">
                <div className="text-center">
                    <div className="w-24 h-24 bg-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <p className="text-indigo-600 font-medium mb-2">Harita Yükleniyor...</p>
                </div>
            </div>
        )
    }
);

const MatchPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [mapReady, setMapReady] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [defaultIcon, setDefaultIcon] = useState<any>(null);
    const [nearbyPets, setNearbyPets] = useState<NearbyPet[]>([]);
    const [filteredPets, setFilteredPets] = useState<NearbyPet[]>([]);
    const [selectedPet, setSelectedPet] = useState<NearbyPet | null>(null);
    const [userActiveStatus, setUserActiveStatus] = useState<boolean>(true);
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
    const [mapKey, setMapKey] = useState<string>(Date.now().toString());
    const [showNoPetsWarning, setShowNoPetsWarning] = useState<boolean>(false);
    const [showAllPets, setShowAllPets] = useState<boolean>(true);
    const [pendingMatchesCount, setPendingMatchesCount] = useState<number>(0);

    // Kullanıcının evcil hayvanları
    const [userPets, setUserPets] = useState<UserPets>({});
    const [selectedUserPetId, setSelectedUserPetId] = useState<string | null>(null);
    const [activePet, setActivePet] = useState<Pet | null>(null);
    const [isLoadingPets, setIsLoadingPets] = useState<boolean>(true);

    const [activeFilters, setActiveFilters] = useState({
        distance: 10, // km cinsinden varsayılan değer
        petTypes: ['dog', 'cat', 'bird', 'rabbit', 'other'], // varsayılan hayvan türleri
        ageRange: [0, 20], // yaş aralığı
        gender: 'all' // cinsiyet filtresi
    });

    // Leaflet için icon oluşturma - sadece client tarafında
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('leaflet').then(L => {
                setDefaultIcon(
                    L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                );
            });
        }
    }, []);

    // Kullanıcının evcil hayvanlarını yükle
    useEffect(() => {
        if (!user) return;

        setIsLoadingPets(true);
        const db = getDatabase();
        const petsRef = dbRef(db, `pets/${user.uid}`);

        get(petsRef).then((snapshot) => {
            if (snapshot.exists()) {
                const petsData = snapshot.val() as UserPets;
                setUserPets(petsData);

                // İlk evcil hayvanı seç
                const petIds = Object.keys(petsData);
                if (petIds.length > 0) {
                    const firstPetId = petIds[0];
                    setSelectedUserPetId(firstPetId);
                    setActivePet(petsData[firstPetId]);
                }
            }
            setIsLoadingPets(false);
        }).catch((error) => {
            console.error("Evcil hayvanlar yüklenirken hata oluştu:", error);
            setIsLoadingPets(false);
        });
    }, [user]);

    // Evcil hayvan seçimi değiştiğinde
    const handleUserPetChange = (petId: string) => {
        setSelectedUserPetId(petId);
        setActivePet(userPets[petId]);
    };

    // Kullanıcı konumunu alma
    useEffect(() => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]);
                    setMapReady(true);

                    try {
                        // Eğer kullanıcı giriş yapmışsa, konum bilgilerini veritabanına kaydet
                        if (user) {
                            const db = getDatabase();
                            const userLocationRef = dbRef(db, `userLocations/${user.uid}`);

                            // Önce mevcut durumu kontrol et
                            const snapshot = await get(dbRef(db, `userLocations/${user.uid}`));
                            const currentData = snapshot.val();

                            // Aktif durumu kaydet
                            const isActive = currentData && typeof currentData.active !== 'undefined' ? currentData.active : true;
                            setUserActiveStatus(isActive);

                            // Konum bilgilerini güncelle - aktif durumunu koruyarak
                            await update(userLocationRef, {
                                lat: latitude,
                                lng: longitude,
                                active: isActive,
                                timestamp: new Date().toISOString(),
                                // Eşleştirme aradığı evcil hayvan ID'sini ekle
                                activePetId: selectedUserPetId
                            });
                        }

                        // Kullanıcı konumu alındığında yakındaki evcil hayvanları çek
                        const pets = await generateNearbyPets(
                            [latitude, longitude],
                            15, // 15 evcil hayvan
                            activeFilters.distance * 1000, // km'yi metreye çevir
                            showAllPets // Tüm evcil hayvanları göster parametresi
                        );

                        if (pets.length === 0) {
                            // Gerçek veri bulunmadığında daha bilgilendirici bir mesaj göster
                            setLocationError('Yakınızda henüz evcil hayvan bulunamadı. Uygulamayı kullanan ilk kişilerden birisiniz! Arkadaşlarınızı davet ederek evcil hayvan ağını genişletebilirsiniz.');
                        } else {
                            setNearbyPets(pets);
                            setFilteredPets(pets);
                        }
                    } catch (error) {
                        console.error('❌ Evcil hayvan verileri alınamadı:', error);
                        setLocationError('Evcil hayvan verileri alınamadı. Lütfen daha sonra tekrar deneyin.');
                    }
                },
                (error) => {
                    console.error('❌ Konum alınamadı:', error);
                    setLocationError('Konum bilgisi alınamadı. Lütfen konum izinlerini kontrol edin.');
                    // Hata durumunda varsayılan bir konum gösterelim (İstanbul)
                    const defaultLocation: [number, number] = [41.0082, 28.9784];
                    setUserLocation(defaultLocation);
                    setMapReady(true);

                    // Kullanıcıya konum izni olmadan devam ettiğini bildir
                    alert('Konum izni olmadan yakınındaki gerçek kullanıcıları göremezsiniz. Lütfen konum izni verin.');
                }
            );
        } else {
            setLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
            // Tarayıcı desteklemiyorsa varsayılan bir konum gösterelim
            const defaultLocation: [number, number] = [41.0082, 28.9784];
            setUserLocation(defaultLocation);
            setMapReady(true);
        }
    }, [user, selectedUserPetId, showAllPets]);

    // Sayfa yüklendiğinde oturum kontrolü
    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth');
        }
    }, [user, loading, router]);

    // Bekleyen eşleşme isteklerini kontrol et
    useEffect(() => {
        if (!user) return;

        const db = getDatabase();
        const matchesRef = dbRef(db, 'matches');

        const unsubscribe = onValue(matchesRef, (snapshot) => {
            let pendingCount = 0;
            snapshot.forEach((childSnapshot) => {
                const match = childSnapshot.val();
                // Kullanıcıya ait ve beklemede olan eşleşmeleri say
                if (match.receiverId === user.uid && match.status === 'pending') {
                    pendingCount++;
                }
            });
            setPendingMatchesCount(pendingCount);
        });

        return () => unsubscribe();
    }, [user]);

    // Filtreleme işlemi
    const applyFilters = async () => {
        if (!userLocation) return;

        try {
            // Önce filtresiz tüm verileri almaya çalış
            if (nearbyPets.length === 0) {
                const pets = await generateNearbyPets(
                    userLocation,
                    15,
                    activeFilters.distance * 1000,
                    showAllPets
                );
                setNearbyPets(pets);
            }

            // Mesafe ve tür filtresi uygula
            const filtered = nearbyPets.filter(pet => {
                // Mesafe filtresi (km)
                const isWithinDistance = pet.distance <= activeFilters.distance * 1000;

                // Tür filtresi
                const matchesType = activeFilters.petTypes.includes(pet.type);

                // Cinsiyet filtresi
                const matchesGender = activeFilters.gender === 'all' || pet.gender === activeFilters.gender;

                // Yaş filtresi
                const isWithinAge = pet.age >= activeFilters.ageRange[0] && pet.age <= activeFilters.ageRange[1];

                return isWithinDistance && matchesType && matchesGender && isWithinAge;
            });

            setFilteredPets(filtered);

            // Eğer filtre sonucunda hiç veri yoksa uyarı göster
            if (filtered.length === 0) {
                setShowNoPetsWarning(true);
                setTimeout(() => setShowNoPetsWarning(false), 5000);
            } else {
                setShowNoPetsWarning(false);
            }
        } catch (error) {
            console.error('Filtre uygulanırken hata oluştu:', error);
            setShowNoPetsWarning(true);
            setTimeout(() => setShowNoPetsWarning(false), 5000);
        }
    };

    // Aktif filtreleri sıfırlama
    const resetFilters = async () => {
        setActiveFilters({
            distance: 10,
            petTypes: ['dog', 'cat', 'bird', 'rabbit', 'other'],
            ageRange: [0, 20],
            gender: 'all'
        });

        // Filtreler sıfırlandığında yeni veriler çek
        if (userLocation) {
            try {
                const pets = await generateNearbyPets(
                    userLocation,
                    15,
                    10 * 1000, // 10 km
                    showAllPets
                );
                setNearbyPets(pets);
                setFilteredPets(pets);

                if (pets.length === 0) {
                    setLocationError('Yakında evcil hayvan bulunamadı.');
                }
            } catch (error) {
                console.error('Veriler yenilenirken hata oluştu:', error);
                alert('Veriler yenilenirken bir sorun oluştu. Lütfen tekrar deneyin.');
            }
        }
    };

    // Kullanıcı konum paylaşımını açıp kapatma
    const toggleLocationSharing = async (active: boolean) => {
        if (!user || !userLocation) return;

        setUpdatingStatus(true);
        try {
            const db = getDatabase();
            const userLocationRef = dbRef(db, `userLocations/${user.uid}`);

            // Konum durumunu güncelle
            await update(userLocationRef, {
                active,
                timestamp: new Date().toISOString()
            });

            setUserActiveStatus(active);

            // Kullanıcıya geri bildirim göster
            const message = active
                ? 'Konum paylaşımınız açıldı. Diğer kullanıcılar evcil hayvanlarınızı haritada görebilecek.'
                : 'Konum paylaşımınız kapatıldı. Diğer kullanıcılar evcil hayvanlarınızı haritada göremeyecek.';

            alert(message);

            // Aktifse ve konum verileri varsa, konumu da güncelle
            if (active && userLocation) {
                await update(userLocationRef, {
                    lat: userLocation[0],
                    lng: userLocation[1]
                });
            }
        } catch (error) {
            console.error('Konum paylaşım durumu güncellenirken hata oluştu:', error);
            alert('Konum paylaşım durumu güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Kullanıcının aktif durumunu kontrol et
    useEffect(() => {
        if (user && userLocation) {
            const db = getDatabase();
            const userLocationRef = dbRef(db, `userLocations/${user.uid}`);

            // Realtime Database izleme fonksiyonu burada eklenebilir
            // Ancak performans nedenlerinden dolayı şimdilik eklemiyoruz
        }
    }, [user, userLocation]);

    // Harita render fonksiyonu
    const renderMap = () => {
        if (locationError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm p-6">
                    <div className="max-w-lg mx-auto text-center">
                        <div className="bg-amber-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Evcil Hayvan Bulunamadı</h3>
                        <p className="text-gray-600 mb-6">{locationError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Yeniden Dene
                        </button>
                        <div className="mt-6 text-sm text-gray-500">
                            <p>Uygulamayı arkadaşlarınızla paylaşarak evcil hayvan sahibi ağını genişletebilirsiniz!</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (!mapReady || !userLocation || !defaultIcon) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-100">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-indigo-600 font-medium">Harita Yükleniyor...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 z-10">
                <MapWithNoSSR
                    key={mapKey}
                    center={userLocation}
                    zoom={13}
                    radius={activeFilters.distance * 1000}
                    userLocation={userLocation}
                    pets={filteredPets}
                    onSelectPet={setSelectedPet}
                />
            </div>
        );
    };

    // Eşleştirme isteği gönder
    const requestMatch = async (targetPet: NearbyPet) => {
        if (!user || !selectedUserPetId || !activePet) {
            alert('Eşleşme isteği göndermek için lütfen giriş yapın ve bir evcil hayvan seçin.');
            return;
        }

        try {
            const db = getDatabase();

            // Eşleşme kaydı oluştur
            const matchRef = dbRef(db, `matches/${Date.now()}`);

            await update(matchRef, {
                senderId: user.uid,
                senderName: user.displayName || 'Evcil Hayvan Sahibi',
                receiverId: targetPet.ownerId,
                petId: selectedUserPetId, // Kullanıcının seçtiği evcil hayvan ID'si
                status: 'pending',
                petInfo: {
                    name: activePet.name,
                    type: activePet.type,
                    breed: activePet.breed,
                    age: activePet.age,
                    gender: activePet.gender,
                    photo: activePet.profilePhoto || (activePet.photos && activePet.photos.length > 0 ? activePet.photos[0] : '')
                },
                targetPetId: targetPet.id, // Hedef evcil hayvan ID'si
                message: `${activePet.name} ile tanışmak istiyorum!`,
                createdAt: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });

            alert(`${targetPet.name} ile eşleşme isteği gönderildi!`);
        } catch (error) {
            console.error('Eşleşme isteği gönderilirken hata oluştu:', error);
            alert('Eşleşme isteği gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    const renderEvcilHayvanSelector = () => {
        if (isLoadingPets) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg mb-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
                    <span className="text-gray-600">Evcil hayvanlarınız yükleniyor...</span>
                </div>
            );
        }

        const petCount = Object.keys(userPets).length;

        if (petCount === 0) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg mb-4 text-center">
                    <p className="text-gray-600 mb-2">Henüz evcil hayvanınız yok.</p>
                    <button
                        onClick={() => router.push('/profile/create')}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 px-4 rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all"
                    >
                        Evcil Hayvan Ekle
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                <h3 className="text-gray-700 text-lg font-medium mb-3 flex items-center">
                    <span className="text-xl mr-2">🐾</span> Hangi dostunuz için eşleşme arıyorsunuz?
                </h3>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(userPets).map(([id, pet]) => (
                        <button
                            key={id}
                            onClick={() => handleUserPetChange(id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedUserPetId === id
                                ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}
                        >
                            <span className="text-lg">
                                {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : pet.type === 'rabbit' ? '🐇' : pet.type === 'bird' ? '🦜' : '🐾'}
                            </span>
                            <span className="font-medium">{pet.name}</span>
                        </button>
                    ))}
                </div>
                {activePet && (
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">Aktif</span>
                        {activePet.name} için yakınlarda eşleşmeler aranıyor
                    </div>
                )}
            </div>
        );
    };

    // Haritayı ve filtreleri yenile
    const refreshMapData = async () => {
        if (!userLocation) return;

        try {
            setMapKey(Date.now().toString()); // Haritayı yeniden render et

            // Yeni veri çek
            const pets = await generateNearbyPets(
                userLocation,
                15,
                activeFilters.distance * 1000,
                showAllPets
            );

            setNearbyPets(pets);
            setFilteredPets(pets);

            if (pets.length === 0) {
                setLocationError('Yakında evcil hayvan bulunamadı.');
            } else {
                setLocationError(null);
            }
        } catch (error) {
            console.error('Veriler yenilenirken hata oluştu:', error);
            alert('Veriler yenilenirken bir sorun oluştu. Lütfen tekrar deneyin.');
        }
    };

    // Yükleme durumu
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 relative overflow-hidden">
            {/* Uyarı Modal */}
            {showNoPetsWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
                    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 animate-[fade-in_0.3s_ease-in-out] relative">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Filtrelerinizle eşleşen minik dost bulunamadı</h3>
                                <p className="text-gray-600 mb-4">Lütfen filtrelerinizi genişletin veya konumunuzu değiştirin</p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowNoPetsWarning(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Kapat
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNoPetsWarning(false);
                                            resetFilters();
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Filtreleri Sıfırla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Arkaplan animasyonu için gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/80 via-purple-100/80 to-pink-100/80 animate-gradient-x"></div>

            {/* Animasyonlu arka plan desenleri */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiA4YzAgMi4yMS0xLjc5IDQtNCA0cy00LTEuNzktNC00IDEuNzktNCA0LTQgNCAxLjc5IDQgNHoiIGZpbGw9IiM4ODgiLz48L2c+PC9zdmc+')] opacity-50 animate-pulse"></div>
            </div>

            {/* Üst Kısım: Başlık ve Navigasyon */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg py-4 px-4 sm:px-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-gray-600 hover:text-indigo-600 transition-all duration-300 p-2 rounded-full hover:bg-indigo-50 hover:scale-110"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Yakınında
                        </h1>
                    </div>

                    <div className="flex flex-row gap-2 mt-3 sm:mt-0 sm:gap-3 overflow-x-auto pb-1">
                        {user && userLocation && (
                            <>
                                <button
                                    onClick={() => {
                                        setShowAllPets(!showAllPets);
                                        setTimeout(() => refreshMapData(), 100);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ${showAllPets
                                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className={`block w-2 h-2 rounded-full ${showAllPets ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                                    {showAllPets ? 'Tüm Hayvanlar' : 'Aktif Hayvan'}
                                </button>
                                <button
                                    onClick={() => toggleLocationSharing(!userActiveStatus)}
                                    disabled={updatingStatus}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 ${userActiveStatus
                                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                        }`}
                                >
                                    <span className={`block w-2 h-2 rounded-full ${userActiveStatus ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {userActiveStatus ? 'Konum Açık' : 'Konum Kapalı'}
                                </button>
                            </>
                        )}
                        <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full text-sm font-medium text-indigo-700 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300">
                            <span className="text-indigo-600 font-bold">{filteredPets.length}</span>
                            <span className="hidden sm:inline">minik dost bulundu</span>
                            <span className="sm:hidden">dost</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orta Kısım: Harita Alanı */}
            <div className="flex-1 relative">
                {renderMap()}
            </div>

            {/* Alt Kısım: Filtre Paneli */}
            <div className="bg-white/95 backdrop-blur-md shadow-lg py-6 px-4 sm:px-6 border-t border-gray-100 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filtreler
                            </h2>
                            <button
                                onClick={() => router.push('/matches')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                Eşleşmeleri Gör
                                {pendingMatchesCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                                        {pendingMatchesCount}
                                    </span>
                                )}
                            </button>
                        </div>
                        <button
                            className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-all duration-300 flex items-center gap-1 hover:scale-105"
                            onClick={resetFilters}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sıfırla
                        </button>
                    </div>

                    {/* Mesafe Filtresi */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700">Mesafe</label>
                            <span className="text-sm text-indigo-600 font-medium">{activeFilters.distance} km</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={activeFilters.distance}
                            onChange={(e) => setActiveFilters({ ...activeFilters, distance: parseInt(e.target.value) })}
                            className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 hover:accent-indigo-700 transition-all duration-300"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>1 km</span>
                            <span>25 km</span>
                            <span>50 km</span>
                        </div>
                    </div>

                    {/* Hayvan Türü Filtreleri */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Hayvan Türü</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'dog', label: '🐕 Köpek' },
                                { id: 'cat', label: '🐈 Kedi' },
                                { id: 'bird', label: '🦜 Kuş' },
                                { id: 'rabbit', label: '🐇 Tavşan' },
                                { id: 'other', label: '🐾 Diğer' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${activeFilters.petTypes.includes(type.id)
                                        ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300 shadow-sm hover:bg-indigo-200'
                                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                        }`}
                                    onClick={() => {
                                        const newPetTypes = activeFilters.petTypes.includes(type.id)
                                            ? activeFilters.petTypes.filter(t => t !== type.id)
                                            : [...activeFilters.petTypes, type.id];
                                        setActiveFilters({ ...activeFilters, petTypes: newPetTypes });
                                    }}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cinsiyet Filtresi */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Cinsiyet</label>
                        <div className="flex gap-2">
                            {[
                                { id: 'all', label: 'Hepsi' },
                                { id: 'male', label: 'Erkek ♂️' },
                                { id: 'female', label: 'Dişi ♀️' }
                            ].map((gender) => (
                                <button
                                    key={gender.id}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${activeFilters.gender === gender.id
                                        ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300 shadow-sm hover:bg-indigo-200'
                                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                        }`}
                                    onClick={() => setActiveFilters({ ...activeFilters, gender: gender.id })}
                                >
                                    {gender.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtre Uygulama Butonu */}
                    <button
                        onClick={applyFilters}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filtreleri Uygula
                    </button>
                </div>
            </div>

            {/* Evcil hayvan detay kartı - Haritanın dışında render edilir */}
            {selectedPet && (
                <PetDetailCard
                    pet={selectedPet}
                    onClose={() => setSelectedPet(null)}
                />
            )}
        </div>
    );
};

export default MatchPage; 