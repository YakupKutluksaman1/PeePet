'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NearbyPet } from './PetData';
import { useRouter } from 'next/navigation';
import { getDatabase, ref as dbRef, push, set, get } from 'firebase/database';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { useMessage } from '@/context/MessageContext';

interface PetDetailCardProps {
    pet: NearbyPet;
    onClose: () => void;
}

const PetDetailCard: React.FC<PetDetailCardProps> = ({ pet, onClose }) => {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [showFriendRequest, setShowFriendRequest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [petPhotos, setPetPhotos] = useState<string[]>(pet.photos || []);
    const imageRef = useRef<HTMLImageElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();
    const { createMessage } = useMessage();

    // Portal için state ve effect
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Firebase'den fotoğrafları çek
    useEffect(() => {
        const fetchPetPhotosFromFirebase = async () => {
            setIsLoading(true);
            try {
                // Başlangıçta varsayılan fotoğrafları atayalım
                let photos: string[] = [];

                // Pet'in fotoğraflarını kontrol et
                if (pet.photos && pet.photos.length > 0) {
                    photos = [...pet.photos];
                } else if (pet.profilePhoto) {
                    photos = [pet.profilePhoto];
                }

                // Eğer geçerli bir foto yoksa, varsayılan oluştur
                if (photos.length === 0 || photos.some(url => !url || url.includes('undefined'))) {
                    const placeholderUrl = `https://via.placeholder.com/400x400?text=${encodeURIComponent(pet.name)}`;
                    photos = [placeholderUrl];
                }

                // URL'leri kontrol et ve geçerli olduklarından emin ol
                photos = photos.filter(url =>
                    url &&
                    typeof url === 'string' &&
                    (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:'))
                );


                setPetPhotos(photos);

                // Eğer pet.id test verisine aitse veya giriş yapmamışsa daha ileri gitme
                if (pet.id.startsWith('pet-') || !user) {
                    setIsLoading(false);
                    return;
                }

                // Eğer hala fotoğraf bulunamadıysa Firebase'den almaya çalış
                if (photos.length === 0) {
                    console.log('Realtime Database\'den veri çekiliyor, Pet ID:', pet.id, 'Sahip ID:', pet.ownerId);
                    try {
                        const db = getDatabase();

                        // 1. conversations koleksiyonunu kontrol edelim
                        console.log('Conversations koleksiyonundan eşleşme aranıyor...');
                        const conversationsRef = dbRef(db, 'conversations');
                        const conversationsSnapshot = await get(conversationsRef);

                        if (conversationsSnapshot.exists()) {
                            // Tüm konuşmaları itere et ve pet.id içeren konuşmayı bul
                            let matchDetails: any = null;

                            conversationsSnapshot.forEach((conversationSnapshot) => {
                                const conversation = conversationSnapshot.val();
                                if (conversation.matchDetails &&
                                    (conversation.matchDetails.petId === pet.id ||
                                        (conversation.participants &&
                                            (conversation.participants.includes(pet.id) ||
                                                conversation.participants.includes(pet.ownerId))))) {

                                    console.log('Pet ile ilgili konuşma bulundu:', conversationSnapshot.key);
                                    matchDetails = conversation.matchDetails;
                                }
                            });

                            if (matchDetails) {
                                console.log('Eşleşme detayları bulundu:', matchDetails);

                                if (matchDetails.petPhoto) {
                                    console.log('Eşleşme detaylarından petPhoto alındı:', matchDetails.petPhoto);
                                    photos = [matchDetails.petPhoto, ...photos];
                                }
                            } else {
                                console.log('Pet ile ilgili konuşma bulunamadı');
                            }
                        }

                        // 2. users/ownerId/pets/petId yolunu deneyelim
                        if (pet.ownerId) {
                            console.log('Kullanıcının evcil hayvanlarında aranıyor...');
                            const petPath = `users/${pet.ownerId}/pets/${pet.id}`;
                            console.log('Şu yoldan veri alınıyor:', petPath);
                            const petRef = dbRef(db, petPath);
                            const petSnapshot = await get(petRef);

                            if (petSnapshot.exists()) {
                                const petData = petSnapshot.val();
                                console.log('Kullanıcının evcil hayvanı bulundu:', petData);

                                if (petData.photos && Array.isArray(petData.photos) && petData.photos.length > 0) {
                                    console.log('Veritabanından photos alındı:', petData.photos);
                                    photos = [...petData.photos, ...photos];
                                }
                                else if (petData.photoURL) {
                                    console.log('Veritabanından photoURL alındı:', petData.photoURL);
                                    photos = [petData.photoURL, ...photos];
                                }
                                else if (petData.profilePhoto) {
                                    console.log('Veritabanından profilePhoto alındı:', petData.profilePhoto);
                                    photos = [petData.profilePhoto, ...photos];
                                }
                            } else {
                                console.log('Kullanıcının evcil hayvanı bulunamadı');
                            }
                        }

                        // 3. direkt pets koleksiyonuna bakalım
                        console.log('Pets koleksiyonunda aranıyor...');
                        const petRef = dbRef(db, `pets/${pet.ownerId}/${pet.id}`);
                        const petSnapshot = await get(petRef);

                        if (petSnapshot.exists()) {
                            const petData = petSnapshot.val();
                            console.log('Evcil hayvan bulundu:', petData);

                            if (petData.photos && Array.isArray(petData.photos) && petData.photos.length > 0) {
                                console.log('Veritabanından photos alındı:', petData.photos);
                                photos = [...petData.photos, ...photos];
                            }
                            else if (petData.photoURL) {
                                console.log('Veritabanından photoURL alındı:', petData.photoURL);
                                photos = [petData.photoURL, ...photos];
                            }
                            else if (petData.profilePhoto) {
                                console.log('Veritabanından profilePhoto alındı:', petData.profilePhoto);
                                photos = [petData.profilePhoto, ...photos];
                            }
                        } else {
                            console.log('Evcil hayvan bulunamadı');
                        }

                    } catch (dbError) {
                        console.error('Veritabanından bilgiler alınamadı:', dbError);
                    }
                }

                // Fotoğrafları tekilleştir
                const uniquePhotos = Array.from(new Set(photos));
                setPetPhotos(uniquePhotos);

            } catch (error) {
                console.error('Fotoğraflar yüklenirken hata oluştu:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPetPhotosFromFirebase();
    }, [pet.id, pet.ownerId, pet.photos, pet.profilePhoto, user]);

    // Fotoğraf yüklendiğinde yükleme durumunu güncelle
    const handleImageLoad = () => {
        setIsLoading(false);
    };

    // Metre veya km olarak mesafe gösterimi
    const formatDistance = (meters: number): string => {
        if (meters < 1000) {
            return `${meters} metre`;
        }
        return `${(meters / 1000).toFixed(1)} kilometre`;
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

    // Cinsiyet için metin
    const getGenderText = (gender: string): string => {
        return gender === 'male' ? 'Erkek' : 'Dişi';
    };

    // Son aktif zamanı formatla
    const formatLastActive = (dateString: string): string => {
        const now = new Date();
        const lastActive = new Date(dateString);
        const diffTime = Math.abs(now.getTime() - lastActive.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Bugün';
        } else if (diffDays === 1) {
            return 'Dün';
        } else {
            return `${diffDays} gün önce`;
        }
    };

    // Fotoğraf galerisinde önceki fotoğrafa geç
    const prevPhoto = () => {
        setCurrentPhotoIndex(prev =>
            prev === 0 ? petPhotos.length - 1 : prev - 1
        );
        setIsLoading(true);
    };

    // Fotoğraf galerisinde sonraki fotoğrafa geç
    const nextPhoto = () => {
        setCurrentPhotoIndex(prev =>
            prev === petPhotos.length - 1 ? 0 : prev + 1
        );
        setIsLoading(true);
    };

    // Dokunmatik kaydırma işlemleri
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) {
            // Sola kaydırma - sonraki fotoğraf
            nextPhoto();
        } else if (distance < -minSwipeDistance) {
            // Sağa kaydırma - önceki fotoğraf
            prevPhoto();
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

    // Eşleşme isteği gönderme fonksiyonu
    const sendFriendRequest = async () => {
        if (!user) {
            alert('Lütfen önce giriş yapın');
            return;
        }

        try {
            const db = getDatabase();
            const matchesRef = dbRef(db, 'matches');
            const newMatchRef = push(matchesRef);

            const matchData = {
                senderId: user.uid,
                senderName: user.displayName || 'Anonim',
                receiverId: pet.ownerId,
                petId: pet.id,
                status: 'pending',
                createdAt: new Date().toISOString(),
                message: `${user.displayName || 'Anonim'} adlı kullanıcı ${pet.name} ile eşleşmek istiyor.`,
                petInfo: {
                    name: pet.name,
                    type: pet.type,
                    breed: pet.breed,
                    age: pet.age,
                    gender: pet.gender,
                    photo: petPhotos[0]
                }
            };

            await set(newMatchRef, matchData);

            // Eşleşme isteği emaili gönder
            try {
                // Kullanıcının aktif petini al
                const userLocationRef = dbRef(db, `userLocations/${user.uid}`);
                const userLocationSnapshot = await get(userLocationRef);
                let activePetId = '';

                if (userLocationSnapshot.exists()) {
                    const locationData = userLocationSnapshot.val();
                    activePetId = locationData.activePetId || '';
                }

                // Eğer aktif pet yoksa, kullanıcının ilk petini al
                if (!activePetId) {
                    const userPetsRef = dbRef(db, `pets/${user.uid}`);
                    const userPetsSnapshot = await get(userPetsRef);
                    if (userPetsSnapshot.exists()) {
                        const pets = userPetsSnapshot.val();
                        const petIds = Object.keys(pets);
                        if (petIds.length > 0) {
                            activePetId = petIds[0];
                        }
                    }
                }

                if (activePetId) {
                    await fetch('/api/send-match-request-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            targetPetId: pet.id,
                            requesterUserId: user.uid,
                            ownerUserId: pet.ownerId,
                            requesterPetId: activePetId
                        }),
                    });
                    console.log('Eşleşme isteği emaili gönderildi (PetDetailCard)');
                }
            } catch (emailError) {
                console.error('Eşleşme isteği emaili gönderilirken hata (PetDetailCard):', emailError);
                // Email hatası kullanıcı deneyimini etkilemez
            }

            setShowFriendRequest(true);
        } catch (error) {
            console.error('Eşleşme isteği gönderilirken hata oluştu:', error);
            alert('Eşleşme isteği gönderilemedi. Lütfen tekrar deneyin.');
        }
    };

    // Eşleşme kabul etme fonksiyonu
    const acceptFriendRequest = async () => {
        if (!user) {
            alert('Lütfen önce giriş yapın');
            return;
        }

        try {
            const db = getDatabase();

            // Eşleşme durumunu güncelle
            const matchRef = dbRef(db, `matches/${pet.id}`);
            await set(matchRef, {
                ...pet,
                status: 'accepted',
                updatedAt: new Date().toISOString()
            });

            // Mesajlaşma kanalı oluştur
            await createMessage(
                pet.id, // listingId olarak pet.id kullanıyoruz
                pet.ownerId,
                `${user.displayName || 'Anonim'} ve ${pet.ownerName} artık arkadaş! 🎉`
            );

            // Kullanıcıya bildirim göster
            alert('Eşleşme kabul edildi! Artık mesajlaşabilirsiniz.');

            // Mesajlar sayfasına yönlendir
            router.push('/messages');
        } catch (error) {
            console.error('Eşleşme kabul edilirken hata oluştu:', error);
            alert('Eşleşme kabul edilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    // Kapatma animasyonu
    const closeWithAnimation = () => {
        if (cardRef.current) {
            cardRef.current.classList.add('animate-fadeOut');
            setTimeout(() => {
                onClose();
            }, 200);
        } else {
            onClose();
        }
    };

    // ESC tuşu ile kapatma
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeWithAnimation();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}>
            <div
                ref={cardRef}
                className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl"
                style={{ position: 'relative', zIndex: 9999999 }}
            >
                {/* Kapat Butonu */}
                <button
                    onClick={closeWithAnimation}
                    className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2.5 rounded-full hover:bg-black/70 transition-all border border-white/20 backdrop-blur-sm shadow-lg"
                    aria-label="Kapat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Fotoğraf Galerisi */}
                <div
                    className="relative h-72 sm:h-80 bg-gradient-to-tr from-indigo-50 to-purple-50"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <img
                        ref={imageRef}
                        src={petPhotos && petPhotos.length > 0
                            ? petPhotos[currentPhotoIndex]
                            : `https://via.placeholder.com/600x400?text=${pet.name}`}
                        alt={pet.name}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={handleImageLoad}
                        onError={(e) => {
                            // Görüntü yüklenemezse isimle yer tutucu göster
                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/600x400?text=${encodeURIComponent(pet.name)}`;
                            setIsLoading(false);
                        }}
                    />

                    {/* Galeri Navigasyon Butonları */}
                    {petPhotos && petPhotos.length > 1 && (
                        <>
                            <button
                                onClick={prevPhoto}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black/60 transition-all border border-white/20 backdrop-blur-sm shadow-md touch-manipulation"
                                aria-label="Önceki fotoğraf"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextPhoto}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black/60 transition-all border border-white/20 backdrop-blur-sm shadow-md touch-manipulation"
                                aria-label="Sonraki fotoğraf"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* Nokta göstergeleri */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 py-1 px-2 bg-black/30 backdrop-blur-sm rounded-full">
                                {petPhotos.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setIsLoading(true);
                                            setCurrentPhotoIndex(index);
                                        }}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentPhotoIndex
                                            ? 'bg-white scale-110'
                                            : 'bg-white/50 hover:bg-white/70'
                                            }`}
                                        aria-label={`Fotoğraf ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Uzaklık ve tür işaretleri */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 sm:flex-row">
                        <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-gray-800 flex items-center shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {formatDistance(pet.distance)}
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium text-gray-800 shadow-md">
                            <span className="mr-1.5">{getPetEmoji(pet.type)}</span>
                            {pet.type === 'dog' ? 'Köpek' :
                                pet.type === 'cat' ? 'Kedi' :
                                    pet.type === 'rabbit' ? 'Tavşan' :
                                        pet.type === 'bird' ? 'Kuş' : 'Diğer'}
                        </div>
                    </div>
                </div>

                {/* Bilgi Bölümü */}
                <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                {pet.name}
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    {getGenderText(pet.gender)}
                                </span>
                            </h2>
                            <p className="text-sm text-gray-600">
                                {pet.breed}, {pet.age} yaşında
                            </p>
                        </div>
                        <div className="bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs text-indigo-700 flex items-center border border-indigo-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatLastActive(pet.lastActive)}
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div className="mb-5">
                        <h3 className="text-sm font-medium text-gray-700 mb-1.5">Hakkında</h3>
                        <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {pet.description}
                        </p>
                    </div>

                    {/* Sahip Bilgisi */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-1.5">Sahibi</h3>
                        <div className="flex items-center bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg mr-3 shadow-md">
                                {pet.ownerName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">{pet.ownerName}'in dostu</p>
                                <p className="text-xs text-gray-500">Karşılıklı eşleşme sonrası iletişim kurabilirsiniz</p>
                            </div>
                        </div>
                    </div>

                    {/* Arkadaşlık İsteği Butonları */}
                    <div className="flex gap-2">
                        <button
                            onClick={sendFriendRequest}
                            disabled={showFriendRequest}
                            className={`py-3.5 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all w-full ${showFriendRequest
                                ? 'bg-green-500 shadow-lg shadow-green-200'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200/50 active:shadow-md transform active:scale-[0.98] active:translate-y-[1px]'
                                }`}
                        >
                            {showFriendRequest ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    İstek Gönderildi
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Eşleş
                                </>
                            )}
                        </button>
                    </div>

                    {/* Modern Bildirim */}
                    {showFriendRequest && (
                        <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200 animate-fadeIn">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full p-2 mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-800">Eşleşme isteği gönderildi!</h3>
                                    <p className="text-xs text-gray-600 mt-0.5">{pet.name} ile eşleşme isteğiniz gönderildi. Kişi onaylayınca mesajlaşma başlayacak.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Animasyon Stilleri */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeOut {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(20px); }
                }
                .animate-fadeOut {
                    animation: fadeOut 0.2s ease-out forwards;
                }
                .touch-manipulation {
                    touch-action: manipulation;
                }
            `}</style>
        </div>
    );

    // Client-side portal rendering
    if (!mounted) return null;

    return createPortal(
        modalContent,
        document.body
    );
};

export default PetDetailCard;