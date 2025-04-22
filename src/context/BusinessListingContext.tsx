'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getDatabase, ref, onValue, push, set, remove } from 'firebase/database';

// İşletme ilanı arayüzü - ihtiyaca göre genişletilebilir
export interface BusinessListing {
    id: string;
    businessId: string;
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'sold';
    images?: {
        image1?: string;
        image2?: string;
        image3?: string;
    };
    createdAt: string;
    updatedAt: string;
    price?: string;
    category?: string;
    subCategory?: string;
    city: string;
    district: string;
    phone?: string;
    email?: string;
    features?: Record<string, any>;
    businessName?: string;
    location?: {
        city: string;
        district: string;
    };
}

interface BusinessListingContextType {
    businessListings: BusinessListing[];
    getBusinessListings: () => BusinessListing[];
    createBusinessListing: (listing: Omit<BusinessListing, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateBusinessListing: (id: string, listing: Partial<BusinessListing>) => Promise<void>;
    deleteBusinessListing: (id: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

const BusinessListingContext = createContext<BusinessListingContextType | undefined>(undefined);

export function BusinessListingProvider({ children }: { children: React.ReactNode }) {
    const [businessListings, setBusinessListings] = useState<BusinessListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setBusinessListings([]);
            return;
        }

        const db = getDatabase();
        const listingsRef = ref(db, 'business-listings');

        console.log("Firebase'den işletme ilanları dinleniyor...");

        const unsubscribe = onValue(listingsRef, (snapshot) => {
            try {
                const data = snapshot.val();
                console.log("Firebase'den gelen işletme ilanları:", data ? Object.keys(data).length : 0, "adet");
                if (data) {
                    const listingsArray = Object.entries(data)
                        .map(([id, listing]) => ({
                            ...(listing as Omit<BusinessListing, 'id'>),
                            id
                        }))
                        .filter(listing => listing.status !== 'sold');
                    console.log("İşlenen işletme ilanları:", listingsArray.length, "adet");
                    setBusinessListings(listingsArray);
                } else {
                    console.log("İşletme ilanı verisi bulunamadı - data null veya undefined");
                    setBusinessListings([]);
                }
            } catch (err: any) {
                console.error("İşletme ilanlarını işlerken hata:", err.message, err);
                setError(`İşletme ilanları işlenirken bir hata oluştu: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Firebase işletme ilanları veri dinleme hatası:", err);
            setError(`İşletme ilanları yüklenirken bir hata oluştu: ${err.message}`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // İşletmenin kendi ilanlarını getiren metod
    const getBusinessListings = () => {
        if (!user) return [];
        return businessListings.filter(listing => listing.businessId === user.uid);
    };

    const createBusinessListing = async (listing: Omit<BusinessListing, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            setLoading(true);
            setError(null);

            const db = getDatabase();
            const listingsRef = ref(db, 'business-listings');
            const newListingRef = push(listingsRef);

            const newListing: BusinessListing = {
                id: newListingRef.key!,
                businessId: user.uid,
                ...listing,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await set(newListingRef, newListing);
        } catch (error) {
            setError('İşletme ilanı oluşturulurken bir hata oluştu');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateBusinessListing = async (id: string, listing: Partial<BusinessListing>) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            const db = getDatabase();
            const listingRef = ref(db, `business_listings/${id}`);

            if (listing.status === 'sold') {
                await remove(listingRef);
                return;
            }

            await set(listingRef, {
                ...listing,
                businessId: user.uid,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            setError('İşletme ilanı güncellenirken bir hata oluştu');
            throw error;
        }
    };

    const deleteBusinessListing = async (id: string) => {
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }

        try {
            const db = getDatabase();
            const listingRef = ref(db, `business_listings/${id}`);
            await remove(listingRef);
        } catch (error) {
            setError('İşletme ilanı silinirken bir hata oluştu');
            throw error;
        }
    };

    return (
        <BusinessListingContext.Provider value={{
            businessListings,
            getBusinessListings,
            createBusinessListing,
            updateBusinessListing,
            deleteBusinessListing,
            loading,
            error
        }}>
            {children}
        </BusinessListingContext.Provider>
    );
}

export function useBusinessListing() {
    const context = useContext(BusinessListingContext);
    if (context === undefined) {
        throw new Error('useBusinessListing must be used within a BusinessListingProvider');
    }
    return context;
} 