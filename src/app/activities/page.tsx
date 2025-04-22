'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, get, remove } from 'firebase/database';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Activity {
    id: string;
    type: 'match' | 'message' | 'event' | 'vet';
    title: string;
    description: string;
    timestamp: string;
    icon: string;
    sourceRef?: string; // Aktivitenin kaynağı (silme işlemi için)
}

export default function ActivitiesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'match' | 'message' | 'vet' | 'event'>('all');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

    useEffect(() => {
        if (!user) {
            router.push('/auth');
            return;
        }

        setLoading(true);
        const allActivities: Activity[] = [];
        const db = getDatabase();

        // Eşleşmeleri al
        const matchesRef = ref(db, 'matches');
        const matchesPromise = new Promise<void>((resolve) => {
            onValue(matchesRef, (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const match = childSnapshot.val();
                    const matchId = childSnapshot.key;

                    // Kullanıcıya ait eşleşmeleri filtrele
                    if (match.receiverId === user.uid || match.senderId === user.uid) {
                        // Eşleşme durumuna göre farklı aktiviteler oluştur
                        if (match.status === 'pending' && match.receiverId === user.uid) {
                            // Bekleyen eşleşme isteği
                            allActivities.push({
                                id: `match-pending-${matchId}`,
                                type: 'match',
                                title: 'Eşleşme İsteği',
                                description: `${match.senderName || 'Birisi'} evcil hayvanı için eşleşme isteği gönderdi`,
                                timestamp: match.createdAt || match.timestamp,
                                icon: '💌',
                                sourceRef: `matches/${matchId}`
                            });
                        } else if (match.status === 'accepted') {
                            // Kabul edilen eşleşme
                            allActivities.push({
                                id: `match-accepted-${matchId}`,
                                type: 'match',
                                title: 'Eşleşme Kabul Edildi',
                                description: `${match.petInfo?.name || 'Bir evcil hayvan'} ile eşleşme kabul edildi`,
                                timestamp: match.updatedAt || match.timestamp,
                                icon: '✅',
                                sourceRef: `matches/${matchId}`
                            });
                        } else if (match.status === 'rejected' && (match.updatedAt || match.timestamp)) {
                            // Reddedilen eşleşme
                            allActivities.push({
                                id: `match-rejected-${matchId}`,
                                type: 'match',
                                title: 'Eşleşme Reddedildi',
                                description: match.senderId === user.uid
                                    ? 'Gönderdiğiniz eşleşme isteği reddedildi'
                                    : `${match.senderName || 'Birisi'}'den gelen eşleşme isteğini reddettiniz`,
                                timestamp: match.updatedAt || match.timestamp,
                                icon: '❌',
                                sourceRef: `matches/${matchId}`
                            });
                        }
                    }
                });
                resolve();
            }, { onlyOnce: true });
        });

        // Mesajları al
        const messagesRef = ref(db, `messages/${user.uid}`);
        const messagesPromise = new Promise<void>((resolve) => {
            onValue(messagesRef, (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    const messageId = childSnapshot.key;

                    allActivities.push({
                        id: `message-${messageId}`,
                        type: 'message',
                        title: 'Yeni Mesaj',
                        description: `${message.senderName || 'Birisi'}'dan mesaj aldınız`,
                        timestamp: message.timestamp,
                        icon: '💬',
                        sourceRef: `messages/${user.uid}/${messageId}`
                    });
                });
                resolve();
            }, { onlyOnce: true });
        });

        // Veteriner kayıtlarını al
        const vetRecordsRef = ref(db, 'vetRecords');
        const vetRecordsPromise = new Promise<void>((resolve) => {
            onValue(vetRecordsRef, async (snapshot) => {
                const petNames: Record<string, string> = {};

                // Önce evcil hayvan isimlerini topla
                const petsRef = ref(db, `pets/${user.uid}`);
                const petsSnapshot = await get(petsRef);
                if (petsSnapshot.exists()) {
                    petsSnapshot.forEach((petSnapshot) => {
                        const petData = petSnapshot.val();
                        petNames[petSnapshot.key!] = petData.name;
                    });
                }

                snapshot.forEach((childSnapshot) => {
                    const vetRecord = childSnapshot.val();
                    const recordId = childSnapshot.key;

                    if (vetRecord.petId) {
                        const petName = petNames[vetRecord.petId] || 'Evcil Hayvan';

                        // Son veteriner ziyaretini aktivite olarak ekle
                        if (vetRecord.lastVisit && vetRecord.lastVisit !== "") {
                            allActivities.push({
                                id: `vet-visit-${recordId}`,
                                type: 'vet',
                                title: 'Veteriner Ziyareti',
                                description: `${petName} veteriner kontrolünden geçti`,
                                timestamp: vetRecord.updatedAt,
                                icon: '🩺',
                                sourceRef: `vetRecords/${recordId}`
                            });
                        }

                        // Sonraki veteriner ziyaretini aktivite olarak ekle (eğer varsa)
                        if (vetRecord.nextVisit && vetRecord.nextVisit !== "") {
                            allActivities.push({
                                id: `vet-next-${recordId}`,
                                type: 'vet',
                                title: 'Yaklaşan Veteriner Randevusu',
                                description: `${petName} için randevu: ${vetRecord.nextVisit}`,
                                timestamp: vetRecord.updatedAt,
                                icon: '📅',
                                sourceRef: `vetRecords/${recordId}`
                            });
                        }

                        // Eğer aşılar varsa, son aşıyı ekle
                        if (vetRecord.vaccinations && vetRecord.vaccinations.length > 0) {
                            const lastVaccination = vetRecord.vaccinations[vetRecord.vaccinations.length - 1];
                            allActivities.push({
                                id: `vac-${recordId}-${lastVaccination.name}`,
                                type: 'vet',
                                title: 'Aşı Kaydı',
                                description: `${petName}: ${lastVaccination.name} aşısı yapıldı`,
                                timestamp: vetRecord.updatedAt,
                                icon: '💉',
                                sourceRef: `vetRecords/${recordId}/vaccinations/${vetRecord.vaccinations.length - 1}`
                            });
                        }
                    }
                });
                resolve();
            }, { onlyOnce: true });
        });

        // Tüm promise'ların tamamlanmasını bekle
        Promise.all([matchesPromise, messagesPromise, vetRecordsPromise])
            .then(() => {
                // Aktiviteleri tarihe göre sırala
                const sortedActivities = allActivities.sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                setActivities(sortedActivities);
                setFilteredActivities(sortedActivities);
                setLoading(false);
            })
            .catch(err => {
                console.error("Aktiviteler yüklenirken hata oluştu:", err);
                setLoading(false);
            });
    }, [user, router]);

    // Filtreleme fonksiyonu
    const handleFilterChange = (filter: 'all' | 'match' | 'message' | 'vet' | 'event') => {
        setActiveFilter(filter);

        if (filter === 'all') {
            setFilteredActivities(activities);
        } else {
            setFilteredActivities(activities.filter(activity => activity.type === filter));
        }
    };

    const handleDeleteClick = (activity: Activity) => {
        setActivityToDelete(activity);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!activityToDelete || !activityToDelete.sourceRef) {
            setShowDeleteModal(false);
            return;
        }

        try {
            const db = getDatabase();
            const activityRef = ref(db, activityToDelete.sourceRef);

            // Firebase'den aktiviteyi sil
            await remove(activityRef);

            // Yerel state'den de sil
            const updatedActivities = activities.filter(a => a.id !== activityToDelete.id);
            setActivities(updatedActivities);
            setFilteredActivities(
                activeFilter === 'all'
                    ? updatedActivities
                    : updatedActivities.filter(a => a.type === activeFilter)
            );

            toast.success('Aktivite başarıyla silindi');
        } catch (error) {
            console.error('Aktivite silinirken hata oluştu:', error);
            toast.error('Aktivite silinirken bir hata oluştu');
        }

        setShowDeleteModal(false);
        setActivityToDelete(null);
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setActivityToDelete(null);
    };

    const getActivityTypeText = (type: string) => {
        switch (type) {
            case 'match': return 'Eşleşme';
            case 'message': return 'Mesaj';
            case 'vet': return 'Veteriner';
            case 'event': return 'Etkinlik';
            default: return 'Diğer';
        }
    };

    const getActivityTypeColor = (type: string) => {
        switch (type) {
            case 'match': return 'bg-green-100 text-green-800';
            case 'message': return 'bg-blue-100 text-blue-800';
            case 'vet': return 'bg-amber-100 text-amber-800';
            case 'event': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
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
                {/* Başlık ve Geri Butonu */}
                <div className="flex items-center mb-6">
                    <button
                        onClick={() => router.back()}
                        className="mr-4 flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        aria-label="Geri git"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Tüm Aktiviteler</h1>
                </div>

                {/* Filtreler */}
                <div className="bg-white rounded-xl p-4 mb-6 shadow-md flex flex-wrap gap-2">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => handleFilterChange('match')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === 'match'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                    >
                        Eşleşmeler
                    </button>
                    <button
                        onClick={() => handleFilterChange('message')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === 'message'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                    >
                        Mesajlar
                    </button>
                    <button
                        onClick={() => handleFilterChange('vet')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === 'vet'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                    >
                        Veteriner
                    </button>
                    <button
                        onClick={() => handleFilterChange('event')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === 'event'
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            }`}
                    >
                        Etkinlikler
                    </button>
                </div>

                {/* Aktiviteler Listesi */}
                <div className="space-y-4">
                    {filteredActivities.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center shadow-md">
                            <p className="text-gray-600">
                                {activeFilter === 'all'
                                    ? 'Henüz aktivite bulunmuyor.'
                                    : `${getActivityTypeText(activeFilter)} kategorisinde aktivite bulunmuyor.`}
                            </p>
                        </div>
                    ) : (
                        filteredActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-white rounded-xl p-4 shadow-md transition-all hover:shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activity.type === 'match' ? 'bg-green-100' :
                                        activity.type === 'message' ? 'bg-blue-100' :
                                            activity.type === 'vet' ? 'bg-amber-100' :
                                                'bg-purple-100'
                                        }`}>
                                        <span className="text-2xl">{activity.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getActivityTypeColor(activity.type)}`}>
                                                {getActivityTypeText(activity.type)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600">{activity.description}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-gray-500">
                                                {format(new Date(activity.timestamp), 'd MMMM yyyy, HH:mm', { locale: tr })}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteClick(activity)}
                                                className="text-red-600 hover:text-red-800 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Silme Onay Modalı */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
                        <div className="text-center mb-6">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aktiviteyi Sil</h3>
                            <p className="text-sm text-gray-600">
                                Bu aktiviteyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
        </div>
    );
} 