import sgMail from '@sendgrid/mail';

// SendGrid API Key'ini ayarla
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailTemplate {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// Email gönderme fonksiyonu
export async function sendEmail({ to, subject, html, text }: EmailTemplate): Promise<boolean> {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            console.error('SendGrid API key bulunamadı');
            return false;
        }

        if (!process.env.SENDGRID_FROM_EMAIL) {
            console.error('SendGrid FROM email bulunamadı');
            return false;
        }

        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: process.env.SENDGRID_FROM_NAME || 'PetApp'
            },
            subject,
            text: text || subject,
            html
        };

        console.log('Email gönderiliyor:', { to, from: msg.from.email, subject });
        await sgMail.send(msg);
        console.log('Email başarıyla gönderildi:', to);
        return true;
    } catch (error) {
        console.error('Email gönderilirken hata:', error);

        // SendGrid hata detaylarını logla
        if (error.response && error.response.body) {
            console.error('SendGrid hata detayı:', error.response.body);
        }

        return false;
    }
}

// Takip isteği bildirimi
export async function sendFollowRequestNotification(
    ownerEmail: string,
    ownerName: string,
    petName: string,
    requesterName: string,
    petId: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const petUrl = `${appUrl}/pet/${petId}`;

    const subject = `${petName} - Yeni Takip İsteği`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Takip İsteği Bildirimi</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f8fafc; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    font-weight: 600; 
                }
                .content { 
                    padding: 30px 20px; 
                }
                .pet-info { 
                    background: #f1f5f9; 
                    border-radius: 8px; 
                    padding: 20px; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .pet-name { 
                    font-size: 20px; 
                    font-weight: bold; 
                    color: #1e293b; 
                    margin-bottom: 5px; 
                }
                .requester { 
                    color: #475569; 
                    font-size: 16px; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .footer { 
                    background: #f8fafc; 
                    padding: 20px; 
                    text-align: center; 
                    color: #64748b; 
                    font-size: 14px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🐾 Yeni Takip İsteği!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${ownerName}</strong>,</p>
                    
                    <p>Evcil dostunuz için yeni bir takip isteği var!</p>
                    
                    <div class="pet-info">
                        <div class="pet-name">🐕 ${petName}</div>
                        <div class="requester">
                            <strong>${requesterName}</strong> takip etmek istiyor
                        </div>
                    </div>
                    
                    <p>Bu isteği onaylamak veya reddetmek için pet profiline göz atabilirsiniz:</p>
                    
                    <div style="text-align: center;">
                        <a href="${petUrl}" class="button">
                            Pet Profilini Görüntüle
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                        Bu email otomatik olarak gönderilmiştir. Takip isteklerini pet profilinizden yönetebilirsiniz.
                    </p>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                    <p>Bu emaili almak istemiyorsanız hesap ayarlarınızdan bildirimlerinizi kapatabilirsiniz.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const text = `
        Merhaba ${ownerName},
        
        ${requesterName} adlı kullanıcı ${petName} isimli evcil dostunuzu takip etmek istiyor.
        
        Bu isteği onaylamak için: ${petUrl}
        
        PetApp Ekibi
    `;

    return await sendEmail({
        to: ownerEmail,
        subject,
        html,
        text
    });
}

// Takip isteği onaylandı bildirimi
export async function sendFollowRequestApprovedNotification(
    requesterEmail: string,
    requesterName: string,
    petName: string,
    petOwnerName: string,
    petId: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const petUrl = `${appUrl}/pet/${petId}`;

    const subject = `${petName} - Takip İsteğiniz Onaylandı`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Takip İsteği Onaylandı</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f8fafc; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    font-weight: 600; 
                }
                .content { 
                    padding: 30px 20px; 
                }
                .success-box { 
                    background: #dcfce7; 
                    border: 2px solid #16a34a; 
                    border-radius: 8px; 
                    padding: 20px; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .pet-name { 
                    font-size: 20px; 
                    font-weight: bold; 
                    color: #166534; 
                    margin-bottom: 5px; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .footer { 
                    background: #f8fafc; 
                    padding: 20px; 
                    text-align: center; 
                    color: #64748b; 
                    font-size: 14px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Takip İsteği Onaylandı!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${requesterName}</strong>,</p>
                    
                    <p>Harika haber! Takip isteğiniz onaylandı.</p>
                    
                    <div class="success-box">
                        <div class="pet-name">🐕 ${petName}</div>
                        <p>Artık <strong>${petOwnerName}</strong>'in evcil dostunu takip ediyorsunuz!</p>
                    </div>
                    
                    <p>Şimdi ${petName}'in tüm gönderilerini görebilir ve etkileşimde bulunabilirsiniz.</p>
                    
                    <div style="text-align: center;">
                        <a href="${petUrl}" class="button">
                            Pet Profilini Ziyaret Et
                        </a>
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
        Merhaba ${requesterName},
        
        Harika haber! ${petOwnerName} adlı kullanıcının ${petName} isimli evcil dostunu takip etme isteğiniz onaylandı.
        
        Pet profilini ziyaret edin: ${petUrl}
        
        PetApp Ekibi
    `;

    return await sendEmail({
        to: requesterEmail,
        subject,
        html,
        text
    });
}

// Eşleşme isteği bildirimi
export async function sendMatchRequestNotification(
    ownerEmail: string,
    ownerName: string,
    petName: string,
    requesterName: string,
    requesterPetName: string,
    petId: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const matchesUrl = `${appUrl}/matches`;

    const subject = `${petName} - Yeni Eşleşme İsteği`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Eşleşme İsteği Bildirimi</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f8fafc; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    font-weight: 600; 
                }
                .content { 
                    padding: 30px 20px; 
                }
                .match-info { 
                    background: #fdf2f8; 
                    border-radius: 8px; 
                    padding: 20px; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .pet-name { 
                    font-size: 20px; 
                    font-weight: bold; 
                    color: #831843; 
                    margin-bottom: 5px; 
                }
                .requester { 
                    color: #be185d; 
                    font-size: 16px; 
                }
                .match-detail { 
                    background: #f1f5f9; 
                    border-radius: 8px; 
                    padding: 15px; 
                    margin: 15px 0; 
                    border-left: 4px solid #ec4899; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .footer { 
                    background: #f8fafc; 
                    padding: 20px; 
                    text-align: center; 
                    color: #64748b; 
                    font-size: 14px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💕 Yeni Eşleşme İsteği!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${ownerName}</strong>,</p>
                    
                    <p>Evcil dostunuz için yeni bir eşleşme isteği var!</p>
                    
                    <div class="match-info">
                        <div class="pet-name">🐾 ${petName}</div>
                        <div class="requester">
                            <strong>${requesterName}</strong> eşleşmek istiyor
                        </div>
                    </div>
                    
                    <div class="match-detail">
                        <strong>🌟 Eşleşme Detayları:</strong><br/>
                        <strong>${requesterPetName}</strong> isimli dostlarıyla ${petName} arasında arkadaşlık kurmak istiyorlar!
                    </div>
                    
                    <p>Bu eşleşme isteğini onaylamak veya reddetmek için:</p>
                    
                    <div style="text-align: center;">
                        <a href="${matchesUrl}" class="button">
                            Eşleşme İsteklerini Görüntüle
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                        Bu email otomatik olarak gönderilmiştir. Eşleşme isteklerini uygulama içinden yönetebilirsiniz.
                    </p>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                    <p>Bu emaili almak istemiyorsanız hesap ayarlarınızdan bildirimlerinizi kapatabilirsiniz.</p>
                </div>
            </div>
        </body>
        </html>
`;

    const text = `
        Merhaba ${ownerName},
        
        ${requesterName} adlı kullanıcının ${requesterPetName} isimli evcil hayvanı, ${petName} isimli dostunuzla eşleşmek istiyor.
        
        Eşleşme isteklerini görüntülemek için: ${matchesUrl}
        
        PetApp Ekibi
    `;

    return await sendEmail({
        to: ownerEmail,
        subject,
        html,
        text
    });
}

// Eşleşme kabul edildi bildirimi
export async function sendMatchAcceptedNotification(
    requesterEmail: string,
    requesterName: string,
    requesterPetName: string,
    accepterName: string,
    accepterPetName: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const messagesUrl = `${appUrl}/messages`;

    const subject = `🎉 Eşleşme Kabul Edildi - ${requesterPetName} ve ${accepterPetName}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Eşleşme Kabul Edildi</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background-color: #f8fafc; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    font-weight: 600; 
                }
                .content { 
                    padding: 30px 20px; 
                }
                .celebration { 
                    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); 
                    border-radius: 8px; 
                    padding: 20px; 
                    margin: 20px 0; 
                    text-align: center; 
                    border: 2px solid #10b981; 
                }
                .pet-names { 
                    font-size: 20px; 
                    font-weight: bold; 
                    color: #065f46; 
                    margin-bottom: 10px; 
                }
                .match-detail { 
                    background: #f1f5f9; 
                    border-radius: 8px; 
                    padding: 15px; 
                    margin: 15px 0; 
                    border-left: 4px solid #10b981; 
                }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    margin: 20px 0; 
                    text-align: center; 
                }
                .footer { 
                    background: #f8fafc; 
                    padding: 20px; 
                    text-align: center; 
                    color: #64748b; 
                    font-size: 14px; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Tebrikler! Eşleşme Kabul Edildi!</h1>
                </div>
                <div class="content">
                    <p>Merhaba <strong>${requesterName}</strong>,</p>
                    
                    <p>Harika haberlerimiz var! Eşleşme isteğiniz kabul edildi! 🎊</p>
                    
                    <div class="celebration">
                        <div class="pet-names">🐾 ${requesterPetName} ❤️ ${accepterPetName}</div>
                        <div style="color: #059669; font-size: 16px;">
                            <strong>${accepterName}</strong> eşleşmeyi kabul etti!
                        </div>
                    </div>
                    
                    <div class="match-detail">
                        <strong>🌟 Ne oldu?</strong><br/>
                        ${accepterName}, ${accepterPetName} adlı dostlarıyla ${requesterPetName} arasındaki arkadaşlık isteğinizi onayladı!
                        Artık mesajlaşmaya başlayarak evcil dostlarınız hakkında konuşabilirsiniz.
                    </div>
                    
                    <p>Hemen mesajlaşmaya başlamak için:</p>
                    
                    <div style="text-align: center;">
                        <a href="${messagesUrl}" class="button">
                            Mesajlaşmaya Başla
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                        Bu email otomatik olarak gönderilmiştir. Evcil dostlarınızın yeni arkadaşlık maceraları başlıyor! 🐾
                    </p>
                </div>
                <div class="footer">
                    <p>PetApp - Evcil dostlarınızın sosyal ağı</p>
                    <p>Bu emaili almak istemiyorsanız hesap ayarlarınızdan bildirimlerinizi kapatabilirsiniz.</p>
                </div>
            </div>
        </body>
        </html>
`;

    const text = `
        Merhaba ${requesterName},
        
        Tebrikler! ${accepterName} adlı kullanıcı, ${accepterPetName} isimli dostlarıyla ${requesterPetName} arasındaki eşleşme isteğinizi kabul etti!
        
        Artık mesajlaşmaya başlayabilirsiniz: ${messagesUrl}
        
        PetApp Ekibi
    `;

    return await sendEmail({
        to: requesterEmail,
        subject,
        html,
        text
    });
}