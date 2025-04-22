'use client';

import { useState } from 'react';
import { Vaccination } from '@/app/types/vet';
import { toast } from 'react-hot-toast';

interface AddVaccinationModalProps {
    onClose: () => void;
    onSubmit: (vaccination: Vaccination) => void;
}

export default function AddVaccinationModal({ onClose, onSubmit }: AddVaccinationModalProps) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [nextDueDate, setNextDueDate] = useState('');
    const [vetName, setVetName] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !date || !nextDueDate || !vetName) {
            toast.error('Lütfen tüm zorunlu alanları doldurun!');
            return;
        }

        const vaccination: Vaccination = {
            id: Date.now().toString(),
            name,
            date,
            nextDueDate,
            vetName,
            batchNumber,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        onSubmit(vaccination);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-2xl">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">💉</span>
                            <h2 className="text-xl font-bold text-gray-900">Aşı Ekle</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span className="text-lg">🏷️</span>
                            Aşı Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            placeholder="Örn: Karma Aşı"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <span className="text-lg">📅</span>
                                Yapıldığı Tarih
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <span className="text-lg">⏰</span>
                                Sonraki Tarih
                            </label>
                            <input
                                type="date"
                                value={nextDueDate}
                                onChange={(e) => setNextDueDate(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span className="text-lg">👨‍⚕️</span>
                            Veteriner Adı
                        </label>
                        <input
                            type="text"
                            value={vetName}
                            onChange={(e) => setVetName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            placeholder="Veterinerin adı"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span className="text-lg">🔢</span>
                            Seri Numarası
                        </label>
                        <input
                            type="text"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            placeholder="Aşı seri numarası"
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span className="text-lg">📝</span>
                            Notlar
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 group-hover:border-indigo-300"
                            placeholder="Aşı hakkında notlar..."
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 flex items-center gap-2"
                        >
                            <span>❌</span>
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
                        >
                            <span>💾</span>
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 