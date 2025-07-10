'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { VetRecord, VetVisit, Vaccination } from '@/app/types/vet';
import { Pet } from '@/app/types/pet';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import AddVaccinationModal from './components/AddVaccinationModal';
import AddVisitModal from './components/AddVisitModal';

export default function VetPage() {
    const { user } = useAuth();
    const [pet, setPet] = useState<Pet | null>(null);
    const [userPets, setUserPets] = useState<{ [key: string]: any }>({});
    const [selectedPetId, setSelectedPetId] = useState<string>('');
    const [vetRecord, setVetRecord] = useState<VetRecord>({
        id: '',
        petId: '',
        vetVisits: [],
        vaccinations: [],
        allergies: [],
        chronicConditions: [],
        lastVisit: '',
        nextVisit: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    const [loading, setLoading] = useState(true);
    const [showAddVisitModal, setShowAddVisitModal] = useState(false);
    const [showAddVaccinationModal, setShowAddVaccinationModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'visits' | 'vaccinations' | 'health' | 'ai'>('visits');
    const [isEditingAllergies, setIsEditingAllergies] = useState(false);
    const [isEditingConditions, setIsEditingConditions] = useState(false);
    const [newAllergy, setNewAllergy] = useState('');
    const [newCondition, setNewCondition] = useState('');
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
    const [vaccinationToDelete, setVaccinationToDelete] = useState<string | null>(null);

    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
        { role: 'assistant', content: 'Merhaba! Ben sağlık asistanınızım. Evcil hayvanınızın sağlık geçmişiyle ilgili sorularınızı yanıtlayabilirim.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Daha önce oluşturulmuş bir unsubscribe fonksiyonu varsa saklamak için ref kullanıyoruz
    const vetUnsubscribeRef = useRef<(() => void) | null>(null);

    // Ana useEffect - uygulama ilk yüklendiğinde ve user değiştiğinde çalışır
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        console.log('Kullanıcı oturum açtı, evcil hayvan verileri getiriliyor');

        const db = getDatabase();
        const petsRef = ref(db, `pets/${user.uid}`);

        // Evcil hayvanları çek
        const petUnsubscribe = onValue(petsRef, (snapshot) => {
            const petsData = snapshot.val();
            console.log('Evcil hayvan verileri:', petsData);

            if (petsData && typeof petsData === 'object') {
                setUserPets(petsData);

                const petIds = Object.keys(petsData);
                if (petIds.length > 0) {
                    // İlk evcil hayvanı seç
                    const firstPetId = petIds[0];
                    setSelectedPetId(firstPetId);
                    setPet(petsData[firstPetId] as Pet);

                    // Veteriner kaydını çek
                    fetchVetRecord(firstPetId);
                } else {
                    console.log('Evcil hayvan bulunamadı');
                    setLoading(false);
                }
            } else {
                // Test verisi
                console.log('Evcil hayvan verisi bulunamadı veya uygun formatta değil');
                const testPetId = 'test-pet-1';
                const testPet: Pet = {
                    id: testPetId,
                    ownerId: user?.uid || 'test-user',
                    name: 'Test Hayvan',
                    type: 'dog',
                    breed: 'Karışık',
                    age: '2',
                    gender: 'male',
                    description: 'Test hayvan',
                    personality: ['friendly'],
                    photos: [],
                    profilePhoto: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Pet;

                // Ekstra veriler için any tipinde bir obje oluştur
                const testPetWithExtras = {
                    ...testPet,
                    emoji: '🐶' // Pet tipinde olmayan özel alan
                };

                setUserPets({ [testPetId]: testPetWithExtras });
                setSelectedPetId(testPetId);
                setPet(testPet);
                setLoading(false);
            }
        }, (error) => {
            console.error('Evcil hayvan verisi çekilirken hata:', error);
            setLoading(false);
        });

        // Component unmount olduğunda unsubscribe ol
        return () => {
            console.log('Component unmount - abonelikleri temizleme');
            petUnsubscribe();

            // Eğer veteriner kaydı için de bir unsubscribe varsa çalıştır
            if (vetUnsubscribeRef.current) {
                vetUnsubscribeRef.current();
                vetUnsubscribeRef.current = null;
            }
        };
    }, [user]); // Sadece user değiştiğinde çalışır

    // Veteriner kaydını çekmek için fonksiyon
    const fetchVetRecord = (petId: string) => {
        if (!petId) {
            console.log('Veteriner kaydı çekilirken petId bulunamadı');
            return;
        }

        console.log('Veteriner kaydı çekiliyor:', petId);

        // Önceki veteriner kaydı dinlemesini temizle
        if (vetUnsubscribeRef.current) {
            vetUnsubscribeRef.current();
            vetUnsubscribeRef.current = null;
        }

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${petId}`);

        const unsubscribe = onValue(vetRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                // Veteriner kaydını güncelle
                setVetRecord({
                    ...data,
                    id: data.id || '',
                    petId,
                    vetVisits: data.vetVisits || [],
                    vaccinations: data.vaccinations || [],
                    allergies: data.allergies || [],
                    chronicConditions: data.chronicConditions || [],
                    lastVisit: data.lastVisit || '',
                    nextVisit: data.nextVisit || '',
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || new Date().toISOString()
                });
            } else {
                // Yeni veteriner kaydı oluştur
                const newRecord: VetRecord = {
                    id: Date.now().toString(),
                    petId,
                    vetVisits: [],
                    vaccinations: [],
                    allergies: [],
                    chronicConditions: [],
                    lastVisit: '',
                    nextVisit: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                set(vetRef, newRecord);
                setVetRecord(newRecord);
            }

            setLoading(false);
        });

        // unsubscribe fonksiyonunu sakla
        vetUnsubscribeRef.current = unsubscribe;
    };

    // selectedPetId değiştiğinde veteriner kaydını güncelle
    useEffect(() => {
        if (selectedPetId) {
            fetchVetRecord(selectedPetId);
        }
    }, [selectedPetId]); // Sadece selectedPetId değiştiğinde çalışır

    // Hayvan değiştirme işlevi
    const handleChangePet = (petId: string) => {
        if (!petId) return;

        console.log('Hayvan değiştiriliyor:', petId);
        setSelectedPetId(petId);

        const petData = userPets[petId];
        if (petData) {
            setPet(petData);
        } else {
            console.error('Seçilen hayvan verisi bulunamadı:', petId);
        }
    };

    const handleAddVisit = async (visit: Omit<VetVisit, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user || !selectedPetId) {
            toast.error('Kullanıcı veya hayvan bilgisi bulunamadı!');
            return;
        }

        console.log('Veteriner ziyareti ekleniyor:', { visit, selectedPetId });

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        const newVisit: VetVisit = {
            ...visit,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            // Önce mevcut kayıtları kontrol et
            const snapshot = await get(vetRef);
            const currentRecord = snapshot.val() || {
                id: Date.now().toString(),
                petId: selectedPetId,
                vetVisits: [],
                vaccinations: [],
                allergies: [],
                chronicConditions: [],
                lastVisit: '',
                nextVisit: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Ziyaretleri güncelle - dizinin tanımlı olduğundan emin ol
            const currentVisits = Array.isArray(currentRecord.vetVisits) ? currentRecord.vetVisits : [];

            const updatedRecord = {
                ...currentRecord,
                petId: selectedPetId,
                vetVisits: [...currentVisits, newVisit],
                lastVisit: newVisit.date,
                nextVisit: newVisit.nextVisitDate || newVisit.date,
                updatedAt: new Date().toISOString()
            };

            console.log('Güncellenmiş veteriner kaydı:', updatedRecord);

            await set(vetRef, updatedRecord);
            toast.success('Veteriner ziyareti başarıyla eklendi!');
            setShowAddVisitModal(false);

            // UI'ı güncelle
            setVetRecord(updatedRecord);
        } catch (error) {
            console.error('Veteriner ziyareti eklenirken hata:', error);
            toast.error('Bir hata oluştu: ' + (error as Error).message);
        }
    };

    const handleAddVaccination = async (vaccination: Vaccination) => {
        if (!user || !selectedPetId) {
            toast.error('Kullanıcı veya hayvan bilgisi bulunamadı!');
            return;
        }

        console.log('Aşı ekleniyor:', { vaccination, selectedPetId });

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        try {
            // Önce mevcut kayıtları kontrol et
            const snapshot = await get(vetRef);
            const currentRecord = snapshot.val() || {
                id: Date.now().toString(),
                petId: selectedPetId,
                vetVisits: [],
                vaccinations: [],
                allergies: [],
                chronicConditions: [],
                lastVisit: '',
                nextVisit: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Aşıları güncelle - dizinin tanımlı olduğundan emin ol
            const currentVaccinations = Array.isArray(currentRecord.vaccinations) ? currentRecord.vaccinations : [];

            const updatedRecord = {
                ...currentRecord,
                petId: selectedPetId,
                vaccinations: [...currentVaccinations, vaccination],
                updatedAt: new Date().toISOString()
            };

            console.log('Güncellenmiş aşı kaydı:', updatedRecord);

            await set(vetRef, updatedRecord);
            toast.success('Aşı başarıyla eklendi!');
            setShowAddVaccinationModal(false);

            // UI'ı güncelle
            setVetRecord(updatedRecord);
        } catch (error) {
            console.error('Aşı eklenirken hata:', error);
            toast.error('Bir hata oluştu: ' + (error as Error).message);
        }
    };

    const handleAddAllergy = async () => {
        if (!newAllergy.trim() || !user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            allergies: [...(vetRecord.allergies || []), newAllergy.trim()],
            updatedAt: new Date().toISOString(),
        };

        try {
            await set(vetRef, updatedRecord);
            setNewAllergy('');
            setIsEditingAllergies(false);
            toast.success('Alerji başarıyla eklendi!');
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Alerji eklenirken hata:', error);
        }
    };

    const handleRemoveAllergy = async (allergyToRemove: string) => {
        if (!user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            allergies: vetRecord.allergies?.filter(allergy => allergy !== allergyToRemove) || [],
            updatedAt: new Date().toISOString(),
        };

        try {
            await set(vetRef, updatedRecord);
            toast.success('Alerji başarıyla kaldırıldı!');
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Alerji kaldırılırken hata:', error);
        }
    };

    const handleAddCondition = async () => {
        if (!newCondition.trim() || !user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            chronicConditions: [...(vetRecord.chronicConditions || []), newCondition.trim()],
            updatedAt: new Date().toISOString(),
        };

        try {
            await set(vetRef, updatedRecord);
            setNewCondition('');
            setIsEditingConditions(false);
            toast.success('Kronik rahatsızlık başarıyla eklendi!');
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Kronik rahatsızlık eklenirken hata:', error);
        }
    };

    const handleRemoveCondition = async (conditionToRemove: string) => {
        if (!user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            chronicConditions: vetRecord.chronicConditions?.filter(condition => condition !== conditionToRemove) || [],
            updatedAt: new Date().toISOString(),
        };

        try {
            await set(vetRef, updatedRecord);
            toast.success('Kronik rahatsızlık başarıyla kaldırıldı!');
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Kronik rahatsızlık kaldırılırken hata:', error);
        }
    };

    const handleRemoveVisit = async (visitId: string) => {
        if (!user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        // Ziyareti kaldır
        const updatedVisits = vetRecord.vetVisits.filter(visit => visit.id !== visitId);

        // Son ziyaret ve sonraki randevu tarihlerini güncelle
        let lastVisit = '';
        let nextVisit = '';

        if (updatedVisits.length > 0) {
            // Ziyaretleri tarihe göre sırala
            const sortedVisits = [...updatedVisits].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            lastVisit = sortedVisits[0].date;
            nextVisit = sortedVisits[0].nextVisitDate || sortedVisits[0].date;
        }

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            vetVisits: updatedVisits,
            lastVisit,
            nextVisit,
            updatedAt: new Date().toISOString()
        };

        try {
            await set(vetRef, updatedRecord);
            toast.success('Veteriner ziyareti başarıyla silindi!');
            setShowDeleteConfirmModal(false);
            setVisitToDelete(null);
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Veteriner ziyareti silinirken hata:', error);
        }
    };

    const handleRemoveVaccination = async (vaccinationId: string) => {
        if (!user || !selectedPetId) return;

        const db = getDatabase();
        const vetRef = ref(db, `vetRecords/${selectedPetId}`);

        // Aşıyı kaldır
        const updatedVaccinations = vetRecord.vaccinations.filter(vacc => vacc.id !== vaccinationId);

        const updatedRecord: VetRecord = {
            ...vetRecord,
            petId: selectedPetId, // Her zaman seçili hayvanın ID'sini kullan
            vaccinations: updatedVaccinations,
            updatedAt: new Date().toISOString()
        };

        try {
            await set(vetRef, updatedRecord);
            toast.success('Aşı başarıyla silindi!');
            setShowDeleteConfirmModal(false);
            setVaccinationToDelete(null);
        } catch (error) {
            toast.error('Bir hata oluştu!');
            console.error('Aşı silinirken hata:', error);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userMsg = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const res = await fetch('/api/vet-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, vetRecord })
            });
            const data = await res.json();
            if (data.reply) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'assistant', content: 'Bir hata oluştu, lütfen tekrar deneyin.' }]);
            }
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Bir hata oluştu, lütfen tekrar deneyin.' }]);
        }
        setChatLoading(false);
    };

    // useRef ve useEffect sadece bir kez tanımlanmalı
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            {/* Animasyonlu Arka Plan */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-slow"></div>
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>
            </div>

            {/* Ana İçerik */}
            <div className="relative z-10 container mx-auto px-4 py-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Veteriner Kayıtları</h1>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowAddVaccinationModal(true)}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors flex items-center gap-2 hover:shadow-lg hover:-translate-y-1"
                            >
                                <span>💉</span>
                                Aşı Ekle
                            </button>
                            <button
                                onClick={() => setShowAddVisitModal(true)}
                                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors flex items-center gap-2 hover:shadow-lg hover:-translate-y-1"
                            >
                                <span>🏥</span>
                                Ziyaret Ekle
                            </button>
                        </div>
                    </div>

                    {/* Hayvan Seçimi - Her zaman görünsün */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-md">
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <div className="font-medium text-gray-700 flex items-center gap-2">
                                <span className="text-xl">🐾</span>
                                <span>Evcil Hayvan Seçin:</span>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-3">
                                {/* Debug bilgisi */}
                                {Object.keys(userPets).length === 0 ? (
                                    <span className="text-sm text-red-500">Hiç hayvan bulunamadı - Lütfen önce hayvan ekleyin</span>
                                ) : (
                                    Object.entries(userPets).map(([petId, petData]: [string, any]) => (
                                        <button
                                            key={petId}
                                            onClick={() => handleChangePet(petId)}
                                            className={`px-4 py-2 rounded-lg ${selectedPetId === petId
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                } transition-colors flex items-center gap-2`}
                                        >
                                            <span>{petData?.emoji || '🐾'}</span>
                                            <span>{petData?.name || 'İsimsiz Hayvan'}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Özet Bilgiler */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                        <div className="bg-purple-100 rounded-xl p-3 sm:p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-purple-200 cursor-pointer group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg sm:text-xl group-hover:animate-bounce">📅</span>
                                <p className="text-xs sm:text-sm text-purple-600">Son Ziyaret</p>
                            </div>
                            <p className="text-sm sm:text-lg font-semibold text-purple-900 group-hover:text-purple-700">
                                {vetRecord?.lastVisit ? format(new Date(vetRecord.lastVisit), 'd MMMM yyyy', { locale: tr }) : 'Henüz ziyaret yok'}
                            </p>
                        </div>
                        <div className="bg-blue-100 rounded-xl p-3 sm:p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-200 cursor-pointer group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg sm:text-xl group-hover:animate-bounce">⏰</span>
                                <p className="text-xs sm:text-sm text-blue-600">Sonraki Randevu</p>
                            </div>
                            <p className="text-sm sm:text-lg font-semibold text-blue-900 group-hover:text-blue-700">
                                {vetRecord?.nextVisit ? format(new Date(vetRecord.nextVisit), 'd MMMM yyyy', { locale: tr }) : 'Planlanmış randevu yok'}
                            </p>
                        </div>
                        <div className="bg-green-100 rounded-xl p-3 sm:p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-green-200 cursor-pointer group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg sm:text-xl group-hover:animate-bounce">💉</span>
                                <p className="text-xs sm:text-sm text-green-600">Toplam Aşı</p>
                            </div>
                            <p className="text-sm sm:text-lg font-semibold text-green-900 group-hover:text-green-700">
                                {vetRecord?.vaccinations?.length || 0}
                            </p>
                        </div>
                        <div className="bg-amber-100 rounded-xl p-3 sm:p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-amber-200 cursor-pointer group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg sm:text-xl group-hover:animate-bounce">💊</span>
                                <p className="text-xs sm:text-sm text-amber-600">Aktif İlaç</p>
                            </div>
                            <p className="text-sm sm:text-lg font-semibold text-amber-900 group-hover:text-amber-700">
                                {vetRecord?.vetVisits?.reduce((acc, visit) =>
                                    acc + (visit.medications?.filter(med => med.isActive)?.length || 0), 0) || 0}
                            </p>
                        </div>
                    </div>

                    {/* Sekmeler */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <div className="flex whitespace-nowrap">
                                <button
                                    onClick={() => setActiveTab('visits')}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${activeTab === 'visits'
                                        ? 'text-indigo-700 border-b-2 border-indigo-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Veteriner Ziyaretleri
                                </button>
                                <button
                                    onClick={() => setActiveTab('vaccinations')}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${activeTab === 'vaccinations'
                                        ? 'text-indigo-700 border-b-2 border-indigo-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Aşı Takibi
                                </button>
                                <button
                                    onClick={() => setActiveTab('health')}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${activeTab === 'health'
                                        ? 'text-indigo-700 border-b-2 border-indigo-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Sağlık Bilgileri
                                </button>
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${activeTab === 'ai'
                                        ? 'text-indigo-700 border-b-2 border-indigo-700'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🤖 Yapay Zeka Asistanı
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {activeTab === 'visits' && (
                                <div className="space-y-4">
                                    {vetRecord?.vetVisits?.length ? (
                                        vetRecord.vetVisits.map((visit) => (
                                            <div key={visit.id} className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">👨‍⚕️</span>
                                                        <div>
                                                            <h3 className="font-semibold text-gray-900">{visit.vetName}</h3>
                                                            <p className="text-sm text-gray-700">{visit.clinicName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                                        <p className="text-sm text-gray-700">
                                                            {format(new Date(visit.date), 'd MMMM yyyy', { locale: tr })}
                                                        </p>
                                                        <button
                                                            onClick={() => {
                                                                setVisitToDelete(visit.id);
                                                                setShowDeleteConfirmModal(true);
                                                            }}
                                                            className="text-red-500 hover:text-red-700 transition-colors"
                                                            title="Ziyareti Sil"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-2">
                                                    <p className="text-sm text-gray-800"><span className="font-medium">Teşhis:</span> {visit.diagnosis}</p>
                                                    <p className="text-sm text-gray-800"><span className="font-medium">Tedavi:</span> {visit.treatment}</p>
                                                    {visit.medications?.length > 0 && (
                                                        <div>
                                                            <p className="text-sm font-medium mb-1 text-gray-800">İlaçlar:</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {visit.medications.map((med, idx) => (
                                                                    <div key={idx} className="bg-white rounded-lg p-2 text-sm text-gray-900">
                                                                        <p className="font-medium">{med.name}</p>
                                                                        <p className="text-gray-700">{med.dosage} - {med.frequency}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <span className="text-4xl mb-4 block">🏥</span>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz veteriner ziyareti yok</h3>
                                            <p className="text-gray-500">İlk veteriner ziyaretini eklemek için "Ziyaret Ekle" butonunu kullanın.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'vaccinations' && (
                                <div className="space-y-4">
                                    {vetRecord?.vaccinations?.length ? (
                                        vetRecord.vaccinations.map((vacc, idx) => (
                                            <div key={idx} className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">💉</span>
                                                        <div>
                                                            <h3 className="font-medium text-gray-900">{vacc.name}</h3>
                                                            <p className="text-sm text-gray-500">{vacc.vetName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500">
                                                            {format(new Date(vacc.date), 'd MMMM yyyy', { locale: tr })}
                                                        </p>
                                                        <p className="text-xs text-indigo-600">
                                                            Sonraki: {format(new Date(vacc.nextDueDate), 'd MMMM yyyy', { locale: tr })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-2">
                                                    <button
                                                        onClick={() => {
                                                            setVaccinationToDelete(vacc.id);
                                                            setShowDeleteConfirmModal(true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Aşıyı Sil"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <span className="text-4xl mb-4 block">💉</span>
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz aşı kaydı yok</h3>
                                            <p className="text-gray-500">İlk aşı kaydını eklemek için "Aşı Ekle" butonunu kullanın.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'health' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                                <span>⚠️</span> Alerjiler
                                            </h3>
                                            <button
                                                onClick={() => setIsEditingAllergies(!isEditingAllergies)}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                            >
                                                <span>{isEditingAllergies ? '✕' : '✚'}</span>
                                                {isEditingAllergies ? 'İptal' : 'Ekle'}
                                            </button>
                                        </div>
                                        {isEditingAllergies && (
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={newAllergy}
                                                    onChange={(e) => setNewAllergy(e.target.value)}
                                                    placeholder="Yeni alerji ekle"
                                                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    onClick={handleAddAllergy}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                >
                                                    Ekle
                                                </button>
                                            </div>
                                        )}
                                        {vetRecord?.allergies?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {vetRecord.allergies.map((allergy, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm group relative"
                                                    >
                                                        {allergy}
                                                        <button
                                                            onClick={() => handleRemoveAllergy(allergy)}
                                                            className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Bilinen alerji yok</p>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                                <span>🏥</span> Kronik Rahatsızlıklar
                                            </h3>
                                            <button
                                                onClick={() => setIsEditingConditions(!isEditingConditions)}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                            >
                                                <span>{isEditingConditions ? '✕' : '✚'}</span>
                                                {isEditingConditions ? 'İptal' : 'Ekle'}
                                            </button>
                                        </div>
                                        {isEditingConditions && (
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={newCondition}
                                                    onChange={(e) => setNewCondition(e.target.value)}
                                                    placeholder="Yeni kronik rahatsızlık ekle"
                                                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <button
                                                    onClick={handleAddCondition}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                >
                                                    Ekle
                                                </button>
                                            </div>
                                        )}
                                        {vetRecord?.chronicConditions?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {vetRecord.chronicConditions.map((condition, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm group relative"
                                                    >
                                                        {condition}
                                                        <button
                                                            onClick={() => handleRemoveCondition(condition)}
                                                            className="ml-2 text-amber-500 hover:text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Kronik rahatsızlık yok</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ai' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl p-4 shadow-md mt-6">
                                        <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                            <span>🤖</span> Yapay Zeka Sağlık Asistanı
                                        </h3>
                                        <div className="flex flex-col h-96 max-h-[32rem] border rounded-lg overflow-hidden">
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50" id="vet-chat-messages">
                                                {chatMessages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`px-3 py-2 rounded-lg max-w-full sm:max-w-xs text-base sm:text-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                                                            {msg.content
                                                                .replace(/[-*•]/g, '') // madde işaretlerini kaldır
                                                                .replace(/\n/g, ' ')   // satır sonlarını boşlukla değiştir
                                                                .replace(/\s+/g, ' ')  // fazla boşlukları tek boşluğa indir
                                                                .trim()
                                                            }
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={chatEndRef} />
                                            </div>
                                            <form
                                                className="flex border-t bg-white px-2 py-2 gap-2"
                                                onSubmit={handleChatSubmit}
                                            >
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-3 text-base sm:text-sm outline-none rounded-md border border-gray-200"
                                                    placeholder="Sağlıkla ilgili bir soru sor..."
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    disabled={chatLoading}
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-4 py-3 sm:py-2 bg-indigo-600 text-white font-medium rounded-md disabled:opacity-50"
                                                    disabled={chatLoading || !chatInput.trim()}
                                                >
                                                    Gönder
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modaller */}
            {showAddVaccinationModal && (
                <AddVaccinationModal
                    onClose={() => setShowAddVaccinationModal(false)}
                    onSubmit={handleAddVaccination}
                />
            )}
            {showAddVisitModal && (
                <AddVisitModal
                    onClose={() => setShowAddVisitModal(false)}
                    onSubmit={handleAddVisit}
                />
            )}

            {/* Silme Onay Modalı */}
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {visitToDelete ? 'Ziyareti Sil' : 'Aşıyı Sil'}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {visitToDelete
                                    ? 'Bu ziyareti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                                    : 'Bu aşıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
                                }
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirmModal(false);
                                        setVisitToDelete(null);
                                        setVaccinationToDelete(null);
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={() => {
                                        if (visitToDelete) {
                                            handleRemoveVisit(visitToDelete);
                                        } else if (vaccinationToDelete) {
                                            handleRemoveVaccination(vaccinationToDelete);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 