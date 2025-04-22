export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    location: {
        city: string;
        district: string;
    };
    createdAt: string;
    updatedAt: string;
} 