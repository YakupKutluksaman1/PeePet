import { NextRequest, NextResponse } from 'next/server';
import { rdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { NearbyPet } from '@/app/match/components/PetData';

// İki nokta arasındaki mesafeyi hesaplayan Haversine formülü (kilometre cinsinden)
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Dünya'nın yarıçapı (kilometre)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Bir önbellek oluşturmak için
const CACHE_DURATION = 5; // Saniye cinsinden önbellek süresi (geliştirme için 5 saniyeye düşürüldü)
let cache: {
    [key: string]: {
        timestamp: number;
        data: NearbyPet[];
    }
} = {};

export async function GET(request: NextRequest) {
    // URL'den parametreleri al
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radius') || '10000'; // Varsayılan 10km (metre)
    const limit = Number(searchParams.get('limit') || '20'); // Varsayılan 20 sonuç
    const showAllPets = searchParams.get('showAllPets') === 'true'; // Kullanıcının tüm evcil hayvanlarını göster

    // Önbellek için benzersiz anahtar oluştur
    const cacheKey = `${latParam}-${lngParam}-${radiusParam}-${limit}-${showAllPets}`;

    // Önbellekte veri varsa ve süresi geçmediyse kullan
    const now = Date.now();
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) / 1000 < CACHE_DURATION) {
        // Cache-Control başlığı ile yanıt
        return NextResponse.json(cache[cacheKey].data, {
            headers: {
                'Cache-Control': `public, max-age=${CACHE_DURATION}`
            }
        });
    }

    if (!latParam || !lngParam) {
        return NextResponse.json(
            { error: 'Konum parametreleri (lat, lng) gereklidir' },
            { status: 400 }
        );
    }

    const userLat = parseFloat(latParam);
    const userLng = parseFloat(lngParam);
    const radius = parseFloat(radiusParam);

    try {
        // Firebase'den veri çek
        const locationsSnapshot = await get(ref(rdb, 'userLocations'));
        const petsSnapshot = await get(ref(rdb, 'pets'));
        const usersSnapshot = await get(ref(rdb, 'users'));

        if (!locationsSnapshot.exists()) {
            console.warn('⚠️ userLocations koleksiyonu bulunamadı veya boş');
            return NextResponse.json([]);
        }

        const locationsData = locationsSnapshot.val();
        const petsData = petsSnapshot.exists() ? petsSnapshot.val() : {};
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

        // Yakındaki evcil hayvanları bul
        const nearbyPets: NearbyPet[] = [];

        // Her kullanıcı için konum kontrolü yap
        for (const [userId, locationData] of Object.entries(locationsData)) {
            // TypeScript uyarısını önlemek için tip kontrolü
            const location = locationData as any;

            // Kullanıcının aktif durumda olup olmadığını kontrol et
            if (!location || !location.active) {
                continue; // Kullanıcı aktif değilse atla
            }

            // Kullanıcının konumu yoksa atla
            if (!location.lat || !location.lng) {
                continue;
            }

            // Mesafeyi hesapla
            const distance = calculateDistance(
                userLat,
                userLng,
                location.lat,
                location.lng
            );

            // Mesafeyi kontrol et
            const distanceInMeters = distance * 1000; // kilometre → metre
            if (distanceInMeters > radius) {
                continue; // Yarıçap dışındaysa atla
            }

            // Kullanıcının evcil hayvanlarını bul
            let userPets: Array<any> = [];

            // 1. pets/${userId} yapısında evcil hayvanları ara
            if (petsData && petsData[userId]) {
                const userPetsData = petsData[userId];
                // Evcil hayvanları diziye dönüştür
                userPets = Object.entries(userPetsData).map(([petId, petData]) => ({
                    id: petId,
                    ownerId: userId,
                    ...petData as object
                }));
            } else {
                continue; // Evcil hayvanı yoksa sonraki kullanıcıya geç
            }

            // 2. Eğer kullanıcının activePetId'si varsa ve showAllPets parametresi false ise sadece onu göster
            if (!showAllPets && location.activePetId && userPets.length > 0) {
                const activePet = userPets.find(pet => pet.id === location.activePetId);
                if (activePet) {
                    userPets = [activePet];
                }
            }

            // Kullanıcı bilgilerini al
            const ownerInfo = usersData[userId] || {
                displayName: 'Bilinmeyen Kullanıcı'
            };

            // Bu kullanıcının evcil hayvanlarını yakındaki hayvanlara ekle
            for (const pet of userPets) {
                const petLocation: [number, number] = [location.lat, location.lng]; // Tip belirtiyoruz

                // Evcil hayvan bilgilerini kontrol et ve varsayılan değerler ata
                const petInfo: Partial<NearbyPet> = {
                    id: pet.id || `pet-${Math.random().toString(36).substring(2, 9)}`,
                    name: pet.name || 'İsimsiz Hayvan',
                    type: (pet.type || 'other') as NearbyPet['type'],
                    breed: pet.breed || 'Bilinmeyen',
                    age: pet.age || 1,
                    gender: (pet.gender || 'male') as NearbyPet['gender'],
                    photos: [],
                    description: pet.description || 'Açıklama yok',
                    ownerName: ownerInfo.displayName || ownerInfo.firstName || 'Bilinmeyen Kullanıcı',
                    ownerId: userId,
                    distance: Math.round(distanceInMeters), // metre cinsinden
                    location: petLocation,
                    lastActive: location.timestamp || new Date().toISOString(),
                    profilePhoto: ''
                };

                // Fotoğraf alanlarını kontrol et ve birleştir - daha fazla alan kontrolü ekledik
                let photoFound = false;

                // 1. Olası tüm fotoğraf alanlarını kontrol et (Firebase'deki veri yapısı farklılıklarını kapsayacak şekilde)
                const possiblePhotoFields = [
                    'profilePhoto', 'photoURL', 'imageUrl', 'image', 'profileImage',
                    'photo', 'photoUrl', 'profileImageUrl', 'avatar', 'thumbnail'
                ];

                for (const field of possiblePhotoFields) {
                    if (pet[field] && typeof pet[field] === 'string' && pet[field].trim() !== '') {
                        petInfo.profilePhoto = pet[field];
                        petInfo.photos = [pet[field]];
                        photoFound = true;
                        break;
                    }
                }

                // 2. photos veya fotolar alanını kontrol et
                if (!photoFound) {
                    const photoArrayFields = ['photos', 'fotolar', 'images', 'pictures', 'photoUrls'];

                    for (const field of photoArrayFields) {
                        if (pet[field] && Array.isArray(pet[field]) && pet[field].length > 0) {
                            petInfo.profilePhoto = pet[field][0];
                            petInfo.photos = [...pet[field]];
                            photoFound = true;
                            break;
                        }
                    }
                }

                // 3. Eğer photos bir obje ise (Firebase'de bazen olabilir)
                if (!photoFound && pet.photos && typeof pet.photos === 'object' && !Array.isArray(pet.photos)) {
                    const photoObj = pet.photos;
                    const photoUrls = Object.values(photoObj).filter(url => typeof url === 'string');

                    if (photoUrls.length > 0) {
                        petInfo.profilePhoto = photoUrls[0] as string;
                        petInfo.photos = photoUrls as string[];
                        photoFound = true;
                    }
                }

                // 4. Hala fotoğraf bulunamadıysa, varsayılan fotoğraf
                if (!photoFound) {
                    const placeholderUrl = `https://via.placeholder.com/300x300?text=${encodeURIComponent(pet.name || 'Pet')}`;
                    petInfo.profilePhoto = placeholderUrl;
                    petInfo.photos = [placeholderUrl];

                    // Hayvan türüne göre görsel
                    if (pet.type) {
                        const typeEmoji =
                            pet.type === 'dog' ? '🐕' :
                                pet.type === 'cat' ? '🐈' :
                                    pet.type === 'bird' ? '🦜' :
                                        pet.type === 'rabbit' ? '🐇' : '🐾';

                        petInfo.profilePhoto = `https://via.placeholder.com/300x300?text=${encodeURIComponent(pet.name + ' ' + typeEmoji)}`;
                        petInfo.photos = [petInfo.profilePhoto];
                    }
                }

                nearbyPets.push(petInfo as NearbyPet);
            }
        }

        // Mesafeye göre sırala ve limit uygula
        const sortedNearbyPets = nearbyPets
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        // Sonucu önbelleğe al
        cache[cacheKey] = {
            timestamp: now,
            data: sortedNearbyPets
        };

        // Önbellek temizliği - eski girdileri temizle
        Object.keys(cache).forEach(key => {
            if ((now - cache[key].timestamp) / 1000 > CACHE_DURATION) {
                delete cache[key];
            }
        });

        // Cache-Control başlığı ile yanıt
        return NextResponse.json(sortedNearbyPets, {
            headers: {
                'Cache-Control': `public, max-age=${CACHE_DURATION}`
            }
        });
    } catch (error) {
        console.error('Firebase veri alımında hata:', error);
        return NextResponse.json(
            [],
            { status: 500 }
        );
    }
} 