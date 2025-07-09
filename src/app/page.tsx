'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'

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
    <>
      <Head>
        <title>PeePet - Evcil Hayvan Eşleşme ve Hizmet Platformu</title>
        <meta name="description" content="PeePet ile evcil hayvanınız için en uygun eşleşmeyi bulun, güvenli ve kolay bir şekilde diğer evcil hayvan sahipleriyle tanışın. Pet shop, veteriner ve diğer hizmetlere ulaşın." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
      </Head>
      <main className="relative min-h-screen overflow-hidden">
        <div className="animated-bg absolute inset-0">
          <div className="bg-emoji">🐕</div>
          <div className="bg-emoji">🐈</div>
          <div className="bg-emoji">🐇</div>
          <div className="bg-emoji">🦊</div>
          <div className="hero-overlay" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Image
              src="/peepet.png"
              alt="PeePet Logo"
              width={220}
              height={220}
              className="rounded-full object-cover mx-auto animate-pulse hover:animate-none transition-all duration-300 hover:scale-110"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-white mb-8">
            PeePet
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

        <style jsx>{`
          .animated-bg {
            background: linear-gradient(
              45deg,
              #ff6b6b,
              #4ecdc4,
              #45b7d1,
              #f9ca24,
              #f0932b,
              #eb4d4b,
              #6c5ce7,
              #a29bfe
            );
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
          }

          @keyframes gradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          .bg-emoji {
            position: absolute;
            font-size: 3rem;
            opacity: 0.1;
            animation: float 20s infinite linear;
          }

          .bg-emoji:nth-child(1) {
            top: 10%;
            left: 10%;
            animation-delay: -5s;
          }

          .bg-emoji:nth-child(2) {
            top: 20%;
            right: 10%;
            animation-delay: -10s;
          }

          .bg-emoji:nth-child(3) {
            bottom: 20%;
            left: 20%;
            animation-delay: -15s;
          }

          .bg-emoji:nth-child(4) {
            bottom: 10%;
            right: 20%;
            animation-delay: -20s;
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }

          .hero-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              45deg,
              rgba(0, 0, 0, 0.3),
              rgba(0, 0, 0, 0.1),
              rgba(0, 0, 0, 0.3)
            );
          }
        `}</style>
      </main>
    </>
  )
}
