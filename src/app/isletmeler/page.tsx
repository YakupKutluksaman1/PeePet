'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '@/lib/firebase';

// İşletme kategorileri
const BUSINESS_CATEGORIES = [
    { id: 'veterinary', name: 'Veteriner Klinikleri ve Hastaneler' },
    { id: 'petshop', name: 'Pet Shop ve Malzeme Satıcıları' },
    { id: 'grooming', name: 'Bakım ve Güzellik Hizmetleri' },
    { id: 'boarding', name: 'Konaklama ve Bakım Hizmetleri' },
    { id: 'training', name: 'Eğitim ve Aktivite Merkezleri' },
    { id: 'entertainment', name: 'Eğlence ve Etkinlik İşletmeleri' },
    { id: 'transport', name: 'Ulaşım ve Seyahat Hizmetleri' },
    { id: 'health_products', name: 'Hayvan Sağlığı Ürünleri' },
    { id: 'shelter', name: 'Barınaklar ve Rehabilitasyon Merkezleri' },
    { id: 'special', name: 'Özel Hizmetler' },
    { id: 'farm', name: 'Çiftlik ve Büyük Hayvan Hizmetleri' },
    { id: 'tech', name: 'Teknoloji ve Yenilikçi Çözümler' }
]

// Alt kategoriler
const SUB_CATEGORIES = {
    veterinary: ['Genel Sağlık Hizmetleri', 'Uzman Veteriner Klinikleri', 'Acil Veteriner Hizmetleri'],
    petshop: ['Mama ve Beslenme Ürünleri', 'Aksesuar ve Oyuncaklar', 'Özel Diyet ve Vitamin Ürünleri'],
    grooming: ['Pet Kuaför/Tıraş Salonları', 'Yıkama ve Bakım Merkezleri', 'Spa ve Masaj Hizmetleri'],
    boarding: ['Pet Oteller/Pansiyonlar', 'Gündüz Bakım Merkezleri', 'Uzun Süreli Bakım Hizmetleri'],
    training: ['Eğitim ve Davranış Düzeltme Okulları', 'Agility ve Spor Merkezleri', 'Sosyalleşme Grupları'],
    entertainment: ['Pet Cafeler ve Restoranlar', 'Hayvan Dostu Etkinlik Alanları', 'Pet Parkları İşletmeleri'],
    transport: ['Pet Taxi/Transfer Hizmetleri', 'Evcil Hayvan Taşıma ve Lojistik', 'Seyahat Danışmanlığı'],
    health_products: ['Özel İlaç ve Tedavi Ürünleri', 'Tamamlayıcı Sağlık Ürünleri', 'Medikal Ekipman Tedarikçileri'],
    shelter: ['Özel Bakım Gerektiren Hayvanlar İçin Hizmetler', 'Sahiplendirme Organizasyonları', 'Yaşlı Hayvan Bakım Hizmetleri'],
    special: ['Pet Fotoğrafçılık Stüdyoları', 'Hayvan Mezarlıkları ve Anma Hizmetleri', 'Genetik ve Üreme Danışmanlığı'],
    farm: ['At Çiftlikleri ve Biniciliği', 'Çiftlik Hayvanları Bakımı ve Tedavisi', 'Organik/Doğal Ürün Üreten Çiftlikler'],
    tech: ['Hayvan Takip Sistemleri', 'Akıllı Mama ve Su Ürünleri', 'Dijital Sağlık İzleme Hizmetleri']
}

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐄', '🦮', '🐩', '🐈‍⬛', '🐕‍🦺', '🛒', '🏪', '🧾', '🛍️', '🎁', '💊', '🔍', '🦴', '🧶', '🧸', '🐄', '🐖', '🐎', '🦜', '🦢', '🐡', '🦩']

