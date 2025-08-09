import { NextRequest, NextResponse } from 'next/server';
import { sendMatchRequestNotification } from '@/lib/email';
import { rdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

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

        const db = rdb;

        // Hedef pet bilgilerini çek
        const targetPetRef = ref(db, `pets/${ownerUserId}/${targetPetId}`);
        const targetPetSnapshot = await get(targetPetRef);

        if (!targetPetSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Hedef pet bulunamadı' },
                { status: 404 }
            );
        }

        const targetPetData = targetPetSnapshot.val();

        // Pet sahibi bilgilerini çek
        const ownerRef = ref(db, `users/${ownerUserId}`);
        const ownerSnapshot = await get(ownerRef);

        if (!ownerSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Pet sahibi bulunamadı' },
                { status: 404 }
            );
        }

        const ownerData = ownerSnapshot.val();

        // İstek gönderen kullanıcı bilgilerini çek
        const requesterRef = ref(db, `users/${requesterUserId}`);
        const requesterSnapshot = await get(requesterRef);

        if (!requesterSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const requesterData = requesterSnapshot.val();

        // İstek gönderen kullanıcının pet bilgilerini çek
        const requesterPetRef = ref(db, `pets/${requesterUserId}/${requesterPetId}`);
        const requesterPetSnapshot = await get(requesterPetRef);

        if (!requesterPetSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcının peti bulunamadı' },
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
