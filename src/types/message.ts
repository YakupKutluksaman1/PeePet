export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    petId?: string;
    status: 'pending' | 'active' | 'rejected';
    createdAt: string;
    updatedAt: string;
    isRead?: boolean;
    readBy?: {
        [userId: string]: boolean;
    };
    imageUrl?: string; // Mesajda fotoğraf varsa, fotoğrafın URL'si
}

export interface Conversation {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageAt?: string;
    lastSenderId?: string;
    lastPetId?: string;
    status: 'pending' | 'active' | 'rejected';
    unreadCount?: number;
    unreadBy?: {
        [userId: string]: boolean;
    };
    petInfo?: {
        [userId: string]: any;
    };
    userMatchDetails?: {
        [userId: string]: {
            petId: string;
            petName: string;
            petType: string;
            petPhoto: string;
            petAge: string;
            petGender: string;
            breed?: string;
            partnerId: string;
            partnerName: string;
        }
    };
    matchDetails?: {
        petId: string;
        petName: string;
        petType: string;
        petPhoto: string;
        senderId: string;
        senderName: string;
        receiverId: string;
        receiverName: string;
        petAge: string;
        petGender: string;
        breed?: string;
    };
} 