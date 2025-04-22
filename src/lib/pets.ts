import { getDatabase, ref as dbRef, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { Pet } from '@/app/types/pet';
import { User } from '@/app/types/user';

export async function getPetWithOwner(petId: string): Promise<{ pet: Pet; owner: User } | null> {
    try {
        const db = getDatabase();
        const petRef = dbRef(db, `pets/${petId}`);
        const petSnapshot = await get(petRef);

        if (!petSnapshot.exists()) {
            return null;
        }

        const petData = petSnapshot.val();
        const pet: Pet = {
            id: petId,
            name: petData.name,
            type: petData.type,
            breed: petData.breed,
            age: petData.age,
            gender: petData.gender,
            description: petData.description,
            ownerId: petData.ownerId,
            photos: petData.photos || [],
            profilePhoto: petData.profilePhoto,
            createdAt: petData.createdAt,
            updatedAt: petData.updatedAt
        };

        // Kullanıcı bilgilerini al
        const ownerRef = dbRef(db, `users/${pet.ownerId}`);
        const ownerSnapshot = await get(ownerRef);

        if (!ownerSnapshot.exists()) {
            return null;
        }

        const ownerData = ownerSnapshot.val();
        const owner: User = {
            id: pet.ownerId,
            email: ownerData.email,
            firstName: ownerData.firstName,
            lastName: ownerData.lastName,
            phone: ownerData.phone,
            location: ownerData.location,
            photoURL: ownerData.photoURL,
            createdAt: ownerData.createdAt,
            updatedAt: ownerData.updatedAt
        };

        return { pet, owner };
    } catch (error) {
        console.error('Evcil hayvan ve sahibi bilgileri alınırken hata:', error);
        return null;
    }
}

// İki konum arasındaki mesafeyi metre cinsinden hesaplama (Haversine formülü)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metre cinsinden dünya yarıçapı
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Konum string'ini [lat, lng] dizisine çevirme (örn: "41.0082,28.9784" -> [41.0082, 28.9784])
export function parseLocation(locationString: string): [number, number] | null {
    if (!locationString) return null;

    const parts = locationString.split(',').map(part => parseFloat(part.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
    }

    return null;
}

// Kullanıcının konumuna yakın evcil hayvanları bulma
export async function getNearbyPets(userLocation: [number, number], maxDistance: number = 10000): Promise<Array<Pet & { distance: number; ownerName: string; location: [number, number] }>> {
    try {
        console.log('🔄 Firebase: getNearbyPets çağrıldı', { userLocation, maxDistance });

        const db = getDatabase();
        console.log('📊 Firebase: Veritabanı bağlantısı kuruldu');

        // Tüm kullanıcıları çek
        const usersRef = dbRef(db, 'users');
        console.log('👥 Firebase: Kullanıcı referansı alındı');

        const usersSnapshot = await get(usersRef);
        console.log('🔍 Firebase: Kullanıcı verisi çekildi');

        if (!usersSnapshot.exists()) {
            console.warn('⚠️ Firebase: Kullanıcı verisi bulunamadı');
            return [];
        }

        console.log('✅ Firebase: Kullanıcı verisi mevcut');

        const nearbyPets: Array<Pet & { distance: number; ownerName: string; location: [number, number] }> = [];

        // Her bir kullanıcıyı kontrol et
        const usersData = usersSnapshot.val();
        console.log(`👤 Firebase: ${Object.keys(usersData).length} kullanıcı işlenecek`);

        for (const userId in usersData) {
            const userData = usersData[userId];

            // Kullanıcının konum bilgisini çözümle
            const ownerLocation = parseLocation(userData.location);

            if (!ownerLocation) {
                console.log(`⚠️ Firebase: Kullanıcı ${userId} için konum bulunamadı`);
                continue;
            }

            // Kullanıcı ile mevcut kullanıcı arasındaki mesafeyi hesapla
            const distance = calculateDistance(
                userLocation[0],
                userLocation[1],
                ownerLocation[0],
                ownerLocation[1]
            );

            // Mesafe maksimum mesafeden küçükse, bu kullanıcının evcil hayvanlarını ekle
            if (distance <= maxDistance) {
                console.log(`🔍 Firebase: Kullanıcı ${userId} mesafe içinde (${distance.toFixed(2)} metre)`);

                // Kullanıcının evcil hayvanlarını al
                const petsRef = dbRef(db, `pets`);
                const petsSnapshot = await get(petsRef);

                if (petsSnapshot.exists()) {
                    const petsData = petsSnapshot.val();
                    let userPetCount = 0;

                    for (const petId in petsData) {
                        const petData = petsData[petId];

                        // Eğer evcil hayvan bu kullanıcıya aitse ekle
                        if (petData.ownerId === userId) {
                            userPetCount++;
                            nearbyPets.push({
                                ...petData,
                                id: petId,
                                distance: distance,
                                ownerName: `${userData.firstName} ${userData.lastName}`,
                                location: ownerLocation
                            });
                        }
                    }

                    console.log(`🐾 Firebase: Kullanıcı ${userId} için ${userPetCount} evcil hayvan bulundu`);
                } else {
                    console.log(`ℹ️ Firebase: Kullanıcı ${userId} için evcil hayvan bulunamadı`);
                }
            } else {
                console.log(`ℹ️ Firebase: Kullanıcı ${userId} mesafe dışında (${distance.toFixed(2)} metre > ${maxDistance} metre)`);
            }
        }

        // Mesafeye göre sırala
        console.log(`✅ Firebase: Toplam ${nearbyPets.length} evcil hayvan bulundu`);
        return nearbyPets.sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error('❌ Firebase: Yakındaki evcil hayvanlar alınırken hata:', error);
        return [];
    }
} 