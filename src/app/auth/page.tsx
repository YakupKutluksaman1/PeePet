'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { getDatabase, ref, set, get } from 'firebase/database'
import { User } from '@/types/user'
import { cities } from '@/data/cities'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰', '🦮', '🐩', '🐈‍⬛', '🐕‍🦺', '🐹', '🦁', '🐯', '🦒', '🦊', '💖', '💝', '💗', '🌸', '🎀']

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([])
    const [showTermsModal, setShowTermsModal] = useState(false)

    const { signIn, signUp, logout } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // Kullanıcının daha önce şartları gördüğünü kontrol et
        const hasSeenTerms = localStorage.getItem('hasSeenTerms')
        if (!hasSeenTerms) {
            setShowTermsModal(true)
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
    }, [])

    const handleCloseTermsModal = () => {
        setShowTermsModal(false)
        localStorage.setItem('hasSeenTerms', 'true')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                // Önce Firebase Auth ile giriş yap
                const userCredential = await signIn(email, password)

                if (!userCredential || !userCredential.user) {
                    throw new Error('Giriş başarısız oldu')
                }

                // Kullanıcı işletme hesabı mı kontrol et
                const userId = userCredential.user.uid
                const db = getDatabase()

                // İşletme hesabı kontrolü
                const businessRef = ref(db, `businesses/${userId}/profile`)
                const businessSnapshot = await get(businessRef)

                if (businessSnapshot.exists()) {
                    // Eğer işletme hesabı ise hata göster ve çıkış yap
                    setError('Bu hesap bir işletme hesabıdır. Lütfen işletme giriş sayfasını kullanın.')
                    toast.error('İşletme hesapları için lütfen işletme giriş sayfasını kullanın.')

                    // Giriş yapılan hesaptan otomatik çıkış yap
                    await logout()
                    return
                }

                // Normal kullanıcı ise dashboard'a yönlendir
                router.push('/dashboard')
            } else {
                const userCredential = await signUp(email, password)
                const user = userCredential.user

                const db = getDatabase()
                const userRef = ref(db, `users/${user.uid}`)

                const userData: User = {
                    id: user.uid,
                    email: user.email || '',
                    firstName,
                    lastName,
                    phone,
                    location: {
                        city,
                        district,
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }

                await set(userRef, userData)
                router.push('/profile/create')
            }
        } catch (err: any) {
            // Hata mesajlarını daha kullanıcı dostu hale getir
            let errorMessage = 'Bir hata oluştu'

            if (err.code === 'auth/invalid-email') {
                errorMessage = 'Geçersiz e-posta adresi'
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                errorMessage = 'E-posta veya şifre hatalı'
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Şifre çok zayıf. En az 6 karakter kullanın'
            } else if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Bu e-posta adresi zaten kullanımda'
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100/90 to-indigo-100/90 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-gray-200/50 to-indigo-200/50 backdrop-blur-sm">
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

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 w-full max-w-md relative z-10 shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    {/* Logo Alanı */}
                    <div className="mx-auto w-32 h-32 flex items-center justify-center mb-4">
                        <Image src="/peepet.png" alt="PeePet Logo" width={120} height={120} className="rounded-full object-cover" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        {isLogin ? 'Hoş Geldiniz' : 'Aramıza Katılın'}
                    </h2>
                    <p className="text-gray-600">
                        {isLogin ? 'Minik dostlarınızla buluşmaya hazır mısınız?' : 'Minik dostlarınız için yeni arkadaşlar bulun'}
                    </p>
                </div>

                {/* Uyarı Mesajı */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-amber-500 text-xl">⚠️</span>
                        <div>
                            <p className="text-amber-800 font-medium text-sm leading-relaxed">
                                <strong>Önemli Uyarı:</strong> Hayvanların satışı, ticareti ve pazarlaması yasaktır.
                                Sadece güvenilir kişilere sahiplendirilebilir.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        placeholder="Adınız"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                                <div className="relative">
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        placeholder="Soyadınız"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
                            </div>

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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                                    <select
                                        id="city"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    >
                                        <option value="">Seçiniz</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                                    <input
                                        id="district"
                                        type="text"
                                        value={district}
                                        onChange={(e) => setDistrict(e.target.value)}
                                        required
                                        placeholder="İlçeniz"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
                                    />
                                </div>
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
                                placeholder="ornek@email.com"
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

                    {error && (
                        <div className="bg-red-50 text-red-800 rounded-xl p-4 flex items-center gap-2">
                            <span>⚠️</span>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Yükleniyor...</span>
                            </>
                        ) : (
                            <>
                                <span>{isLogin ? '🎈 Giriş Yap' : '✨ Kayıt Ol'}</span>
                            </>
                        )}
                    </button>

                    <div className="flex justify-center mt-4">
                        <Link
                            href="/"
                            className="w-full text-center px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <span>🏠</span> Ana Sayfaya Dön
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="w-full text-center py-3 text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <span>{isLogin ? '🌟' : '💫'}</span>
                        {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                    </button>
                </form>
            </div>

            {/* Şartlar ve Koşullar Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
                        <div className="text-center mb-6">
                            {/* Logo Alanı */}
                            <div className="mx-auto w-36 h-36 flex items-center justify-center mb-4">
                                <Image src="/peepet.png" alt="PeePet Logo" width={135} height={135} className="rounded-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                Önemli Bilgilendirme
                            </h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-red-500 text-xl">🚫</span>
                                    <div>
                                        <p className="text-red-800 font-medium text-sm leading-relaxed">
                                            <strong>Yasal Uyarı:</strong> Hayvanların satışı, ticareti ve pazarlaması yasaktır.
                                            Bu platform sadece güvenilir kişilere sahiplendirme amacıyla kullanılabilir.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-500 text-xl">ℹ️</span>
                                    <div>
                                        <p className="text-blue-800 text-sm leading-relaxed">
                                            <strong>Platformumuzun Amacı:</strong> Hayvan severleri bir araya getirmek,
                                            sahipsiz hayvanlar için yuva bulmak ve sorumlu sahiplenmeyi desteklemektir.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-green-500 text-xl">💚</span>
                                    <div>
                                        <p className="text-green-800 text-sm leading-relaxed">
                                            <strong>Sorumlu Sahiplenme:</strong> Lütfen hayvanları sahiplenirken
                                            uzun vadeli bakım sorumluluğunu göz önünde bulundurun.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCloseTermsModal}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <span>✓</span>
                            Anladım, Devam Et
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0deg);
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
                    animation: float 20s linear infinite;
                }
            `}</style>
        </div>
    )
} 
