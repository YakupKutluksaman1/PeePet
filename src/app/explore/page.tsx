"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { addPostToDB, getPaginatedPosts } from '@/lib/firebase';
import { Post } from '@/types/post';
import { useAuth } from '@/context/AuthContext';
// import { usePet } from '@/context/PetContext'; // Not needed - using local pets state
import { getDatabase, ref as dbRef, query, orderByChild, equalTo, onValue, set, remove, push } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { useRouter } from "next/navigation";

// Örnek gönderi verisi (ileride veritabanından çekilecek)
const examplePosts = [
    {
        id: "1",
        petId: "pet1",
        userId: "user1",
        petName: "Pamuk",
        petType: "dog",
        petPhoto: "/public/peepet.png",
        userName: "Yakup Kaya",
        photoUrl: "/public/peepet.png",
        caption: "Bugün parkta çok eğlendik! 🐾",
        createdAt: "2024-06-01T12:00:00Z",
    },
    {
        id: "2",
        petId: "pet2",
        userId: "user2",
        petName: "Mırmır",
        petType: "cat",
        petPhoto: "https://placekitten.com/200/200",
        userName: "Ayşe Demir",
        photoUrl: "https://placekitten.com/400/300",
        caption: "Yeni pati dostumla tanıştım! 😻",
        createdAt: "2024-06-02T09:30:00Z",
    },
];

// Örnek evcil hayvanlar (kullanıcıya ait)
const examplePets = [
    { id: "pet1", name: "Pamuk", type: "dog" },
    { id: "pet2", name: "Mırmır", type: "cat" },
];

