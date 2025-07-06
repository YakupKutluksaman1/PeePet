'use client';

import { useParams } from 'next/navigation';
import { useListing } from '@/context/ListingContext';
import { useAuth } from '@/context/AuthContext';
import { useMessage } from '@/context/MessageContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ListingDetailPage() {
    const { id } = useParams();
    const { listings, deleteListing } = useListing();
    const { user } = useAuth();
    const { createMessage, conversations } = useMessage();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageContent, setMessageContent] = useState('');
    const [showMessageForm, setShowMessageForm] = useState(false);
    const [hasSentMessage, setHasSentMessage] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const listing = listings.find(l => l.id === id);

    useEffect(() => {
        if (!listing && id) {
            setError('İlan bulunamadı');
            setLoading(false);
        } else if (listing) {
            setLoading(false);
        }
    }, [listing, id]);

    useEffect(() => {
        if (listing && user) {
            const existingConversation = conversations.find(
                conv => conv.matchDetails?.petId === listing.id && conv.matchDetails?.senderId === user.uid
            );
            setHasSentMessage(!!existingConversation);
        }
    }, [listing, user, conversations]);

    const handleDelete = async () => {
        if (!id) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!id) return;

        setIsDeleting(true);
        setError(null);

        try {
            await deleteListing(id as string);
            toast.success('İlanınız başarıyla silindi');
            router.push('/listings');
        } catch (error) {
            setError('İlan silinirken bir hata oluştu');
            toast.error('İlan silinirken bir hata oluştu');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    const handleSendMessage = async () => {
        if (!user) {
            router.push('/auth');
            return;
        }

        if (!listing) {
            toast.error('İlan bilgisi bulunamadı');
            return;
        }

        if (!messageContent.trim()) {
            toast.error('Lütfen bir mesaj yazın');
            return;
        }

        try {
            await createMessage(listing.id, listing.ownerId, messageContent);
            setMessageContent('');
            setHasSentMessage(true);
            setShowMessageForm(false);
            toast.success('Mesajınız başarıyla gönderildi! İlan sahibinin onayı bekleniyor.', {
                duration: 3000,
                icon: '💬',
                style: {
                    background: '#4F46E5',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Mesaj gönderilirken hata:', error);
            toast.error('Mesaj gönderilemedi');
        }
    };

    if (loading) {
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
                    {error}
                </div>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded relative">
                    İlan bulunamadı
                </div>
            </div>
        );
    }

    const isOwner = user?.uid === listing.ownerId;
    const existingConversation = conversations.find(c => c.matchDetails?.petId === listing.id);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 relative overflow-hidden">
            <Toaster position="top-right" />
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-70" />
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    {/* Fotoğraf Galerisi */}
                    {listing.photos && listing.photos.length > 0 && (
                        <div className="aspect-w-16 aspect-h-9 relative group">
                            <img
                                src={listing.photos[0]}
                                alt={listing.title}
                                className="object-cover w-full h-96 transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    )}

                    <div className="p-8">
                        {/* Geri Butonu */}
                        <div className="mb-6">
                            <button
                                onClick={() => router.push('/listings')}
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                                aria-label="Geri dön"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>İlanlar sayfasına dön</span>
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-3 flex items-center gap-3">
                                    {listing.title}
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-2xl mr-3">
                                        {listing.petType === 'dog' ? '🐕' :
                                            listing.petType === 'cat' ? '🐈' :
                                                listing.petType === 'rabbit' ? '🐇' :
                                                    listing.petType === 'bird' ? '🦜' :
                                                        listing.petType === 'hamster' ? '🐹' :
                                                            listing.petType === 'guinea-pig' ? '🐹' :
                                                                listing.petType === 'ferret' ? '🐾' :
                                                                    listing.petType === 'turtle' ? '🐢' :
                                                                        listing.petType === 'fish' ? '🐠' :
                                                                            listing.petType === 'snake' ? '🐍' :
                                                                                listing.petType === 'lizard' ? '🦎' :
                                                                                    listing.petType === 'hedgehog' ? '🦔' :
                                                                                        listing.petType === 'exotic' ? '🦓' : '🐾'}
                                    </div>
                                </h1>
                                <p className="text-gray-500 flex items-center gap-2">
                                    <span className="text-xl">📍</span>
                                    {listing.city}, {listing.district}
                                </p>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                listing.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {listing.status === 'active' ? '🟢 Aktif' :
                                    listing.status === 'inactive' ? '🟡 Pasif' :
                                        '⚫ Sahiplendirildi'}
                            </span>
                        </div>

                        {/* Evcil Hayvan Bilgileri */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl mb-8 border border-indigo-100 shadow-sm">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🐾</span>
                                Dostumuzun Bilgileri
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {listing.petName && (
                                    <div className="bg-white/70 p-3 rounded-lg flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <span className="text-lg">📛</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">İsim</p>
                                            <p className="font-medium text-gray-900">{listing.petName}</p>
                                        </div>
                                    </div>
                                )}
                                {listing.petAge && (
                                    <div className="bg-white/70 p-3 rounded-lg flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <span className="text-lg">🗓️</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Yaş</p>
                                            <p className="font-medium text-gray-900">{listing.petAge}</p>
                                        </div>
                                    </div>
                                )}
                                {listing.petGender && (
                                    <div className="bg-white/70 p-3 rounded-lg flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <span className="text-lg">{listing.petGender === 'male' ? '♂️' : '♀️'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Cinsiyet</p>
                                            <p className="font-medium text-gray-900">{listing.petGender === 'male' ? 'Erkek' : 'Dişi'}</p>
                                        </div>
                                    </div>
                                )}
                                {listing.breed && (
                                    <div className="bg-white/70 p-3 rounded-lg flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <span className="text-lg">🧬</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Irk</p>
                                            <p className="font-medium text-gray-900">{listing.breed}</p>
                                        </div>
                                    </div>
                                )}
                                {listing.petType && (
                                    <div className="flex items-center mb-4">
                                        <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center mr-2">
                                            <span className="mr-1">
                                                {listing.petType === 'dog' ? '🐕' :
                                                    listing.petType === 'cat' ? '🐈' :
                                                        listing.petType === 'rabbit' ? '🐇' :
                                                            listing.petType === 'bird' ? '🦜' :
                                                                listing.petType === 'hamster' ? '🐹' :
                                                                    listing.petType === 'guinea-pig' ? '🐹' :
                                                                        listing.petType === 'ferret' ? '🐾' :
                                                                            listing.petType === 'turtle' ? '🐢' :
                                                                                listing.petType === 'fish' ? '🐠' :
                                                                                    listing.petType === 'snake' ? '🐍' :
                                                                                        listing.petType === 'lizard' ? '🦎' :
                                                                                            listing.petType === 'hedgehog' ? '🦔' :
                                                                                                listing.petType === 'exotic' ? '🦓' : '🐾'}
                                            </span>
                                            {listing.petType === 'dog' ? 'Köpek' :
                                                listing.petType === 'cat' ? 'Kedi' :
                                                    listing.petType === 'rabbit' ? 'Tavşan' :
                                                        listing.petType === 'bird' ? 'Kuş' :
                                                            listing.petType === 'hamster' ? 'Hamster' :
                                                                listing.petType === 'guinea-pig' ? 'Guinea Pig' :
                                                                    listing.petType === 'ferret' ? 'Gelincik' :
                                                                        listing.petType === 'turtle' ? 'Kaplumbağa' :
                                                                            listing.petType === 'fish' ? 'Balık' :
                                                                                listing.petType === 'snake' ? 'Yılan' :
                                                                                    listing.petType === 'lizard' ? 'Kertenkele' :
                                                                                        listing.petType === 'hedgehog' ? 'Kirpi' :
                                                                                            listing.petType === 'exotic' ? 'Egzotik Hayvan' : 'Diğer'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="prose max-w-none mb-8">
                            <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">
                                {listing.description}
                            </p>
                        </div>

                        <div className="border-t border-gray-200 pt-8">
                            <h2 className="text-xl font-medium text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-2xl">💬</span>
                                İletişim
                            </h2>
                            <div className="bg-indigo-50 p-6 rounded-xl">
                                <p className="text-gray-700 mb-4">
                                    Bu ilan ile ilgilendiyseniz, ilan sahibiyle iletişime geçmek için mesaj gönderebilirsiniz.
                                    Gizlilik nedeniyle doğrudan iletişim bilgileri paylaşılmamaktadır.
                                </p>

                                {!isOwner && user && (
                                    <div>
                                        {hasSentMessage ? (
                                            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <p className="text-yellow-800">Bu ilan için bir mesaj gönderdiniz.</p>
                                                <p className="text-sm text-yellow-600 mt-2">İlan sahibinin onayını bekliyorsunuz.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <button
                                                    onClick={() => setShowMessageForm(!showMessageForm)}
                                                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                                                >
                                                    {showMessageForm ? 'İletişim Formunu Kapat' : 'İlan Sahibiyle İletişime Geç'}
                                                </button>

                                                {showMessageForm && (
                                                    <div className="mt-4">
                                                        <textarea
                                                            value={messageContent}
                                                            onChange={(e) => setMessageContent(e.target.value)}
                                                            placeholder="İlan sahibine göndermek istediğiniz mesajı yazın..."
                                                            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                            rows={4}
                                                        />
                                                        <button
                                                            onClick={handleSendMessage}
                                                            className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
                                                        >
                                                            Mesaj Gönder
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!user && (
                                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-blue-800">İlan sahibiyle iletişime geçmek için giriş yapmalısınız.</p>
                                        <button
                                            onClick={() => router.push('/auth')}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Giriş Yap / Kayıt Ol
                                        </button>
                                    </div>
                                )}

                                {isOwner && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Gelen Mesajlar</h3>
                                        {conversations
                                            .filter(conv => conv.matchDetails?.petId === listing.id)
                                            .map(conversation => (
                                                <div key={conversation.id} className="bg-white p-4 rounded-lg shadow-sm mb-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {conversation.matchDetails?.senderName} tarafından gönderildi
                                                            </p>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {conversation.lastMessage}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {conversation.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => acceptMessage(conversation.lastMessageAt || '', conversation.id)}
                                                                        className="px-3 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                                                                    >
                                                                        Kabul Et
                                                                    </button>
                                                                    <button
                                                                        onClick={() => rejectMessage(conversation.lastMessageAt || '', conversation.id)}
                                                                        className="px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                                                                    >
                                                                        Reddet
                                                                    </button>
                                                                </>
                                                            )}
                                                            {conversation.status === 'active' && (
                                                                <Link
                                                                    href="/messages"
                                                                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors"
                                                                >
                                                                    Mesajları Gör
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* İlan Sahibi Kontrolleri */}
                        {isOwner && (
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => router.push(`/listings/${id}/edit`)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    İlanı Düzenle
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    İlanı Sil
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Silme Onay Modalı */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                        >
                            <div className="text-center mb-6">
                                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">İlanı Sil</h3>
                                <p className="text-gray-600">Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm ilişkili mesajlar ve veriler silinecektir.</p>
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
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center"
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                            Siliniyor...
                                        </>
                                    ) : (
                                        'Evet, Sil'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
} 