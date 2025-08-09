import { NextRequest, NextResponse } from 'next/server';
import { sendEngagementEmail } from '@/lib/engagement-emails';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, scenario, data } = body;

        if (!userId || !scenario) {
            return NextResponse.json(
                { error: 'Gerekli parametreler eksik (userId, scenario)' },
                { status: 400 }
            );
        }

        const db = adminDb;

        // Kullanıcı bilgilerini çek
        const userSnapshot = await db.ref(`users/${userId}`).once('value');

        if (!userSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const userData = userSnapshot.val();

        // Email bilgilerini kontrol et
        if (!userData.email) {
            return NextResponse.json(
                { error: 'Kullanıcının email adresi bulunamadı' },
                { status: 400 }
            );
        }

        // Kullanıcı adını belirle
        const userName = userData.firstName
            ? `${userData.firstName} ${userData.lastName || ''}`.trim()
            : userData.displayName || userData.email.split('@')[0];

        // Email gönder
        const emailSent = await sendEngagementEmail(
            userData.email,
            userName,
            scenario,
            data
        );

        if (emailSent) {
            return NextResponse.json(
                { message: 'Engagement emaili başarıyla gönderildi', scenario },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: 'Email gönderilirken hata oluştu' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Engagement email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}
