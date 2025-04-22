'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';

const EMOJIS = ['🔒', '🔑', '🔐', '🛡️', '🔏', '🔓', '🗝️', '✨'];

export default function ChangePassword() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [backgroundEmojis, setBackgroundEmojis] = useState<Array<{ emoji: string; style: any }>>([]);

    // Arka plan emojileri için effect
    useEffect(() => {
        // İlk emoji setini oluştur
        const emojis = Array.from({ length: 15 }, () => ({
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            style: {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`
            }
        }));
        setBackgroundEmojis(emojis);

        // Her 3 saniyede bir yeni emoji ekle
        const interval = setInterval(() => {
            setBackgroundEmojis(prev => {
                if (prev.length >= 25) {
                    return [...prev.slice(1), {
                        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                        style: {
                            left: `${Math.random() * 100}%`,
                            top: '-10%',
                            animationDelay: '0s'
                        }
                    }];
                }
                return [...prev, {
                    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
                    style: {
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animationDelay: '0s'
                    }
                }];
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) {
        router.push('/auth');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Yeni şifreler eşleşmiyor! 🚫', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                }
            });
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Yeni şifre en az 6 karakter olmalıdır! 📏', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                }
            });
            return;
        }

        const loadingToast = toast.loading('Şifreniz güncelleniyor... 🔄', {
            position: 'top-center'
        });

        setIsLoading(true);
        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser || !currentUser.email) throw new Error('Kullanıcı bulunamadı!');

            const credential = EmailAuthProvider.credential(
                currentUser.email,
                currentPassword
            );
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);

            toast.success('Şifreniz başarıyla güncellendi! 🎉', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#DCFCE7',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                }
            });

            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);

        } catch (error: any) {
            console.error('Şifre değiştirme hatası:', error);
            if (error.code === 'auth/wrong-password') {
                toast.error('Mevcut şifreniz yanlış! 🔐', {
                    duration: 3000,
                    position: 'top-center',
                    style: {
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                    }
                });
            } else {
                toast.error('Şifre değiştirme işlemi başarısız oldu. Lütfen tekrar deneyin. ⚠️', {
                    duration: 3000,
                    position: 'top-center',
                    style: {
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                    }
                });
            }
        } finally {
            toast.dismiss(loadingToast);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Animasyonlu Arka Plan */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-50" />
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
                <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 backdrop-blur-sm bg-opacity-90">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => router.back()}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span>Şifre Değiştir</span>
                                <span className="text-2xl">🔐</span>
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span>Mevcut Şifre</span>
                                    <span className="text-lg">🔑</span>
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white bg-opacity-80"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span>Yeni Şifre</span>
                                    <span className="text-lg">🔒</span>
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white bg-opacity-80"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <span>Yeni Şifre (Tekrar)</span>
                                    <span className="text-lg">🔒</span>
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white bg-opacity-80"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex justify-end gap-4">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                                >
                                    <span>İptal</span>
                                    <span>❌</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 flex items-center gap-2 ${isLoading
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                                        }`}
                                >
                                    <span>{isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}</span>
                                    <span>{isLoading ? '🔄' : '✨'}</span>
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
    );
} 