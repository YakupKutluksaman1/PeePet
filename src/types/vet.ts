export interface VetVisit {
    id: string;
    date: string;
    vetName: string;
    clinicName?: string;
    diagnosis: string;
    symptoms: string[];
    treatment: string;
    medications: Medication[];
    nextVisitDate?: string;
    notes?: string;
    documents?: string[]; // Dosya URL'leri
    cost?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate: string;
    notes?: string;
    isActive: boolean;
}

export interface VetRecord {
    petId: string;
    allergies: string[];
    chronicConditions: string[];
    vaccinations: Vaccination[];
    vetVisits: VetVisit[];
    lastVisit?: string; // Son ziyaret tarihi
    nextVisit?: string; // Bir sonraki randevu tarihi
    updatedAt: string;
}

export interface Vaccination {
    name: string;
    date: string;
    nextDueDate: string;
    vetName: string;
    batchNumber?: string;
    notes?: string;
} 