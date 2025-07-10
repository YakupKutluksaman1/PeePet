import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // Ortam değişkenini logla (ilk 5 karakter güvenlik için)
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('GEMINI_API_KEY (ilk 5):', apiKey ? apiKey.slice(0, 5) : 'YOK');

        // Request body logu
        const bodyJson = await req.json();
        console.log('Gelen request body:', JSON.stringify(bodyJson));
        const { message, vetRecord } = bodyJson;

        if (!apiKey) {
            console.error('API anahtarı bulunamadı!');
            return NextResponse.json({ error: 'Gemini API anahtarı bulunamadı.' }, { status: 500 });
        }

        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const prompt = `Sen bir veteriner sağlık asistanısın. Aşağıda bir evcil hayvanın sağlık kayıtları var. Kullanıcı bu hayvanla ilgili sorular soracak. Sadece bilgilendirici cevaplar ver, teşhis koyma, acil durumlarda veterinerine danışmasını öner.\n\nSağlık Kayıtları: ${JSON.stringify(vetRecord, null, 2)}\n\nKullanıcı: ${message}`;

        const body = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        };

        console.log('Gemini API fetch başlatılıyor:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });
        console.log('Gemini API fetch tamamlandı. Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Gemini API HTTP Hatası:', response.status, errorText);
            return NextResponse.json({ error: `Google Gemini API HTTP Hatası: ${response.status} - ${errorText}` }, { status: 500 });
        }

        const data = await response.json();
        console.log('Gemini API yanıtı:', JSON.stringify(data));
        if (data.error) {
            console.error('Google Gemini API Yanıt Hatası:', data.error);
            return NextResponse.json({ error: `Google Gemini API Yanıt Hatası: ${JSON.stringify(data.error)}` }, { status: 500 });
        }
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';
        return NextResponse.json({ reply });
    } catch (error) {
        console.error('Gemini API Hatası (catch):', error);
        return NextResponse.json({ error: `Bir hata oluştu: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
} 