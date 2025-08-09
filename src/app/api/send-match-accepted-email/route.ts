import { NextRequest, NextResponse } from 'next/server';
import { sendMatchAcceptedNotification } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { matchId, requesterUserId, accepterUserId } = body;

        if (!matchId || !requesterUserId || !accepterUserId) {
            return NextResponse.json(
                { error: 'Gerekli parametreler eksik' },
                { status: 400 }
            );
        }

        const db = rdb;

        // Eşleşme bilgilerini çek
        const matchRef = ref(db, `matches/${matchId}`);
        const matchSnapshot = await get(matchRef);

        if (!matchSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Eşleşme bulunamadı' },
                { status: 404 }
            );
        }

        const matchData = matchSnapshot.val();

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

        // Kabul eden kullanıcı bilgilerini çek
        const accepterRef = ref(db, `users/${accepterUserId}`);
        const accepterSnapshot = await get(accepterRef);

        if (!accepterSnapshot.exists()) {
            return NextResponse.json(
                { error: 'Kabul eden kullanıcı bulunamadı' },
                { status: 404 }
            );
        }

        const accepterData = accepterSnapshot.val();

        // İstek gönderenin pet bilgilerini çek
        const requesterPetRef = ref(db, `pets/${requesterUserId}/${matchData.petId}`);
        const requesterPetSnapshot = await get(requesterPetRef);

        if (!requesterPetSnapshot.exists()) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcının peti bulunamadı' },
                { status: 404 }
            );
        }

        const requesterPetData = requesterPetSnapshot.val();

        // Kabul edenin aktif petini bul
        let accepterPetData = null;
        try {
            // Önce user location'dan aktif pet'i al
            const userLocationRef = ref(db, `userLocations/${accepterUserId}`);
            const userLocationSnapshot = await get(userLocationRef);

            let activePetId = '';
            if (userLocationSnapshot.exists()) {
                const locationData = userLocationSnapshot.val();
                activePetId = locationData.activePetId || '';
            }

            // Eğer aktif pet varsa onu kullan
            if (activePetId) {
                const accepterPetRef = ref(db, `pets/${accepterUserId}/${activePetId}`);
                const accepterPetSnapshot = await get(accepterPetRef);
                if (accepterPetSnapshot.exists()) {
                    accepterPetData = accepterPetSnapshot.val();
                }
            }

            // Eğer aktif pet bulunamazsa, ilk peti al
            if (!accepterPetData) {
                const accepterPetsRef = ref(db, `pets/${accepterUserId}`);
                const accepterPetsSnapshot = await get(accepterPetsRef);
                if (accepterPetsSnapshot.exists()) {
                    const pets = accepterPetsSnapshot.val();
                    const petIds = Object.keys(pets);
                    if (petIds.length > 0) {
                        accepterPetData = pets[petIds[0]];
                    }
                }
            }
        } catch (error) {
            console.error('Kabul eden kullanıcının pet bilgileri alınamadı:', error);
        }

        // Email bilgilerini kontrol et
        if (!requesterData.email) {
            return NextResponse.json(
                { error: 'İstek gönderen kullanıcının email adresi bulunamadı' },
                { status: 400 }
            );
        }

        // Pet adlarını belirle
        const requesterPetName = requesterPetData.name || 'Bilinmeyen Pet';
        const accepterPetName = accepterPetData?.name || 'Bilinmeyen Pet';

        // Email gönder
        const emailSent = await sendMatchAcceptedNotification(
            requesterData.email,
            `${requesterData.firstName} ${requesterData.lastName}` || requesterData.email,
            requesterPetName,
            `${accepterData.firstName} ${accepterData.lastName}` || accepterData.email,
            accepterPetName
        );

        if (emailSent) {
            return NextResponse.json(
                { message: 'Eşleşme kabul edildi emaili başarıyla gönderildi' },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: 'Email gönderilirken hata oluştu' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Eşleşme kabul edildi email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}