export default function BusinessPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [businessName, setBusinessName] = useState('')
    const [businessCategory, setBusinessCategory] = useState('')
    const [businessSubCategory, setBusinessSubCategory] = useState('')
    const [taxNumber, setTaxNumber] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [website, setWebsite] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([])

    const router = useRouter();
    const { signIn, registerBusiness, isBusinessUser, user } = useAuth();
    const auth = getAuth(app);
    const db = getDatabase();

    useEffect(() => {
        // Eğer kullanıcı zaten giriş yapmış ve işletme ise, panele yönlendir
        if (user && isBusinessUser()) {
            router.push('/business/dashboard');
        }

        // Arka plan emojilerini oluştur
        const emojis = Array.from({ length: 20 }, () => ({
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.5})`
            }
        }))
        setBackgroundEmojis(emojis)

        // Her 2 saniyede bir yeni emoji ekle
        const interval = setInterval(() => {
            setBackgroundEmojis(prev => {
                if (prev.length >= 30) {
                    return [...prev.slice(1), {
                        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                        style: {
                            left: `${Math.random() * 100}%`,
                            top: '-10%',
                            animationDelay: '0s',
                            transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.5})`
                        }
                    }]
                }
                return [...prev, {
                    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    style: {
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animationDelay: '0s',
                        transform: `rotate(${Math.random() * 360}deg) scale(${0.8 + Math.random() * 0.5})`
                    }
                }]
            })
        }, 2000)

        return () => clearInterval(interval)
    }, [user, isBusinessUser, router]);

    // İşletme hesabını direkt veritabanından kontrol et
    const checkBusinessAccount = async (userId: string) => {
        try {
            console.log("checkBusinessAccount çağrıldı, userId:", userId);
            const businessRef = ref(db, `businesses/${userId}/profile`);
            const snapshot = await get(businessRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log("İşletme profil verisi:", data);

                // Eğer userType alanı business ise veya businessName alanı doluysa işletme hesabıdır
                if (data.userType === 'business' || data.businessName) {
                    console.log("İŞLETME HESABI ONAYLANDI!");
                    return true;
                }
            }

            console.log("İşletme hesabı bulunamadı:", userId);
            return false;
        } catch (error) {
            console.error("İşletme hesabı kontrolünde hata:", error);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Direkt Firebase Authentication API'sini kullanalım
                console.log("İşletme girişi denemesi:", email);

                try {
                    // Firebase ile giriş yap
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const userId = userCredential.user.uid;
                    console.log("Kullanıcı girişi başarılı, uid:", userId);

                    // Bu kullanıcının işletme olup olmadığını kontrol et
                    const businessRef = ref(db, `businesses/${userId}/profile`);
                    const businessSnapshot = await get(businessRef);

                    if (businessSnapshot.exists()) {
                        // İşletme verisini al
                        const data = businessSnapshot.val();
                        console.log("İşletme profili bulundu:", data.businessName);

                        toast.success('İşletme girişi başarılı! Yönlendiriliyorsunuz...');
                        router.push('/business/dashboard');
                    } else {
                        // İşletme hesabı değilse çıkış yap
                        console.log("İşletme profili bulunamadı, normal kullanıcı");
                        await auth.signOut();

                        setError('Bu hesap bir kullanıcı hesabıdır. İşletme hesabınızla giriş yapın veya yeni bir işletme hesabı oluşturun.');
                        toast.error('Bu hesap bir işletme hesabı değil. Kullanıcı hesapları için kullanıcı girişini kullanın.');
                    }
                } catch (authError: any) {
                    console.error("Firebase auth hatası:", authError);
                    let errorMessage = 'Giriş yapılırken bir hata oluştu';

                    if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
                        errorMessage = 'E-posta veya şifre hatalı';
                    }

                    setError(errorMessage);
                    toast.error(errorMessage);
                }
            } else {
                // Kayıt işlemi

                // Şifre kontrolü
                if (password !== confirmPassword) {
                    setError('Şifreler eşleşmiyor');
                    toast.error('Şifreler eşleşmiyor');
                    setLoading(false);
                    return;
                }

                // Kategori kontrolü
                if (!businessCategory) {
                    setError('Lütfen işletme kategorisi seçin');
                    toast.error('Lütfen işletme kategorisi seçin');
                    setLoading(false);
                    return;
                }

                // İşletme verileri
                const businessData = {
                    businessName,
                    businessCategory,
                    businessSubCategory: businessSubCategory || null,
                    taxNumber,
                    phone,
                    address,
                    location: {
                        city,
                        district,
                        fullAddress: address
                    },
                    website: website || null,
                    description: description || null,
                    status: 'active', // varsayılan olarak aktif
                    verified: false // başlangıçta doğrulanmamış
                };

                // İşletme kayıt işlemi
                await registerBusiness(email, password, businessData);

                toast.success('İşletme kaydınız başarıyla oluşturuldu! İşletme panelinize yönlendiriliyorsunuz.');
                router.push('/business/dashboard');
            }
        } catch (err: any) {
            // Firebase hata kodlarını daha anlaşılır mesajlara çevir
            let errorMessage = 'Bir hata oluştu';

            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Bu e-posta adresi zaten kullanımda';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Geçersiz e-posta adresi';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Şifre çok zayıf. En az 6 karakter kullanın';
            } else if (err.message) {
                errorMessage = err.message;
            }

            console.error('Firebase hata kodu:', err.code); // Hata kodunu konsola yazdıralım
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('İşlem hatası:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100/90 to-purple-100/90 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-indigo-200/50 to-purple-200/50 backdrop-blur-sm">
                {backgroundEmojis.map((item, index) => (
                    <div
                        key={index}
                        className="absolute text-4xl animate-float opacity-20 transition-all duration-300 hover:opacity-100 hover:scale-125 cursor-default"
                        style={item.style}
                    >
                        {item.emoji}
                    </div>
                ))}
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 w-full max-w-2xl relative z-10 shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <span className="text-4xl">{isLogin ? '🔑' : '📋'}</span>
                        {isLogin ? 'İşletme Girişi' : 'İşletme Kaydı'}
                        <span className="text-4xl">{isLogin ? '🏪' : '🐾'}</span>
                    </h2>
                    <p className="text-gray-600">
                        {isLogin ? 'İşletme yönetim paneline erişin' : 'İşletmenizi platformumuza ekleyin'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <>
                            <div className="relative">
                                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                        🏪
                                    </span>
                                    <input
                                        id="businessName"
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        required
                                        placeholder="İşletme Adınız"
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label htmlFor="businessCategory" className="block text-sm font-medium text-gray-700 mb-1">İşletme Kategorisi</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                        🔍
                                    </span>
                                    <select
                                        id="businessCategory"
                                        value={businessCategory}
                                        onChange={(e) => {
                                            setBusinessCategory(e.target.value);
                                            setBusinessSubCategory('');
                                        }}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    >
                                        <option value="">Kategori Seçin</option>
                                        {BUSINESS_CATEGORIES.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {businessCategory && (
                                <div className="relative">
                                    <label htmlFor="businessSubCategory" className="block text-sm font-medium text-gray-700 mb-1">Alt Kategori</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                            📑
                                        </span>
                                        <select
                                            id="businessSubCategory"
                                            value={businessSubCategory}
                                            onChange={(e) => setBusinessSubCategory(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        >
                                            <option value="">Alt Kategori Seçin</option>
                                            {SUB_CATEGORIES[businessCategory as keyof typeof SUB_CATEGORIES]?.map((subCategory, index) => (
                                                <option key={index} value={subCategory}>
                                                    {subCategory}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                        🧾
                                    </span>
                                    <input
                                        id="taxNumber"
                                        type="text"
                                        value={taxNumber}
                                        onChange={(e) => setTaxNumber(e.target.value)}
                                        required
                                        placeholder="Vergi Numaranız"
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                            📱
                                        </span>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                            placeholder="(5XX) XXX XX XX"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">Web Sitesi <span className="text-gray-400">(İsteğe Bağlı)</span></label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                            🌐
                                        </span>
                                        <input
                                            id="website"
                                            type="url"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            placeholder="https://www.example.com"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                                <div className="relative">
                                    <span className="absolute top-3 left-4 flex items-center text-gray-500">
                                        📍
                                    </span>
                                    <textarea
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        required
                                        placeholder="İşletme Adresiniz"
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                                    <input
                                        id="city"
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        required
                                        placeholder="Şehir"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                                <div className="relative">
                                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                                    <input
                                        id="district"
                                        type="text"
                                        value={district}
                                        onChange={(e) => setDistrict(e.target.value)}
                                        required
                                        placeholder="İlçe"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">İşletme Açıklaması <span className="text-gray-400">(İsteğe Bağlı)</span></label>
                                <div className="relative">
                                    <span className="absolute top-3 left-4 flex items-center text-gray-500">
                                        📝
                                    </span>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="İşletmeniz hakkında kısa bir açıklama"
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-200 my-6 pt-6">
                                <h3 className="text-gray-700 font-medium mb-3">Hesap Bilgileri</h3>
                            </div>
                        </>
                    )}

                    <div className="relative">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                ✉️
                            </span>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ornek@isletme.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                🔒
                            </span>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="relative">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                                    🔒
                                </span>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 font-medium flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşlem yapılıyor...
                            </>
                        ) : (
                            <>
                                {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                    >
                        {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                    </button>
                </div>

                <div className="mt-8 pt-5 border-t border-gray-200">
                    <div className="flex justify-center space-x-4">
                        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 shadow-sm hover:shadow">
                            <span>🏠</span>
                            <span>Ana Sayfa</span>
                        </Link>
                        <Link href="/auth" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 shadow-sm hover:shadow">
                            <span>👤</span>
                            <span>Kullanıcı Girişi</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stil tanımlamaları */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0);
                        opacity: 0.2;
                    }
                    50% {
                        transform: translateY(400px) rotate(180deg);
                        opacity: 0.1;
                    }
                    100% {
                        transform: translateY(800px) rotate(360deg);
                        opacity: 0;
                    }
                }
                .animate-float {
                    animation: float 15s linear infinite;
                }
            `}</style>
        </div>
    )
} 