'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="animated-bg absolute inset-0">
        <div className="bg-emoji">🐕</div>
        <div className="bg-emoji">🐈</div>
        <div className="bg-emoji">🐇</div>
        <div className="bg-emoji">🦊</div>
        <div className="hero-overlay" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-white mb-8">
          Evcil Hayvan Eşleştirme
        </h1>

        <p className="text-xl text-white/90 text-center max-w-2xl mb-12">
          Evcil hayvanınız için en uygun eşleşmeyi bulun. Güvenli ve kolay bir şekilde diğer evcil hayvan sahipleriyle tanışın.
        </p>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <button className="relative px-8 py-6 bg-white/90 backdrop-blur-sm rounded-xl text-gray-900 font-semibold text-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <Link href="/auth">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0s' }}>🐾</span>
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>❤️</span>
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🐾</span>
                </div>
                <span className="text-2xl">Eşleşmeye Hazır mısınız?</span>
                <span className="text-3xl transform group-hover:translate-x-2 transition-transform duration-300">→</span>
              </div>
            </Link>
          </button>
        </div>

        <div className="relative group mt-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <button className="relative px-8 py-6 bg-white/90 backdrop-blur-sm rounded-xl text-gray-900 font-semibold text-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <Link href="/isletmeler">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0s' }}>🏪</span>
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🐄</span>
                  <span className="text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🦜</span>
                </div>
                <span className="text-2xl">Evcil Hizmetler Portalı</span>
                <span className="text-3xl transform group-hover:translate-x-2 transition-transform duration-300">→</span>
              </div>
            </Link>
          </button>
        </div>
      </div>
    </main>
  )
}
