'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Pet } from '@/types/pet';
import { useAuth } from './AuthContext';
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

interface PetContextType {
    pets: Pet[];
    loading: boolean;
    error: string | null;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export function PetProvider({ children }: { children: React.ReactNode }) {
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const db = getDatabase();
        const petsRef = ref(db, 'pets');
        const userPetsQuery = query(petsRef, orderByChild('ownerId'), equalTo(user.uid));

        const unsubscribe = onValue(userPetsQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const petsArray = Object.entries(data).map(([id, pet]) => ({
                    ...(pet as Omit<Pet, 'id'>),
                    id
                }));
                setPets(petsArray);
            } else {
                setPets([]);
            }
            setLoading(false);
        }, (error) => {
            console.error('Evcil hayvanlar yüklenirken hata:', error);
            setError('Evcil hayvanlar yüklenirken bir hata oluştu');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <PetContext.Provider value={{ pets, loading, error }}>
            {children}
        </PetContext.Provider>
    );
}

export function usePet() {
    const context = useContext(PetContext);
    if (context === undefined) {
        throw new Error('usePet must be used within a PetProvider');
    }
    return context;
} 