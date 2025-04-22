'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDatabase, ref, onValue, update, push, set, get, remove } from 'firebase/database';
import { useRouter } from 'next/navigation';

interface Match {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    petId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    message: string;
    petInfo: {
        name: string;
        type: string;
        breed: string;
        age: number;
        gender: string;
        photo: string;
    };
    conversationId?: string; // Eşleşme kabul edildiğinde oluşturulan konuşma ID'si
}

const MatchesPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success'
    });

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }

        const db = getDatabase();
        const matchesRef = ref(db, 'matches');

        const unsubscribe = onValue(matchesRef, (snapshot) => {
            const matchesData: Match[] = [];
            snapshot.forEach((childSnapshot) => {
                const match = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                } as Match;
                matchesData.push(match);
            });

            // Sadece kullanıcının gönderdiği veya aldığı eşleşmeleri filtrele
            const userMatches = matchesData.filter(
                match => match.senderId === user.uid || match.receiverId === user.uid
            );
            setMatches(userMatches);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, router]);

    useEffect(() => {
        // Bildirimi 3 saniye sonra kapat
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleMatchAction = async (matchId: string, action: 'accept' | 'reject') => {
        try {
            const db = getDatabase();
            const matchRef = ref(db, `matches/${matchId}`);

            await update(matchRef, {
                status: action === 'accept' ? 'accepted' : 'rejected',
                updatedAt: new Date().toISOString()
            });

            if (action === 'accept') {
                // Eşleşme kabul edildiğinde sohbet başlat
                const conversationsRef = ref(db, 'conversations');
                const newConversationRef = push(conversationsRef);
                const conversationId = newConversationRef.key;

                const match = matches.find(m => m.id === matchId);
                if (match && conversationId) {
                    // Kayıt içindeki petId kullanılarak gönderenin evcil hayvan bilgilerini al
                    const senderPetId = match.petId;
                    const senderPetRef = ref(db, `pets/${match.senderId}/${senderPetId}`);
                    const senderPetSnapshot = await get(senderPetRef);
                    const senderPetData = senderPetSnapshot.val() || match.petInfo;

                    // Alıcının evcil hayvan bilgilerini al (eşleşme isteğini kabul eden kişi)
                    // Burada aktif evcil hayvanı veya belirli bir hayvanı seçmek için
                    let receiverPetId = '';
                    let receiverPetData = null;

                    try {
                        // Alıcının evcil hayvanlarını getir
                        const receiverPetsRef = ref(db, `pets/${match.receiverId}`);
                        const receiverPetsSnapshot = await get(receiverPetsRef);

                        if (receiverPetsSnapshot.exists()) {
                            // Alıcının evcil hayvanlarını bir diziye çevir
                            const receiverPets: Array<{ id: string, [key: string]: any }> = [];
                            receiverPetsSnapshot.forEach((childSnapshot) => {
                                receiverPets.push({
                                    id: childSnapshot.key as string,
                                    ...childSnapshot.val()
                                });
                            });

                            // Alıcının en son aktif olarak seçtiği hayvanını bul
                            const userLocationRef = ref(db, `userLocations/${match.receiverId}`);
                            const userLocationSnapshot = await get(userLocationRef);

                            if (userLocationSnapshot.exists()) {
                                const locationData = userLocationSnapshot.val();
                                if (locationData.activePetId && receiverPetsSnapshot.child(locationData.activePetId).exists()) {
                                    // Aktif olarak seçilen evcil hayvanı kullan
                                    receiverPetId = locationData.activePetId;
                                    receiverPetData = {
                                        id: receiverPetId,
                                        ...receiverPetsSnapshot.child(receiverPetId).val()
                                    };
                                    console.log('Alıcının aktif evcil hayvanı bulundu:', receiverPetId);
                                } else if (receiverPets.length > 0) {
                                    // Aktif seçili evcil hayvan yoksa ilk hayvanı al
                                    const firstPet = receiverPets[0];
                                    receiverPetId = firstPet.id;
                                    receiverPetData = firstPet;
                                    console.log('Alıcının evcil hayvanı bulundu (varsayılan):', receiverPetId);
                                }
                            } else if (receiverPets.length > 0) {
                                // Konum bilgisi yoksa, ilk evcil hayvanı seç
                                const firstPet = receiverPets[0];
                                receiverPetId = firstPet.id;
                                receiverPetData = firstPet;
                                console.log('Alıcının evcil hayvanı bulundu:', receiverPetId);
                            }
                        }

                        // Eğer alıcının hayvanı bulunamazsa, varsayılan bilgiler kullan
                        if (!receiverPetData) {
                            console.log('Alıcının evcil hayvanı bulunamadı, varsayılan bilgiler kullanılıyor');
                            receiverPetId = 'unknown-pet';
                            receiverPetData = {
                                name: 'Bilinmeyen Hayvan',
                                type: 'other',
                                breed: 'Bilinmeyen',
                                age: '?',
                                gender: 'unknown',
                                profilePhoto: 'https://via.placeholder.com/150?text=?'
                            };
                        }
                    } catch (error) {
                        console.error('Alıcının evcil hayvan bilgileri alınamadı:', error);
                        receiverPetId = 'unknown-pet';
                        receiverPetData = {
                            name: 'Bilinmeyen Hayvan',
                            type: 'other',
                            breed: 'Bilinmeyen',
                            age: '?',
                            gender: 'unknown',
                            profilePhoto: 'https://via.placeholder.com/150?text=?'
                        };
                    }

                    // Eşleşme yapılan kullanıcıların adlarını almaya çalış
                    let senderName = match.senderName;
                    let receiverName = "Kullanıcı";

                    try {
                        const senderUserRef = ref(db, `users/${match.senderId}`);
                        const senderUserData = await get(senderUserRef);
                        if (senderUserData.exists()) {
                            const userData = senderUserData.val();
                            senderName = userData.firstName ?
                                `${userData.firstName} ${userData.lastName || ''}`.trim() :
                                userData.displayName || match.senderName;
                        }

                        const receiverUserRef = ref(db, `users/${match.receiverId}`);
                        const receiverUserData = await get(receiverUserRef);
                        if (receiverUserData.exists()) {
                            const userData = receiverUserData.val();
                            receiverName = userData.firstName ?
                                `${userData.firstName} ${userData.lastName || ''}`.trim() :
                                userData.displayName || "Kullanıcı";
                        }
                    } catch (error) {
                        console.error("Kullanıcı adları alınamadı:", error);
                    }

                    // Otomatik karşılama mesajı metni
                    const welcomeMessage = `Tebrikler! ${senderName} ve ${receiverName} arasındaki eşleşme kabul edildi. Şimdi evcil hayvanlarınızla ilgili konuşmaya başlayabilirsiniz. 🐾`;

                    // Şimdi zaman bilgisi
                    const now = new Date().toISOString();

                    // Aktif bir sohbet oluştur
                    await set(newConversationRef, {
                        participants: [match.senderId, match.receiverId],
                        lastMessage: welcomeMessage,
                        lastMessageAt: now,
                        createdAt: now,
                        status: 'active', // Sohbeti aktif olarak işaretle
                        petInfo: {
                            [match.senderId]: {
                                id: senderPetId,
                                ...senderPetData
                            },
                            [match.receiverId]: {
                                id: receiverPetId,
                                ...receiverPetData
                            }
                        },
                        // Her iki kullanıcı için ayrı matchDetails oluştur
                        userMatchDetails: {
                            // Gönderen için matchDetails (gönderen, alıcının hayvanını görecek)
                            [match.senderId]: {
                                petId: receiverPetId,
                                petName: receiverPetData.name,
                                petType: receiverPetData.type,
                                petPhoto: receiverPetData.profilePhoto || ('photos' in receiverPetData && Array.isArray(receiverPetData.photos) && receiverPetData.photos.length > 0 ? receiverPetData.photos[0] : '') || '',
                                petAge: receiverPetData.age?.toString() || '?',
                                petGender: receiverPetData.gender,
                                breed: receiverPetData.breed,
                                partnerId: match.receiverId,
                                partnerName: receiverName
                            },
                            // Alıcı için matchDetails (alıcı, gönderenin hayvanını görecek)
                            [match.receiverId]: {
                                petId: senderPetId,
                                petName: senderPetData.name,
                                petType: senderPetData.type,
                                petPhoto: senderPetData.photo || senderPetData.profilePhoto || ('photos' in senderPetData && Array.isArray(senderPetData.photos) && senderPetData.photos.length > 0 ? senderPetData.photos[0] : '') || '',
                                petAge: senderPetData.age?.toString() || '?',
                                petGender: senderPetData.gender,
                                breed: senderPetData.breed,
                                partnerId: match.senderId,
                                partnerName: senderName
                            }
                        },
                        // Eşleşme kaydını güncelle
                        acceptedBy: {
                            userId: user?.uid || 'unknown',
                            petId: receiverPetId
                        }
                    });

                    // İlk sistem mesajını ekle
                    const messagesRef = ref(db, `messages/${conversationId}`);
                    const newMessageRef = push(messagesRef);
                    await set(newMessageRef, {
                        text: welcomeMessage,
                        senderId: 'system', // Sistem mesajı olarak işaretle
                        createdAt: now,
                        read: false,
                        type: 'text'
                    });

                    // Eşleşme kaydını güncelle
                    await update(matchRef, {
                        status: action === 'accept' ? 'accepted' : 'rejected',
                        updatedAt: new Date().toISOString(),
                        conversationId: action === 'accept' ? conversationId : undefined,
                        acceptedBy: {
                            userId: user?.uid || 'unknown',
                            petId: receiverPetId
                        }
                    });

                    // Mevcut state'i güncelle
                    setMatches(prev => prev.map(m => {
                        if (m.id === matchId) {
                            return { ...m, conversationId, status: 'accepted' };
                        }
                        return m;
                    }));

                    // Kullanıcıya bildirim göster
                    setToast({
                        show: true,
                        message: 'Eşleşme kabul edildi! Artık mesajlaşmaya başlayabilirsiniz.',
                        type: 'success'
                    });
                }
            }
        } catch (error) {
            console.error('Eşleşme işlemi sırasında hata oluştu:', error);
            setToast({
                show: true,
                message: 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.',
                type: 'error'
            });
        }
    };

    const handleDeleteMatch = async (matchId: string) => {
        // Modal açmak için matchId'yi sakla ve modal'ı göster
        setMatchToDelete(matchId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            if (!matchToDelete) return;

            const db = getDatabase();
            const matchRef = ref(db, `matches/${matchToDelete}`);

            // Firebase'den eşleşmeyi sil
            await remove(matchRef);

            // Yerel state'i güncelle (silinen eşleşmeyi kaldır)
            setMatches(prevMatches => prevMatches.filter(match => match.id !== matchToDelete));

            // Modal'ı kapat ve matchToDelete'i temizle
            setShowDeleteModal(false);
            setMatchToDelete(null);

            // Başarılı bildirim göster
            setToast({
                show: true,
                message: 'Eşleşme isteği başarıyla silindi.',
                type: 'success'
            });
        } catch (error) {
            console.error('Eşleşme silme sırasında hata oluştu:', error);
            setToast({
                show: true,
                message: 'Eşleşme silinirken bir hata oluştu. Lütfen tekrar deneyin.',
                type: 'error'
            });
            setShowDeleteModal(false);
            setMatchToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setMatchToDelete(null);
    };

    const navigateToMessages = (conversationId?: string) => {
        if (conversationId) {
            router.push(`/messages?conversation=${conversationId}`);
        } else {
            router.push('/messages');
        }
    };

    const handleGoBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button
                        onClick={handleGoBack}
                        className="mr-3 flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                        aria-label="Geri git"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Eşleşme İstekleri</h1>
                </div>

                {matches.length === 0 ? (
                    <div className="bg-white rounded-xl p-6 text-center">
                        <p className="text-gray-600">Henüz eşleşme isteği bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map((match) => (
                            <div key={match.id} className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden">
                                        <img
                                            src={match.petInfo.photo}
                                            alt={match.petInfo.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {match.petInfo.name}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${match.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                match.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {match.status === 'pending' ? 'Beklemede' :
                                                    match.status === 'accepted' ? 'Kabul Edildi' :
                                                        'Reddedildi'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {match.senderName} adlı kullanıcı {match.petInfo.name} ile eşleşmek istiyor.
                                        </p>
                                        <div className="flex gap-2">
                                            {match.status === 'pending' && match.receiverId === user?.uid && (
                                                <>
                                                    <button
                                                        onClick={() => handleMatchAction(match.id, 'accept')}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Kabul Et
                                                    </button>
                                                    <button
                                                        onClick={() => handleMatchAction(match.id, 'reject')}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                    >
                                                        Reddet
                                                    </button>
                                                </>
                                            )}
                                            {match.status === 'accepted' && (
                                                <button
                                                    onClick={() => navigateToMessages(match.conversationId)}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    Mesajlaşmaya Git
                                                </button>
                                            )}

                                            {/* Silme butonu - tüm eşleşmeler için göster */}
                                            <button
                                                onClick={() => handleDeleteMatch(match.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Silme Onay Modalı */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eşleşmeyi Sil</h3>
                            <p className="text-sm text-gray-600">
                                Bu eşleşme isteğini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                İptal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Bildirimi */}
            {toast.show && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                    <div
                        className={`px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            } text-white max-w-md animate-fade-in-up`}
                    >
                        <div className="mr-3">
                            {toast.type === 'success' ? (
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <p>{toast.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchesPage; 