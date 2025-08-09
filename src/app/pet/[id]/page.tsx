"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDatabase, ref as dbRef, onValue, set, remove, push } from "firebase/database";
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
import { getPublicPosts } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

export default function PetProfilePage() {
    const { id: rawId } = useParams();
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const router = useRouter();
    const { user } = useAuth();
    const [pet, setPet] = useState<any>(null);
    const [owner, setOwner] = useState<any>(null);
    const [followers, setFollowers] = useState<{ [userId: string]: { status: 'approved' | 'pending' } }>({});
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [petPosts, setPetPosts] = useState<any[]>([]);
    const [ownerInfo, setOwnerInfo] = useState<any>(null);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<any>(null);
    const [likes, setLikes] = useState<{ [userId: string]: boolean }>({});
    const [comments, setComments] = useState<any[]>([]);
    const [likeLoading, setLikeLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [usersMap, setUsersMap] = useState<any>({});
    const [showFollowingModal, setShowFollowingModal] = useState(false);

    // Pet ve sahibi verisini çek
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const db = getDatabase();
        // Tüm kullanıcıların pets'lerinde ara
        const petsRef = dbRef(db, 'pets');
        const off = onValue(petsRef, (snapshot) => {
            let foundPet = null;
            let foundOwner = null;
            snapshot.forEach(userSnap => {
                const userId = userSnap.key;
                const petsObj = userSnap.val();
                if (petsObj && petsObj[id]) {
                    foundPet = { ...petsObj[id], id };
                    foundOwner = { userId };
                }
            });
            setPet(foundPet);
            setOwner(foundOwner);
            setLoading(false);
        });
        return () => off();
    }, [id]);

    // Takipçi verisini çek
    useEffect(() => {
        if (!id) return;
        const db = getDatabase();
        const followersRef = dbRef(db, `petFollowers/${id}`);
        const off = onValue(followersRef, (snapshot) => {
            setFollowers(snapshot.val() || {});
        });
        return () => off();
    }, [id]);

    // Pet'e ait gönderileri çek
    useEffect(() => {
        if (!id) return;
        const db = getDatabase();
        const postsRef = dbRef(db, 'posts');
        const off = onValue(postsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const arr = Object.entries(data)
                    .map(([postId, post]: any) => ({ id: postId, ...post }))
                    .filter(post => post.petId === id);
                // En yeni en üstte
                arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPetPosts(arr);
            } else {
                setPetPosts([]);
            }
        });
        return () => off();
    }, [id]);

    // Sahibin bilgilerini çek
    useEffect(() => {
        if (!owner?.userId) return;
        const db = getDatabase();
        const userRef = dbRef(db, `users/${owner.userId}`);
        const off = onValue(userRef, (snapshot) => {
            setOwnerInfo(snapshot.val() || null);
        });
        return () => off();
    }, [owner?.userId]);

    // Pet gizlilik ayarını state'e al
    useEffect(() => {
        if (pet && pet.privacy) setPrivacy(pet.privacy);
        else setPrivacy('public');
    }, [pet]);

    // Takipçi ve istekleri ayrıştır
    const approvedFollowers = Object.entries(followers || {}).filter(([, v]: any) => v.status === 'approved').map(([k]) => k);
    const pendingFollowers = Object.entries(followers || {}).filter(([, v]: any) => v.status === 'pending').map(([k]) => k);

    // Takip edilenler (bu peti takip edenler değil, bu petin takip ettikleri)
    const [following, setFollowing] = useState<string[]>([]);

    // Petin takip ettiklerini çek
    useEffect(() => {
        if (!pet?.id) return;
        const db = getDatabase();
        const followingRef = dbRef(db, `userFollows/${pet.ownerId}`);
        const off = onValue(followingRef, (snapshot) => {
            const data = snapshot.val() || {};
            // Sadece bu petin id'sini takip edenler
            const followingPetIds = Object.keys(data).filter(pid => data[pid]);
            setFollowing(followingPetIds);
        });
        return () => off();
    }, [pet?.id, pet?.ownerId]);

    // Tüm kullanıcıları topluca çek (takipçi ve istekler için)
    useEffect(() => {
        const allUids = Array.from(new Set([
            ...approvedFollowers,
            ...pendingFollowers,
            ...following,
        ]));
        if (allUids.length === 0) return;
        const db = getDatabase();
        const usersRef = dbRef(db, 'users');
        const off = onValue(usersRef, (snapshot) => {
            const data = snapshot.val() || {};
            const map: any = {};
            allUids.forEach(uid => {
                if (data[uid]) map[uid] = data[uid];
            });
            setUsersMap(map);
        });
        return () => off();
    }, [JSON.stringify(approvedFollowers), JSON.stringify(pendingFollowers), JSON.stringify(following)]);

    // Gizlilik ayarını değiştir (sadece sahibi için)
    const handlePrivacyChange = async (newPrivacy: 'public' | 'private') => {
        if (!user || user.uid !== owner?.userId) return;
        setPrivacy(newPrivacy);
        const db = getDatabase();
        const petRef = dbRef(db, `pets/${owner.userId}/${pet.id}`);
        await set(petRef, { ...pet, privacy: newPrivacy });
    };

    // Gönderi silme fonksiyonu
    const handleDeletePost = async () => {
        if (!postToDelete) return;
        setDeleteLoading(true);
        try {
            const db = getDatabase();
            // 1. Fotoğrafı storage'dan sil
            if (postToDelete.photoUrl && postToDelete.photoUrl.startsWith('https://')) {
                try {
                    const storage = getStorage();
                    const fileRef = storageRef(storage, postToDelete.photoUrl);
                    await deleteObject(fileRef);
                } catch (err) {
                    // Fotoğraf storage'dan silinemese de devam et
                }
            }
            // 2. Post'u veritabanından sil
            const postRef = dbRef(db, `posts/${postToDelete.id}`);
            await remove(postRef);
            // 3. Local state'ten çıkar
            setPetPosts(prev => prev.filter(p => p.id !== postToDelete.id));
            setShowDeleteModal(false);
            setPostToDelete(null);
            if (selectedPost && selectedPost.id === postToDelete.id) {
                setSelectedPost(null);
            }
            toast.success('Gönderi başarıyla silindi!');
        } catch (error) {
            toast.error('Gönderi silinirken bir hata oluştu!');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Modal açıldığında beğeni ve yorumları çek
    useEffect(() => {
        if (!selectedPost) return;
        const db = getDatabase();
        // Likes
        const likesRef = dbRef(db, `postLikes/${selectedPost.id}`);
        const offLikes = onValue(likesRef, (snapshot) => {
            setLikes(snapshot.val() || {});
        });
        // Comments
        setCommentsLoading(true);
        const commentsRef = dbRef(db, `postComments/${selectedPost.id}`);
        const offComments = onValue(commentsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const arr = Object.entries(data).map(([id, c]: any) => ({ id, ...c }));
                arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setComments(arr);
            } else {
                setComments([]);
            }
            setCommentsLoading(false);
        });
        return () => {
            offLikes();
            offComments();
        };
    }, [selectedPost]);

    // Takip et/bırak/istek gönder
    const handleFollow = async () => {
        if (!user || !id) return;
        setFollowLoading(true);
        const db = getDatabase();
        const followerRef = dbRef(db, `petFollowers/${id}/${user.uid}`);

        if (followers && followers[user.uid]) {
            // Takibi bırak
            await remove(followerRef);
        } else {
            // Takip et/istek gönder
            const status = privacy === 'public' ? 'approved' : 'pending';
            await set(followerRef, { status });

            // Eğer private hesap ise ve istek gönderiliyorsa email bildirim gönder
            if (privacy === 'private' && owner?.userId) {
                try {
                    await fetch('/api/send-follow-request-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            petId: id,
                            requesterUserId: user.uid,
                            ownerUserId: owner.userId
                        })
                    });
                } catch (error) {
                    console.error('Email bildirim gönderilirken hata:', error);
                    // Email hatası takip işlemini engellemez
                }
            }
        }
        setFollowLoading(false);
    };



    // Beğeni işlemi
    const handleLike = async () => {
        if (!user || !selectedPost) return;
        setLikeLoading(true);
        const db = getDatabase();
        const likeRef = dbRef(db, `postLikes/${selectedPost.id}/${user.uid}`);
        if (likes && likes[user.uid]) {
            await remove(likeRef);
        } else {
            await set(likeRef, true);
        }
        setLikeLoading(false);
    };

    // Yorum ekleme
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPost || !commentText.trim()) return;
        const db = getDatabase();
        const commentsRef = dbRef(db, `postComments/${selectedPost.id}`);
        const newCommentRef = push(commentsRef);
        await set(newCommentRef, {
            userId: user.uid,
            userName: user.displayName || user.email || 'Kullanıcı',
            userPhoto: user.photoURL || '',
            text: commentText.trim(),
            createdAt: new Date().toISOString(),
        });
        setCommentText('');
    };

    // Geri takip et/bırak
    const handleFollowUser = async (targetUid: string, isFollowing: boolean) => {
        if (!user) return;
        const db = getDatabase();
        const ref = dbRef(db, `userFollows/${user.uid}/${targetUid}`);
        if (isFollowing) {
            await remove(ref);
        } else {
            await set(ref, true);
        }
    };

    // Takip isteğini onayla/reddet
    const handleApproveRequest = async (uid: string) => {
        if (!id || !owner?.userId) return;

        try {
            const db = getDatabase();
            const followerRef = dbRef(db, `petFollowers/${id}/${uid}`);
            await set(followerRef, { status: 'approved' });

            // Email bildirim gönder
            try {
                await fetch('/api/send-follow-approved-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        petId: id,
                        requesterUserId: uid,
                        ownerUserId: owner.userId
                    })
                });
            } catch (error) {
                console.error('Onay email gönderilirken hata:', error);
                // Email hatası onay işlemini engellemez
            }

            toast.success('Takip isteği onaylandı!');
        } catch (error) {
            console.error('Takip isteği onaylanırken hata:', error);
            toast.error('Bir hata oluştu!');
        }
    };

    const handleRejectRequest = async (uid: string) => {
        if (!id) return;

        try {
            const db = getDatabase();
            const followerRef = dbRef(db, `petFollowers/${id}/${uid}`);
            await remove(followerRef);
            toast.success('Takip isteği reddedildi!');
        } catch (error) {
            console.error('Takip isteği reddedilirken hata:', error);
            toast.error('Bir hata oluştu!');
        }
    };

    // Takipçi kontrolü
    const isOwner = user && user.uid === owner?.userId;
    const isApprovedFollower = user && followers && followers[user.uid]?.status === 'approved';
    const isPrivate = pet?.privacy === 'private';
    const canViewPrivate = isOwner || isApprovedFollower;

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
    }
    // Sadece pet verisi yoksa hata göster
    if (pet === null) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Evcil hayvan bulunamadı.</div>;
    }
    // Gizli profil kontrolü
    if (isPrivate && !canViewPrivate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-white to-pink-50 py-8 px-4">
                <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-0 flex flex-col items-center overflow-hidden">
                    <div className="w-full flex flex-col items-center bg-gradient-to-r from-indigo-100 to-purple-100 p-8 pb-4 relative">
                        <div className="w-32 h-32 rounded-full bg-white p-2 shadow-lg mb-3 overflow-hidden flex-shrink-0">
                            {pet.profilePhoto ? (
                                <img src={pet.profilePhoto} alt={pet.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-indigo-50 to-purple-50">🐾</div>
                            )}
                        </div>
                        <h2 className="text-2xl font-extrabold text-blue-900 mb-1">{pet.name}</h2>
                        <div className="text-base text-gray-600 mb-2">@{ownerInfo?.firstName} {ownerInfo?.lastName}</div>
                        {/* Takip Et/İstek Gönderildi/Takibi Bırak butonu */}
                        {user && user.uid !== owner?.userId && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`mt-2 px-6 py-2 rounded-xl font-medium shadow transition-all text-white text-base
                                    ${followers && followers[user.uid]?.status === 'approved' ? 'bg-pink-500 hover:bg-pink-600' :
                                        followers && followers[user.uid]?.status === 'pending' ? 'bg-gray-400 cursor-not-allowed' :
                                            'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'}`}
                            >
                                {followers && followers[user.uid]?.status === 'approved'
                                    ? 'Takibi Bırak'
                                    : followers && followers[user.uid]?.status === 'pending'
                                        ? 'İstek Gönderildi'
                                        : 'Takip Et'}
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="text-2xl text-gray-500 font-semibold mb-4">Bu profil gizli</div>
                        <div className="text-gray-400 text-center max-w-xs">Gönderileri ve detayları görebilmek için takip isteği gönderebilir veya kabul edilmeyi bekleyebilirsin.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-pink-50 py-8 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-0 flex flex-col items-center overflow-hidden">
                {/* Modern üst header */}
                <div className="w-full flex flex-col items-center bg-gradient-to-r from-indigo-100 to-purple-100 p-8 pb-4 relative">
                    {/* Gizlilik ayarı sağ üstte, mutlak konumda ve arka planlı */}
                    {user && user.uid === owner?.userId && (
                        <div className="absolute top-4 right-4 bg-white/90 rounded-lg shadow px-3 py-1 flex items-center gap-2 z-10">
                            <span className="text-xs text-gray-600">Gizlilik:</span>
                            <select
                                value={privacy}
                                onChange={e => handlePrivacyChange(e.target.value as 'public' | 'private')}
                                className="rounded-lg border px-2 py-1 text-xs bg-white shadow"
                            >
                                <option value="public">Herkese Açık</option>
                                <option value="private">Takipçilere Açık</option>
                            </select>
                        </div>
                    )}
                    {/* Profil header'ında, sadece sahibi için Takip İstekleri butonu */}
                    {user && user.uid === owner?.userId && pendingFollowers.length > 0 && (
                        <button
                            className="absolute top-4 left-4 bg-pink-100 text-pink-700 px-4 py-2 rounded-lg font-semibold shadow hover:bg-pink-200 z-10"
                            onClick={() => setShowRequestsModal(true)}
                        >
                            Takip İstekleri ({pendingFollowers.length})
                        </button>
                    )}
                    <div className="flex flex-col sm:flex-row items-center w-full gap-6">
                        {/* Profil Fotoğrafı */}
                        <div className="w-32 h-32 rounded-full bg-white p-2 shadow-lg mb-3 sm:mb-0 overflow-hidden flex-shrink-0">
                            {pet.profilePhoto ? (
                                <img src={pet.profilePhoto} alt={pet.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-indigo-50 to-purple-50">🐾</div>
                            )}
                        </div>
                        {/* Profil Bilgileri ve Sayılar */}
                        <div className="flex-1 flex flex-col items-center sm:items-start gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-extrabold text-blue-900">{pet.name}</h2>
                                {user && user.uid === owner?.userId && (
                                    <button className="ml-2 px-3 py-1 text-xs rounded-lg bg-indigo-200 text-indigo-800 font-semibold hover:bg-indigo-300" onClick={() => router.push('/pet/edit?id=' + pet.id)}>
                                        Profili Düzenle
                                    </button>
                                )}
                            </div>
                            {/* SAHİBİ: Sadece isim ve fotoğraf, profil adının hemen altında, sağa hizalı */}
                            {ownerInfo && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 self-end mb-1">
                                    {ownerInfo.photoURL ? (
                                        <img src={ownerInfo.photoURL} alt={ownerInfo.firstName} className="w-6 h-6 rounded-full object-cover border" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">👤</div>
                                    )}
                                    <span>{ownerInfo.firstName} {ownerInfo.lastName}</span>
                                </div>
                            )}
                            {/* Takip Et/İstek Gönderildi/Takibi Bırak butonu */}
                            {user && user.uid !== owner?.userId && (
                                <button
                                    onClick={handleFollow}
                                    disabled={followLoading}
                                    className={`mt-2 px-6 py-2 rounded-xl font-medium shadow transition-all text-white text-base
                                        ${followers && followers[user.uid]?.status === 'approved' ? 'bg-pink-500 hover:bg-pink-600' :
                                            followers && followers[user.uid]?.status === 'pending' ? 'bg-gray-400 cursor-not-allowed' :
                                                'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'}`}
                                >
                                    {followers && followers[user.uid]?.status === 'approved'
                                        ? 'Takibi Bırak'
                                        : followers && followers[user.uid]?.status === 'pending'
                                            ? 'İstek Gönderildi'
                                            : 'Takip Et'}
                                </button>
                            )}
                            {pet.description && <div className="text-gray-700 text-sm mb-1 max-w-md">{pet.description}</div>}
                            {pet.link && (
                                <a href={pet.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs underline mb-1">{pet.link}</a>
                            )}
                            {/* Gönderi, Takipçi, Takip Edilen Sayıları */}
                            <div className="flex items-center gap-8 mt-2">
                                <button onClick={() => { }} className="flex flex-col items-center group focus:outline-none">
                                    <span className="text-lg font-bold text-indigo-700 group-hover:underline">{petPosts.length}</span>
                                    <span className="text-xs text-gray-600">Gönderi</span>
                                </button>
                                <button onClick={() => setShowFollowersModal(true)} className="flex flex-col items-center group focus:outline-none">
                                    <span className="text-lg font-bold text-indigo-700 group-hover:underline">{approvedFollowers.length}</span>
                                    <span className="text-xs text-gray-600">Takipçi</span>
                                </button>
                                <button onClick={() => setShowFollowingModal(true)} className="flex flex-col items-center group focus:outline-none">
                                    <span className="text-lg font-bold text-indigo-700 group-hover:underline">{following.length}</span>
                                    <span className="text-xs text-gray-600">Takip Edilen</span>
                                </button>
                            </div>
                        </div>
                        {/* Ayar/Arşiv butonları */}
                        <div className="absolute top-4 right-20 flex gap-2">
                            {user && user.uid === owner?.userId && (
                                <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" title="Ayarlar">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Pet'in diğer gönderileri */}
                <div className="w-full p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">{pet.name} ile Paylaşılan Gönderiler</h3>
                    {petPosts.length === 0 ? (
                        <div className="text-gray-400 text-center py-8">Henüz gönderi yok.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {petPosts.map(post => (
                                <div
                                    key={post.id}
                                    className="relative aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden shadow group cursor-pointer"
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <img src={post.photoUrl} alt={post.caption} className="w-full h-full object-cover object-center group-hover:brightness-90 transition-all duration-300" />

                                    {/* Silme butonu - sadece pet sahibi için */}
                                    {user && user.uid === owner?.userId && (
                                        <button
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPostToDelete(post);
                                                setShowDeleteModal(true);
                                            }}
                                            title="Gönderiyi sil"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}

                                    {/* Hover'da açıklama */}
                                    {post.caption && (
                                        <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                            <div className="bg-white/90 rounded-xl px-3 py-1 mb-4 text-xs text-gray-800 shadow max-w-[90%] truncate">
                                                {post.caption}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Gönderi Detay Modalı */}
                {selectedPost && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="bg-white rounded-xl shadow-lg p-0 w-full max-w-3xl relative animate-fade-in-up flex flex-col md:flex-row overflow-hidden">
                            {/* Sol: Büyük görsel */}
                            <div className="md:w-1/2 w-full bg-gray-100 flex items-center justify-center p-4 md:p-8 relative">
                                <img
                                    src={selectedPost.photoUrl}
                                    alt={selectedPost.caption}
                                    className="rounded-xl max-h-[60vh] w-full object-contain shadow"
                                />
                            </div>
                            {/* Sağ: Kutulu detaylar */}
                            <div className="md:w-1/2 w-full flex flex-col gap-4 p-4 md:p-8 bg-gradient-to-b from-blue-50 to-white">
                                {/* Pet ve kullanıcı bilgisi */}
                                <div className="flex items-center gap-3 mb-2">
                                    {selectedPost.petPhoto && (
                                        <img src={selectedPost.petPhoto} alt={selectedPost.petName} className="w-10 h-10 rounded-full object-cover border" />
                                    )}
                                    <div>
                                        <div className="font-semibold text-blue-900">{selectedPost.petName}</div>
                                        <div className="text-xs text-gray-500">{selectedPost.userName}</div>
                                    </div>
                                </div>
                                <div className="text-gray-800 mb-2">{selectedPost.caption}</div>
                                <div className="text-xs text-gray-400 mb-2">{new Date(selectedPost.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                {/* Beğeni ve Yorumlar */}
                                <div className="flex items-center gap-4 mb-2">
                                    <button
                                        className={`flex items-center gap-1 px-3 py-1 rounded-full border ${likes && user && likes[user.uid] ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-gray-100 text-gray-600 border-gray-200'} transition-all`}
                                        onClick={handleLike}
                                        disabled={likeLoading || !user}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={likes && user && likes[user.uid] ? '#ec4899' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        <span>{Object.keys(likes || {}).length}</span>
                                    </button>
                                    <span className="text-gray-400 text-sm">{comments.length} yorum</span>
                                </div>
                                {/* Yorumlar */}
                                <div className="max-h-40 overflow-y-auto mb-2 bg-gray-50 rounded-lg p-2">
                                    {commentsLoading ? (
                                        <div className="text-gray-400 text-sm">Yükleniyor...</div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-gray-400 text-sm">Henüz yorum yok.</div>
                                    ) : (
                                        comments.map((c) => (
                                            <div key={c.id} className="flex items-start gap-2 mb-2">
                                                {c.userPhoto ? (
                                                    <img src={c.userPhoto} alt={c.userName} className="w-7 h-7 rounded-full object-cover border" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">👤</div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="text-xs font-semibold text-blue-900">{c.userName}</div>
                                                    <div className="text-xs text-gray-700">{c.text}</div>
                                                    <div className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {/* Yorum Ekle */}
                                {user && (
                                    <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-1">
                                        <input
                                            type="text"
                                            className="flex-1 border rounded-lg px-2 py-1 text-sm"
                                            placeholder="Yorum ekle..."
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            maxLength={200}
                                        />
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                                            disabled={!commentText.trim()}
                                        >
                                            Gönder
                                        </button>
                                    </form>
                                )}
                            </div>
                            {/* Kapat butonu */}
                            <button
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-20"
                                onClick={() => setSelectedPost(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Takipçi Modalı (sadece takipçiler) */}
            {showFollowersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                        <h3 className="text-lg font-bold text-blue-900 mb-2">Takipçiler</h3>
                        {approvedFollowers.length === 0 ? (
                            <div className="text-gray-500 text-center mb-4">Henüz takipçi yok.</div>
                        ) : (
                            <ul className="space-y-3 mb-6">
                                {approvedFollowers.map(uid => {
                                    const u = usersMap[uid];
                                    return (
                                        <li key={uid} className="flex items-center gap-3 justify-between">
                                            <div className="flex items-center gap-2">
                                                {u?.photoURL ? (
                                                    <img src={u.photoURL} alt={u.firstName} className="w-8 h-8 rounded-full object-cover border" />
                                                ) : (
                                                    <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-500">👤</span>
                                                )}
                                                <span className="text-gray-800 font-medium">{u ? `${u.firstName} ${u.lastName}` : uid}</span>
                                            </div>
                                            {/* Pet sahibi ise takipçiyi kaldırabilir */}
                                            {user && user.uid === owner?.userId && (
                                                <button
                                                    className="text-xs px-3 py-1 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200"
                                                    onClick={async () => {
                                                        const db = getDatabase();
                                                        const followerRef = dbRef(db, `petFollowers/${pet.id}/${uid}`);
                                                        await remove(followerRef);
                                                    }}
                                                >
                                                    Takipçiyi Kaldır
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <button
                            className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                            onClick={() => setShowFollowersModal(false)}
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
            {/* Takip İstekleri Modalı (sadece sahibi için) */}
            {showRequestsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                        <h3 className="text-lg font-bold text-pink-700 mb-4">Takip İstekleri</h3>
                        {pendingFollowers.length === 0 ? (
                            <div className="text-gray-500 text-center">Bekleyen istek yok.</div>
                        ) : (
                            <ul className="space-y-3">
                                {pendingFollowers.map(uid => {
                                    const u = usersMap[uid];
                                    return (
                                        <li key={uid} className="flex items-center gap-3 justify-between">
                                            <div className="flex items-center gap-2">
                                                {u?.photoURL ? (
                                                    <img src={u.photoURL} alt={u.firstName} className="w-8 h-8 rounded-full object-cover border" />
                                                ) : (
                                                    <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-500">👤</span>
                                                )}
                                                <span className="text-gray-800 font-medium">{u ? `${u.firstName} ${u.lastName}` : uid}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    className="text-xs px-3 py-1 rounded-lg font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                                    onClick={() => handleApproveRequest(uid)}
                                                >
                                                    Onayla
                                                </button>
                                                <button
                                                    className="text-xs px-3 py-1 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    onClick={() => handleRejectRequest(uid)}
                                                >
                                                    Reddet
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <button
                            className="mt-6 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all"
                            onClick={() => setShowRequestsModal(false)}
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
            {/* Takip Edilen Modalı (sadece takip edilenler) */}
            {showFollowingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                        <h3 className="text-lg font-bold text-blue-900 mb-2">Takip Edilenler</h3>
                        {following.length === 0 ? (
                            <div className="text-gray-500 text-center mb-4">Henüz takip edilen yok.</div>
                        ) : (
                            <ul className="space-y-3 mb-6">
                                {following.map(fid => {
                                    const u = usersMap[fid];
                                    return (
                                        <li key={fid} className="flex items-center gap-3 justify-between">
                                            <div className="flex items-center gap-2">
                                                {u?.photoURL ? (
                                                    <img src={u.photoURL} alt={u.firstName} className="w-8 h-8 rounded-full object-cover border" />
                                                ) : (
                                                    <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-500">👤</span>
                                                )}
                                                <span className="text-gray-800 font-medium">{u ? `${u.firstName} ${u.lastName}` : fid}</span>
                                            </div>
                                            {/* Takibi bırak butonu */}
                                            {user && user.uid === owner?.userId && (
                                                <button
                                                    className="text-xs px-3 py-1 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    onClick={async () => {
                                                        const db = getDatabase();
                                                        const followRef = dbRef(db, `userFollows/${pet.ownerId}/${fid}`);
                                                        await remove(followRef);
                                                    }}
                                                >
                                                    Takibi Bırak
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <button
                            className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                            onClick={() => setShowFollowingModal(false)}
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}

            {/* Silme Onay Modalı */}
            {showDeleteModal && postToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Gönderiyi Sil</h3>
                        <p className="text-gray-600 mb-6">Bu gönderiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setPostToDelete(null);
                                }}
                                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                disabled={deleteLoading}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDeletePost}
                                className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 