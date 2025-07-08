'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getDatabase, ref, onValue, push, set, remove, update, get } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { Conversation, Message } from '@/types/message';

interface MessageContextType {
    conversations: Conversation[];
    messages: { [key: string]: Message[] };
    loading: boolean;
    error: string | null;
    createMessage: (listingId: string, ownerId: string, content: string) => Promise<void>;
    sendMessage: (conversationId: string, content: string, petId?: string, imageUrl?: string, isRead?: boolean) => Promise<void>;
    acceptMessage: (messageCreatedAt: string, conversationId: string) => Promise<void>;
    rejectMessage: (messageCreatedAt: string, conversationId: string) => Promise<void>;
    deleteConversation: (conversationId: string) => Promise<void>;
    markMessageAsRead: (conversationId: string, messageId: string) => Promise<void>;
    deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    // Konuşmaları dinle
    useEffect(() => {
        if (!user) return;

        const db = getDatabase();
        const conversationsRef = ref(db, 'conversations');

        try {
            console.log("Konuşmalar yükleniyor...");

            const unsubscribe = onValue(conversationsRef, (snapshot) => {
                try {
                    const data = snapshot.val();
                    if (!data) {
                        console.log("Konuşma verisi bulunamadı");
                        setConversations([]);
                        setLoading(false);
                        return;
                    }

                    console.log("Konuşma verisi yüklendi, katılımcıları filtreleme yapılıyor");
                    const userConversations = Object.entries(data)
                        .filter(([_, conv]: [string, any]) => {
                            // Katılımcı kontrolü
                            return conv.participants &&
                                Array.isArray(conv.participants) &&
                                conv.participants.includes(user.uid);
                        })
                        .map(([id, conv]: [string, any]) => ({
                            id,
                            ...conv,
                            unreadCount: conv.unreadCount || 0,
                            status: conv.status || 'active'
                        }));

                    console.log(`${userConversations.length} konuşma bulundu`);
                    setConversations(userConversations);
                } catch (error) {
                    console.error("Konuşma verisi işlenirken hata:", error);
                } finally {
                    setLoading(false);
                }
            }, (error) => {
                console.error('Konuşmalar yüklenirken Firebase hatası:', error);
                setError('Konuşmalar yüklenirken bir hata oluştu: ' + error.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Konuşma dinleyicisi oluşturulurken hata:", error);
            setError('Konuşma verilerine erişilemiyor.');
            setLoading(false);
        }
    }, [user]);

    // Mesajları dinle
    useEffect(() => {
        if (!user || conversations.length === 0) return;

        const db = getDatabase();

        try {
            console.log("Mesajlar yükleniyor...");

            const unsubscribes = conversations.map(conversation => {
                const messagesRef = ref(db, `messages/${conversation.id}`);

                return onValue(messagesRef, (snapshot) => {
                    try {
                        const data = snapshot.val();
                        if (!data) {
                            console.log(`Konuşma ${conversation.id} için mesaj yok`);
                            setMessages(prev => ({ ...prev, [conversation.id]: [] }));
                            return;
                        }

                        const conversationMessages = Object.entries(data).map(([id, msg]: [string, any]) => ({
                            id,
                            ...msg,
                        }));

                        console.log(`Konuşma ${conversation.id} için ${conversationMessages.length} mesaj yüklendi`);
                        setMessages(prev => ({
                            ...prev,
                            [conversation.id]: conversationMessages
                        }));
                    } catch (messageError) {
                        console.error(`Mesajlar işlenirken hata (konuşma ${conversation.id}):`, messageError);
                    }
                }, (error) => {
                    console.error(`Mesajlar yüklenirken Firebase hatası (konuşma ${conversation.id}):`, error);
                });
            });

            return () => unsubscribes.forEach(unsubscribe => unsubscribe());
        } catch (error) {
            console.error("Mesaj dinleyicileri oluşturulurken hata:", error);
        }
    }, [user, conversations]);

    const createMessage = async (listingId: string, ownerId: string, content: string) => {
        if (!user) throw new Error('Kullanıcı girişi gerekli');

        const db = getDatabase();
        const conversationsRef = ref(db, 'conversations');
        const newConversationRef = push(conversationsRef);
        const conversationId = newConversationRef.key;

        if (!conversationId) throw new Error('Konuşma oluşturulamadı');

        // Kullanıcı ve ilan bilgilerini al
        const [senderSnapshot, receiverSnapshot, listingSnapshot] = await Promise.all([
            get(ref(db, `users/${user.uid}`)),
            get(ref(db, `users/${ownerId}`)),
            get(ref(db, `listings/${listingId}`))
        ]);

        const senderData = senderSnapshot.val();
        const receiverData = receiverSnapshot.val();
        const listingData = listingSnapshot.val();

        if (!listingData) {
            throw new Error('İlan bulunamadı');
        }

        const conversation = {
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            participants: [user.uid, ownerId],
            lastMessage: content,
            status: 'pending',
            unreadCount: 1,
            matchDetails: {
                petId: listingId,
                petName: listingData.petName || 'Bilinmeyen Hayvan',
                petType: listingData.petType || 'Bilinmeyen Tür',
                petPhoto: listingData.photos?.[0] || '',
                petAge: listingData.petAge || 'Bilinmeyen Yaş',
                petGender: listingData.petGender || 'Bilinmeyen Cinsiyet',
                breed: listingData.breed || 'Bilinmeyen Irk',
                senderId: user.uid,
                senderName: senderData?.displayName || 'Anonim',
                receiverId: ownerId,
                receiverName: receiverData?.displayName || 'Anonim'
            }
        };

        const messagesRef = ref(db, `messages/${conversationId}`);
        const newMessageRef = push(messagesRef);

        const message = {
            content,
            senderId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending'
        };

        try {
            await Promise.all([
                set(newConversationRef, conversation),
                set(newMessageRef, message)
            ]);
        } catch (error) {
            console.error('Mesaj oluşturma hatası:', error);
            throw error;
        }
    };

    const sendMessage = async (conversationId: string, content: string, petId?: string, imageUrl?: string, isRead?: boolean) => {
        if (!user) {
            toast.error('Mesaj göndermek için giriş yapmalısınız');
            return;
        }

        try {
            const db = getDatabase();
            const messageRef = ref(db, `messages/${conversationId}`);
            const newMessageRef = push(messageRef);
            const messageId = newMessageRef.key;

            if (!messageId) {
                throw new Error('Mesaj ID oluşturulamadı');
            }

            const message: Message = {
                id: messageId,
                conversationId,
                senderId: user.uid,
                content,
                petId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                isRead: isRead ?? false,
                readBy: {
                    [user.uid]: true
                },
                imageUrl // Fotoğraf varsa ekle, yoksa undefined olur
            };

            await set(newMessageRef, message);

            // Konuşma güncellemesi
            const conversationRef = ref(db, `conversations/${conversationId}`);

            // Diğer kullanıcıda okunmamış mesaj sayısını artır
            const conversationData = conversations.find(conv => conv.id === conversationId);
            if (conversationData) {
                // Diğer katılımcıyı bul
                const otherUserId = conversationData.participants.find(id => id !== user.uid);
                if (otherUserId) {
                    // unreadBy alanında her kullanıcının okunma durumunu yönetme
                    // Mevcut unreadBy nesnesini al veya yeni oluştur
                    const currentUnreadBy = conversationData.unreadBy || {};

                    // Gönderen kullanıcı (kendimiz) için false (okundu), 
                    // alıcı kullanıcı için true (okunmadı) olarak ayarla
                    const unreadBy = {
                        ...currentUnreadBy,
                        [user.uid]: false,    // Kendimiz için okunmuş
                        [otherUserId]: true   // Alıcı için okunmamış
                    };

                    const updates = {
                        lastMessage: content,
                        lastMessageAt: new Date().toISOString(),
                        unreadCount: (conversationData.unreadCount || 0) + 1, // Geriye dönük uyumluluk için
                        lastSenderId: user.uid,
                        lastPetId: petId,
                        unreadBy: unreadBy
                    };

                    await update(conversationRef, updates);
                }
            }

            toast.success('Mesaj gönderildi');
        } catch (error) {
            console.error('Mesaj gönderme hatası:', error);
            toast.error('Mesaj gönderilemedi');
        }
    };

    const acceptMessage = async (messageCreatedAt: string, conversationId: string) => {
        if (!user) throw new Error('Kullanıcı girişi gerekli');

        const db = getDatabase();
        const messagesRef = ref(db, `messages/${conversationId}`);
        const conversationRef = ref(db, `conversations/${conversationId}`);

        try {
            // İlgili mesajı bul
            const snapshot = await get(messagesRef);
            const messages = snapshot.val();
            const messageKey = Object.keys(messages).find(
                key => messages[key].createdAt === messageCreatedAt
            );

            if (!messageKey) {
                throw new Error('Mesaj bulunamadı');
            }

            // Mesajı güncelle
            await update(ref(db, `messages/${conversationId}/${messageKey}`), {
                status: 'active'
            });

            // Konuşmayı güncelle
            await update(conversationRef, {
                status: 'active',
                lastMessageAt: new Date().toISOString()
            });

            toast.success('Mesaj kabul edildi');
        } catch (error) {
            console.error('Mesaj kabul edilirken hata:', error);
            throw error;
        }
    };

    const rejectMessage = async (messageCreatedAt: string, conversationId: string) => {
        if (!user) throw new Error('Kullanıcı girişi gerekli');

        const db = getDatabase();
        const messagesRef = ref(db, `messages/${conversationId}`);
        const conversationRef = ref(db, `conversations/${conversationId}`);

        try {
            // İlgili mesajı bul
            const snapshot = await get(messagesRef);
            const messages = snapshot.val();
            const messageKey = Object.keys(messages).find(
                key => messages[key].createdAt === messageCreatedAt
            );

            if (!messageKey) {
                throw new Error('Mesaj bulunamadı');
            }

            // Mesajı güncelle
            await update(ref(db, `messages/${conversationId}/${messageKey}`), {
                status: 'rejected'
            });

            // Konuşmayı güncelle
            await update(conversationRef, {
                status: 'rejected'
            });

            toast.success('Mesaj reddedildi');
        } catch (error) {
            console.error('Mesaj reddedilirken hata:', error);
            throw error;
        }
    };

    const deleteConversation = async (conversationId: string) => {
        if (!user) throw new Error('Kullanıcı girişi gerekli');

        const db = getDatabase();
        const conversationRef = ref(db, `conversations/${conversationId}`);
        const messagesRef = ref(db, `messages/${conversationId}`);

        try {
            console.log(`Silme işlemi başlatılıyor: ${conversationId}`);

            // 1. Önce mesajları sil
            try {
                console.log("Mesajlar siliniyor...");
                await remove(messagesRef);
                console.log("Mesajlar başarıyla silindi");
            } catch (messageError) {
                console.error('Mesajlar silinirken hata:', messageError);
                toast.error('Mesajlar silinirken bir sorun oluştu. Yeniden deneyin.');
            }

            // 2. Sonra konuşmayı sil
            console.log("Konuşma siliniyor...");
            await remove(conversationRef);
            console.log("Konuşma başarıyla silindi");

            toast.success('Konuşma silindi');
        } catch (error) {
            console.error('Konuşma silinirken detaylı hata:', error);

            // Hata mesajını daha kullanışlı hale getir
            let errorMessage = 'Bilinmeyen bir hata oluştu';
            if (error instanceof Error) {
                errorMessage = error.message;
                // Firebase hatalarında genellikle error.code da olur
                if ('code' in error) {
                    const code = (error as any).code;
                    if (code === 'PERMISSION_DENIED') {
                        errorMessage = 'Bu işlem için izniniz yok. Güvenlik kuralları engelliyor olabilir.';
                    }
                }
            }

            toast.error(`Silme işlemi başarısız: ${errorMessage}`);
            throw error;
        }
    };

    const markMessageAsRead = async (conversationId: string, messageId: string) => {
        if (!user) return;

        const db = getDatabase();

        try {
            // 1. Mesajı okundu olarak işaretle
            if (messageId) {
                const messageRef = ref(db, `messages/${conversationId}/${messageId}`);
                const messageSnapshot = await get(messageRef);
                if (messageSnapshot.exists()) {
                    const messageData = messageSnapshot.val();
                    // Mevcut readBy değerini al veya yeni oluştur
                    const readBy = messageData.readBy || {};
                    // Kullanıcıyı ekle
                    readBy[user.uid] = true;

                    // readBy ve isRead (geriye dönük uyumluluk için) olarak güncelle
                    await update(messageRef, {
                        readBy,
                        isRead: true
                    });
                }
            }

            // 2. Konuşmadaki okunmamış mesaj sayısını sıfırla
            const conversationRef = ref(db, `conversations/${conversationId}`);
            await update(conversationRef, { unreadCount: 0 });

            // State'i güncelle
            setMessages(prevMessages => {
                // Eğer bu konuşma henüz state'te yoksa bir şey yapma
                if (!prevMessages[conversationId]) return prevMessages;

                // Konuşmadaki tüm mesajları güncelle
                const updatedMessages = prevMessages[conversationId].map(msg => {
                    // Kendi mesajlarımızı değil, sadece karşı tarafın mesajlarını işaretle
                    if (msg.id === messageId || msg.senderId !== user.uid) {
                        // readBy'ı güncelle veya oluştur
                        const newReadBy = { ...(msg.readBy || {}), [user.uid]: true };
                        return {
                            ...msg,
                            readBy: newReadBy,
                            isRead: true // Geriye dönük uyumluluk için
                        };
                    }
                    return msg;
                });

                return {
                    ...prevMessages,
                    [conversationId]: updatedMessages
                };
            });
        } catch (error) {
            console.error('Mesaj okuma hatası:', error);
        }
    };

    const deleteMessage = async (conversationId: string, messageId: string) => {
        if (!user) throw new Error('Kullanıcı girişi gerekli');

        const db = getDatabase();
        const messageRef = ref(db, `messages/${conversationId}/${messageId}`);

        try {
            // Mesaj verisini al
            const messageSnapshot = await get(messageRef);
            if (!messageSnapshot.exists()) {
                throw new Error('Mesaj bulunamadı');
            }

            const messageData = messageSnapshot.val();

            // Kullanıcının yetkisini kontrol et
            if (messageData.senderId !== user.uid) {
                throw new Error('Sadece kendi mesajlarınızı silebilirsiniz');
            }

            // Mesajı sil
            await remove(messageRef);

            // Mesaj listesini güncelle
            setMessages(prev => {
                const conversationMessages = [...(prev[conversationId] || [])];
                const updatedMessages = conversationMessages.filter(msg => msg.id !== messageId);
                return {
                    ...prev,
                    [conversationId]: updatedMessages
                };
            });

            // Eğer silinen mesaj son mesajsa, konuşma özetini güncelle
            const conversationRef = ref(db, `conversations/${conversationId}`);
            const conversationData = (await get(conversationRef)).val();

            if (conversationData && conversationData.lastMessage === messageData.content) {
                // Konuşmadaki diğer mesajları al
                const messagesSnapshot = await get(ref(db, `messages/${conversationId}`));
                const allMessages = messagesSnapshot.val() || {};

                // Kalan mesajları tarihe göre sırala
                const remainingMessages = Object.values(allMessages)
                    .filter((msg: any) => msg.id !== messageId)
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (remainingMessages.length > 0) {
                    // Kalan son mesajı konuşma özetine yaz
                    const lastMsg = remainingMessages[0] as any;
                    await update(conversationRef, {
                        lastMessage: lastMsg.content,
                        lastMessageAt: lastMsg.createdAt,
                        lastSenderId: lastMsg.senderId
                    });
                } else {
                    // Hiç mesaj kalmadıysa konuşma özetini temizle
                    await update(conversationRef, {
                        lastMessage: "(Mesaj silindi)",
                        lastMessageAt: new Date().toISOString()
                    });
                }
            }

            toast.success('Mesaj silindi');
        } catch (error) {
            console.error('Mesaj silinirken hata:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Mesaj silinemedi');
            }
            throw error;
        }
    };

    const value = {
        conversations,
        messages,
        loading,
        error,
        createMessage,
        sendMessage,
        acceptMessage,
        rejectMessage,
        deleteConversation,
        markMessageAsRead,
        deleteMessage
    };

    return (
        <MessageContext.Provider value={value}>
            {children}
        </MessageContext.Provider>
    );
}

export function useMessage() {
    const context = useContext(MessageContext);
    if (context === undefined) {
        throw new Error('useMessage must be used within a MessageProvider');
    }
    return context;
} 