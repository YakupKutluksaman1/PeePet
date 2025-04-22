export interface Pet {
    id: string;
    name: string;
    type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
    breed: string;
    age: string;
    gender: 'male' | 'female';
    description: string;
    ownerId: string;
    ownerName?: string;
    ownerPhotoURL?: string;
    photos: string[];
    profilePhoto: string;
    createdAt: string;
    updatedAt: string;
}

// Kullanıcının sahip olduğu tüm evcil hayvanlar için
export interface UserPets {
    [petId: string]: Pet;
} 