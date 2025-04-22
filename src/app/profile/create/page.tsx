'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { getDatabase, ref, set, push } from 'firebase/database'
import { Pet } from '@/types/pet'
import { breeds } from '@/data/breeds'
import toast, { Toaster } from 'react-hot-toast'

const EMOJIS = ['🐕', '🐈', '🐇', '🦊', '🐾', '❤️', '🐱', '🐶', '🐰']

export default function CreateProfilePage() {
    const [pet, setPet] = useState<Partial<Pet>>({
        name: '',
        type: '',
        breed: '',
        age: '',
        gender: '',
        description: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([])
    const [availableBreeds, setAvailableBreeds] = useState<string[]>([])

    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!user) {
            router.push('/auth')
            return
        }

        // Arka plan emojilerini oluştur
        const emojis = Array.from({ length: 15 }, () => ({
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: 0.1 + Math.random() * 0.2,
                fontSize: `${1 + Math.random() * 1.5}rem`
            }
        }))
        setBackgroundEmojis(emojis)

        // Her 3 saniyede bir yeni emoji ekle
        const interval = setInterval(() => {
            setBackgroundEmojis(prev => {
                if (prev.length >= 25) {
                    return [...prev.slice(1), {
                        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                        style: {
                            left: `${Math.random() * 100}%`,
                            top: '-10%',
                            animationDelay: '0s',
                            opacity: 0.1 + Math.random() * 0.2,
                            fontSize: `${1 + Math.random() * 1.5}rem`
                        }
                    }]
                }
                return [...prev, {
                    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    style: {
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animationDelay: '0s',
                        opacity: 0.1 + Math.random() * 0.2,
                        fontSize: `${1 + Math.random() * 1.5}rem`
                    }
                }]
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [user, router])

    // Tür seçildiğinde ırkları güncelle
    useEffect(() => {
        if (pet.type) {
            setAvailableBreeds(breeds[pet.type as keyof typeof breeds] || [])
            setPet(prev => ({ ...prev, breed: '' })) // Tür değiştiğinde ırk seçimini sıfırla
        } else {
            setAvailableBreeds([])
        }
    }, [pet.type])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const loadingToast = toast.loading('Evcil hayvan profili oluşturuluyor... 🐾', {
            position: 'top-center'
        })

        try {
            if (!user) throw new Error('Kullanıcı bulunamadı')

            const db = getDatabase()
            // Her evcil hayvan için benzersiz bir ID oluştur
            const petsRef = ref(db, `pets/${user.uid}`)
            const newPetRef = push(petsRef) // Otomatik benzersiz ID oluşturur
            const petId = newPetRef.key

            if (!petId) throw new Error('Benzersiz ID oluşturulamadı')

            const petData: Pet = {
                id: petId, // Benzersiz ID kullan
                name: pet.name || '',
                type: pet.type || '',
                breed: pet.breed || '',
                age: pet.age || '',
                gender: pet.gender || '',
                description: pet.description || '',
                ownerId: user.uid,
                ownerName: user.displayName || 'Evcil Hayvan Sahibi',
                ownerPhotoURL: user.photoURL || '',
                photos: [], // Fotoğraflar için boş dizi başlat
                profilePhoto: '', // Profil fotoğrafı başlangıçta boş olsun
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // Evcil hayvanı benzersiz ID altında kaydet
            await set(newPetRef, petData)

            toast.success('Evcil hayvan profili başarıyla oluşturuldu! 🎉', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#DCFCE7',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                }
            })

            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        } catch (err: any) {
            setError(err.message)
            toast.error(`Hata: ${err.message}`, {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                }
            })
        } finally {
            toast.dismiss(loadingToast)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 opacity-50" />
                {backgroundEmojis.map((item, index) => (
                    <div
                        key={index}
                        className="absolute text-4xl animate-float opacity-10"
                        style={item.style}
                    >
                        {item.emoji}
                    </div>
                ))}
            </div>

            {/* Ana İçerik */}
            <div className="relative z-10 py-12">
                <Toaster />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white/90 rounded-2xl shadow-xl p-6 md:p-10 backdrop-blur-sm border border-white/20">
                        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-indigo-50 transition-all duration-300 hover:shadow-lg text-indigo-700"
                                aria-label="Geri dön"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span>Evcil Hayvan Profili Oluştur</span>
                                <span className="text-2xl">🐾</span>
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Temel Bilgiler */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🏷️ İsim</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={pet.name}
                                        onChange={(e) => setPet({ ...pet, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                        required
                                        placeholder="Evcil hayvanınızın adı"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🐾 Tür</span>
                                    </label>
                                    <select
                                        id="type"
                                        value={pet.type}
                                        onChange={(e) => setPet({ ...pet, type: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm appearance-none"
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        <option value="dog">Köpek</option>
                                        <option value="cat">Kedi</option>
                                        <option value="rabbit">Tavşan</option>
                                        <option value="bird">Kuş</option>
                                    </select>
                                </div>
                            </div>

                            {/* Detay Bilgileri */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🧬 Irk</span>
                                    </label>
                                    <select
                                        id="breed"
                                        value={pet.breed}
                                        onChange={(e) => setPet({ ...pet, breed: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm appearance-none"
                                        required
                                        disabled={!pet.type}
                                    >
                                        <option value="">Seçiniz</option>
                                        {availableBreeds.map((breed) => (
                                            <option key={breed} value={breed}>
                                                {breed}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <span>🗓️ Yaş</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="age"
                                        value={pet.age}
                                        onChange={(e) => setPet({ ...pet, age: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                        required
                                        placeholder="Yaşı"
                                    />
                                </div>
                            </div>

                            {/* Cinsiyet */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <span>⚤ Cinsiyet</span>
                                </label>
                                <div className="flex gap-6">
                                    <label className="flex items-center bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-indigo-50">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="male"
                                            checked={pet.gender === 'male'}
                                            onChange={(e) => setPet({ ...pet, gender: e.target.value })}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2">👨 Erkek</span>
                                    </label>
                                    <label className="flex items-center bg-white/80 px-5 py-3 rounded-xl shadow-sm border border-gray-200 cursor-pointer transition-all hover:bg-indigo-50">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="female"
                                            checked={pet.gender === 'female'}
                                            onChange={(e) => setPet({ ...pet, gender: e.target.value })}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2">👩 Dişi</span>
                                    </label>
                                </div>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <span>📝 Açıklama</span>
                                </label>
                                <textarea
                                    id="description"
                                    value={pet.description}
                                    onChange={(e) => setPet({ ...pet, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white/80 shadow-sm"
                                    placeholder="Evcil hayvanınız hakkında bilgi verin"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </div>
                                </div>
                            )}

                            {/* Butonlar */}
                            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-8 py-3 rounded-xl text-white font-medium transition-all duration-200 shadow-md ${loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5'
                                        }`}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Yükleniyor...
                                        </div>
                                    ) : 'Profil Oluştur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Stil tanımlamaları */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translateY(0) rotate(0);
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
                    animation: float 15s linear infinite;
                }
            `}</style>
        </div>
    )
} 