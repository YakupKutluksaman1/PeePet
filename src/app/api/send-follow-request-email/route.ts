import { NextRequest, NextResponse } from 'next/server';
import { sendFollowRequestNotification } from '@/lib/email';
import { rdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { petId, requesterUserId, ownerUserId } = body;

        if (!petId || !requesterUserId || !ownerUserId) {
            return NextResponse.json(
                { error: 'Gerekli parametreler eksik' },
                { status: 400 }
            );
        }

        const db = rdb;

        // Pet bilgilerini çek
        const petRef = ref(db, `pets/${ownerUserId}/${petId}`);
        const petSnapshot = await get(petRef);

        if (!petSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Pet bulunamadı' },
                { status: 404 }
            );
        }

        const petData = petSnapshot.val();

        // Sahip bilgilerini çek
        const ownerRef = ref(db, `users/${ownerUserId}`);
        const ownerSnapshot = await get(ownerRef);

        if (!ownerSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Pet sahibi bulunamadı' },
                { status: 404 }
            );
        }

        const ownerData = ownerSnapshot.val();

        // Takip isteği gönderen kullanıcı bilgilerini çek
        const requesterRef = ref(db, `users/${requesterUserId}`);
        const requesterSnapshot = await get(requesterRef);

        if (!requesterSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const requesterData = requesterSnapshot.val();

        // Email bilgilerini kontrol et
        if (!ownerData.email) {
            return NextResponse.json(
                { error: 'Pet sahibinin email adresi bulunamadı' },
                { status: 400 }
            );
        }

        // Email gönder
        const emailSent = await sendFollowRequestNotification(
            ownerData.email,
            `${ownerData.firstName} ${ownerData.lastName}` || ownerData.email,
            petData.name,
            `${requesterData.firstName} ${requesterData.lastName}` || requesterData.email,
            petId
        );

        if (emailSent) {
            return NextResponse.json(
                { message: 'Takip isteği emaili başarıyla gönderildi' },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: 'Email gönderilirken hata oluştu' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Takip isteği email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}