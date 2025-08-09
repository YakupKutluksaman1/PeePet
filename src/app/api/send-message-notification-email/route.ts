import { NextRequest, NextResponse } from 'next/server';
import { sendNewMessageNotification } from '@/lib/engagement-emails';
import { rdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            receiverUserId,
            senderUserId,
            messageText,
            conversationId,
            petName
        } = body;

        if (!receiverUserId || !senderUserId || !messageText || !conversationId) {
            return NextResponse.json(
                { error: 'Gerekli parametreler eksik' },
                { status: 400 }
            );
        }

        const db = rdb;

        // Mesajı alan kullanıcı bilgilerini çek
        const receiverRef = ref(db, `users/${receiverUserId}`);
        const receiverSnapshot = await get(receiverRef);

        if (!receiverSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Mesajı alan kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const receiverData = receiverSnapshot.val();

        // Mesajı gönderen kullanıcı bilgilerini çek
        const senderRef = ref(db, `users/${senderUserId}`);
        const senderSnapshot = await get(senderRef);

        if (!senderSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Mesajı gönderen kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const senderData = senderSnapshot.val();

        // Email bilgilerini kontrol et
        if (!receiverData.email) {
            return NextResponse.json(
                { error: 'Mesajı alan kullanıcının email adresi bulunamadı' },
                { status: 400 }
            );
        }

        // İsim bilgilerini formatla
        const receiverName = `${receiverData.firstName} ${receiverData.lastName}` || receiverData.email;
        const senderName = `${senderData.firstName} ${senderData.lastName}` || senderData.email;

        // Email gönder
        const emailSent = await sendNewMessageNotification(
            receiverData.email,
            receiverName,
            senderName,
            petName || 'Evcil Hayvan',
            messageText,
            conversationId
        );

        if (emailSent) {
            return NextResponse.json(
                { message: 'Mesaj bildirimi emaili başarıyla gönderildi' },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: 'Email gönderilirken hata oluştu' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Mesaj bildirimi email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}