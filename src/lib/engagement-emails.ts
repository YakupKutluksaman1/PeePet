import { sendEmail, EmailTemplate } from './email';

// Kullanıcı geri kazanma email'leri
export async function sendEngagementEmail(
    userEmail: string,
    userName: string,
    scenario: 'pending_match' | 'pending_message' | 'general_inactive' | 'pending_follow' | 'no_matches',
    data?: {
        matchCount?: number;
        messageCount?: number;
        followRequestCount?: number;
        petName?: string;
    }
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let subject = '';
    let html = '';
    let text = '';

    // Senaryoya göre email içeriği
    switch (scenario) {
        case 'pending_match':
            subject = `💕 ${data?.petName || 'Evcil dostun'} için yeni eşleşme var!`;
            html = generateMatchEmailHTML(userName, data?.matchCount || 1, data?.petName || 'evcil dostun', appUrl);
            text = generateMatchEmailText(userName, data?.matchCount || 1, data?.petName || 'evcil dostun', appUrl);
            break;

        case 'pending_message':
            subject = `💬 ${data?.messageCount || ''} yeni mesajın var!`;
            html = generateMessageEmailHTML(userName, data?.messageCount || 1, appUrl);
            text = generateMessageEmailText(userName, data?.messageCount || 1, appUrl);
            break;

        case 'pending_follow':
            subject = `👥 ${data?.followRequestCount || ''} takip isteğin bekliyor!`;
            html = generateFollowEmailHTML(userName, data?.followRequestCount || 1, appUrl);
            text = generateFollowEmailText(userName, data?.followRequestCount || 1, appUrl);
            break;

        case 'no_matches':
            subject = `🌟 Yeni dostlar seni keşfetmek istiyor!`;
            html = generateNoMatchesEmailHTML(userName, appUrl);
            text = generateNoMatchesEmailText(userName, appUrl);
            break;

        default: // general_inactive
            subject = `🐾 Seni özledik ${userName}!`;
            html = generateGeneralEmailHTML(userName, appUrl);
            text = generateGeneralEmailText(userName, appUrl);
            break;
    }

    return await sendEmail({
        to: userEmail,
        subject,
        html,
        text
    });
}

