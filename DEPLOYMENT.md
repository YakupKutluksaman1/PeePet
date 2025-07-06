# PeePet Deployment Rehberi

## 🚀 Vercel ile Yayınlama (Önerilen)

### 1. Vercel Hesabı ve Proje Kurulumu

```bash
# Vercel CLI'yi yükleyin
npm install -g vercel

# Proje dizininde login olun
vercel login

# Deployment'ı başlatın
vercel
```

### 2. Environment Variables Ayarları

Vercel dashboard'da aşağıdaki environment variables'ları ekleyin:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
NEXT_PUBLIC_SITE_URL=https://peepet.com.tr
NEXT_PUBLIC_DOMAIN=peepet.com.tr
```

### 3. Domain Bağlama

1. Vercel dashboard'da projenizi açın
2. "Domains" sekmesine gidin
3. "Add Domain" butonuna tıklayın
4. `peepet.com.tr` domaininizi ekleyin
5. DNS ayarlarını yapın

### 4. DNS Ayarları

Domain sağlayıcınızda (Türkiye'de muhtemelen Natro, Hosting.com.tr vs.) aşağıdaki DNS kayıtlarını ekleyin:

```
Type: A
Name: @
Value: 76.76.19.19

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 🔥 Firebase Hosting ile Yayınlama

### 1. Firebase CLI Kurulumu

```bash
# Firebase CLI'yi yükleyin
npm install -g firebase-tools

# Firebase'e login olun
firebase login

# Firebase projenizi başlatın
firebase init hosting
```

### 2. Firebase Hosting Konfigürasyonu

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 3. Static Export için Next.js Konfigürasyonu

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    output: 'export',
    trailingSlash: true,
    experimental: {
        appDir: true,
    },
    images: {
        domains: ['firebasestorage.googleapis.com'],
        unoptimized: true,
    },
}

module.exports = nextConfig
```

### 4. Build ve Deploy

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### 5. Custom Domain Bağlama

```bash
# Firebase console'da custom domain ekleyin
firebase hosting:sites:create peepet-com-tr
```

---

## 📱 Netlify ile Yayınlama

### 1. Netlify Hesabı ve Proje Kurulumu

1. GitHub reponuzu Netlify'a bağlayın
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`

### 2. Environment Variables

Netlify dashboard'da environment variables'ları ekleyin (Vercel ile aynı)

### 3. Domain Bağlama

1. Netlify dashboard'da "Domain management"
2. "Add custom domain" → `peepet.com.tr`
3. DNS ayarlarını yapın

---

## 🔧 Genel Optimizasyonlar

### 1. Production Build Testi

```bash
# Yerel olarak production build'i test edin
npm run build
npm run start
```

### 2. SEO Optimizasyonu

```javascript
// src/app/layout.tsx
export const metadata = {
  title: 'PeePet - Evcil Hayvan Eşleştirme Platformu',
  description: 'Evcil hayvanınız için mükemmel eşi bulun',
  url: 'https://peepet.com.tr',
  siteName: 'PeePet',
  locale: 'tr_TR',
  type: 'website',
}
```

### 3. Sitemap ve Robots.txt

```bash
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://peepet.com.tr/sitemap.xml
```

---

## 🚨 Deployment Öncesi Kontrol Listesi

- [ ] Environment variables doğru ayarlandı
- [ ] Firebase projesi production'a hazır
- [ ] SSL sertifikası aktif
- [ ] Domain DNS ayarları tamamlandı
- [ ] SEO ayarları yapıldı
- [ ] Mobile responsive test edildi
- [ ] Performance optimizasyonu yapıldı

---

## 🆘 Sorun Giderme

### Build Hataları

```bash
# Dependencies'leri temizleyin
rm -rf node_modules package-lock.json
npm install

# Build'i tekrar deneyin
npm run build
```

### Firebase Bağlantı Sorunları

- Environment variables'ların doğru olduğundan emin olun
- Firebase projesi ayarlarını kontrol edin
- CORS ayarlarını kontrol edin

### Domain Bağlantı Sorunları

- DNS ayarlarının aktif olması 24-48 saat sürebilir
- DNS propagation kontrolü yapın
- SSL sertifikası otomatik olarak aktif olmalı 