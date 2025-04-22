'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Listing } from '@/types/listing';
import { useAuth } from './AuthContext';
import { getDatabase, ref, onValue, push, set, remove } from 'firebase/database';

interface ListingContextType {
    listings: Listing[];
    getUserListings: () => Listing[];
    createListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateListing: (id: string, listing: Partial<Listing>) => Promise<void>;
    deleteListing: (id: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export function ListingProvider({ children }: { children: React.ReactNode }) {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setListings([]);
            return;
        }

        const db = getDatabase();
        const listingsRef = ref(db, 'listings');

        const unsubscribe = onValue(listingsRef, (snapshot) => {
            try {
                const data = snapshot.val();
                console.log("Firebase'den gelen veri:", data ? Object.keys(data).length : 0, "adet ilan");
                if (data) {
                    const listingsArray = Object.entries(data)
                        .map(([id, listing]) => ({
                            ...(listing as Omit<Listing, 'id'>),
                            id
                        }))
                        .filter(listing => listing.status !== 'sold');
                    setListings(listingsArray);
                    console.log("İşlenen ilanlar:", listingsArray.length, "adet");
                } else {
                    console.log("İlan verisi bulunamadı - data null veya undefined");
                    setListings([]);
                }
            } catch (err: any) {
                console.error("İlanları işlerken hata:", err.message, err);
                setError(`İlanlar işlenirken bir hata oluştu: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Firebase veri dinleme hatası:", err);
            setError(`İlanlar yüklenirken bir hata oluştu: ${err.message}`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const createListing = async (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            setLoading(true);
            setError(null);

            const db = getDatabase();
            const listingsRef = ref(db, 'listings');
            const newListingRef = push(listingsRef);

            const newListing: Listing = {
                id: newListingRef.key!,
                ...listing,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await set(newListingRef, newListing);
        } catch (error) {
            setError('İlan oluşturulurken bir hata oluştu');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateListing = async (id: string, listing: Partial<Listing>) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            const db = getDatabase();
            const listingRef = ref(db, `listings/${id}`);

            if (listing.status === 'sold') {
                await remove(listingRef);
                return;
            }

            await set(listingRef, {
                ...listing,
                ownerId: user.uid,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            setError('İlan güncellenirken bir hata oluştu');
            throw error;
        }
    };

    const deleteListing = async (id: string) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            const db = getDatabase();
            const listingRef = ref(db, `listings/${id}`);
            await remove(listingRef);
        } catch (error) {
            setError('İlan silinirken bir hata oluştu');
            throw error;
        }
    };

    const getUserListings = () => {
        if (!user) return [];
        return listings.filter(listing => listing.ownerId === user.uid);
    };

    return (
        <ListingContext.Provider value={{
            listings,
            getUserListings,
            createListing,
            updateListing,
            deleteListing,
            loading,
            error
        }}>
            {children}
        </ListingContext.Provider>
    );
}

export function useListing() {
    const context = useContext(ListingContext);
    if (context === undefined) {
        throw new Error('useListing must be used within a ListingProvider');
    }
    return context;
} 