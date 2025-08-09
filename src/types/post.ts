export interface Post {
    id: string;
    petId: string;
    userId: string;
    photoUrl: string;
    caption: string;
    createdAt: string;
    visibility: 'public' | 'private';
    petName: string;
    petPhoto: string;
    petType: string;
    userName: string;
    userPhoto: string;
} 