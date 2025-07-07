/**
 * Evcil Hayvan Eşleştirme - Veri Modelleri ve Yardımcı Fonksiyonlar
 * Bu dosya PetData.ts ve PetData.tsx dosyalarının birleştirilmiş halidir
 */

export type NearbyPet = {
    id: string;
    name: string;
    type: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
    breed: string;
    age: number;
    gender: 'male' | 'female';
    photos: string[];
    description: string;
    ownerName: string;
    ownerId: string;
    distance: number; // metre cinsinden
    location: [number, number]; // enlem, boylam
    lastActive: string;
    profilePhoto: string;
};

export type UserProfile = {
    id: string;
    name: string;
    location: [number, number];
    pets: UserPet[];
    lastActive: string;
};

export type UserPet = {
    id: string;
    name: string;
    type: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
    breed: string;
    age: number;
    gender: 'male' | 'female';
    photos: string[];
    description: string;
};

// Evcil hayvan isimleri
const petNames = [
    'Luna', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Daisy',
    'Milo', 'Lily', 'Bailey', 'Zoe', 'Buddy', 'Rocky', 'Lola',
    'Badem', 'Tarçın', 'Fındık', 'Kömür', 'Pamuk', 'Şeker', 'Karamel',
    'Paşa', 'Şila', 'Duman', 'Zeytin', 'Lokum', 'Mavi', 'Köpük', 'Bulut',
    'Melo', 'Pati', 'Toros', 'Mısır', 'Atlas', 'Oscar', 'Karabaş'
];

// Köpek ırkları
const dogBreeds = [
    'Golden Retriever', 'Labrador', 'Sibirya Kurdu', 'Pug', 'Bulldog',
    'Pomeranian', 'Chihuahua', 'Border Collie', 'Kangal', 'Maltepe',
    'Akita', 'Beagle', 'Rottweiler', 'Sokak Köpeği', 'Alman Çoban Köpeği',
    'Dalmaçyalı', 'Terrier'
];

// Kedi ırkları
const catBreeds = [
    'Van Kedisi', 'Ankara Kedisi', 'British Shorthair', 'Scottish Fold',
    'Maine Coon', 'Siyam', 'Tekir', 'Persian', 'Bengal', 'Ragdoll',
    'Mavi Rus', 'Sphynx', 'Himalayan', 'Sokak Kedisi', 'Devon Rex',
    'Exotic Shorthair', 'Norveç Orman Kedisi'
];

// Kuş türleri
const birdBreeds = [
    'Muhabbet Kuşu', 'Sultan Papağanı', 'Kanarya', 'Jako',
    'Paraket', 'Sevda Papağanı', 'Yavru Papağan', 'Sultan', 'Kakadu',
    'Forpus', 'Amazon Papağanı'
];

// Tavşan ırkları
const rabbitBreeds = [
    'Holland Lop', 'Mini Lop', 'Reks', 'Hollanda Lüks', 'Mini Rex',
    'Angora', 'Kaliforniya', 'Flamenko', 'Havana Teddy',
    'Flemish Giant', 'İngiliz Lekeli', 'Dutch'
];

// Diğer türler
const otherBreeds = [
    'Hamster', 'Guinea Pig', 'Iguana', 'Kaplumbağa', 'Degu',
    'Sincap', 'Kirpi', 'Gelincik', 'Bukalemun'
];

// Rastgele sahip isimleri
const ownerNames = [
    'Ayşe', 'Mehmet', 'Zeynep', 'Mustafa', 'Fatma', 'Ali', 'Hatice',
    'Ahmet', 'Emine', 'İbrahim', 'Elif', 'Hüseyin', 'Melek', 'Hasan',
    'Can', 'Deniz', 'Emir', 'Naz', 'Yusuf', 'İrem', 'Burak', 'Selin',
    'Eren', 'Defne', 'Kerem', 'Buse', 'Gökhan', 'Merve', 'Tolga', 'Özge'
];

// Örnek açıklamalar
const descriptions = [
    'Çok sevecen ve oyuncu bir hayvan. Çocuklarla arası çok iyi.',
    'Sahibinin peşini hiç bırakmayan sadık bir dost.',
    'Biraz utangaç olsa da alıştıktan sonra çok sevgi dolu.',
    'Diğer hayvanlarla uyum içinde yaşayabilen sosyal bir hayvan.',
    'Sevgi göstermeyi seven, akıllı ve dost canlısı bir hayvan.',
    'Kucak kedisi olmayı seven, çok sevimli bir hayvan.',
    'Çok meraklı ve evde her köşeyi keşfetmeyi seven.',
    'Yaramazlık yapmayı seven ama çok tatli bir hayvan.',
    'Sakin ve uysal yapıda, ev hayatına alışkın.',
    'Dışarıda koşmayı ve oynamayı çok seven enerjik bir hayvan.'
];

/**
 * Hayvan türüne göre resim URL'i oluşturur
 */
const generatePetImageUrl = (type: string): string => {
    const imageSize = '400';

    switch (type) {
        case 'dog':
            return `https://placedog.net/${imageSize}/${imageSize}?id=${Math.floor(Math.random() * 16) + 1}`;
        case 'cat':
            return `https://placekitten.com/${imageSize}/${imageSize}?image=${Math.floor(Math.random() * 16) + 1}`;
        case 'bird':
            return `https://images.unsplash.com/photo-${1 + Math.floor(Math.random() * 5)}?ixlib=rb-1.2.1&auto=format&fit=crop&w=${imageSize}&q=80`;
        case 'rabbit':
            return `https://images.unsplash.com/photo-${10 + Math.floor(Math.random() * 5)}?ixlib=rb-1.2.1&auto=format&fit=crop&w=${imageSize}&q=80`;
        default:
            return `https://images.unsplash.com/photo-${20 + Math.floor(Math.random() * 5)}?ixlib=rb-1.2.1&auto=format&fit=crop&w=${imageSize}&q=80`;
    }
};

