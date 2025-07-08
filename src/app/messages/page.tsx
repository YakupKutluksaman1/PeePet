'use client';

import { useAuth } from '@/context/AuthContext';
import { useMessage } from '@/context/MessageContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { getDatabase, ref, onValue, get, update } from 'firebase/database';
import { Message } from '@/types/message';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Message interface artık isRead alanını içerdiği için bu interface'e gerek kalmadı
// interface MessageWithReadStatus extends Message {
//     isRead: boolean;
// }

interface UserMatchDetail {
    petId?: string;
    petName?: string;
    petType?: string;
    petPhoto?: string;
    petAge?: string;
    petGender?: string;
    breed?: string;
    partnerId?: string;
    partnerName?: string;
    // matchDetails'tan aktarılan alanlar
    receiverId?: string;
    senderId?: string;
    senderName?: string;
    receiverName?: string;
    // Ek alanlar
    name?: string;
    profilePhoto?: string;
    photos?: string[];
    age?: string | number;
    gender?: string;
}

interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt?: string;
    status: 'pending' | 'active' | 'rejected';
    unreadCount?: number;
    matchDetails?: {
        petId: string;
        petName: string;
        petType: string;
        petPhoto: string;
        senderId: string;
        senderName: string;
        receiverId: string;
        receiverName: string;
        petAge: string;
        petGender: string;
        breed?: string;
    };
    userMatchDetails?: {
        [userId: string]: UserMatchDetail;
    };
    // Veritabanından gelen farklı bir yapı
    petInfo?: {
        [userId: string]: {
            name?: string;
            age?: string | number;
            breed?: string;
            gender?: string;
            type?: string;
            profilePhoto?: string;
            photos?: string[];
        }
    };
}