// Email template fonksiyonları
function generateMatchEmailHTML(userName: string, matchCount: number, petName: string, appUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Yeni Eşleşme Var!</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px 20px; }
                .highlight { background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #ec4899; }
                .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💕 Yeni Eşleşme!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${userName}</strong>,</p>
                    <p>Harika haberler! ${petName} için ${matchCount} yeni eşleşme var ve seni bekliyor!</p>
                    <div class="highlight">
                        <h3 style="color: #be185d; margin: 0 0 10px 0;">🎉 ${matchCount} Yeni Arkadaşlık İsteği</h3>
                        <p style="margin: 0; color: #831843;">Evcil dostun için yeni arkadaşlık fırsatları var!</p>
                    </div>
                    <p>Bu özel anları kaçırma! Hemen giriş yaparak yeni dostlarla tanış.</p>
                    <div style="text-align: center;">
                        <a href="${appUrl}/matches" class="button">Eşleşmeleri Gör</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateMatchEmailText(userName: string, matchCount: number, petName: string, appUrl: string): string {
    return `
        Merhaba ${userName},
        
        ${petName} için ${matchCount} yeni eşleşme var!
        
        Eşleşmeleri görmek için: ${appUrl}/matches
        
        PetApp Ekibi
    `;
}

function generateMessageEmailHTML(userName: string, messageCount: number, appUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px 20px; }
                .highlight { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #3b82f6; }
                .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💬 Yeni Mesajlar!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${userName}</strong>,</p>
                    <p>Birisi seninle konuşmak istiyor! ${messageCount} yeni mesajın var.</p>
                    <div class="highlight">
                        <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">📱 ${messageCount} Okunmamış Mesaj</h3>
                        <p style="margin: 0; color: #1e3a8a;">Arkadaşların seni bekliyor!</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${appUrl}/messages" class="button">Mesajları Oku</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateMessageEmailText(userName: string, messageCount: number, appUrl: string): string {
    return `
        Merhaba ${userName},
        
        ${messageCount} yeni mesajın var!
        
        Mesajları okumak için: ${appUrl}/messages
        
        PetApp Ekibi
    `;
}

function generateFollowEmailHTML(userName: string, followCount: number, appUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px 20px; }
                .highlight { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #8b5cf6; }
                .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>👥 Takip İstekleri!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${userName}</strong>,</p>
                    <p>${followCount} takip isteğin bekliyor! Yeni arkadaşlık fırsatlarını kaçırma.</p>
                    <div class="highlight">
                        <h3 style="color: #7c3aed; margin: 0 0 10px 0;">🔔 ${followCount} Bekleyen İstek</h3>
                        <p style="margin: 0; color: #6b21a8;">Seni takip etmek isteyenler var!</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${appUrl}/dashboard" class="button">İstekleri Gör</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateFollowEmailText(userName: string, followCount: number, appUrl: string): string {
    return `
        Merhaba ${userName},
        
        ${followCount} takip isteğin bekliyor!
        
        İstekleri görmek için: ${appUrl}/dashboard
        
        PetApp Ekibi
    `;
}

function generateNoMatchesEmailHTML(userName: string, appUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px 20px; }
                .highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #f59e0b; }
                .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌟 Yeni Dostlar Seni Bekliyor!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${userName}</strong>,</p>
                    <p>Çevrendeki yeni evcil hayvan sahipleri seni keşfetmek istiyor!</p>
                    <div class="highlight">
                        <h3 style="color: #d97706; margin: 0 0 10px 0;">🔍 Keşfet ve Eşleş</h3>
                        <p style="margin: 0; color: #92400e;">Yeni arkadaşlıklar için harita üzerinde gez!</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${appUrl}/match" class="button">Keşfetmeye Başla</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateNoMatchesEmailText(userName: string, appUrl: string): string {
    return `
        Merhaba ${userName},
        
        Çevrendeki yeni evcil hayvan sahipleri seni keşfetmek istiyor!
        
        Keşfetmeye başlamak için: ${appUrl}/match
        
        PetApp Ekibi
    `;
}

function generateGeneralEmailHTML(userName: string, appUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px 20px; }
                .highlight { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
                .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🐾 Seni Özledik!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${userName}</strong>,</p>
                    <p>Uzun zamandır aramızda görünmüyorsun! Dostların ve yeni keşifler seni bekliyor.</p>
                    <div class="highlight">
                        <h3 style="color: #059669; margin: 0 0 10px 0;">🏠 Geri Hoşgeldin!</h3>
                        <p style="margin: 0; color: #065f46;">Evcil dostların maceralarını takip et, yeni arkadaşlıklar kur!</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${appUrl}/dashboard" class="button">Geri Dön</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function generateGeneralEmailText(userName: string, appUrl: string): string {
    return `
        Merhaba ${userName},
        
        Seni özledik! Dostların ve yeni keşifler seni bekliyor.
        
        Geri dönmek için: ${appUrl}/dashboard
        
        PetApp Ekibi
    `;
}

// Yeni mesaj bildirimi
export async function sendNewMessageNotification(
    receiverEmail: string,
    receiverName: string,
    senderName: string,
    petName: string,
    messageText: string,
    conversationId: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const messagesUrl = `${appUrl}/messages/${conversationId}`;

    const subject = `💬 ${senderName} size mesaj gönderdi`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
                .content { padding: 30px 20px; }
                .message { background: #f1f5f9; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
                .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💬 Yeni Mesaj!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${receiverName}</strong>,</p>
                    <p><strong>${senderName}</strong> size ${petName} hakkında mesaj gönderdi:</p>
                    <div class="message">
                        <strong>💬 Mesaj:</strong><br/>
                        "${messageText}"
                    </div>
                    <div style="text-align: center;">
                        <a href="${messagesUrl}" class="button">Mesajı Yanıtla</a>
                    </div>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Merhaba ${receiverName},
        
        ${senderName} size ${petName} hakkında mesaj gönderdi:
        "${messageText}"
        
        Yanıtlamak için: ${messagesUrl}
        
        PetApp Ekibi
    `;

    const { sendEmail } = await import('./email');
    return await sendEmail({
        to: receiverEmail,
        subject,
        html,
        text
    });
}
