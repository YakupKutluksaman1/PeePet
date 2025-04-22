export interface Vaccination {
    id: string;
    name: string;
    date: string;
    nextDueDate: string;
    vetName: string;
    batchNumber?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    isActive: boolean;
}

export interface VetVisit {
    id: string;
    vetName: string;
    clinicName: string;
    date: string;
    diagnosis: string;
    symptoms: string[];
    treatment: string;
    medications: Medication[];
    nextVisitDate?: string;
    notes?: string;
    cost?: number;
    createdAt: string;
    updatedAt: string;
}

export interface VetRecord {
    id: string;
    petId: string;
    vetVisits: VetVisit[];
    vaccinations: Vaccination[];
    allergies: string[];
    chronicConditions: string[];
    lastVisit: string;
    nextVisit: string;
    createdAt: string;
    updatedAt: string;
} 