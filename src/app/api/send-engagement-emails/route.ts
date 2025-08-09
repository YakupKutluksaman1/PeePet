import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const dryRun = searchParams.get('dryRun') === 'true';
        const minDays = parseInt(searchParams.get('minDays') || '5');
        const maxEmails = parseInt(searchParams.get('maxEmails') || '20');

        // İnaktif kullanıcıları bul
        const inactiveUsersResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/check-inactive-users?minDays=${minDays}&maxUsers=${maxEmails}`,
            { method: 'GET' }
        );

        if (!inactiveUsersResponse.ok) {
            throw new Error('İnaktif kullanıcılar alınamadı');
        }

        const { inactiveUsers } = await inactiveUsersResponse.json();

        if (!dryRun) {
            // Email geçmişini kontrol et (spam önleme)
            const db = adminDb;
            const emailHistorySnapshot = await db.ref('engagementEmailHistory').once('value');
            const emailHistory = emailHistorySnapshot.val() || {};

            const results = [];
            const now = new Date().toISOString();
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            for (const user of inactiveUsers) {
                // Son 24 saatte bu kullanıcıya email gönderilmiş mi kontrol et
                const userEmailHistory = emailHistory[user.userId];
                if (userEmailHistory && userEmailHistory.lastSent > oneDayAgo) {
                    results.push({
                        userId: user.userId,
                        email: user.email,
                        status: 'skipped',
                        reason: 'Email sent in last 24 hours'
                    });
                    continue;
                }

                try {
                    // Email gönder
                    const emailResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-engagement-email`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: user.userId,
                                scenario: user.scenario,
                                data: user.data
                            }),
                        }
                    );

                    if (emailResponse.ok) {
                        // Email geçmişini güncelle
                        await db.ref(`engagementEmailHistory/${user.userId}`).set({
                            lastSent: now,
                            scenario: user.scenario,
                            daysInactive: user.daysInactive
                        });

                        results.push({
                            userId: user.userId,
                            email: user.email,
                            status: 'sent',
                            scenario: user.scenario,
                            daysInactive: user.daysInactive
                        });
                    } else {
                        results.push({
                            userId: user.userId,
                            email: user.email,
                            status: 'failed',
                            reason: 'Email API error'
                        });
                    }
                } catch (emailError) {
                    results.push({
                        userId: user.userId,
                        email: user.email,
                        status: 'failed',
                        reason: `Error: ${emailError.message}`
                    });
                }

                // Rate limiting - 1 saniye bekle
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return NextResponse.json({
                message: 'Engagement email gönderimi tamamlandı',
                totalUsers: inactiveUsers.length,
                results,
                summary: {
                    sent: results.filter(r => r.status === 'sent').length,
                    failed: results.filter(r => r.status === 'failed').length,
                    skipped: results.filter(r => r.status === 'skipped').length
                }
            });
        } else {
            // Dry run - sadece analiz et
            return NextResponse.json({
                message: 'Dry run - email gönderilmedi',
                totalUsers: inactiveUsers.length,
                users: inactiveUsers.map(user => ({
                    email: user.email,
                    name: user.name,
                    scenario: user.scenario,
                    daysInactive: user.daysInactive,
                    data: user.data
                }))
            });
        }

    } catch (error) {
        console.error('Engagement email gönderim hatası:', error);
        return NextResponse.json(
            { error: 'İç sunucu hatası', details: error.message },
            { status: 500 }
        );
    }
}
