import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Sadece Vercel cron job'larından gelen istekleri kabul et
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Engagement email gönderimi
        const response = await fetch(`${baseUrl}/api/send-engagement-emails?dryRun=false&minDays=5&maxEmails=30`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        // Sonuçları logla
        console.log('📧 Daily engagement emails sent:', {
            timestamp: new Date().toISOString(),
            totalUsers: result.totalUsers,
            summary: result.summary
        });

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            result
        });

    } catch (error) {
        console.error('❌ Cron job failed:', error);
        return NextResponse.json(
            {
                error: 'Cron job failed',
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
