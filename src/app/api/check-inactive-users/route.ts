import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface InactiveUser {
    userId: string;
    email: string;
    name: string;
    lastActive: string;
    daysInactive: number;
    scenario: 'pending_match' | 'pending_message' | 'pending_follow' | 'no_matches' | 'general_inactive';
    data?: {
        matchCount?: number;
        messageCount?: number;
        followRequestCount?: number;
        petName?: string;
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const minDays = parseInt(searchParams.get('minDays') || '5');
        const maxUsers = parseInt(searchParams.get('maxUsers') || '50');

        const db = adminDb;
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (minDays * 24 * 60 * 60 * 1000));

        // Kullanıcıları çek
        const usersSnapshot = await db.ref('users').once('value');

        if (!usersSnapshot.exists()) {
            return NextResponse.json({ inactiveUsers: [] });
        }

        const users = usersSnapshot.val();
        const inactiveUsers: InactiveUser[] = [];

        // Paralel olarak diğer verileri çek
        const [userLocationsSnapshot, matchesSnapshot, messagesSnapshot, followersSnapshot] = await Promise.all([
            db.ref('userLocations').once('value'),
            db.ref('matches').once('value'),
            db.ref('messages').once('value'),
            db.ref('petFollowers').once('value')
        ]);

        const userLocations = userLocationsSnapshot.val() || {};
        const matches = matchesSnapshot.val() || {};
        const messages = messagesSnapshot.val() || {};
        const followers = followersSnapshot.val() || {};

        // Her kullanıcı için inaktiflik kontrolü
        for (const [userId, userData] of Object.entries(users) as [string, any][]) {
            if (!userData.email) continue;

            // Son aktiflik zamanını bul
            let lastActiveDate = new Date(userData.createdAt || '2024-01-01');

            // User locations'dan son aktiflik
            if (userLocations[userId]?.timestamp) {
                const locationDate = new Date(userLocations[userId].timestamp);
                if (locationDate > lastActiveDate) {
                    lastActiveDate = locationDate;
                }
            }

            // Eğer 5 günden az inaktifse atla
            const daysSinceActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceActive < minDays) continue;

            // Kullanıcının durumunu analiz et
            const analysis = await analyzeUserStatus(userId, userData, matches, messages, followers, db);

            if (analysis.shouldSendEmail) {
                inactiveUsers.push({
                    userId,
                    email: userData.email,
                    name: userData.firstName
                        ? `${userData.firstName} ${userData.lastName || ''}`.trim()
                        : userData.displayName || userData.email.split('@')[0],
                    lastActive: lastActiveDate.toISOString(),
                    daysInactive: daysSinceActive,
                    scenario: analysis.scenario,
                    data: analysis.data
                });
            }

            // Maksimum kullanıcı sayısına ulaştıysak dur
            if (inactiveUsers.length >= maxUsers) break;
        }

        return NextResponse.json({
            inactiveUsers,
            totalFound: inactiveUsers.length,
            cutoffDate: cutoffDate.toISOString()
        });

    } catch (error) {
        console.error('İnaktif kullanıcılar kontrol edilirken hata:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}

async function analyzeUserStatus(
    userId: string,
    userData: any,
    matches: any,
    messages: any,
    followers: any,
    db: any
) {
    let scenario: InactiveUser['scenario'] = 'general_inactive';
    let data: InactiveUser['data'] = {};
    let shouldSendEmail = true;

    // 1. Bekleyen eşleşmeleri kontrol et
    const pendingMatches = Object.values(matches || {}).filter((match: any) =>
        match.receiverId === userId && match.status === 'pending'
    ) as any[];

    if (pendingMatches.length > 0) {
        scenario = 'pending_match';
        data.matchCount = pendingMatches.length;

        // Pet adını bul
        try {
            const userPetsSnapshot = await db.ref(`pets/${userId}`).once('value');
            if (userPetsSnapshot.exists()) {
                const pets = userPetsSnapshot.val();
                const petIds = Object.keys(pets);
                if (petIds.length > 0) {
                    data.petName = pets[petIds[0]].name;
                }
            }
        } catch (error) {
            // Pet adı bulunamazsa genel isim kullan
        }

        return { scenario, data, shouldSendEmail: true };
    }

    // 2. Okunmamış mesajları kontrol et
    let unreadMessageCount = 0;
    for (const [conversationId, messageList] of Object.entries(messages || {}) as [string, any][]) {
        if (Array.isArray(messageList)) {
            // Kullanıcının bu konuşmada olup olmadığını kontrol et
            try {
                const conversationSnapshot = await db.ref(`conversations/${conversationId}`).once('value');
                if (conversationSnapshot.exists()) {
                    const conversation = conversationSnapshot.val();
                    if (conversation.participants?.includes(userId)) {
                        // Okunmamış mesajları say
                        const unreadInThisConversation = messageList.filter((message: any) =>
                            message.senderId !== userId && !message.read
                        ).length;
                        unreadMessageCount += unreadInThisConversation;
                    }
                }
            } catch (error) {
                // Hata durumunda devam et
            }
        }
    }

    if (unreadMessageCount > 0) {
        scenario = 'pending_message';
        data.messageCount = unreadMessageCount;
        return { scenario, data, shouldSendEmail: true };
    }

    // 3. Bekleyen takip isteklerini kontrol et
    let pendingFollowCount = 0;
    try {
        const userPetsSnapshot = await db.ref(`pets/${userId}`).once('value');
        if (userPetsSnapshot.exists()) {
            const userPets = userPetsSnapshot.val();
            for (const petId of Object.keys(userPets)) {
                if (followers[petId]) {
                    const petFollowers = followers[petId];
                    pendingFollowCount += Object.values(petFollowers).filter((follower: any) =>
                        follower.status === 'pending'
                    ).length;
                }
            }
        }
    } catch (error) {
        // Hata durumunda devam et
    }

    if (pendingFollowCount > 0) {
        scenario = 'pending_follow';
        data.followRequestCount = pendingFollowCount;
        return { scenario, data, shouldSendEmail: true };
    }

    // 4. Hiç eşleşme olmayan uzun süreli kullanıcılar (10+ gün)
    const userMatches = Object.values(matches || {}).filter((match: any) =>
        match.senderId === userId || match.receiverId === userId
    ) as any[];

    if (userMatches.length === 0) {
        scenario = 'no_matches';
        return { scenario, data, shouldSendEmail: true };
    }

    // 5. Genel inaktif kullanıcı
    return { scenario: 'general_inactive', data: {}, shouldSendEmail: true };
}
