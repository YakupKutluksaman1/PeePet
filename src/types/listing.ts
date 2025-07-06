export interface Listing {
    id: string;
    ownerId: string;
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'sold';
    photos: string[];
    createdAt: string;
    updatedAt: string;
    petType: 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'guinea-pig' | 'ferret' | 'turtle' | 'fish' | 'snake' | 'lizard' | 'hedgehog' | 'exotic' | 'other';
    petName: string;
    petAge: string;
    petGender: 'male' | 'female';
    breed: string;
    city: string;
    district: string;
    phone?: string;
    email?: string;
} 