export default function MessagesPage() {
    const { user } = useAuth();
    const { conversations, messages: originalMessages, loading, error, sendMessage, acceptMessage, rejectMessage, deleteConversation } = useMessage();
    const router = useRouter();
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
    const [usersData, setUsersData] = useState<{ [key: string]: any }>({});
    // Veritabanından çekilen evcil hayvan verilerini tutacak state
    const [dbPetData, setDbPetData] = useState<{ [key: string]: any }>({});
    // Veritabanı sorguları için cache kullanarak performansı artırıyoruz
    const [fetchedUserIds, setFetchedUserIds] = useState<Set<string>>(new Set());
    // Bileşenin monte edilmiş olup olmadığını takip etmek için ref
    const mounted = useRef(false);
    // Okunma durumu ile birlikte mesajları tutan state
    const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
    // Fotoğraf gönderme için state
    const [imageFile, setImageFile] = useState<File | null>(null);
    // Fotoğraf yüklenirken butonu disable etmek için loading state
    const [sending, setSending] = useState(false);

    // Tip tanımlamaları
    interface PetData {
        petName?: string;
        petType?: string;
        petPhoto?: string;
        petAge?: string;
        petGender?: string;
        breed?: string;
        senderId?: string;
        receiverId?: string;
        [key: string]: any; // Dinamik erişim için indeks tanımlama
    }

    // Ortak fonksiyonlar
    // -------------------

    // Evcil hayvan bilgilerini standart formata dönüştürür
    const formatPetInfo = (petData: any, prefix = ''): PetData => {
        if (!petData) return {};

        // Alan isimlerini belirle (farklı veri modellerini ele almak için)
        const nameField = petData.petName || petData.name || '';
        const typeField = petData.petType || petData.type || petData.species || 'other';
        let photoField = petData.petPhoto || petData.profilePhoto || '';

        // Eğer photos dizisi varsa ve profilePhoto yoksa ilk fotoğrafı al
        if (!photoField && petData.photos && Array.isArray(petData.photos) && petData.photos.length > 0) {
            photoField = petData.photos[0];
        }

        const ageField = petData.petAge || (petData.age ? petData.age.toString() : '');
        const genderField = petData.petGender || petData.gender || '';
        const breedField = petData.breed || '';
        const petIdField = petData.petId || petData.id || '';

        // Eğer fields doğrudan petId içeriyor ve hayvan verileri içermiyorsa
        // Veritabanından ilgili hayvan bilgilerini getirmek gerekebilir

        return {
            petId: petIdField,
            petName: nameField || 'İsimsiz Hayvan',
            petType: typeField || 'other',
            petPhoto: photoField || undefined,
            petAge: ageField || '?',
            petGender: genderField || 'unknown',
            breed: breedField || 'Bilinmeyen',
            senderId: petData.senderId || '',
            receiverId: petData.receiverId || ''
        };
    };

    // Değerin varsayılan/geçersiz olup olmadığını kontrol eder
    const isDefaultValue = (value: any): boolean => {
        return !value ||
            value === 'İsimsiz Hayvan' ||
            value === 'Bilinmeyen Hayvan' ||
            value === 'Bilinmeyen' ||
            value === '?' ||
            value === 'other' ||
            value === 'unknown' ||
            (typeof value === 'string' && value.includes('placeholder'));
    };

    // Hayvan tipini görüntülenecek metne dönüştürür
    const getPetTypeText = (petType: string): string => {
        switch (petType) {
            case 'dog': return 'Köpek';
            case 'cat': return 'Kedi';
            case 'rabbit': return 'Tavşan';
            case 'bird': return 'Kuş';
            case 'hamster': return 'Hamster';
            case 'guinea-pig': return 'Guinea Pig';
            case 'ferret': return 'Gelincik';
            case 'turtle': return 'Kaplumbağa';
            case 'fish': return 'Balık';
            case 'snake': return 'Yılan';
            case 'lizard': return 'Kertenkele';
            case 'hedgehog': return 'Kirpi';
            case 'exotic': return 'Egzotik Hayvan';
            default: return 'Diğer';
        }
    };

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }
    }, [user, router]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedConversation]);

    // Kullanıcı verilerini yükle
    useEffect(() => {
        if (!user || conversations.length === 0) return;

        const db = getDatabase();
        const userIds = new Set<string>();

        // Konuşmalardaki tüm kullanıcı ID'lerini topla
        conversations.forEach(conv => {
            if (conv.matchDetails) {
                userIds.add(conv.matchDetails.senderId);
                userIds.add(conv.matchDetails.receiverId);
            }

            // Debug: Konuşma detaylarını konsola yazdır
            console.log('Konuşma detayları:', conv.id, {
                matchDetails: conv.matchDetails,
                userMatchDetails: conv.userMatchDetails
            });

            // Eksik bilgileri kontrol et
            if (user && conv.userMatchDetails && conv.userMatchDetails[user.uid]) {
                const userMatch = conv.userMatchDetails[user.uid];
                if (!userMatch.petName || !userMatch.petType || !userMatch.petPhoto) {
                    console.warn('Eksik evcil hayvan bilgileri tespit edildi:', userMatch);
                }
            }
        });

        // Her bir kullanıcının bilgilerini getir
        userIds.forEach(userId => {
            const userRef = ref(db, `users/${userId}`);

            onValue(userRef, (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    setUsersData(prev => ({
                        ...prev,
                        [userId]: userData
                    }));
                }
            });
        });
    }, [user, conversations]);

    // Kullanıcı adını getir
    const getUserName = (userId: string) => {
        if (usersData[userId]) {
            // Adı ve soyadı birleştir (varsa)
            if (usersData[userId].firstName && usersData[userId].lastName) {
                return `${usersData[userId].firstName} ${usersData[userId].lastName}`;
            } else if (usersData[userId].firstName) {
                return usersData[userId].firstName;
            } else if (usersData[userId].displayName) {
                return usersData[userId].displayName;
            }
        }

        // Veriler henüz yüklenmediyse veya kullanıcı bulunamadıysa
        return userId === user?.uid ? 'Siz' : 'Kullanıcı';
    };

    const getOtherParticipant = (conversation: Conversation) => {
        if (!conversation.participants) return null;
        return conversation.participants.find(id => id !== user?.uid);
    };

    const getMatchDetails = (conversation: Conversation) => {
        if (!conversation) {
            return {
                petName: 'İsimsiz Hayvan',
                petType: 'other',
                petPhoto: undefined,
                petAge: '?',
                petGender: 'unknown',
                breed: 'Bilinmeyen'
            };
        }

        // Karşı tarafın evcil hayvan bilgilerini aldığımız yardımcı fonksiyon
        const otherParticipantId = getOtherParticipant(conversation);

        // Tüm veri kaynaklarından bilgileri çekelim
        let matchDetailsData: PetData | null = null;
        let userMatchDetailsData: PetData | null = null;
        let petInfoData: PetData | null = null;

        // 1. matchDetails verileri (genellikle güvenilir ve temel bilgileri içerir)
        if (conversation.matchDetails) {
            matchDetailsData = formatPetInfo(conversation.matchDetails);
        }

        // 2. userMatchDetails verileri (kullanıcının kendi tarafındaki eşleşme bilgileri)
        if (user && conversation.userMatchDetails && conversation.userMatchDetails[user.uid]) {
            userMatchDetailsData = formatPetInfo(conversation.userMatchDetails[user.uid]);
        }

        // 3. petInfo verileri (yeni yapı, karşı tarafın hayvanı)
        if (otherParticipantId && conversation.petInfo && conversation.petInfo[otherParticipantId]) {
            const partnerPetInfo = conversation.petInfo[otherParticipantId];

            // petInfo'daki verilerin varsayılan değer olup olmadığını kontrol et
            const isDefaultName = isDefaultValue(partnerPetInfo.name);
            const isDefaultBreed = isDefaultValue(partnerPetInfo.breed);
            const isDefaultPhoto = isDefaultValue(partnerPetInfo.profilePhoto);
            const isDefaultAge = isDefaultValue(partnerPetInfo.age);

            // Eğer çoğunlukla varsayılan değerler varsa, bu veri kümesini düşük öncelikli yap
            const mostlyDefault = isDefaultName && isDefaultBreed && isDefaultPhoto && isDefaultAge;

            if (!mostlyDefault) {
                petInfoData = formatPetInfo(partnerPetInfo);
            }
        }

        // Veritabanından çekilen evcil hayvan bilgilerini kontrol et
        if (otherParticipantId && dbPetData[otherParticipantId]) {
            // dbPetData, petInfo'dan daha güvenilir olduğu için daha yüksek öncelikle ekleyelim
            if (!matchDetailsData) {
                matchDetailsData = dbPetData[otherParticipantId];
            } else {
                // Mevcut bilgileri dbPetData ile zenginleştir
                Object.keys(dbPetData[otherParticipantId]).forEach(key => {
                    if (dbPetData[otherParticipantId][key] && !isDefaultValue(dbPetData[otherParticipantId][key])) {
                        // matchDetailsData null değilse güvenli bir şekilde değeri atayalım
                        if (matchDetailsData) {
                            matchDetailsData[key] = dbPetData[otherParticipantId][key];
                        }
                    }
                });
            }
        } else if (otherParticipantId) {
            // Henüz veritabanından bilgi çekilmediyse, çekmeyi deneyelim
            fetchDetailedUserInfo(otherParticipantId);
        }

        // Bilgileri birleştirerek en iyi veri kümesini oluştur
        // Öncelik: 1) matchDetails 2) userMatchDetails 3) petInfo (eğer varsayılan değilse)
        const finalData: PetData = {
            // Varsayılan değerler
            petName: 'İsimsiz Hayvan',
            petType: 'other',
            petPhoto: undefined,
            petAge: undefined,
            petGender: undefined,
            breed: undefined
        };

        // matchDetails'daki bilgileri al (en güvenilir kaynak)
        if (matchDetailsData) {
            Object.keys(matchDetailsData).forEach(key => {
                if (matchDetailsData && matchDetailsData[key] && !isDefaultValue(matchDetailsData[key])) {
                    finalData[key] = matchDetailsData[key];
                }
            });
        }

        // userMatchDetails'daki eksik bilgileri doldur
        if (userMatchDetailsData) {
            Object.keys(userMatchDetailsData).forEach(key => {
                if (userMatchDetailsData && userMatchDetailsData[key] && !isDefaultValue(userMatchDetailsData[key]) && isDefaultValue(finalData[key])) {
                    finalData[key] = userMatchDetailsData[key];
                }
            });
        }

        // petInfo varsayılan değer değilse ve hala eksik bilgiler varsa, petInfo'dan doldur
        if (petInfoData) {
            Object.keys(petInfoData).forEach(key => {
                if (petInfoData && petInfoData[key] && !isDefaultValue(petInfoData[key]) && isDefaultValue(finalData[key])) {
                    finalData[key] = petInfoData[key];
                }
            });
        }

        return finalData;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !imageFile) return;
        if (!selectedConversation || !user) return;

        setSending(true);
        let imageUrl: string | undefined = undefined;

        try {
            // Eğer fotoğraf seçildiyse önce Storage'a yükle
            if (imageFile) {
                const fileName = `${user.uid}_${Date.now()}_${imageFile.name}`;
                const imgRef = storageRef(storage, `message-images/${fileName}`);
                await uploadBytes(imgRef, imageFile);
                imageUrl = await getDownloadURL(imgRef);
            }

            const conversation = conversations.find(c => c.id === selectedConversation);
            if (!conversation) return;

            // Mesajı gönderen kullanıcının evcil hayvan bilgisini al
            let petId = "";

            // userMatchDetails'dan evcil hayvan bilgisini almaya çalış
            if (conversation.userMatchDetails && conversation.userMatchDetails[user.uid]) {
                petId = conversation.userMatchDetails[user.uid].petId || "";
            }
            // Alternatif olarak petInfo'dan kontrol et
            else if (conversation.petInfo && conversation.petInfo[user.uid]) {
                const db = getDatabase();
                const userPetsRef = ref(db, `userPets/${user.uid}`);
                try {
                    const snapshot = await get(userPetsRef);
                    if (snapshot.exists()) {
                        const userPets = snapshot.val();
                        const activePetId = userPets.activePetId || Object.keys(userPets.pets)[0] || "";
                        petId = activePetId;
                    }
                } catch (error) {
                    console.error('Evcil hayvan bilgisi alınırken hata:', error);
                }
            }

            // Yeni mesajı alıcıya okunmamış olarak gönder
            await sendMessage(selectedConversation, newMessage, petId, imageUrl);
            setNewMessage('');
            setImageFile(null);
        } catch (error) {
            console.error('Mesaj gönderilirken hata:', error);
        } finally {
            setSending(false);
        }
    };

    const handleAcceptMessage = async (conversationId: string) => {
        try {
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) return;

            const firstMessage = originalMessages[conversationId]?.[0];
            if (!firstMessage) return;

            await acceptMessage(firstMessage.createdAt, conversationId);
            toast.success('Mesaj kabul edildi');
        } catch (error) {
            console.error('Mesaj kabul edilirken hata:', error);
            toast.error('Mesaj kabul edilemedi');
        }
    };

    const handleRejectMessage = async (conversationId: string) => {
        try {
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) return;

            const firstMessage = originalMessages[conversationId]?.[0];
            if (!firstMessage) return;

            await rejectMessage(firstMessage.createdAt, conversationId);
            toast.success('Mesaj reddedildi');
        } catch (error) {
            console.error('Mesaj reddedilirken hata:', error);
            toast.error('Mesaj reddedilemedi');
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (!user) return;
        const conversation = conversations.find(c => c.id === conversationId);

        if (!conversation) {
            toast.error('Konuşma bulunamadı');
            return;
        }

        // Eşleşmelerden veya ilanlardan gelen konuşmalar için güvenlik kontrolü
        // NOT: participants dizisinde kullanıcının olması yeterli olacak
        if (!conversation.participants || !conversation.participants.includes(user.uid)) {
            toast.error('Bu işlem için yetkiniz yok');
            return;
        }

        console.log("Silmeye çalışılan konuşma:", {
            id: conversationId,
            yapı: conversation
        });

        setConversationToDelete(conversationId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!conversationToDelete) return;

        try {
            await deleteConversation(conversationToDelete);
            setSelectedConversation(null);
            toast.success('Konuşma silindi');
        } catch (error) {
            console.error('Konuşma silinirken hata:', error);
            toast.error('Konuşma silinemedi');
        } finally {
            setShowDeleteModal(false);
            setConversationToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setConversationToDelete(null);
    };

    // Konuşma seçildiğinde
    useEffect(() => {
        if (selectedConversation) {
            const conversation = conversations.find(c => c.id === selectedConversation);
            if (conversation) {
                console.log('SEÇİLEN KONUŞMA DETAYLARI:', {
                    conversation,
                    matchDetails: conversation.matchDetails,
                    userMatchDetails: conversation.userMatchDetails,
                    petInfo: conversation.petInfo,
                    otherParticipant: getOtherParticipant(conversation)
                });

                // Konuşma kartı için kullanılan evcil hayvan bilgilerini görelim
                const otherParticipantId = getOtherParticipant(conversation);
                console.log('KARŞI TARAFIN ID\'si:', otherParticipantId);

                if (conversation.petInfo && otherParticipantId && conversation.petInfo[otherParticipantId]) {
                    console.log('KARŞI TARAFIN PET BİLGİLERİ (petInfo):', conversation.petInfo[otherParticipantId]);
                } else {
                    console.log('KARŞI TARAFIN PET BİLGİLERİ BULUNAMADI (petInfo alanında)');
                }

                // getMatchDetails fonksiyonunun sonucunu görelim
                console.log('getMatchDetails SONUCU:', getMatchDetails(conversation));

                // Karşı tarafın tüm bilgilerini detaylı konsola yazdır
                if (otherParticipantId) {
                    console.log('KARŞI TARAFIN TÜM BİLGİLERİ:');
                    // Firebase'den gelen kullanıcı bilgileri
                    console.log('Kullanıcı verileri:', usersData[otherParticipantId] || 'Veri bulunamadı');

                    // Evcil hayvan bilgileri
                    if (conversation.petInfo && conversation.petInfo[otherParticipantId]) {
                        console.log('Evcil hayvan bilgileri:', conversation.petInfo[otherParticipantId]);
                    }

                    // Eşleşme bilgileri
                    if (conversation.matchDetails) {
                        const isOtherSender = conversation.matchDetails.senderId === otherParticipantId;
                        console.log('Eşleşme bilgileri (matchDetails):', {
                            ...conversation.matchDetails,
                            role: isOtherSender ? 'Gönderen' : 'Alıcı'
                        });
                    }

                    // userMatchDetails içindeki karşı taraf bilgileri
                    if (conversation.userMatchDetails && conversation.userMatchDetails[otherParticipantId]) {
                        console.log('userMatchDetails içindeki bilgiler:', conversation.userMatchDetails[otherParticipantId]);
                    }

                    // Varsa mesajları
                    if (originalMessages[selectedConversation]) {
                        const otherUserMessages = originalMessages[selectedConversation].filter(msg => msg.senderId === otherParticipantId);
                        console.log('Gönderdiği mesaj sayısı:', otherUserMessages.length);
                        console.log('Son mesajı:', otherUserMessages.length > 0 ? otherUserMessages[otherUserMessages.length - 1] : 'Mesaj yok');
                    }

                    // VERİTABANINDAN DETAYLI BİLGİ ÇEKME
                    fetchDetailedUserInfo(otherParticipantId);
                }
            }
        }
    }, [selectedConversation, conversations]);

    // Bileşenin monte durumunu ayarla
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Kullanıcının ilişkili tüm bilgilerini veritabanından çeker
    const fetchDetailedUserInfo = (userId: string) => {
        if (!userId || !mounted.current) return;

        // Cache kontrolü: Bu kullanıcının bilgileri daha önce çekildiyse tekrar sorgu yapma
        if (fetchedUserIds.has(userId)) {
            return;
        }

        // Cache'e ekle
        setFetchedUserIds(prev => new Set(prev).add(userId));

        const db = getDatabase();

        // Sadece gerekli bilgileri çekelim

        // 1. Evcil hayvanları çek - en önemli bilgi
        const petsRef = ref(db, `pets`);
        get(petsRef).then((petsSnapshot) => {
            if (!mounted.current) return; // Bileşen unmount edildiyse işlemi durdur

            if (petsSnapshot.exists()) {
                const allPets = petsSnapshot.val();
                const userPets = Object.values(allPets)
                    .filter((pet: any) => pet.ownerId === userId);

                if (userPets.length > 0) {
                    const petData = userPets[0] as any; // İlk hayvanı alalım
                    const formattedPetData = formatPetInfo(petData);

                    // State'i güncelle
                    if (mounted.current) {
                        setDbPetData(prev => ({
                            ...prev,
                            [userId]: formattedPetData
                        }));
                    }

                    // Mevcut konuşmayı bul
                    const currentConversation = conversations.find(c => c.id === selectedConversation);
                    if (currentConversation) {
                        // petInfo alanını güncelle (eğer yoksa oluştur)
                        if (!currentConversation.petInfo) {
                            currentConversation.petInfo = {};
                        }

                        // Karşı tarafın hayvan bilgilerini petInfo formatında güncelle
                        const convertedData: Record<string, any> = {
                            name: petData.name,
                            type: petData.type || petData.species,
                            profilePhoto: petData.profilePhoto,
                            photos: petData.photos,
                            age: petData.age,
                            gender: petData.gender,
                            breed: petData.breed,
                            id: petData.id  // Hayvan ID'sini de ekleyelim
                        };

                        // Null/undefined değerleri temizle
                        Object.keys(convertedData).forEach(key => {
                            if (convertedData[key] === undefined || convertedData[key] === null) {
                                delete convertedData[key];
                            }
                        });

                        currentConversation.petInfo[userId] = convertedData;
                    }
                }
            }
        }).catch(error => {
            console.error('Evcil hayvan bilgileri çekilirken hata:', error);
        });

        // 2. Yalnızca kullanıcı verilerini getirme
        const userRef = ref(db, `users/${userId}`);
        get(userRef).then((userSnapshot) => {
            if (!mounted.current) return; // Bileşen unmount edildiyse işlemi durdur

            if (userSnapshot.exists()) {
                setUsersData(prev => ({
                    ...prev,
                    [userId]: userSnapshot.val()
                }));
            }
        }).catch(error => {
            console.error('Kullanıcı bilgileri çekilirken hata:', error);
        });
    };

    // Mesajları okundu olarak işaretleyen fonksiyon
    const markMessagesAsRead = async (conversationId: string) => {
        if (!user || !conversationId || !originalMessages[conversationId]) return;

        const db = getDatabase();
        const conversationRef = ref(db, `conversations/${conversationId}`);

        try {
            // Sadece mevcut kullanıcı için okundu olarak işaretle
            const conversationSnapshot = await get(conversationRef);
            if (conversationSnapshot.exists()) {
                const conversationData = conversationSnapshot.val();
                const currentUnreadBy = conversationData.unreadBy || {};

                // Sadece mevcut kullanıcının okunma durumunu false (okundu) olarak güncelle
                // diğer kullanıcıların durumlarını değiştirme
                await update(conversationRef, {
                    unreadBy: {
                        ...currentUnreadBy,
                        [user.uid]: false
                    },
                    // Geriye dönük uyumluluk için unreadCount'u güncelle
                    // Artık buna pek ihtiyacımız yok ama eski kodları bozmamak için tutuyoruz
                    unreadCount: 0
                });
            }

            // Karşı tarafın gönderdiği tüm mesajları okundu olarak işaretle
            const updatedMessages = originalMessages[conversationId].map(msg => {
                // Sadece karşı tarafın mesajlarını işaretle (kendi mesajlarımızı değil)
                if (msg.senderId !== user.uid) {
                    // readBy alanını al veya oluştur
                    const readBy = { ...(msg.readBy || {}) };
                    // Mesajı okuyan kullanıcı olarak ekle
                    readBy[user.uid] = true;

                    // Firebase'de mesajı güncelle
                    const messageRef = ref(db, `messages/${conversationId}/${msg.id}`);
                    update(messageRef, {
                        readBy,
                        isRead: true // Geriye dönük uyumluluk için
                    }).catch(err =>
                        console.error('Mesaj okundu işaretlenirken hata:', err)
                    );

                    return { ...msg, readBy, isRead: true } as Message;
                }

                // Kendi mesajlarımıza dokunma
                return msg;
            });

            // State'i güncelle
            setMessages(prev => ({
                ...prev,
                [conversationId]: updatedMessages
            }));

        } catch (error) {
            console.error('Mesajlar okundu işaretlenirken hata:', error);
        }
    };

    // Seçili konuşma değiştiğinde mesajları okundu olarak işaretle
    useEffect(() => {
        if (selectedConversation && user) {
            markMessagesAsRead(selectedConversation);
        }
    }, [selectedConversation, user]);

    // Mesajlar değiştiğinde, okunma durumunu takip eden state'i güncelle
    useEffect(() => {
        if (!originalMessages) return;

        const messagesWithReadStatus: { [key: string]: Message[] } = {};

        Object.keys(originalMessages).forEach(convId => {
            messagesWithReadStatus[convId] = originalMessages[convId].map(msg => ({
                ...msg,
                isRead: msg.isRead ?? false
            })) as Message[];
        });

        setMessages(messagesWithReadStatus);
    }, [originalMessages]);

    // Okunmamış mesaj sayısını hesaplama fonksiyonu
    const getUnreadMessageCount = (conversationId: string): number => {
        if (!user || !originalMessages[conversationId]) return 0;

        // Karşı tarafın gönderdiği ve bizim henüz okumadığımız mesajları say
        return originalMessages[conversationId].filter(msg => {
            // Bizim mesajımız değilse 
            const isNotOurMessage = msg.senderId !== user.uid;
            // Mesajın okunmadığını kontrol et
            let isUnread = false;

            if (isNotOurMessage) {
                if (msg.readBy) {
                    // readBy alanı varsa, bizim ID'miz yoksa veya false ise okunmamış demektir
                    isUnread = !msg.readBy[user.uid];
                } else if (msg.isRead !== undefined) {
                    // Eğer readBy yoksa ama isRead değeri varsa, o değere göre belirle
                    isUnread = !msg.isRead;
                } else {
                    // Eğer mesaj konuşmanın ilk mesajıysa ve readBy/isRead yoksa,
                    // bu genellikle ilan üzerinden gelen ilk mesajdır, okunmuş kabul et
                    const isFirstMessage = originalMessages[conversationId][0]?.id === msg.id ||
                        originalMessages[conversationId][0]?.createdAt === msg.createdAt;
                    isUnread = !isFirstMessage;
                }
            }

            return isNotOurMessage && isUnread;
        }).length;
    };

    // Tüm konuşmalardaki toplam okunmamış mesaj sayısını hesapla
    const getTotalUnreadMessageCount = (): number => {
        if (!user || !conversations || conversations.length === 0) return 0;

        let totalUnread = 0;

        // Aktif ve UI'da gösterilen konuşmaları filtrele
        const activeConversations = conversations.filter(conv =>
            // Aktif konuşmaları seç
            conv.status === 'active' &&
            // Ve UI'da gösterilen konuşmaları seç (görüntülenen konuşmaları belirle)
            (
                // Burada ek kontroller ekleyebiliriz, örneğin:
                // Son mesaj varsa veya unreadCount > 0 ise
                conv.lastMessage !== undefined || (conv.unreadCount || 0) > 0
            )
        );

        // Her aktif ve görüntülenen konuşma için okunmamış mesaj sayılarını topla
        activeConversations.forEach(conversation => {
            const unreadCount = getUnreadMessageCount(conversation.id);

            // Konuşmanın karşı tarafı kimse önemli bilgileri logla
            const otherParticipant = conversation.participants?.find(id => id !== user?.uid);
            console.log(`Konuşma: ${conversation.id}, Kullanıcı: ${otherParticipant || 'bilinmiyor'}, Okunmamış: ${unreadCount}`);

            // Bu konuşmada karşı taraf mesaj göndermişse sayıyı ekle
            if (unreadCount > 0) {
                totalUnread += unreadCount;
            }
        });

        console.log(`Toplam okunmamış mesaj: ${totalUnread}`);
        return totalUnread;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Mesajlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 flex items-center justify-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    {error}
                </div>
            </div>
        );
    }

    const conversation = conversations.find(c => c.id === selectedConversation);
    const isOwner = conversation?.matchDetails?.senderId === user?.uid;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 backdrop-blur-3xl" />
                <div className="absolute -right-64 -top-64 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -left-64 -bottom-64 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-8rem)]">
                        {/* Konuşma Listesi */}
                        <div className={`flex flex-col h-full border-r border-gray-200/50 backdrop-blur-lg bg-white/50 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            {/* Başlık - Sabit */}
                            <div className="flex-shrink-0 p-6 border-b border-gray-200/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => router.back()}
                                        className="text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        Mesajlar
                                        {/* Toplam okunmamış mesaj sayısı */}
                                        {getTotalUnreadMessageCount() > 0 && (
                                            <span className="ml-2 inline-block bg-indigo-500 text-white text-sm px-2 py-0.5 rounded-full">
                                                {getTotalUnreadMessageCount()}
                                            </span>
                                        )}
                                    </h2>
                                </div>
                            </div>

                            {/* Konuşmalar - Scrollable */}
                            <div className="flex-1 overflow-y-auto min-h-0 relative">
                                <div className="absolute inset-0 overflow-y-auto">
                                    <div className="divide-y divide-gray-200/50">
                                        <AnimatePresence>
                                            {conversations.length === 0 ? (
                                                <motion.div
                                                    key="no-messages"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="p-6 text-center text-gray-500"
                                                >
                                                    <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                                                        💬
                                                    </div>
                                                    Henüz mesajınız yok
                                                </motion.div>
                                            ) : (
                                                <>
                                                    {/* Bekleyen Mesajlar */}
                                                    <div className="p-4 bg-yellow-50">
                                                        <h3 className="text-lg font-medium text-gray-700 mb-3">Bekleyen Mesajlar</h3>
                                                        {conversations
                                                            .filter(conv => conv.status === 'pending')
                                                            // Son mesaj tarihine göre sırala (en son mesaj en üstte)
                                                            .sort((a, b) => {
                                                                // lastMessageAt yoksa createdAt veya başka bir tarih alanı kullan
                                                                const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                                                                const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                                                                return dateB - dateA; // Azalan sırayla (en son tarih en üstte)
                                                            })
                                                            .map(conversation => {
                                                                // Alıcı olmak, mesajı almak demektir
                                                                const matchDetails = getMatchDetails(conversation);
                                                                const isOwner = matchDetails?.receiverId === user?.uid;

                                                                if (!isOwner) return null;

                                                                // Karşı tarafın (gönderenin) bilgilerini al
                                                                let petDetails = null;
                                                                const senderId = matchDetails?.senderId;

                                                                if (senderId && conversation.petInfo && conversation.petInfo[senderId]) {
                                                                    const senderPetInfo = conversation.petInfo[senderId];
                                                                    petDetails = {
                                                                        petName: senderPetInfo.name || 'İsimsiz Hayvan',
                                                                        petType: senderPetInfo.type || 'other',
                                                                        petPhoto: senderPetInfo.profilePhoto ||
                                                                            (senderPetInfo.photos && senderPetInfo.photos.length > 0 ? senderPetInfo.photos[0] : undefined),
                                                                        petAge: senderPetInfo.age?.toString() || '?',
                                                                        petGender: senderPetInfo.gender || 'unknown',
                                                                        breed: senderPetInfo.breed
                                                                    };
                                                                } else {
                                                                    // Eğer petInfo'da bulamazsak matchDetails'ı kullan
                                                                    petDetails = matchDetails;
                                                                }

                                                                if (!petDetails) return null;

                                                                return (
                                                                    <motion.div
                                                                        key={`pending-${conversation.id}`}
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="bg-white border border-yellow-200 rounded-lg p-4 mb-3"
                                                                    >
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            {petDetails.petPhoto && (
                                                                                <img
                                                                                    src={petDetails.petPhoto}
                                                                                    alt={petDetails.petName}
                                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                                />
                                                                            )}
                                                                            <div>
                                                                                <p className="font-medium">{petDetails.petName}</p>
                                                                                <p className="text-sm text-gray-600">
                                                                                    {getUserName(matchDetails?.senderId || '')} tarafından
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-sm text-gray-600 mb-3">
                                                                            {conversation.lastMessage}
                                                                        </p>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleAcceptMessage(conversation.id)}
                                                                                className="flex-1 bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition-colors"
                                                                            >
                                                                                Kabul Et
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectMessage(conversation.id)}
                                                                                className="flex-1 bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 transition-colors"
                                                                            >
                                                                                Reddet
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                    </div>

                                                    {/* Aktif Konuşmalar */}
                                                    <div className="p-4">
                                                        <h3 className="text-lg font-medium text-gray-700 mb-3">Aktif Konuşmalar</h3>
                                                        {conversations
                                                            .filter(conv => conv.status === 'active')
                                                            // Son mesaj tarihine göre sırala (en son mesaj en üstte)
                                                            .sort((a, b) => {
                                                                // lastMessageAt yoksa createdAt kullan
                                                                const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                                                                const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                                                                return dateB - dateA; // Azalan sırayla (en son tarih en üstte)
                                                            })
                                                            .map(conversation => {
                                                                const otherParticipant = getOtherParticipant(conversation);

                                                                // Karşı tarafın evcil hayvan bilgilerini çek
                                                                // Önce petInfo alanına bakıyoruz
                                                                let petDetails = null;

                                                                if (otherParticipant && conversation.petInfo && conversation.petInfo[otherParticipant]) {
                                                                    const partnerPetInfo = conversation.petInfo[otherParticipant];
                                                                    petDetails = {
                                                                        petName: partnerPetInfo.name || 'İsimsiz Hayvan',
                                                                        petType: partnerPetInfo.type || 'other',
                                                                        petPhoto: partnerPetInfo.profilePhoto ||
                                                                            (partnerPetInfo.photos && partnerPetInfo.photos.length > 0 ? partnerPetInfo.photos[0] : undefined),
                                                                        petAge: partnerPetInfo.age?.toString() || '?',
                                                                        petGender: partnerPetInfo.gender || 'unknown',
                                                                        breed: partnerPetInfo.breed
                                                                    };
                                                                } else {
                                                                    // Eğer petInfo'da bulunamazsa matchDetails veya userMatchDetails'a bak
                                                                    petDetails = getMatchDetails(conversation);
                                                                }

                                                                if (!otherParticipant || !petDetails) return null;

                                                                // Okunmamış mesaj var mı kontrolü - mevcut kullanıcıya göre
                                                                const hasUnreadMessages = user?.uid && conversation.unreadBy ?
                                                                    conversation.unreadBy[user.uid] === true :
                                                                    (conversation.unreadCount && conversation.unreadCount > 0);

                                                                return (
                                                                    <motion.div
                                                                        key={`active-${conversation.id}`}
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className={`p-4 cursor-pointer transition-all duration-200 
                                                                            hover:bg-white/80 
                                                                            active:bg-white/90 
                                                                            hover:shadow-md 
                                                                            active:shadow-lg 
                                                                            hover:scale-[1.01] 
                                                                            active:scale-[0.99]
                                                                            ${selectedConversation === conversation.id
                                                                                ? 'bg-white shadow-md'
                                                                                : ''
                                                                            }
                                                                            ${hasUnreadMessages ? 'border-l-4 border-indigo-500' : ''}
                                                                        `}
                                                                        onClick={() => setSelectedConversation(conversation.id)}
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="relative">
                                                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                                                                                    {petDetails.petPhoto ? (
                                                                                        <img
                                                                                            src={petDetails.petPhoto}
                                                                                            alt={petDetails.petName}
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                                            🐾
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {/* Okunmadı Göstergesi */}
                                                                                {hasUnreadMessages && (
                                                                                    <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                                                                        {getUnreadMessageCount(conversation.id)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className="font-semibold text-gray-900">
                                                                                        {petDetails.petName}
                                                                                    </p>
                                                                                    {/* Okunma Durumu */}
                                                                                    {hasUnreadMessages ? (
                                                                                        <span className="text-xs font-medium text-indigo-600">
                                                                                            Okunmadı
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-xs font-medium text-gray-400">
                                                                                            Okundu
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm text-gray-500 mt-1">
                                                                                    {petDetails.petType === 'dog' ? 'Köpek' :
                                                                                        petDetails.petType === 'cat' ? 'Kedi' :
                                                                                            petDetails.petType === 'rabbit' ? 'Tavşan' :
                                                                                                petDetails.petType === 'bird' ? 'Kuş' : 'Diğer'}
                                                                                    {petDetails.breed ? ` - ${petDetails.breed}` : ''}
                                                                                </p>
                                                                                <p className="text-sm text-gray-500 mt-1">
                                                                                    {conversation.lastMessage}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                    </div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mesaj İçeriği */}
                        <div className={`md:col-span-2 flex flex-col h-full bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-lg ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
                            {selectedConversation ? (
                                <div className="flex flex-col h-full">
                                    {/* Başlık - Sabit Üst Kısım */}
                                    <div className="flex-shrink-0 p-6 border-b border-gray-200/50 flex justify-between items-center backdrop-blur-sm bg-white/50">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setSelectedConversation(null)}
                                                className="md:hidden text-gray-600 hover:text-gray-900 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                </svg>
                                            </button>
                                            <div className="flex items-center gap-4">
                                                {(() => {
                                                    if (!conversation) return null;

                                                    // Konuştuğumuz kişinin ID'sini al
                                                    const otherParticipant = getOtherParticipant(conversation);
                                                    if (!otherParticipant) return null;

                                                    // Doğru evcil hayvan bilgilerini çek
                                                    // Birleştirilmiş getMatchDetails fonksiyonunu kullanalım
                                                    const petInfo = getMatchDetails(conversation);

                                                    if (!petInfo) return null;

                                                    // Değerleri alalım
                                                    const petName = petInfo.petName || 'İsimsiz Hayvan';
                                                    const petType = petInfo.petType || 'other';
                                                    const petPhoto = petInfo.petPhoto;
                                                    const petAge = petInfo.petAge;
                                                    const petGender = petInfo.petGender;
                                                    const breed = petInfo.breed;

                                                    return (
                                                        <>
                                                            {petPhoto ? (
                                                                <img
                                                                    src={petPhoto}
                                                                    alt={petName}
                                                                    className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-200"
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-indigo-200">
                                                                    <span className="text-2xl">🐾</span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h3 className="text-xl font-semibold text-gray-900">
                                                                    {petName}
                                                                </h3>
                                                                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                                                                    {petType && (
                                                                        <>
                                                                            <span>
                                                                                {getPetTypeText(petType)}
                                                                            </span>
                                                                            {(petAge || petGender || breed) && <span>•</span>}
                                                                        </>
                                                                    )}
                                                                    {petAge && (
                                                                        <>
                                                                            <span>
                                                                                {petAge} yaşında
                                                                            </span>
                                                                            {(petGender || breed) && <span>•</span>}
                                                                        </>
                                                                    )}
                                                                    {petGender && (
                                                                        <>
                                                                            <span>
                                                                                {petGender === 'male' ? 'Erkek' : 'Dişi'}
                                                                            </span>
                                                                            {breed && <span>•</span>}
                                                                        </>
                                                                    )}
                                                                    {breed && (
                                                                        <span>
                                                                            {breed}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-500 mt-1">
                                                                    {otherParticipant ? getUserName(otherParticipant) : 'Kullanıcı'} ile konuşuyorsunuz
                                                                </p>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteConversation(selectedConversation)}
                                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                        >
                                            Konuşmayı Sil
                                        </button>
                                    </div>

                                    {/* Mesajlar Alanı - Scrollable */}
                                    <div className="flex-1 overflow-y-auto min-h-0 relative">
                                        <div className="absolute inset-0 overflow-y-auto">
                                            <div className="p-6 space-y-4">
                                                <AnimatePresence>
                                                    {messages[selectedConversation] && messages[selectedConversation].sort((a, b) =>
                                                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                                                    ).map((message, index) => {
                                                        // Mesaja ait evcil hayvan bilgilerini alalım
                                                        const isPetIdAvailable = message.petId && message.petId.length > 0;

                                                        // Evcil hayvan bilgilerini göstermek için gerekli verileri bulalım
                                                        let petInfo = null;
                                                        if (isPetIdAvailable && conversation?.petInfo) {
                                                            // Eğer bu mesajın evcil hayvan ID'si varsa ve petInfo verisi mevcutsa
                                                            const userId = message.senderId;
                                                            if (userId && conversation.petInfo[userId]) {
                                                                petInfo = conversation.petInfo[userId];
                                                            }
                                                        }

                                                        // Mesajın bize ait olup olmadığı
                                                        const isOwnMessage = message.senderId === user?.uid;

                                                        // Okundu işareti gösterilip gösterilmeyeceği - sadece kendi gönderdiğimiz mesajlar için gösterilmeli
                                                        // ve karşı taraf okumuşsa gösterilmeli
                                                        const shouldShowReadStatus = isOwnMessage && message.readBy && Object.keys(message.readBy).some(id =>
                                                            id !== user?.uid && message.readBy![id] === true
                                                        );

                                                        return (
                                                            <motion.div
                                                                key={`message-${selectedConversation}-${message.createdAt}-${index}`}
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                            >
                                                                <div
                                                                    className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage
                                                                        ? 'bg-indigo-500 text-white'
                                                                        : 'bg-gray-100 text-gray-900'
                                                                        }`}
                                                                >
                                                                    {/* Evcil hayvan bilgisi gösterimi */}
                                                                    {isPetIdAvailable && petInfo && (
                                                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/30">
                                                                            {petInfo.profilePhoto && (
                                                                                <img
                                                                                    src={petInfo.profilePhoto}
                                                                                    alt={petInfo.name || 'Evcil Hayvan'}
                                                                                    className="w-6 h-6 rounded-full object-cover"
                                                                                />
                                                                            )}
                                                                            <span className={`text-xs ${isOwnMessage ? 'text-white/80' : 'text-gray-600'}`}>
                                                                                {petInfo.name || 'Evcil Hayvan'} adına
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {/* Fotoğraf mesajı */}
                                                                    {message.imageUrl && (
                                                                        <div className="mb-2">
                                                                            <img
                                                                                src={message.imageUrl}
                                                                                alt="Gönderilen fotoğraf"
                                                                                className="max-h-48 rounded-lg border border-gray-200 object-contain"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <p className="text-sm">{message.content}</p>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <p className="text-xs opacity-70">
                                                                            {message.createdAt
                                                                                ? new Date(message.createdAt).toLocaleString('tr-TR', {
                                                                                    day: 'numeric',
                                                                                    month: 'long',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })
                                                                                : 'Yeni mesaj'}
                                                                        </p>
                                                                        {/* Okundu işareti */}
                                                                        {shouldShowReadStatus && (
                                                                            <span className="ml-2 text-xs opacity-70 flex items-center">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                </svg>
                                                                                Okundu
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )
                                                    })}
                                                </AnimatePresence>
                                                <div ref={messagesEndRef} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mesaj Formu - Sabit Alt Kısım */}
                                    {conversation?.status === 'active' && (
                                        <div className="flex-shrink-0 p-6 border-t border-gray-200/50 backdrop-blur-sm bg-white/50">
                                            <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Mesajınızı yazın..."
                                                    className="flex-1 px-6 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                                />
                                                {/* Fotoğraf seçme alanı */}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setImageFile(e.target.files[0]);
                                                        } else {
                                                            setImageFile(null);
                                                        }
                                                    }}
                                                    className="block w-32 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={sending || (!newMessage.trim() && !imageFile)}
                                                >
                                                    Gönder
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
                                            💬
                                        </div>
                                        <p className="text-gray-500 text-lg">Bir konuşma seçin</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Silme Onay Modalı */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                    >
                        <div className="text-center mb-6">
                            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Konuşmayı Sil</h3>
                            <p className="text-gray-600">Bu konuşmayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-all duration-200"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200"
                            >
                                Sil
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
} 