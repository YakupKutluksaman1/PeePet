export interface Pet {
    id: string;
    name: string;
    type: string;
    breed: string;
    age: string;
    gender: string;
    description: string;
    ownerId: string;
    ownerName: string;
    ownerPhotoURL?: string;
    photos?: string[];
    profilePhoto?: string;
    createdAt: string;
    updatedAt: string;
}

// Kullanıcıya ait birden fazla evcil hayvan için tanımlama
export interface UserPets {
    [petId: string]: Pet;
} 