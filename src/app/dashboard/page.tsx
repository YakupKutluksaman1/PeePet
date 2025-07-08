'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDatabase, ref as dbRef, onValue, set, push, get, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Pet, UserPets } from '@/types/pet';
import { VetRecord, Vaccination } from '@/types/vet';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useMessage } from '@/context/MessageContext';
import { useListing } from '@/context/ListingContext';

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰'];

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    photoURL?: string;
}

interface Activity {
    id: string;
    type: 'match' | 'message' | 'event' | 'vet';
    title: string;
    description: string;
    timestamp: string;
    icon: string;
}

interface Event {
    id: string;
    title: string;
    date: string;
    location: {
        address: string;
        coordinates: {
            lat: number;
            lng: number;
        };
        meetingPoint: string; // Toplanma noktası
        qrCode: string;      // QR kod
    };
    privacySettings: {
        locationSharing: {
            enabled: boolean;
            visibility: 'private' | 'organizer-only' | 'participants' | 'friends';
            accuracy: 'exact' | 'approximate' | 'area-only';
            startTime: string; // Etkinlik başlangıcından 30 dakika önce
            endTime: string;   // Etkinlik bitişi
        };
        emergencyContact: {
            enabled: boolean;
            contactInfo: string;
        };
    };
    participants: {
        userId: {
            status: 'attending' | 'maybe' | 'declined';
            locationSharing: boolean;
            lastLocationUpdate?: string;
        };
    };
}

// typeMap ekle
const typeMap = {
    dog: 'Köpek',
    cat: 'Kedi',
    rabbit: 'Tavşan',
    bird: 'Kuş',
    hamster: 'Hamster',
    'guinea-pig': 'Guinea Pig',
    ferret: 'Gelincik',
    turtle: 'Kaplumbağa',
    fish: 'Balık',
    snake: 'Yılan',
    lizard: 'Kertenkele',
    hedgehog: 'Kirpi',
    exotic: 'Egzotik Hayvan'
};

