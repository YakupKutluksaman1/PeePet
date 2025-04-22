'use client';

import { useParams } from 'next/navigation';
import { useMessage } from '@/context/MessageContext';
import { useAuth } from '@/context/AuthContext';
import { useListing } from '@/context/ListingContext';
import { useEffect, useState, useRef } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Conversation, Message } from '@/types/message';

// Geçici tip tanımı - Bu sayfaya özel dönüştürme için
interface DetailPageConversation extends Conversation {
    ownerId: string;
    interestedUserId: string;
    listingId: string;
}

export default function MessagePage() {
    const { id } = useParams();
    const { conversations, messages, sendMessage, acceptMessage, rejectMessage,
        deleteConversation, deleteMessage } = useMessage();
    const { user } = useAuth();
    const { listings } = useListing();
    const [messageContent, setMessageContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [usersData, setUsersData] = useState<{ [key: string]: any }>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const router = useRouter();

    // Tipleri detay sayfası için doğru şekilde dönüştürüyoruz
    const foundConversation = conversations.find(c => c.id === id);
    let conversation: DetailPageConversation | undefined;

    if (foundConversation && foundConversation.matchDetails) {
        // Konuşmayı bu sayfanın anladığı tipe dönüştür
        conversation = {
            ...foundConversation,
            ownerId: foundConversation.matchDetails.receiverId,
            interestedUserId: foundConversation.matchDetails.senderId,
            listingId: foundConversation.matchDetails.petId
        };
    }

    const listing = listings.find(l => conversation && l.id === conversation.listingId);
    const conversationMessages = messages[id as string] || [];

    // Kullanıcı verileri yükle
    useEffect(() => {
        if (!conversation || !user) return;

        const db = getDatabase();
        const userIds = [conversation.ownerId, conversation.interestedUserId];

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
    }, [conversation, user]);

    // Kullanıcı adını getir
    const getUserName = (userId: string) => {
        if (usersData[userId]) {
            if (usersData[userId].firstName && usersData[userId].lastName) {
                return `${usersData[userId].firstName} ${usersData[userId].lastName}`;
            } else if (usersData[userId].firstName) {
                return usersData[userId].firstName;
            } else if (usersData[userId].displayName) {
                return usersData[userId].displayName;
            }
        }

        return userId === user?.uid ? 'Siz' : 'Kullanıcı';
    };

    useEffect(() => {
        if (!conversation) {
            setError('Konuşma bulunamadı');
        }
    }, [conversation]);

    // Yeni mesaj geldiğinde en alta scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversationMessages]);

    const isOwner = user?.uid === conversation?.ownerId;

    const handleSendMessage = async () => {
        if (!messageContent.trim() || !id) return;

        try {
            await sendMessage(id as string, messageContent);
            setMessageContent('');
        } catch (error) {
            setError('Mesaj gönderilirken bir hata oluştu');
        }
    };

    const handleAcceptMessage = async (messageCreatedAt: string) => {
        try {
            await acceptMessage(messageCreatedAt, id as string);
        } catch (error) {
            setError('Mesaj kabul edilirken bir hata oluştu');
        }
    };

    const handleRejectMessage = async (messageCreatedAt: string) => {
        try {
            await rejectMessage(messageCreatedAt, id as string);
        } catch (error) {
            setError('Mesaj reddedilirken bir hata oluştu');
        }
    };

    const handleDeleteConversation = async () => {
        if (!conversation || !user) return;

        // Sadece ilan sahibi veya ilgilenen kullanıcı silebilir
        if (conversation.ownerId !== user.uid && conversation.interestedUserId !== user.uid) {
            toast.error('Bu işlem için yetkiniz yok');
            return;
        }

        // Kısıtlamayı kaldırıldı - Her iki kullanıcı da mesajları silebilir
        // if (conversation.interestedUserId === user.uid && conversation.status !== 'active') {
        //     toast.error('Sadece kabul edilmiş konuşmaları silebilirsiniz');
        //     return;
        // }

        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteConversation(id as string);
            toast.success('Konuşma silindi');
            router.push('/messages');
        } catch (error) {
            console.error('Konuşma silinirken hata:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Konuşma silinemedi');
            }
        } finally {
            setShowDeleteModal(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    const handleDeleteMessage = (messageId: string) => {
        if (!user) return;
        setMessageToDelete(messageId);
        setShowDeleteMessageModal(true);
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete || !id) return;

        try {
            await deleteMessage(id as string, messageToDelete);
            toast.success('Mesaj silindi');
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Mesaj silinemedi');
            }
        } finally {
            setMessageToDelete(null);
            setShowDeleteMessageModal(false);
        }
    };

    const cancelDeleteMessage = () => {
        setMessageToDelete(null);
        setShowDeleteMessageModal(false);
    };

    if (!conversation || !listing) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    {error || 'Konuşma bulunamadı'}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                    {/* Başlık */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {listing.title}
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    {listing.city}, {listing.district}
                                </p>
                                <div className="flex items-center mt-3 text-sm text-gray-600">
                                    <span className="font-medium">İletişimde olduğunuz kişi: </span>
                                    <span className="ml-1 text-indigo-600 font-semibold">
                                        {isOwner
                                            ? getUserName(conversation.interestedUserId)
                                            : getUserName(conversation.ownerId)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.push('/messages')}
                                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    Tüm Mesajlar
                                </button>
                                {/* Tüm kullanıcılar mesajları silebilir */}
                                <button
                                    onClick={handleDeleteConversation}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                    Konuşmayı Sil
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mesajlar */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                        {conversationMessages.map((message, index) => (
                            <div
                                key={`${message.createdAt}-${index}`}
                                className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg p-4 relative ${message.senderId === user?.uid
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                        } ${message.status === 'pending' ? 'border-2 border-yellow-500' : ''}`}
                                >
                                    {message.senderId === user?.uid && (
                                        <button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="absolute top-1 right-1 text-white opacity-60 hover:opacity-100 text-xs p-1 rounded-full transition-opacity"
                                            title="Mesajı Sil"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                    <p className="text-sm">{message.content}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {new Date(message.createdAt).toLocaleString('tr-TR')}
                                    </p>
                                    {message.status === 'pending' && isOwner && message.senderId !== user?.uid && (
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => handleAcceptMessage(message.createdAt)}
                                                className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                                            >
                                                Kabul Et
                                            </button>
                                            <button
                                                onClick={() => handleRejectMessage(message.createdAt)}
                                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                            >
                                                Reddet
                                            </button>
                                        </div>
                                    )}
                                    {message.status === 'pending' && !isOwner && (
                                        <p className="text-xs mt-1 text-yellow-600">
                                            Mesajınız onay bekliyor
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Mesaj Formu */}
                    {conversation.status === 'active' && (
                        <div className="p-6 border-t border-gray-200 bg-white/50">
                            <div className="flex gap-4">
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Mesajınızı yazın..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    rows={3}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageContent.trim()}
                                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed h-fit self-end"
                                >
                                    Gönder
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mesaj Silme Modal */}
            <AnimatePresence>
                {showDeleteMessageModal && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg p-6 w-full max-w-md"
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mesajı Sil</h3>
                            <p className="text-gray-600 mb-6">Bu mesajı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cancelDeleteMessage}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmDeleteMessage}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Sil
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Konuşma Silme Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg p-6 w-full max-w-md"
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Konuşmayı Sil</h3>
                            <p className="text-gray-600 mb-6">Bu konuşmayı silmek istediğinizden emin misiniz? Tüm mesajlarınız silinecek ve bu işlem geri alınamaz.</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cancelDelete}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Sil
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 