export default function ExplorePage() {
    const { user, loading: authLoading } = useAuth();
    // const { pets: contextPets, loading: contextPetsLoading } = usePet(); // Not needed - using local pets state
    const [pets, setPets] = useState<any[]>([]);
    const [petsLoading, setPetsLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastPostKey, setLastPostKey] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newPost, setNewPost] = useState({ petId: '', photo: null as File | null, caption: '' });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [likes, setLikes] = useState<{ [userId: string]: boolean }>({});
    const [comments, setComments] = useState<any[]>([]);
    const [likeLoading, setLikeLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    // Gönderi geçişi için index
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [activeTab, setActiveTab] = useState<'mine' | 'explore' | 'pets'>('explore');
    // Düzenle/Sil modal state'leri
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editCaption, setEditCaption] = useState('');
    const [editPhoto, setEditPhoto] = useState<File | null>(null);
    const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [petPrivacyMap, setPetPrivacyMap] = useState<{ [petId: string]: { privacy: string, ownerId: string, followers: { [uid: string]: { status: string } } } }>({});
    const [searchValue, setSearchValue] = useState("");
    const [cityPets, setCityPets] = useState<any[]>([]);
    const [userCity, setUserCity] = useState("");


    const router = useRouter();

    // Modalı açarken index'i de ayarla
    const openPostModal = (post: Post, index: number) => {
        setSelectedPost(post);
        setSelectedIndex(index);
    };



    // İlk pet seçili olsun
    useEffect(() => {
        if (!petsLoading && pets.length > 0 && !newPost.petId) {
            setNewPost(p => ({ ...p, petId: pets[0].id }));
        }
    }, [petsLoading, pets, newPost.petId]);

    // Kendi pet'lerini çekmek için (paylaşım formu için):
    useEffect(() => {
        if (!user) return;
        setPetsLoading(true);
        const db = getDatabase();
        const petsRef = dbRef(db, `pets/${user.uid}`);
        const unsubscribe = onValue(petsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const petsArray = Object.entries(data).map(([id, pet]) => ({ ...(pet as any), id }));
                setPets(petsArray);
                console.log('Firebase pets (kendi):', petsArray);
            } else {
                setPets([]);
                console.log('Firebase pets (kendi): []');
            }
            setPetsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Tüm petlerin privacy ve takipçi bilgilerini çek
    useEffect(() => {
        const db = getDatabase();
        const petsRef = dbRef(db, 'pets');
        const followersRef = dbRef(db, 'petFollowers');
        let petsData: any = {};
        let followersData: any = {};
        let loaded = { pets: false, followers: false };
        const trySet = () => {
            if (loaded.pets && loaded.followers) {
                // Her petId için privacy, ownerId ve followers'ı eşleştir
                const map: any = {};
                Object.entries(petsData).forEach(([ownerId, petsObj]: any) => {
                    Object.entries(petsObj).forEach(([petId, pet]: any) => {
                        map[petId] = {
                            privacy: pet.privacy || 'public',
                            ownerId,
                            followers: followersData[petId] || {}
                        };
                    });
                });
                setPetPrivacyMap(map);
            }
        };
        const offPets = onValue(petsRef, (snapshot) => {
            petsData = snapshot.val() || {};
            loaded.pets = true;
            trySet();
        });
        const offFollowers = onValue(followersRef, (snapshot) => {
            followersData = snapshot.val() || {};
            loaded.followers = true;
            trySet();
        });
        return () => { offPets(); offFollowers(); };
    }, []);

    // İlk gönderileri yükle
    useEffect(() => {
        loadInitialPosts();
    }, []);

    const loadInitialPosts = async () => {
        setLoading(true);
        try {
            const result = await getPaginatedPosts(20, null);
            setPosts(result.posts);
            setLastPostKey(result.lastKey);
            setHasMore(result.hasMore);
        } catch (error) {
            console.error('Gönderiler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    // Daha fazla gönderi yükle
    const loadMorePosts = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const result = await getPaginatedPosts(20, lastPostKey);
            setPosts(prev => [...prev, ...result.posts]);
            setLastPostKey(result.lastKey);
            setHasMore(result.hasMore);
        } catch (error) {
            console.error('Daha fazla gönderi yüklenirken hata:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Infinite scroll - otomatik yükleme
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop
                >= document.documentElement.offsetHeight - 1000) {
                if (hasMore && !loadingMore && (activeTab === 'mine' || activeTab === 'explore')) {
                    loadMorePosts();
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loadingMore, activeTab, lastPostKey]);

    useEffect(() => {
        console.log('user:', user);
        console.log('pets:', pets);
    }, [user, pets]);

    // Beğeni ve yorumları çek (modal açıldığında)
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
                // Yorumları tarihe göre sırala
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

    // Beğeni işlemi
    const handleLike = async () => {
        if (!user || !selectedPost) return;
        setLikeLoading(true);
        const db = getDatabase();
        const likeRef = dbRef(db, `postLikes/${selectedPost.id}/${user.uid}`);
        if (likes && likes[user.uid]) {
            // Beğeniyi kaldır
            await remove(likeRef);
        } else {
            // Beğen
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

    const handleAddPost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.photo || !user) return;
        const pet = pets.find(p => p.id === newPost.petId);
        if (!pet) return;

        // 1. Fotoğrafı Storage'a yükle
        const storage = getStorage();
        const file = newPost.photo;
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.uid}/${pet.id}/${Date.now()}.${fileExtension}`;
        const fileRef = storageRef(storage, `post-photos/${fileName}`);
        await uploadBytes(fileRef, file);
        const photoUrl = await getDownloadURL(fileRef);

        // 2. Post'u veritabanına kaydet
        const post: Omit<Post, 'id'> = {
            petId: pet.id,
            userId: user.uid,
            photoUrl,
            caption: newPost.caption,
            createdAt: new Date().toISOString(),
            visibility: 'public',
            petName: pet.name,
            petPhoto: pet.profilePhoto || (pet.photos && pet.photos[0]) || '',
            petType: pet.type,
            userName: user.displayName || user.email || 'Kullanıcı',
            userPhoto: user.photoURL || '',
        };
        const postId = await addPostToDB(post);
        if (postId) {
            setPosts(prev => [
                { id: postId, ...post },
                ...prev,
            ]);
        }
        setShowModal(false);
        setNewPost({ petId: pets[0]?.id || '', photo: null, caption: '' });
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Tab'a göre gösterilecek gönderileri seç
    let postsToShow = posts;
    if (activeTab === 'mine') {
        postsToShow = user ? posts.filter(p => p.userId === user.uid) : [];
    } else if (activeTab === 'pets') {
        postsToShow = []; // Pets tab'ında gönderi gösterilmez
    }

    // Seçilen gönderileri privacy'e göre filtrele
    const filteredPosts = postsToShow.filter(post => {
        const petInfo = petPrivacyMap[post.petId];
        if (!petInfo) return false; // Pet bulunamadıysa gösterme
        if (petInfo.privacy === 'public') return true;
        if (!user) return false;
        if (petInfo.ownerId === user.uid) return true; // Sahibi ise görebilir
        if (petInfo.followers && petInfo.followers[user.uid]?.status === 'approved') return true; // Takipçi ise görebilir
        return false;
    });

    // Modalda ileri/geri geçiş fonksiyonları
    const handlePrev = () => {
        if (selectedIndex > 0) {
            setSelectedPost(filteredPosts[selectedIndex - 1]);
            setSelectedIndex(selectedIndex - 1);
        }
    };
    const handleNext = () => {
        if (selectedIndex < filteredPosts.length - 1) {
            setSelectedPost(filteredPosts[selectedIndex + 1]);
            setSelectedIndex(selectedIndex + 1);
        }
    };

    // Klavye ile geçiş (ok tuşları)
    useEffect(() => {
        if (selectedPost === null) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') setSelectedPost(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPost, selectedIndex, filteredPosts]);

    // Kullanıcının şehir bilgisini çek (örnek: user profilinden veya konumdan)
    useEffect(() => {
        if (!user) return;
        const db = getDatabase();
        const userRef = dbRef(db, `users/${user.uid}`);
        const off = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.city) setUserCity(data.city);
        });
        return () => off();
    }, [user]);

    // Aynı şehirdeki petleri çek
    useEffect(() => {
        if (!userCity) return;
        const db = getDatabase();
        const petsRef = dbRef(db, 'pets');
        const off = onValue(petsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const petsArray = Object.entries(data).flatMap(([userId, petsObj]: any) =>
                Object.entries(petsObj).map(([petId, pet]: any) => ({ ...pet, id: petId, userId }))
            );
            const filtered = petsArray.filter(pet => pet.city === userCity && pet.userId !== user?.uid);
            setCityPets(filtered);
        });
        return () => off();
    }, [userCity, user]);

    // Arama fonksiyonu
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        // Önce şehirdeki petlerde ara
        let foundPet = cityPets.find(pet =>
            pet.id === searchValue.trim() || (pet.name && pet.name.toLowerCase() === searchValue.trim().toLowerCase())
        );
        // Sonra keşfet gönderilerinde ara
        if (!foundPet) {
            foundPet = posts.find(post =>
                post.petId === searchValue.trim() || (post.petName && post.petName.toLowerCase() === searchValue.trim().toLowerCase())
            );
            if (foundPet) {
                router.push(`/pet/${foundPet.petId}`);
                return;
            }
        }
        if (foundPet) {
            router.push(`/pet/${foundPet.id}`);
        } else {
            alert("Pet bulunamadı");
        }
    };

    if (authLoading || petsLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
    }

    // Gönderi silme fonksiyonu
    const handleDeletePost = async () => {
        if (!selectedPost) return;
        setDeleteLoading(true);
        try {
            const db = getDatabase();
            // 1. Fotoğrafı storage'dan sil
            if (selectedPost.photoUrl && selectedPost.photoUrl.startsWith('https://')) {
                try {
                    const storage = getStorage();
                    const fileRef = storageRef(storage, selectedPost.photoUrl);
                    await deleteObject(fileRef);
                } catch (err) {
                    // Fotoğraf storage'dan silinemese de devam et
                }
            }
            // 2. Post'u veritabanından sil
            const postRef = dbRef(db, `posts/${selectedPost.id}`);
            await remove(postRef);
            // 3. Local state'ten çıkar
            setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
            setShowDeleteModal(false);
            setSelectedPost(null);
            toast.success('Gönderi başarıyla silindi!');
        } catch (error) {
            toast.error('Gönderi silinirken bir hata oluştu!');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-pink-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Modern Başlık ve Açıklama */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl md:text-5xl">🌟</span>
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow">Keşfet</h1>
                    </div>
                    <p className="text-lg text-gray-600 text-center max-w-xl">Tüm kullanıcıların paylaşımlarını burada keşfet! Evcil dostların maceralarını gör, beğen ve yorum yap. 🐾</p>
                </div>



                {/* Arama kutusu ve şehirdeki petler önerisi */}
                <div className="max-w-4xl mx-auto w-full mb-8 mt-4 flex flex-col gap-6">
                    <form onSubmit={handleSearch} className="flex gap-2 items-center">
                        <input
                            type="text"
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                            placeholder="Pet ID veya adını yaz..."
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                        />
                        <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-600 transition-all">Ara</button>
                    </form>
                    {userCity && cityPets.length > 0 && (
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="font-bold text-indigo-700 mb-2">Aynı şehirdeki petler ({userCity}):</div>
                            <div className="flex flex-wrap gap-4">
                                {cityPets.map(pet => (
                                    <div key={pet.id} className="flex flex-col items-center border rounded-lg p-3 w-40 bg-gradient-to-br from-indigo-50 to-pink-50 shadow">
                                        <div className="w-16 h-16 rounded-full bg-white shadow mb-2 overflow-hidden">
                                            {pet.profilePhoto ? (
                                                <img src={pet.profilePhoto} alt={pet.name} className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-50 to-purple-50">🐾</div>
                                            )}
                                        </div>
                                        <div className="font-semibold text-blue-900 text-sm truncate">{pet.name}</div>
                                        <div className="text-xs text-gray-500 mb-1">{pet.city}</div>
                                        {petPrivacyMap[pet.id]?.privacy === 'private' ? (
                                            <div className="text-xs text-pink-600 font-medium mb-1">Gizli Profil</div>
                                        ) : null}
                                        <button
                                            className="mt-1 px-3 py-1 rounded bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600"
                                            onClick={() => router.push(`/pet/${pet.id}`)}
                                        >
                                            Profili Gör
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {/* Tablar - Mobil Uyumlu */}
                <div className="flex justify-center mb-6 overflow-x-auto">
                    <div className="flex bg-gray-100 rounded-lg p-1 min-w-fit">
                        <button
                            className={`px-3 md:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'mine' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'}`}
                            onClick={() => setActiveTab('mine')}
                        >
                            <span className="md:hidden">Gönderilerim</span>
                            <span className="hidden md:inline">Kendi Gönderilerim</span>
                        </button>
                        <button
                            className={`px-3 md:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'explore' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'}`}
                            onClick={() => setActiveTab('explore')}
                        >
                            Keşfet
                        </button>
                        {user && pets && pets.length > 0 && (
                            <button
                                className={`px-3 md:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base whitespace-nowrap ${activeTab === 'pets' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'}`}
                                onClick={() => setActiveTab('pets')}
                            >
                                <span className="flex items-center gap-1">
                                    <span>🐾</span>
                                    <span>Petlerim</span>
                                </span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex justify-end mb-4">
                    <button
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg font-medium shadow hover:from-indigo-600 hover:to-purple-600 transition-all"
                        onClick={() => {
                            setShowModal(true);
                        }}
                        disabled={pets.length === 0}
                    >
                        Gönderi Paylaş
                    </button>
                </div>
                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative animate-fade-in-up">
                            <button
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowModal(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold text-blue-900 mb-4">Gönderi Paylaş</h2>
                            {pets.length === 0 ? (
                                <div className="text-center text-gray-500">Önce bir evcil hayvan eklemelisiniz.</div>
                            ) : (
                                <form onSubmit={handleAddPost} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Evcil Hayvan</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={newPost.petId}
                                            onChange={e => setNewPost(p => ({ ...p, petId: e.target.value }))}
                                        >
                                            {pets.map(pet => (
                                                <option key={pet.id} value={pet.id}>{pet.name} ({pet.type})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf</label>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp"
                                            ref={fileInputRef}
                                            onChange={e => {
                                                const file = e.target.files?.[0] || null;
                                                setNewPost(p => ({ ...p, photo: file }));
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    setPreviewUrl(url);
                                                } else {
                                                    setPreviewUrl(null);
                                                }
                                            }}
                                            className="w-full border rounded-lg px-3 py-2"
                                            required
                                        />
                                        {previewUrl && (
                                            <img src={previewUrl} alt="Önizleme" className="mt-2 rounded-lg w-full h-40 object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                        <textarea
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={newPost.caption}
                                            onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))}
                                            rows={3}
                                            maxLength={200}
                                            placeholder="Bugün neler yaptınız?"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                                        disabled={!newPost.photo || !newPost.caption}
                                    >
                                        Paylaş
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
                {/* Gönderi Detay Modalı */}
                {selectedPost && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                        {/* Sağ ve sol oklar modal kenarında, içerik dışında */}
                        {selectedIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-lg z-50 border border-gray-200"
                                style={{ minWidth: 44, minHeight: 44 }}
                                aria-label="Önceki gönderi"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        {selectedIndex < filteredPosts.length - 1 && (
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-lg z-50 border border-gray-200"
                                style={{ minWidth: 44, minHeight: 44 }}
                                aria-label="Sonraki gönderi"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        )}
                        <div className="bg-white rounded-xl shadow-lg p-0 w-full max-w-3xl relative animate-fade-in-up flex flex-col md:flex-row overflow-hidden">
                            {/* Eğer kendi gönderisi ise üç nokta menüsü */}
                            {user && selectedPost.userId === user.uid && (
                                <div className="absolute top-4 right-14 z-30">
                                    <button
                                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                                        onClick={() => setMenuOpen((v) => !v)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <circle cx="5" cy="12" r="2" />
                                            <circle cx="12" cy="12" r="2" />
                                            <circle cx="19" cy="12" r="2" />
                                        </svg>
                                    </button>
                                    {menuOpen && (
                                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border z-40">
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                                                onClick={() => {
                                                    setEditCaption(selectedPost.caption);
                                                    setEditPhoto(null);
                                                    setEditPreviewUrl(null);
                                                    setShowEditModal(true);
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Düzenle
                                            </button>
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 text-red-600 rounded-b-lg"
                                                onClick={() => {
                                                    setShowDeleteModal(true);
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                {/* Sayaç */}
                                <div className="text-xs text-gray-400 text-right mb-2">{selectedIndex + 1} / {filteredPosts.length}</div>
                                {/* Pet ve kullanıcı bilgisi */}
                                <div className="flex items-center gap-3 mb-2">
                                    {selectedPost.petPhoto && (
                                        <img
                                            src={selectedPost.petPhoto}
                                            alt={selectedPost.petName}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
                                            onClick={() => router.push(`/pet/${selectedPost.petId}`)}
                                        />
                                    )}
                                    <div>
                                        <div
                                            className="font-bold text-blue-900 text-lg cursor-pointer hover:underline"
                                            onClick={() => router.push(`/pet/${selectedPost.petId}`)}
                                        >
                                            {selectedPost.petName}
                                        </div>
                                        <div className="text-xs text-gray-500">{selectedPost.userName}</div>
                                    </div>
                                </div>
                                {/* Kutulu bilgiler */}
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div className="bg-pink-100 rounded-xl p-3 flex flex-col items-center">
                                        <span className="text-pink-600 font-bold text-lg">{Object.keys(likes || {}).length}</span>
                                        <span className="text-xs text-pink-700">Beğeni</span>
                                    </div>
                                    <div className="bg-indigo-100 rounded-xl p-3 flex flex-col items-center">
                                        <span className="text-indigo-600 font-bold text-lg">{comments.length}</span>
                                        <span className="text-xs text-indigo-700">Yorum</span>
                                    </div>
                                </div>
                                {/* Açıklama */}
                                <div className="bg-white rounded-xl p-3 shadow text-gray-800 mb-2">
                                    <span className="font-semibold">Açıklama:</span> {selectedPost.caption}
                                </div>
                                {/* Tarih */}
                                <div className="bg-gray-100 rounded-xl p-2 text-xs text-gray-500 text-center">
                                    {new Date(selectedPost.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                                {/* Beğeni butonu */}
                                <button
                                    className={`flex items-center gap-2 justify-center px-4 py-2 rounded-xl font-medium shadow transition-all ${likes && user && likes[user.uid] ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-pink-100 hover:text-pink-600'}`}
                                    onClick={handleLike}
                                    disabled={likeLoading || !user}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={likes && user && likes[user.uid] ? '#fff' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    {likes && user && likes[user.uid] ? 'Beğendin' : 'Beğen'}
                                </button>
                                {/* Yorumlar */}
                                <div className="bg-white rounded-xl p-3 shadow max-h-32 overflow-y-auto mt-2">
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
                                {/* Yorum ekle */}
                                {user && (
                                    <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-2">
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
                        {/* Düzenleme Modalı */}
                        {showEditModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Gönderiyi Düzenle</h3>
                                    <form className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                            <textarea
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={editCaption}
                                                onChange={e => setEditCaption(e.target.value)}
                                                rows={3}
                                                maxLength={200}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğrafı Değiştir</label>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.webp"
                                                ref={editFileInputRef}
                                                onChange={e => {
                                                    const file = e.target.files?.[0] || null;
                                                    setEditPhoto(file);
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setEditPreviewUrl(url);
                                                    } else {
                                                        setEditPreviewUrl(null);
                                                    }
                                                }}
                                                className="w-full border rounded-lg px-3 py-2"
                                            />
                                            {editPreviewUrl && (
                                                <img src={editPreviewUrl} alt="Önizleme" className="mt-2 rounded-lg w-full h-40 object-cover" />
                                            )}
                                        </div>
                                        <div className="flex gap-3 justify-end">
                                            <button
                                                type="button"
                                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                                onClick={() => setShowEditModal(false)}
                                            >
                                                Vazgeç
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all"
                                            >
                                                Kaydet
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                        {/* Silme Onay Modalı */}
                        {showDeleteModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in-up">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Gönderiyi Sil</h3>
                                    <p className="text-gray-600 mb-6">Bu işlemi geri alamazsınız. Emin misiniz?</p>
                                    <div className="flex gap-4 justify-end">
                                        <button
                                            onClick={() => setShowDeleteModal(false)}
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
                )}
                {/* Petlerim Tab İçeriği */}
                {activeTab === 'pets' ? (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Benim Petlerim</h2>
                        {pets.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🐾</div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz petiniz yok</h3>
                                <p className="text-gray-500 mb-6">İlk petinizi ekleyerek başlayın!</p>
                                <button
                                    onClick={() => router.push('/pet/edit')}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                                >
                                    Pet Ekle
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pets.map((pet, index) => (
                                    <div
                                        key={pet.id}
                                        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                                        onClick={() => router.push(`/pet/${pet.id}`)}
                                    >
                                        <div className="relative aspect-square bg-gradient-to-br from-indigo-50 to-purple-50">
                                            {pet.profilePhoto || (pet.photos && pet.photos.length > 0) ? (
                                                <img
                                                    src={pet.profilePhoto || (pet.photos && pet.photos[0]) || ''}
                                                    alt={pet.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-6xl">
                                                    {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐱' : '🐾'}
                                                </div>
                                            )}
                                            {index === 0 && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">{pet.name}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500 capitalize font-medium">{pet.type}</span>
                                                <div className="flex items-center gap-1 text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                                    <span className="text-sm font-medium">Profili Gör</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Gönderi Grid'i
                    <>
                        {/* Modern Grid Akışı */}
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 animate-fade-in"
                        >
                            {filteredPosts.length === 0 ? (
                                <div className="col-span-full text-center text-gray-500 py-12">Henüz gönderi yok.</div>
                            ) : (
                                filteredPosts.map((post, idx) => (
                                    <div
                                        key={post.id}
                                        className="relative aspect-[4/5] bg-white rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] border border-gray-100"
                                        onClick={() => openPostModal(post, idx)}
                                    >
                                        {/* Fotoğraf ve overlay */}
                                        <div className="relative w-full h-full">
                                            <img
                                                src={post.photoUrl}
                                                alt={post.caption}
                                                className="w-full h-full object-cover object-center transition-all duration-300 group-hover:brightness-90"
                                            />
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-all duration-300" />
                                            {/* Alt bilgi kutusu */}
                                            <div className="absolute bottom-0 left-0 w-full px-4 py-3 flex flex-col gap-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                                                <div className="flex items-center gap-2">
                                                    {post.petPhoto ? (
                                                        <img src={post.petPhoto} alt={post.petName} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-500">🐾</div>
                                                    )}
                                                    <span className="text-white font-semibold text-base truncate drop-shadow">{post.petName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-200">
                                                    <span className="truncate">{post.userName}</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    {/* Beğeni ve yorum sayısı kartlarda gösterilmeyecek */}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Hover'da açıklama */}
                                        {post.caption && (
                                            <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                                <div className="bg-white/90 rounded-xl px-4 py-2 mb-6 text-sm text-gray-800 shadow-lg max-w-[90%] truncate">
                                                    {post.caption}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Infinite Scroll - Daha Fazla Yükle */}
                        {(activeTab === 'mine' || activeTab === 'explore') && (
                            <div className="col-span-full flex justify-center py-8">
                                {loadingMore ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                                        <span>Yükleniyor...</span>
                                    </div>
                                ) : hasMore ? (
                                    <button
                                        onClick={loadMorePosts}
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        Daha Fazla Gönderi Yükle
                                    </button>
                                ) : filteredPosts.length > 0 ? (
                                    <div className="text-gray-500 text-center">
                                        <div className="text-2xl mb-2">🎉</div>
                                        <p>Tüm gönderileri gördünüz!</p>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </div>
            <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 500px; }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                @media (max-width: 640px) {
                    .grid-cols-3 {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (min-width: 640px) and (max-width: 1023px) {
                    .sm\:grid-cols-4 {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }
                }
                @media (min-width: 1024px) {
                    .md\:grid-cols-5 {
                        grid-template-columns: repeat(5, minmax(0, 1fr));
                    }
                }
            `}</style>
        </div>
    );
} 