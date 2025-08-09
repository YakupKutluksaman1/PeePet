import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            schedule = 'daily',
            time = '10:00',
            minDays = 5,
            maxEmails = 30,
            enabled = true
        } = body;

        // Zamanlanmış görev bilgilerini kaydet
        // Bu gerçek bir scheduler değil, sadak yapılandırma saklama
        const schedulerConfig = {
            schedule,
            time,
            minDays,
            maxEmails,
            enabled,
            lastRun: null,
            nextRun: calculateNextRun(schedule, time),
            createdAt: new Date().toISOString()
        };

        // Production'da bu bilgileri database'e kaydetmek gerekir
        console.log('📅 Scheduler configured:', schedulerConfig);

        return NextResponse.json({
            message: 'Engagement email scheduler configured',
            config: schedulerConfig
        });

    } catch (error) {
        console.error('Scheduler configuration error:', error);
        return NextResponse.json(
            { error: 'Scheduler configuration failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Mevcut scheduler yapılandırmasını döndür
    return NextResponse.json({
        schedule: 'daily',
        time: '10:00',
        minDays: 5,
        maxEmails: 30,
        enabled: true,
        lastRun: null,
        nextRun: calculateNextRun('daily', '10:00')
    });
}

function calculateNextRun(schedule: string, time: string): string {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (schedule === 'daily') {
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
    }

    return nextRun.toISOString();
}
