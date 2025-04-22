'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰', '🦮', '🐩', '🐈‍⬛', '🐕‍🦺', '🛒', '🏪', '🧾', '🛍️', '🎁', '💊', '🔍', '🦴', '🧶', '🧸']

export default function PetShopPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [businessName, setBusinessName] = useState('')
    const [taxNumber, setTaxNumber] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [district, setDistrict] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([])

    const router = useRouter()

    useEffect(() => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                // Burada giriş işlemi yapılacak
                console.log('Giriş yapılıyor:', { email, password })
                // Şimdilik sadece console.log ile gösteriyoruz
                alert('Giriş işlemi başarılı (Bu bir demodir, gerçek giriş yapılmamıştır)')
                router.push('/dashboard')
            } else {
                // Şifre kontrolü
                if (password !== confirmPassword) {
                    setError('Şifreler eşleşmiyor')
                    setLoading(false)
                    return
                }

                // Burada kayıt işlemi yapılacak
                console.log('Kayıt yapılıyor:', {
                    email,
                    password,
                    businessName,
                    taxNumber,
                    phone,
                    address,
                    city,
                    district
                })
                // Şimdilik sadece console.log ile gösteriyoruz
                alert('Kayıt işlemi başarılı (Bu bir demodir, gerçek kayıt yapılmamıştır)')
                router.push('/dashboard')
            }
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

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

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 w-full max-w-md relative z-10 shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <span className="text-4xl">🏪</span>
                        {isLogin ? 'Pet Shop Girişi' : 'Pet Shop Kaydı'}
                        <span className="text-4xl">🛍️</span>
                    </h2>
                    <p className="text-gray-600">
                        {isLogin ? 'Pet Shop yönetim paneline erişin' : 'Pet Shop işletmenizi platformumuza ekleyin'}
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

                            <div className="grid grid-cols-2 gap-4">
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
                                placeholder="ornek@petshop.com"
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
                        <Link href="/" className="text-gray-600 hover:text-gray-800 transition-colors">
                            Ana Sayfa
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link href="/auth" className="text-gray-600 hover:text-gray-800 transition-colors">
                            Kullanıcı Girişi
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