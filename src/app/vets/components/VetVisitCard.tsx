'use client';

import { VetVisit } from '@/app/types/vet';
import { formatDate } from '@/lib/utils';

interface VetVisitCardProps {
    visit: VetVisit;
    onEdit?: (visit: VetVisit) => void;
    onDelete?: (visitId: string) => void;
}

export default function VetVisitCard({ visit, onEdit, onDelete }: VetVisitCardProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{visit.vetName}</h3>
                        <p className="text-sm text-gray-500">{visit.clinicName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(visit)}
                                className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(visit.id)}
                                className="p-2 text-red-600 hover:text-red-800 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Ziyaret Tarihi</p>
                            <p className="font-medium">{formatDate(visit.date)}</p>
                        </div>
                        {visit.nextVisitDate && (
                            <div>
                                <p className="text-sm text-gray-500">Sonraki Ziyaret</p>
                                <p className="font-medium">{formatDate(visit.nextVisitDate)}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Teşhis</p>
                        <p className="font-medium">{visit.diagnosis}</p>
                    </div>

                    {visit.symptoms.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Belirtiler</p>
                            <div className="flex flex-wrap gap-2">
                                {visit.symptoms.map((symptom, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                                    >
                                        {symptom}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-gray-500">Tedavi</p>
                        <p className="font-medium">{visit.treatment}</p>
                    </div>

                    {visit.medications.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-500 mb-2">İlaçlar</p>
                            <div className="space-y-2">
                                {visit.medications.map((med, index) => (
                                    <div
                                        key={index}
                                        className="p-3 bg-gray-50 rounded-lg"
                                    >
                                        <p className="font-medium">{med.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {med.dosage} - {med.frequency} - {med.duration}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visit.notes && (
                        <div>
                            <p className="text-sm text-gray-500">Notlar</p>
                            <p className="font-medium">{visit.notes}</p>
                        </div>
                    )}

                    {visit.cost && visit.cost > 0 && (
                        <div>
                            <p className="text-sm text-gray-500">Ücret</p>
                            <p className="font-medium">{visit.cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 