'use client';

import { useState } from 'react';
import { VetVisit } from '@/app/types/vet';

interface AddVisitModalProps {
    onClose: () => void;
    onSubmit: (visit: Omit<VetVisit, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function AddVisitModal({ onClose, onSubmit }: AddVisitModalProps) {
    const [formData, setFormData] = useState({
        vetName: '',
        clinicName: '',
        date: '',
        nextVisitDate: '',
        diagnosis: '',
        symptoms: [''],
        treatment: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', isActive: true }],
        notes: '',
        cost: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const addMedication = () => {
        setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', isActive: true }]
        }));
    };

    const updateMedication = (index: number, field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            medications: prev.medications.map((med, i) =>
                i === index ? { ...med, [field]: value } : med
            )
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            {/* Arka plan animasyonu */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-50 animate-pulse"></div>

            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl transform transition-all duration-300 hover:scale-[1.01]">
                {/* Başlık bölümü */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🏥</span>
                        <h2 className="text-2xl font-bold text-gray-900">Veteriner Ziyareti Ekle</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Veteriner ve Klinik Bilgileri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-indigo-700 mb-1 flex items-center gap-2">
                                <span>👨‍⚕️</span>
                                Veteriner Adı
                            </label>
                            <input
                                type="text"
                                value={formData.vetName}
                                onChange={(e) => setFormData(prev => ({ ...prev, vetName: e.target.value }))}
                                className="w-full px-4 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                required
                                placeholder="Veterinerin adını girin"
                            />
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-purple-700 mb-1 flex items-center gap-2">
                                <span>🏢</span>
                                Klinik Adı
                            </label>
                            <input
                                type="text"
                                value={formData.clinicName}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
                                className="w-full px-4 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                required
                                placeholder="Klinik adını girin"
                            />
                        </div>
                    </div>

                    {/* Tarih Bilgileri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                                <span>📅</span>
                                Ziyaret Tarihi
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                required
                            />
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-green-700 mb-1 flex items-center gap-2">
                                <span>⏰</span>
                                Sonraki Ziyaret Tarihi
                            </label>
                            <input
                                type="date"
                                value={formData.nextVisitDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, nextVisitDate: e.target.value }))}
                                className="w-full px-4 py-2 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Teşhis */}
                    <div className="bg-amber-50 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-amber-700 mb-1 flex items-center gap-2">
                            <span>🔍</span>
                            Teşhis
                        </label>
                        <input
                            type="text"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            className="w-full px-4 py-2 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                            required
                            placeholder="Teşhisi girin"
                        />
                    </div>

                    {/* Belirtiler */}
                    <div className="bg-pink-50 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-pink-700 mb-1 flex items-center gap-2">
                            <span>⚠️</span>
                            Belirtiler
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.symptoms[formData.symptoms.length - 1] || ''}
                                onChange={(e) => {
                                    const newSymptoms = [...formData.symptoms];
                                    newSymptoms[newSymptoms.length - 1] = e.target.value;
                                    setFormData(prev => ({ ...prev, symptoms: newSymptoms }));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (e.currentTarget.value) {
                                            setFormData(prev => ({
                                                ...prev,
                                                symptoms: [...prev.symptoms, '']
                                            }));
                                        }
                                    }
                                }}
                                className="w-full px-4 py-2 border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
                                placeholder="Belirti eklemek için yazın ve Enter'a basın"
                            />
                        </div>
                        {formData.symptoms.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {formData.symptoms.map((symptom, index) => (
                                    symptom && (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-100 text-pink-800 animate-fade-in"
                                        >
                                            {symptom}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSymptoms = formData.symptoms.filter((_, i) => i !== index);
                                                    setFormData(prev => ({ ...prev, symptoms: newSymptoms }));
                                                }}
                                                className="ml-2 text-pink-600 hover:text-pink-800 transition-colors"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    )
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tedavi */}
                    <div className="bg-teal-50 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-teal-700 mb-1 flex items-center gap-2">
                            <span>💊</span>
                            Tedavi
                        </label>
                        <textarea
                            value={formData.treatment}
                            onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
                            className="w-full px-4 py-2 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                            rows={3}
                            placeholder="Tedavi detaylarını girin"
                        />
                    </div>

                    {/* İlaçlar */}
                    <div className="bg-cyan-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-cyan-700 flex items-center gap-2">
                                <span>💊</span>
                                İlaçlar
                            </label>
                            <button
                                type="button"
                                onClick={addMedication}
                                className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1"
                            >
                                <span>➕</span>
                                İlaç Ekle
                            </button>
                        </div>
                        <div className="space-y-4">
                            {formData.medications.map((med, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl shadow-sm">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="İlaç Adı"
                                            value={med.name}
                                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                                            className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Dozaj"
                                            value={med.dosage}
                                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                            className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Kullanım Sıklığı"
                                            value={med.frequency}
                                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                            className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Kullanım Süresi"
                                            value={med.duration}
                                            onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                                            className="w-full px-4 py-2 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={med.isActive}
                                                onChange={(e) => updateMedication(index, 'isActive', e.target.checked)}
                                                className="mr-2 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-cyan-300 rounded"
                                            />
                                            <span className="text-sm text-cyan-700">Aktif</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notlar */}
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span>📝</span>
                            Notlar
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                            rows={3}
                            placeholder="Ek notlarınızı girin"
                        />
                    </div>

                    {/* Ücret */}
                    <div className="bg-emerald-50 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-emerald-700 mb-1 flex items-center gap-2">
                            <span>💰</span>
                            Ücret
                        </label>
                        <input
                            type="number"
                            value={formData.cost}
                            onChange={(e) => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                            className="w-full px-4 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                            min="0"
                            step="0.01"
                            placeholder="Ücreti girin"
                        />
                    </div>

                    {/* Butonlar */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <span>❌</span>
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
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