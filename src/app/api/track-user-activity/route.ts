import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, activity, metadata } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId gereklidir' },
                { status: 400 }
            );
        }

        const db = adminDb;
        const now = new Date().toISOString();

        // Kullanıcının location kaydını güncelle
        await db.ref(`userLocations/${userId}`).update({
            lastActiveAt: now,
            lastActivity: activity || 'page_visit',
            timestamp: now
        });

        // Aktivite geçmişi kaydet (isteğe bağlı)
        if (metadata) {
            await db.ref(`userActivityHistory/${userId}/${Date.now()}`).update({
                activity: activity || 'page_visit',
                timestamp: now,
                ...metadata
            });
        }

        return NextResponse.json({
            message: 'Kullanıcı aktivitesi kaydedildi',
            timestamp: now
        });

    } catch (error) {
        console.error('Kullanıcı aktivitesi kaydedilirken hata:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}