/**
 * Rastgele sahip fotoğrafı URL'i üretir
 */
const generateOwnerImageUrl = (): string => {
    const imageNumber = Math.floor(Math.random() * 100);
    return `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${imageNumber}.jpg`;
};

/**
 * Belirli bir konum etrafında rastgele bir konum oluşturur
 */
export const generateRandomLocation = (
    center: [number, number],
    radius: number // metre cinsinden
): [number, number] => {
    // Dünya yarıçapı (metre)
    const earthRadius = 6371000;

    // Rastgele bir açı
    const randomAngle = Math.random() * Math.PI * 2;

    // Rastgele bir mesafe (0 ile verilen yarıçap arasında)
    const randomRadius = Math.random() * radius;

    // Enlem değişimi
    const latOffset = (randomRadius / earthRadius) * (180 / Math.PI);

    // Boylam değişimi (enlem kosinüsüne göre ayarlanmış)
    const lngOffset = (randomRadius / earthRadius) * (180 / Math.PI) / Math.cos(center[0] * Math.PI / 180);

    // Rastgele yön
    const newLat = center[0] + latOffset * Math.sin(randomAngle);
    const newLng = center[1] + lngOffset * Math.cos(randomAngle);

    return [newLat, newLng];
};

/**
 * İki konum arasındaki mesafeyi hesaplar (metre cinsinden)
 */
export const calculateDistance = (location1: [number, number], location2: [number, number]): number => {
    const toRad = (value: number) => value * Math.PI / 180;
    const R = 6371000; // Dünya yarıçapı metre cinsinden

    const dLat = toRad(location2[0] - location1[0]);
    const dLon = toRad(location2[1] - location1[1]);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(location1[0])) * Math.cos(toRad(location2[0])) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

/**
 * Hayvan türüne göre doğru cinsi seçer
 */
const getBreedForType = (type: string): string => {
    switch (type) {
        case 'dog':
            return dogBreeds[Math.floor(Math.random() * dogBreeds.length)];
        case 'cat':
            return catBreeds[Math.floor(Math.random() * catBreeds.length)];
        case 'bird':
            return birdBreeds[Math.floor(Math.random() * birdBreeds.length)];
        case 'rabbit':
            return rabbitBreeds[Math.floor(Math.random() * rabbitBreeds.length)];
        default:
            return otherBreeds[Math.floor(Math.random() * otherBreeds.length)];
    }
};

/**
 * Yakındaki evcil hayvanları getirir (artık sadece gerçek veriler)
 */
export const generateNearbyPets = async (
    userLocation: [number, number],
    count: number = 10,
    maxDistance: number = 10000, // metre cinsinden max mesafe (10km)
    showAllPets: boolean = false, // Kullanıcının tüm evcil hayvanlarını göster
    showAllLocations: boolean = false // Tüm dünyadan hayvanları göster
): Promise<NearbyPet[]> => {
    try {
        // API'den gerçek verileri al
        const pets = await fetchNearbyPets(userLocation, maxDistance, showAllPets, showAllLocations);
        return pets; // Sonucu doğrudan döndür, boş olsa bile
    } catch (error) {
        console.error('❌ Veri alınamadı:', error);
        // Hata durumunda boş dizi döndür - sahte veri üretmiyoruz
        return [];
    }
};

/**
 * API'den yakındaki evcil hayvanları getirir
 */
export const fetchNearbyPets = async (
    userLocation: [number, number],
    maxDistance: number = 10000, // metre cinsinden max mesafe (10km)
    showAllPets: boolean = false, // Kullanıcının tüm evcil hayvanlarını göster
    showAllLocations: boolean = false // Tüm dünyadan hayvanları göster
): Promise<NearbyPet[]> => {
    try {
        // API endpoint
        const response = await fetch(`/api/nearby-users?lat=${userLocation[0]}&lng=${userLocation[1]}&radius=${maxDistance}&showAllPets=${showAllPets}&showAllLocations=${showAllLocations}`);

        if (!response.ok) {
            console.error('⛔ API yanıtı başarısız:', response.status, response.statusText);
            throw new Error('Kullanıcı verileri alınamadı');
        }

        // API'den gelen verileri doğrudan kullan
        const pets = await response.json();

        // Ekstra kontrol - aktif olmayan kullanıcıların hayvanlarını filtrele
        // (Bu kontrol normalde API tarafında yapılır, ancak ek güvenlik olarak eklenmiştir)
        const activePets = Array.isArray(pets) ? pets.filter(pet => {
            // Eğer pet.active özelliği varsa doğrudan kontrol et, yoksa varsayılan olarak aktif kabul et
            return pet.active !== false;
        }) : [];

        if (activePets.length === 0) {
            console.warn('⚠️ API yanıtında hiç hayvan yok veya aktif hayvan yok');
        }

        return activePets;
    } catch (error) {
        console.error('❌ API verilerini alırken hata oluştu:', error);
        // Hata durumunda boş dizi döndür - sahte veri üretmiyoruz
        return [];
    }
}; 