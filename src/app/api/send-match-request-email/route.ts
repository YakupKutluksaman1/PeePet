import { NextRequest, NextResponse } from 'next/server';
import { sendMatchRequestNotification } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetPetId, requesterUserId, ownerUserId, requesterPetId } = body;

        if (!targetPetId || !requesterUserId || !ownerUserId || !requesterPetId) {
            return NextResponse.json(
                { error: 'Gerekli parametreler eksik' },
                { status: 400 }
            );
        }

        const db = adminDb;
        if (!db) {
            return NextResponse.json(
                { error: 'Firebase Admin SDK not initialized' },
                { status: 500 }
            );
        }

        // Hedef pet bilgilerini çek
        const targetPetSnapshot = await db.ref(`pets/${ownerUserId}/${targetPetId}`).once('value');

        if (!targetPetSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Hedef pet bulunamadı' },
                { status: 404 }
            );
        }
        const targetPetData = targetPetSnapshot.val();

        // Pet sahibi bilgilerini çek
        const ownerSnapshot = await db.ref(`users/${ownerUserId}`).once('value');

        if (!ownerSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Pet sahibi bulunamadı' },
                { status: 404 }
            );
        }
        const ownerData = ownerSnapshot.val();

        // İstek gönderen kullanıcı bilgilerini çek
        const requesterSnapshot = await db.ref(`users/${requesterUserId}`).once('value');

        if (!requesterSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcı bulunamadı' },
                { status: 404 }
            );
        }
        const requesterData = requesterSnapshot.val();

        // İstek gönderen kullanıcının pet bilgilerini çek
        const requesterPetSnapshot = await db.ref(`pets/${requesterUserId}/${requesterPetId}`).once('value');

        if (!requesterPetSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen pet bulunamadı' },
                { status: 404 }
            );
        }
        const requesterPetData = requesterPetSnapshot.val();

        // Email bilgilerini kontrol et
        if (!ownerData.email) {
            return NextResponse.json(
                { error: 'Pet sahibinin email adresi bulunamadı' },
                { status: 400 }
            );
        }

        // Email gönder
        const emailSent = await sendMatchRequestNotification(
            ownerData.email,
            `${ownerData.firstName} ${ownerData.lastName}` || ownerData.email,
            targetPetData.name,
            `${requesterData.firstName} ${requesterData.lastName}` || requesterData.email,
            requesterPetData.name,
            targetPetId
        );

        if (emailSent) {
            return NextResponse.json(
                { message: 'Eşleşme isteği emaili başarıyla gönderildi' },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: 'Email gönderilirken hata oluştu' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Eşleşme isteği email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}