// typeEmojiMap ekle
const typeEmojiMap = {
    dog: '🐕',
    cat: '🐈',
    rabbit: '🐇',
    bird: '🦜',
    hamster: '🐹',
    'guinea-pig': '🐹',
    ferret: '🦡',
    turtle: '🐢',
    fish: '🐟',
    snake: '🐍',
    lizard: '🦎',
    hedgehog: '🦔',
    exotic: '🦝'
};

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [pets, setPets] = useState<UserPets>({});
    const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
    const [activePet, setActivePet] = useState<Pet | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [vetRecord, setVetRecord] = useState<{ lastVisit?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([]);
    const [uploading, setUploading] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const { conversations, messages } = useMessage();
    const [locationSharing, setLocationSharing] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [pendingMatchesCount, setPendingMatchesCount] = useState(0);
    const [totalMatchesCount, setTotalMatchesCount] = useState(0);
    const { listings } = useListing();
    const [userListingsCount, setUserListingsCount] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Okunmamış ve yeni mesajları hesapla
    const unreadMessages = conversations.reduce((count, conversation) => {
        // Sadece aktif konuşmaları kontrol et
        if (conversation.status !== 'active') return count;

        // Konuşmadaki mesajları al
        const conversationMessages = messages[conversation.id] || [];

        // Karşı tarafın gönderdiği ve bizim henüz okumadığımız mesajları say
        const unreadCount = conversationMessages.filter(msg => {
            // Sadece karşı tarafın mesajlarını sayalım
            const isNotOurMessage = msg.senderId !== user?.uid;

            // Mesajın okunma durumunu kontrol et
            let isUnread = false;

            if (isNotOurMessage) {
                if (msg.readBy) {
                    // readBy alanı varsa, bizim ID'miz yoksa veya false ise okunmamış demektir
                    isUnread = user?.uid ? !msg.readBy[user.uid] : true;
                } else if (msg.isRead !== undefined) {
                    // Eğer readBy yoksa ama isRead değeri varsa, o değere göre belirle
                    isUnread = !msg.isRead;
                } else {
                    // Eğer mesaj konuşmanın ilk mesajıysa ve readBy/isRead yoksa,
                    // bu genellikle ilan üzerinden gelen ilk mesajdır, okunmuş kabul et
                    const isFirstMessage = conversationMessages[0]?.id === msg.id ||
                        conversationMessages[0]?.createdAt === msg.createdAt;
                    isUnread = !isFirstMessage;
                }
            }

            return isNotOurMessage && isUnread;
        }).length;

        return count + unreadCount;
    }, 0);

    const newMessages = conversations.reduce((count, conversation) => {
        // Yeni açılan sohbetler için kontrol
        if (conversation.status === 'pending') {
            return count + 1;
        }

        // Okunmamış mesajlar için kontrol
        const conversationMessages = messages[conversation.id] || [];

        // Her konuşmadaki okunmamış mesajları say (yeni eklediğimiz kontrollerle)
        const unreadCount = conversationMessages.filter(msg => {
            // Sadece karşı tarafın mesajlarını sayalım
            const isNotOurMessage = msg.senderId !== user?.uid;

            // Mesajın okunma durumunu kontrol et
            let isUnread = false;

            if (isNotOurMessage) {
                if (msg.readBy) {
                    // readBy alanı varsa, bizim ID'miz yoksa veya false ise okunmamış demektir
                    isUnread = user?.uid ? !msg.readBy[user.uid] : true;
                } else if (msg.isRead !== undefined) {
                    // Eğer readBy yoksa ama isRead değeri varsa, o değere göre belirle
                    isUnread = !msg.isRead;
                } else {
                    // Eğer mesaj konuşmanın ilk mesajıysa ve readBy/isRead yoksa,
                    // bu genellikle ilan üzerinden gelen ilk mesajdır, okunmuş kabul et
                    const isFirstMessage = conversationMessages[0]?.id === msg.id ||
                        conversationMessages[0]?.createdAt === msg.createdAt;
                    isUnread = !isFirstMessage;
                }
            }

            return isNotOurMessage && isUnread;
        }).length;

        return count + unreadCount;
    }, 0);

    // Arka plan emojileri için effect
    useEffect(() => {
        // İlk emoji setini oluştur
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

    // Konum bilgisini almak ve kaydetmek için fonksiyon
    const handleLocationToggle = async (checked: boolean) => {
        if (checked) {
            setShowLocationModal(true);
        } else {
            // Konum paylaşımını kapat
            if (user) {
                const db = getDatabase();
                const locationRef = dbRef(db, `userLocations/${user.uid}`);
                set(locationRef, {
                    ...userLocation,
                    active: false,
                    timestamp: new Date().toISOString()
                });
                setLocationSharing(false);
                toast.success('Konum paylaşımı devre dışı bırakıldı.');
            }
        }
    };

    // Konum onaylandığında çağrılacak fonksiyon
    const handleLocationConfirm = () => {
        try {
            // Kullanıcının konum bilgisine erişim iste
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });

                    // Konum bilgisini veritabanına kaydet
                    if (user) {
                        const db = getDatabase();
                        const locationRef = dbRef(db, `userLocations/${user.uid}`);
                        set(locationRef, {
                            lat: latitude,
                            lng: longitude,
                            timestamp: new Date().toISOString(),
                            active: true
                        });
                        setLocationSharing(true);
                        toast.success('Konum paylaşımı etkinleştirildi!');
                    }
                    setShowLocationModal(false);
                },
                (error) => {
                    console.error('Konum alınamadı:', error);
                    toast.error('Konum bilgisi alınamadı. Lütfen izinleri kontrol edin.');
                    setLocationSharing(false);
                    setShowLocationModal(false);
                }
            );
        } catch (error) {
            console.error('Konum erişim hatası:', error);
            toast.error('Konum servisine erişilemedi!');
            setLocationSharing(false);
            setShowLocationModal(false);
        }
    };

    // Pet verisini yükleme
    useEffect(() => {
        if (!user || authLoading) return;

        setIsLoading(true);
        setError(null);

        const db = getDatabase();
        const userRef = dbRef(db, `users/${user.uid}`);
        const petsRef = dbRef(db, `pets/${user.uid}`); // Artık birden fazla hayvan
        const matchesRef = dbRef(db, `matches/${user.uid}`);
        const messagesRef = dbRef(db, `messages/${user.uid}`);
        const locationRef = dbRef(db, `userLocations/${user.uid}`);
        const vetRecordsRef = dbRef(db, `vetRecords`);
        // Tüm eşleşmeleri kontrol etmek için yeni referans
        const allMatchesRef = dbRef(db, 'matches');

        const locationUnsubscribe = onValue(locationRef, (snapshot) => {
            const locationData = snapshot.val();
            if (locationData && locationData.active) {
                setUserLocation({ lat: locationData.lat, lng: locationData.lng });
                setLocationSharing(true);
            }
        });

        const userUnsubscribe = onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            setUserData(userData);
        });

        const petUnsubscribe = onValue(petsRef, (snapshot) => {
            const petData = snapshot.val();

            if (petData) {
                // Artık tüm evcil hayvanları yüklüyoruz
                setPets(petData as UserPets);

                // İlk evcil hayvanı veya seçili evcil hayvanı etkin olarak ayarlıyoruz
                const petIds = Object.keys(petData);
                if (petIds.length > 0) {
                    // Daha önce seçili bir evcil hayvan varsa onu kullan, yoksa ilkini seç
                    const activePetId = selectedPetId && petData[selectedPetId] ? selectedPetId : petIds[0];
                    setSelectedPetId(activePetId);
                    setActivePet(petData[activePetId] as Pet);
                } else {
                    setActivePet(null);
                }
            } else {
                setPets({});
                setActivePet(null);
                setSelectedPetId(null);
            }

            setIsLoading(false);
        });

        // Eşleşme ve mesaj verilerini çek
        const matchesUnsubscribe = onValue(matchesRef, (snapshot) => {
            const matches = snapshot.val();
            if (matches) {
                Object.entries(matches).forEach(([id, match]: [string, any]) => {
                    setRecentActivities(prev => {
                        const newActivity: Activity = {
                            id: `match-${id}`,
                            type: 'match',
                            title: 'Yeni Eşleşme',
                            description: `${match.petName} ile eşleştiniz`,
                            timestamp: match.timestamp,
                            icon: '❤️'
                        };
                        // Son 2 aktiviteyi göster
                        return [newActivity, ...prev.filter(a => a.id !== `match-${id}`)].slice(0, 2);
                    });
                });
            }
        });

        const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
            const messages = snapshot.val();
            if (messages) {
                Object.entries(messages).forEach(([id, message]: [string, any]) => {
                    setRecentActivities(prev => {
                        const newActivity: Activity = {
                            id: `message-${id}`,
                            type: 'message',
                            title: 'Yeni Mesaj',
                            description: `${message.senderName}'dan mesaj aldınız`,
                            timestamp: message.timestamp,
                            icon: '💬'
                        };
                        // Son 2 aktiviteyi göster
                        return [newActivity, ...prev.filter(a => a.id !== `message-${id}`)].slice(0, 2);
                    });
                });
            }
        });

        // Veteriner kayıtlarını çek
        const vetRecordsUnsubscribe = onValue(vetRecordsRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const vetRecord = childSnapshot.val() as VetRecord;

                if (vetRecord && vetRecord.petId) {
                    // Burada doğrudan Firebase'den pet bilgisini alıyoruz
                    const petRef = dbRef(db, `pets/${user.uid}/${vetRecord.petId}`);

                    get(petRef).then((petSnapshot) => {
                        if (petSnapshot.exists()) {
                            const petData = petSnapshot.val() as Pet;
                            const petName = petData.name || 'Evcil Hayvan';

                            // Son veteriner ziyaretini aktivite olarak ekle
                            if (vetRecord.lastVisit && vetRecord.lastVisit !== "") {
                                setRecentActivities(prev => {
                                    const newActivity: Activity = {
                                        id: `vet-visit-${vetRecord.petId}`,
                                        type: 'vet',
                                        title: 'Veteriner Ziyareti',
                                        description: `${petName} veteriner kontrolünden geçti`,
                                        timestamp: vetRecord.updatedAt,
                                        icon: '🩺'
                                    };
                                    // Son 2 aktiviteyi göster
                                    return [newActivity, ...prev.filter(a => a.id !== `vet-visit-${vetRecord.petId}`)].slice(0, 2);
                                });
                            }

                            // Sonraki veteriner ziyaretini aktivite olarak ekle (eğer varsa)
                            if (vetRecord.nextVisit && vetRecord.nextVisit !== "") {
                                setRecentActivities(prev => {
                                    const newActivity: Activity = {
                                        id: `vet-next-${vetRecord.petId}`,
                                        type: 'vet',
                                        title: 'Yaklaşan Veteriner Randevusu',
                                        description: `${petName} için randevu: ${vetRecord.nextVisit}`,
                                        timestamp: vetRecord.updatedAt,
                                        icon: '📅'
                                    };
                                    // Son 2 aktiviteyi göster
                                    return [newActivity, ...prev.filter(a => a.id !== `vet-next-${vetRecord.petId}`)].slice(0, 2);
                                });
                            }

                            // Eğer aşılar varsa, son aşıyı ekle
                            if (vetRecord.vaccinations && vetRecord.vaccinations.length > 0) {
                                const lastVaccination = vetRecord.vaccinations[vetRecord.vaccinations.length - 1];
                                setRecentActivities(prev => {
                                    const newActivity: Activity = {
                                        id: `vac-${vetRecord.petId}-${lastVaccination.name}`,
                                        type: 'vet',
                                        title: 'Aşı Kaydı',
                                        description: `${petName}: ${lastVaccination.name} aşısı yapıldı`,
                                        timestamp: vetRecord.updatedAt,
                                        icon: '💉'
                                    };
                                    // Son 2 aktiviteyi göster
                                    return [newActivity, ...prev.filter(a => a.id !== `vac-${vetRecord.petId}-${lastVaccination.name}`)].slice(0, 2);
                                });
                            }
                        }
                    }).catch(error => {
                        console.error("Evcil hayvan bilgisi getirilemedi:", error);
                    });
                }
            });
        });

        // Tüm eşleşmeleri kontrol et ve aktiviteler olarak ekle
        const allMatchesUnsubscribe = onValue(allMatchesRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const match = childSnapshot.val();

                // Kullanıcıya ait eşleşmeleri filtrele
                if (match.receiverId === user.uid || match.senderId === user.uid) {
                    // Eşleşme durumuna göre farklı aktiviteler oluştur
                    if (match.status === 'pending' && match.receiverId === user.uid) {
                        // Bekleyen eşleşme isteği
                        setRecentActivities(prev => {
                            const newActivity: Activity = {
                                id: `match-pending-${childSnapshot.key}`,
                                type: 'match',
                                title: 'Eşleşme İsteği',
                                description: `${match.senderName || 'Birisi'} evcil hayvanı için eşleşme isteği gönderdi`,
                                timestamp: match.createdAt || match.timestamp,
                                icon: '💌'
                            };
                            return [newActivity, ...prev.filter(a => a.id !== `match-pending-${childSnapshot.key}`)].slice(0, 2);
                        });
                    } else if (match.status === 'accepted') {
                        // Kabul edilen eşleşme
                        setRecentActivities(prev => {
                            const newActivity: Activity = {
                                id: `match-accepted-${childSnapshot.key}`,
                                type: 'match',
                                title: 'Eşleşme Kabul Edildi',
                                description: `${match.petInfo?.name || 'Bir evcil hayvan'} ile eşleşme kabul edildi`,
                                timestamp: match.updatedAt || match.timestamp,
                                icon: '✅'
                            };
                            return [newActivity, ...prev.filter(a => a.id !== `match-accepted-${childSnapshot.key}`)].slice(0, 2);
                        });
                    } else if (match.status === 'rejected' && (match.updatedAt || match.timestamp)) {
                        // Reddedilen eşleşme
                        setRecentActivities(prev => {
                            const newActivity: Activity = {
                                id: `match-rejected-${childSnapshot.key}`,
                                type: 'match',
                                title: 'Eşleşme Reddedildi',
                                description: match.senderId === user.uid
                                    ? 'Gönderdiğiniz eşleşme isteği reddedildi'
                                    : `${match.senderName || 'Birisi'}'den gelen eşleşme isteğini reddettiniz`,
                                timestamp: match.updatedAt || match.timestamp,
                                icon: '❌'
                            };
                            return [newActivity, ...prev.filter(a => a.id !== `match-rejected-${childSnapshot.key}`)].slice(0, 2);
                        });
                    }
                }
            });
        });

        return () => {
            userUnsubscribe();
            petUnsubscribe();
            matchesUnsubscribe();
            messagesUnsubscribe();
            locationUnsubscribe();
            vetRecordsUnsubscribe(); // Yeni eklenen
            allMatchesUnsubscribe(); // Yeni eklenen - tüm eşleşmeler için
        };
    }, [user, authLoading, router, selectedPetId]);

    // Bekleyen eşleşme isteklerini kontrol et
    useEffect(() => {
        if (!user) return;

        const db = getDatabase();
        const matchesRef = dbRef(db, 'matches');

        const unsubscribe = onValue(matchesRef, (snapshot) => {
            let pendingCount = 0;
            let totalCount = 0;

            snapshot.forEach((childSnapshot) => {
                const match = childSnapshot.val();

                // Kullanıcıya ait olan tüm eşleşmeleri say
                if (match.receiverId === user.uid || match.senderId === user.uid) {
                    totalCount++;

                    // Kullanıcıya ait ve beklemede olan eşleşmeleri say
                    if (match.receiverId === user.uid && match.status === 'pending') {
                        pendingCount++;
                    }
                }
            });

            setPendingMatchesCount(pendingCount);
            setTotalMatchesCount(totalCount);
        });

        return () => unsubscribe();
    }, [user]);

    // Seçili evcil hayvanı değiştirme fonksiyonu
    const handlePetChange = (petId: string) => {
        setSelectedPetId(petId);
        setActivePet(pets[petId]);
    };

    // Yeni evcil hayvan ekleme fonksiyonu
    const handleAddNewPet = () => {
        router.push('/profile/create');
    };

    // Evcil hayvan profil fotoğrafını güncellemek için
    const handleSetProfilePhoto = async (photoURL: string) => {
        if (!user || !selectedPetId) return;

        try {
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${selectedPetId}`);

            await set(petRef, {
                ...activePet,
                profilePhoto: photoURL,
                updatedAt: new Date().toISOString()
            });

            setActivePet(prev => prev ? { ...prev, profilePhoto: photoURL } : null);
            setPets((prev: UserPets) => ({
                ...prev,
                [selectedPetId]: {
                    ...prev[selectedPetId],
                    profilePhoto: photoURL
                }
            }));

            toast.success('Profil fotoğrafı başarıyla güncellendi!');
        } catch (error) {
            console.error('Profil fotoğrafı güncelleme hatası:', error);
            toast.error('Profil fotoğrafı güncellenirken bir hata oluştu!');
        }
    };

    // Fotoğraf yükleme fonksiyonu
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !selectedPetId) return;

        setUploading(true);
        try {
            console.log('Dosya yükleme başladı:', file.name);

            // Dosya uzantısını al
            const fileExtension = file.name.split('.').pop();
            // Benzersiz dosya adı oluştur
            const fileName = `${user.uid}/${selectedPetId}/${Date.now()}.${fileExtension}`;
            console.log('Hedef dosya yolu:', `pet-photos/${fileName}`);

            // Storage referansı oluştur
            const fileRef = storageRef(storage, `pet-photos/${fileName}`);
            console.log('Storage referansı oluşturuldu');

            // Dosyayı yükle
            console.log('Dosya yükleniyor...');
            await uploadBytes(fileRef, file);
            console.log('Dosya yüklendi');

            // Yüklenen dosyanın URL'sini al
            console.log('Dosya URL\'i alınıyor...');
            const photoURL = await getDownloadURL(fileRef);
            console.log('Dosya URL\'i:', photoURL);

            // Pet verisini güncelle
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${selectedPetId}`);

            // Mevcut pet verisini al
            const currentPetData = {
                ...(activePet || {}),
                photos: activePet?.photos || [] // Eğer photos yoksa boş dizi oluştur
            };

            // Yeni fotoğrafı ekle
            const updatedPhotos = [...currentPetData.photos, photoURL];

            // Veritabanını güncelle
            const updatedPetData = {
                ...currentPetData,
                photos: updatedPhotos,
                updatedAt: new Date().toISOString()
            };

            console.log('Veritabanı güncelleniyor...', updatedPetData);
            await set(petRef, updatedPetData);
            console.log('Veritabanı güncellendi');

            // Pet state'ini güncelle
            setActivePet(updatedPetData as Pet);
            setPets((prev: UserPets) => ({
                ...prev,
                [selectedPetId]: updatedPetData as Pet
            }));

            console.log('İşlem başarıyla tamamlandı');

        } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            alert('Fotoğraf yüklenirken bir hata oluştu: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    // Kullanıcının ilan sayısını hesapla
    useEffect(() => {
        if (user && listings.length > 0) {
            const userListings = listings.filter(listing => listing.ownerId === user.uid);
            setUserListingsCount(userListings.length);
        }
    }, [user, listings]);

    const handleDeletePet = async () => {
        if (!user || !selectedPetId) return;
        setDeleting(true);
        try {
            const db = getDatabase();
            const petRef = dbRef(db, `pets/${user.uid}/${selectedPetId}`);
            await remove(petRef);
            toast.success('Evcil hayvan başarıyla silindi!');
            setShowDeleteModal(false);
            setDeleting(false);
        } catch (error) {
            toast.error('Silme işlemi sırasında bir hata oluştu!');
            setDeleting(false);
        }
    };

    if (authLoading || isLoading) {
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

    const fullName = userData ? `${userData.firstName} ${userData.lastName}` : 'İsimsiz Kullanıcı';

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-pink-50 overflow-y-auto">
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
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {/* Sol tarafta kullanıcı profili */}
                    <div className="w-full lg:w-80">
                        {/* Kullanıcı Profili */}
                        <div className="bg-white rounded-xl p-8 shadow-lg h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-2xl">👤</span>
                                    <h2 className="text-xl font-bold text-gray-900">Profil</h2>
                                </div>
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 p-1 mb-4 relative group">
                                        <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden">
                                            {userData?.photoURL ? (
                                                <img
                                                    src={userData.photoURL}
                                                    alt={fullName}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-indigo-50 to-purple-50">
                                                    👤
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !user) return;

                                                try {
                                                    // Dosya uzantısını al
                                                    const fileExtension = file.name.split('.').pop();
                                                    // Benzersiz dosya adı oluştur
                                                    const fileName = `${user.uid}/profile/${Date.now()}.${fileExtension}`;

                                                    // Storage referansı oluştur
                                                    const fileRef = storageRef(storage, `profile-photos/${fileName}`);

                                                    // Dosyayı yükle
                                                    await uploadBytes(fileRef, file);

                                                    // Yüklenen dosyanın URL'sini al
                                                    const photoURL = await getDownloadURL(fileRef);

                                                    // Kullanıcı verisini güncelle
                                                    const db = getDatabase();
                                                    const userRef = dbRef(db, `users/${user.uid}`);
                                                    await set(userRef, {
                                                        ...userData,
                                                        photoURL,
                                                        updatedAt: new Date().toISOString()
                                                    });

                                                    // State'i güncelle
                                                    setUserData(prev => prev ? { ...prev, photoURL } : null);

                                                    alert('Profil fotoğrafı başarıyla güncellendi!');
                                                } catch (error) {
                                                    console.error('Profil fotoğrafı yükleme hatası:', error);
                                                    alert('Profil fotoğrafı yüklenirken bir hata oluştu!');
                                                }
                                            }}
                                            className="hidden"
                                            id="profile-photo-upload"
                                        />
                                        <label
                                            htmlFor="profile-photo-upload"
                                            className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                            </svg>
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {fullName}
                                        </h3>
                                        <p className="text-sm text-gray-700">{userData?.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="bg-indigo-100 rounded-lg p-3 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-indigo-200">
                                        <p className="text-2xl font-semibold text-indigo-800">{totalMatchesCount}</p>
                                        <p className="text-xs text-indigo-800">Eşleşme</p>
                                    </div>
                                    <div className="bg-purple-100 rounded-lg p-3 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-purple-200">
                                        <p className="text-2xl font-semibold text-purple-800">{userListingsCount}</p>
                                        <p className="text-xs text-purple-800">İlan</p>
                                    </div>
                                    <div className="bg-pink-100 rounded-lg p-3 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-pink-200">
                                        <p className="text-2xl font-semibold text-pink-800">{conversations.filter(conv => conv.status === 'active').length}</p>
                                        <p className="text-xs text-pink-800">Sohbet</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => router.push('/user/edit')}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Profili Düzenle
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => router.push('/user/change-password')}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Şifre Değiştir
                                        </button>
                                        <button
                                            onClick={() => router.push('/auth')}
                                            className="flex-1 bg-red-200 hover:bg-red-300 text-red-800 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                            </svg>
                                            Çıkış Yap
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="bg-gray-100 rounded-xl p-4 mt-4 lg:mt-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                            </svg>
                                            <p className="text-sm font-medium text-gray-800">İletişim Tercihleri</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                <div>
                                                    <span className="text-sm text-gray-800">E-posta Bildirimleri</span>
                                                    <p className="text-xs text-gray-600">Önemli güncellemeler için e-posta al</p>
                                                </div>
                                                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                                                    <input
                                                        type="checkbox"
                                                        className="peer absolute w-12 h-6 opacity-0 z-10 cursor-pointer"
                                                    />
                                                    <div className="w-12 h-6 bg-gray-200 peer-checked:bg-indigo-600 rounded-full transition-all duration-300"></div>
                                                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-300 peer-checked:translate-x-6"></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <span className="text-sm text-gray-800">Konum Bildirimleri</span>
                                                    <p className="text-xs text-gray-600">Konum bilgisi paylaşımı</p>
                                                </div>
                                                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                                                    <input
                                                        type="checkbox"
                                                        className="peer absolute w-12 h-6 opacity-0 z-10 cursor-pointer"
                                                        checked={locationSharing}
                                                        onChange={(e) => handleLocationToggle(e.target.checked)}
                                                    />
                                                    <div className="w-12 h-6 bg-gray-200 peer-checked:bg-indigo-600 rounded-full transition-all duration-300"></div>
                                                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-300 peer-checked:translate-x-6"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Orta kısım - Ana Menü */}
                    <div className="flex-1">
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl ring-1 ring-gray-200 h-full flex flex-col">

                            {/* Açıklayıcı Metin */}
                            <div className="mb-5">
                                <h2 className="text-2xl font-medium text-indigo-900 mb-1">Minik dostunuza yeni arkadaşlar bulun 🐾</h2>
                                <p className="text-sm text-indigo-700">Eşleşme butonuna tıklayarak çevrenizdeki potansiyel arkadaşları keşfedin</p>
                            </div>

                            {/* Üst Kısım - Büyük Kartlar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
                                {/* Eşleşme - Büyük Kart */}
                                <div
                                    onClick={() => router.push('/match')}
                                    className="group relative bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden h-[180px] flex flex-col ring-2 ring-indigo-200 hover:ring-indigo-400 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-2xl group-hover:from-indigo-500/30 group-hover:via-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300" />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-indigo-900 group-hover:text-indigo-950 transition-colors">Eşleşme</h3>
                                                <p className="text-sm text-indigo-800">Yeni arkadaşlar keşfet</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto">
                                            {pendingMatchesCount > 0 && (
                                                <span className="px-3 py-1 bg-indigo-400/50 text-indigo-900 rounded-full text-xs font-medium">
                                                    {pendingMatchesCount} yeni eşleşme
                                                </span>
                                            )}
                                            <span className="px-3 py-1 bg-purple-400/50 text-purple-900 rounded-full text-xs font-medium">
                                                Arkadaşlar keşfet
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mesajlar - Büyük Kart */}
                                <div
                                    onClick={() => router.push('/messages')}
                                    className="group relative bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden h-[180px] flex flex-col ring-2 ring-blue-200 hover:ring-blue-400 hover:-translate-y-1 overflow-y-auto"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-blue-900 group-hover:text-blue-950 transition-colors">Mesajlar</h3>
                                                <p className="text-sm text-blue-800">Mesajlarını gör</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto">
                                            <span className="px-3 py-1 bg-blue-400/50 text-blue-900 rounded-full text-xs font-medium">
                                                {unreadMessages} okunmamış
                                            </span>
                                            <span className="px-3 py-1 bg-cyan-400/50 text-cyan-900 rounded-full text-xs font-medium">
                                                {newMessages} yeni mesaj
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alt Kısım - Küçük Kartlar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 lg:mb-8">
                                {/* İlanlar */}
                                <div
                                    onClick={() => router.push('/listings')}
                                    className="group relative bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-red-500/20 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden ring-2 ring-pink-200 hover:ring-pink-400 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-pink-900 group-hover:text-pink-950 transition-colors">İlanlar</h4>
                                            <p className="text-xs text-pink-800">İlanları keşfet</p>
                                        </div>
                                    </div>
                                </div>

                                {/* İşletmeler (eskiden Etkinlikler) */}
                                <div
                                    onClick={() => router.push('/events')}
                                    className="group relative bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-lime-500/20 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden ring-2 ring-emerald-200 hover:ring-emerald-400 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-lime-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-emerald-900 group-hover:text-emerald-950 transition-colors">İşletmeler</h4>
                                            <p className="text-xs text-emerald-800">İşletmeleri keşfedin</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Veteriner */}
                                <div
                                    onClick={() => router.push('/vets')}
                                    className="group relative bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden ring-2 ring-amber-200 hover:ring-amber-400 hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-amber-900 group-hover:text-amber-950 transition-colors">Sağlık</h4>
                                            <p className="text-xs text-amber-800">
                                                {vetRecord?.lastVisit ? `Son kontrol: ${format(new Date(vetRecord.lastVisit), 'd MMMM yyyy', { locale: tr })}` : 'Sağlık takibi'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Son Aktiviteler */}
                            <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-sm rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ring-1 ring-gray-200 hover:ring-gray-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Son Aktiviteler</h3>
                                    <button
                                        onClick={() => router.push('/activities')}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        Tümünü Gör
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {recentActivities.length > 0 ? (
                                        // Son aktiviteleri tarihe göre sırala ve sadece son 2'sini göster
                                        recentActivities
                                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                            .slice(0, 2)
                                            .map((activity) => (
                                                <div
                                                    key={activity.id}
                                                    className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        switch (activity.type) {
                                                            case 'match':
                                                                router.push('/match');
                                                                break;
                                                            case 'message':
                                                                router.push('/messages');
                                                                break;
                                                            case 'vet':
                                                                router.push('/vets');
                                                                break;
                                                            case 'event':
                                                                router.push('/events');
                                                                break;
                                                        }
                                                    }}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.type === 'match' ? 'bg-green-100' :
                                                        activity.type === 'message' ? 'bg-blue-100' :
                                                            activity.type === 'vet' ? 'bg-amber-100' :
                                                                'bg-purple-100'
                                                        }`}>
                                                        <span className="text-xl">{activity.icon}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                                                        <p className="text-xs text-gray-500">{activity.description}</p>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {format(new Date(activity.timestamp), 'd MMMM yyyy', { locale: tr })}
                                                    </span>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500">Henüz aktivite yok</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sağ tarafta Minik Dostumuz kartı */}
                    <div className="w-full lg:w-80">
                        {/* Minik Dostumuz Profili */}
                        <div className="bg-white rounded-xl p-4 lg:p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <span className="text-2xl">🐾</span>
                                        Minik Dostumuz
                                    </h3>

                                    {/* Evcil Hayvan Seçme ve Yenisini Ekleme Butonları */}
                                    <div className="flex items-center gap-2">
                                        {Object.keys(pets).length > 0 && (
                                            <div className="relative">
                                                <button
                                                    className="w-8 h-8 bg-indigo-100 hover:bg-indigo-200 rounded-full flex items-center justify-center transition-colors"
                                                    onClick={() => document.getElementById('pet-selector')?.classList.toggle('hidden')}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-700" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <div id="pet-selector" className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl p-2 z-20 hidden">
                                                    <div className="font-medium text-sm px-3 py-2 text-gray-500">Evcil Hayvanlarım</div>
                                                    {Object.entries(pets).map(([id, petItem]) => (
                                                        <button
                                                            key={id}
                                                            className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${selectedPetId === id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100'}`}
                                                            onClick={() => {
                                                                handlePetChange(id);
                                                                document.getElementById('pet-selector')?.classList.add('hidden');
                                                            }}
                                                        >
                                                            <span className="text-lg">
                                                                {(petItem as Pet).type === 'dog' ? '🐕' : (petItem as Pet).type === 'cat' ? '🐈' : (petItem as Pet).type === 'rabbit' ? '🐇' : '🦜'}
                                                            </span>
                                                            {(petItem as Pet).name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAddNewPet}
                                            className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center transition-colors"
                                            title="Yeni Evcil Hayvan Ekle"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    </div>
                                ) : Object.keys(pets).length === 0 ? (
                                    <div className="text-center py-6 space-y-4">
                                        <div className="text-6xl mb-2">🐾</div>
                                        <p className="text-gray-600">Henüz bir evcil hayvanınız yok</p>
                                        <button
                                            onClick={handleAddNewPet}
                                            className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 px-4 rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 hover:shadow-md"
                                        >
                                            Evcil Hayvan Ekle
                                        </button>
                                    </div>
                                ) : activePet ? (
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div
                                                className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 p-1 mb-4 relative group cursor-pointer"
                                                onClick={() => activePet?.photos?.length ? setShowProfilePhotoModal(true) : null}
                                            >
                                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                    {activePet?.profilePhoto ? (
                                                        <img
                                                            src={activePet.profilePhoto}
                                                            alt={activePet.name}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : activePet?.photos && activePet.photos.length > 0 ? (
                                                        <img
                                                            src={activePet.photos[0]}
                                                            alt={activePet.name}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl">
                                                            {(activePet.type && Object.prototype.hasOwnProperty.call(typeEmojiMap, activePet.type)) ? typeEmojiMap[activePet.type as keyof typeof typeEmojiMap] : '🐾'}
                                                        </div>
                                                    )}
                                                </div>
                                                {activePet?.photos && activePet.photos.length > 0 && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-2xl font-bold text-gray-900 mb-1">{activePet.name}</h4>
                                            <p className="text-sm text-gray-500 mb-4">
                                                {(activePet.type && Object.prototype.hasOwnProperty.call(typeMap, activePet.type)) ? typeMap[activePet.type as keyof typeof typeMap] : activePet.type} • {activePet.breed}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-indigo-100 rounded-xl p-4 transition-all duration-300 hover:bg-indigo-200 hover:shadow-lg hover:-translate-y-1">
                                                <p className="text-xs text-indigo-600 mb-1">Yaş</p>
                                                <p className="text-lg font-semibold text-indigo-900">{activePet.age}</p>
                                            </div>
                                            <div className="bg-purple-100 rounded-xl p-4 transition-all duration-300 hover:bg-purple-200 hover:shadow-lg hover:-translate-y-1">
                                                <p className="text-xs text-purple-600 mb-1">Cinsiyet</p>
                                                <p className="text-lg font-semibold text-purple-900">
                                                    {activePet.gender === 'male' ? 'Erkek' : 'Dişi'}
                                                </p>
                                            </div>
                                        </div>

                                        {activePet.description && (
                                            <div className="bg-gray-100 rounded-xl p-4 transition-all duration-300 hover:bg-gray-200 hover:shadow-lg hover:-translate-y-1">
                                                <p className="text-xs text-gray-500 mb-2">Hakkında</p>
                                                <div className="h-8 overflow-y-auto pr-2 custom-scrollbar">
                                                    <p className="text-gray-700">{activePet.description}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-green-50 rounded-xl p-3 text-center transition-all duration-300 hover:bg-green-100 hover:shadow-lg hover:-translate-y-1">
                                                    <p className="text-2xl font-semibold text-green-600">🧸</p>
                                                    <p className="text-xs text-green-600">Yakında</p>
                                                </div>
                                                <div className="bg-yellow-50 rounded-xl p-3 text-center transition-all duration-300 hover:bg-yellow-100 hover:shadow-lg hover:-translate-y-1">
                                                    <p className="text-2xl font-semibold text-yellow-600">🧸</p>
                                                    <p className="text-xs text-yellow-600">Yakında</p>
                                                </div>
                                                <div className="bg-blue-50 rounded-xl p-3 text-center transition-all duration-300 hover:bg-blue-100 hover:shadow-lg hover:-translate-y-1">
                                                    <p className="text-2xl font-semibold text-blue-600">🧸</p>
                                                    <p className="text-xs text-blue-600">Yakında</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/pet/edit?id=${selectedPetId}`)}
                                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-1"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                                Profili Düzenle
                                            </button>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setShowPhotoModal(true)}
                                                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                    </svg>
                                                    Fotoğraflar {activePet?.photos?.length ? `(${activePet.photos.length})` : ''}
                                                </button>
                                                <input
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.webp"
                                                    onChange={handlePhotoUpload}
                                                    className="hidden"
                                                    id="photo-upload"
                                                    disabled={uploading}
                                                />
                                                <label
                                                    htmlFor="photo-upload"
                                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${uploading
                                                        ? 'bg-gray-300 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white hover:shadow-lg hover:-translate-y-1'
                                                        }`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                    </svg>
                                                    {uploading ? 'Yükleniyor...' : 'Fotoğraf Ekle'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fotoğraf Galerisi Modal */}
            {showPhotoModal && activePet?.photos && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {activePet.name}'in Fotoğrafları
                            </h3>
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {activePet.photos.map((photo, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={photo}
                                            alt={`${activePet.name} fotoğrafı ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <button
                                                onClick={() => {
                                                    if (!activePet || !user) return;
                                                    const currentPhotos = activePet.photos || [];
                                                    const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
                                                    const db = getDatabase();
                                                    const petRef = dbRef(db, `pets/${user.uid}/${selectedPetId}`);
                                                    set(petRef, {
                                                        ...activePet,
                                                        photos: updatedPhotos,
                                                        updatedAt: new Date().toISOString()
                                                    });
                                                }}
                                                className="text-white hover:text-red-500 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t">
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={handlePhotoUpload}
                                className="hidden"
                                id="photo-upload-modal"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="photo-upload-modal"
                                className={`block w-full text-center px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 ${uploading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                                    }`}
                            >
                                {uploading ? 'Yükleniyor...' : 'Yeni Fotoğraf Yükle'}
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Profil Fotoğrafı Seçme Modalı */}
            {showProfilePhotoModal && activePet?.photos && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Profil Fotoğrafı Seç
                            </h3>
                            <button
                                onClick={() => setShowProfilePhotoModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {activePet.photos.map((photo, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={photo}
                                            alt={`${activePet.name} fotoğrafı ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <button
                                                onClick={() => {
                                                    handleSetProfilePhoto(photo);
                                                    setShowProfilePhotoModal(false);
                                                }}
                                                className="bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                Profil Fotoğrafı Yap
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Konum Paylaşımı Modal */}
            {showLocationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full overflow-hidden flex flex-col animate-fade-in-up">
                        <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-500">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Konum Paylaşımı
                            </h3>
                            <button
                                onClick={() => {
                                    setShowLocationModal(false);
                                    setLocationSharing(false);
                                }}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 text-center">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">Konumunuzu Paylaşmak İster misiniz?</h4>
                                <p className="text-sm text-gray-600">
                                    Konum paylaşımını etkinleştirerek, yakınınızdaki evcil hayvan sahipleriyle daha kolay iletişim kurabilir ve buluşma noktalarını belirleyebilirsiniz.
                                </p>
                            </div>

                            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                                <h5 className="text-sm font-medium text-indigo-800 mb-2">Konum bilginiz şunlar için kullanılacak:</h5>
                                <ul className="text-xs text-indigo-700 space-y-2">
                                    <li className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Yakınınızdaki evcil hayvan sahiplerini bulmak
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Yakın çevrenizdeki etkinlikleri görüntülemek
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Acil durumlarda iletişim kurabilmek
                                    </li>
                                </ul>
                            </div>

                            <div className="text-xs text-gray-500 mb-6">
                                Konum paylaşımını istediğiniz zaman kapatabilirsiniz. Konum bilginiz gizlilik politikamıza uygun olarak işlenecektir.
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowLocationModal(false);
                                        setLocationSharing(false);
                                    }}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={handleLocationConfirm}
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Konumu Paylaş
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stil tanımlamaları */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0);
                        opacity: 0.1;
                    }
                    50% {
                        transform: translateY(400px) rotate(180deg);
                        opacity: 0.2;
                    }
                    100% {
                        transform: translateY(800px) rotate(360deg);
                        opacity: 0;
                    }
                }
                .animate-float {
                    animation: float 15s linear infinite;
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.3s ease-out;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #c7d2fe;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a5b4fc;
                }
            `}</style>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Evcil Hayvanı Sil</h3>
                        <p className="text-gray-600 mb-6">Bu işlemi geri alamazsınız. Emin misiniz?</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                disabled={deleting}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeletePet}
                                className={`px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={deleting}
                            >
                                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

