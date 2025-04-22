'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';
import { getAuth, User } from 'firebase/auth';
import { getDatabase, ref, push, set, get, onValue, query, orderByChild, equalTo, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';

// Arka plan animasyonları için CSS stilleri
const backgroundAnimationStyles = `
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-20px) rotate(5deg); opacity: 0.9; }
  100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.05); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.4; }
}

@keyframes bobble {
  0% { transform: translateY(0px) translateX(0px); }
  33% { transform: translateY(-10px) translateX(10px); }
  66% { transform: translateY(10px) translateX(-10px); }
  100% { transform: translateY(0px) translateX(0px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

interface BusinessProfile {
    businessName: string;
    businessCategory: string;
    businessSubCategory: string | null;
    phone: string;
    address: string;
    location: {
        city: string;
        district: string;
    };
    status: string;
    verified: boolean;
}

interface Service {
    id: string;
    serviceName: string;
    description?: string;
    price: string | null;
    duration?: string;
    images: {
        image1: string;
        image2?: string;
    };
    createdAt: number;
    updatedAt: number;
    status?: 'active' | 'inactive' | 'passive';
    categorySpecificFields?: Record<string, any>;
    subCategory?: string;
}

// Kategori özel alan tipleri tanımı
interface CategoryField {
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: string[];
}

export default function BusinessDashboard() {
    const { user, loading, logout } = useAuth();
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [activeTab, setActiveTab] = useState('genel');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Hizmet ekleme için state'ler
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceName, setServiceName] = useState('');
    const [servicePrice, setServicePrice] = useState<string | null>('');
    const [serviceImages, setServiceImages] = useState<{ file1: File | null, file2: File | null }>({ file1: null, file2: null });
    const [imagePreview, setImagePreview] = useState<{ image1: string; image2: string }>({ image1: '', image2: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

    // Hizmet detaylarını göstermek için state
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    // Hizmet düzenleme için state
    const [isEditing, setIsEditing] = useState(false);
    const [editServiceName, setEditServiceName] = useState('');
    const [editServicePrice, setEditServicePrice] = useState('');
    const [editServiceImages, setEditServiceImages] = useState<{ file1: File | null, file2: File | null }>({ file1: null, file2: null });
    const [editImagePreview, setEditImagePreview] = useState<{ preview1: string, preview2: string }>({ preview1: '', preview2: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    const router = useRouter();
    const auth = getAuth(app);
    const db = getDatabase();
    const storage = getStorage(app);

    // Kategori bazlı özel alanlar için state
    const [categoryFields, setCategoryFields] = useState<{ [key: string]: string | string[] }>({});
    const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>('');
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [serviceDescription, setServiceDescription] = useState<string | null>('');
    const [serviceDuration, setServiceDuration] = useState<string | null>('');
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [serviceCategory, setServiceCategory] = useState<string>('');

    // Kategori özel alan tanımlamaları
    const CATEGORY_SPECIFIC_FIELDS = {
        veterinary: [
            { id: 'duration', label: 'Hizmet Süresi', type: 'text', placeholder: 'Örn: 30 dakika' },
            { id: 'animalTypes', label: 'Hangi Hayvanlar İçin', type: 'multiselect', options: ['Kedi', 'Köpek', 'Kuş', 'Kemirgen', 'Diğer'] },
            { id: 'requiresAppointment', label: 'Randevu Gerekli mi?', type: 'checkbox' }
        ],
        petshop: [
            { id: 'brand', label: 'Marka', type: 'text', placeholder: 'Örn: Royal Canin' },
            { id: 'stockCount', label: 'Stok Miktarı', type: 'number' },
            { id: 'weight', label: 'Ağırlık/Miktar', type: 'text', placeholder: 'Örn: 1kg, 500ml' }
        ],
        grooming: [
            { id: 'duration', label: 'İşlem Süresi', type: 'text', placeholder: 'Örn: 45 dakika' },
            { id: 'animalSizes', label: 'Hayvan Boyutu', type: 'multiselect', options: ['Küçük', 'Orta', 'Büyük'] }
        ],
        boarding: [
            { id: 'stayDuration', label: 'Konaklama Süresi', type: 'text', placeholder: 'Örn: Günlük/Haftalık/Aylık' },
            { id: 'facilitiesIncluded', label: 'Dahil Olan Hizmetler', type: 'multiselect', options: ['Besleme', 'Yürüyüş', 'Tımar', 'Oyun', 'Sağlık Kontrolü'] }
        ],
        training: [
            { id: 'sessionType', label: 'Eğitim Tipi', type: 'select', options: ['Bireysel', 'Grup', 'Online'] },
            { id: 'levelRequired', label: 'Seviye Gerekliliği', type: 'select', options: ['Başlangıç', 'Orta', 'İleri'] }
        ],
        entertainment: [
            { id: 'venueType', label: 'Mekan Tipi', type: 'select', options: ['Açık Alan', 'Kapalı Alan', 'Karma'] },
            { id: 'capacity', label: 'Kapasite', type: 'number' }
        ],
        transport: [
            { id: 'vehicleType', label: 'Araç Tipi', type: 'select', options: ['Özel Araç', 'Minibüs', 'Özel Donanımlı Araç'] },
            { id: 'distance', label: 'Hizmet Mesafesi', type: 'text', placeholder: 'Örn: Şehir içi/Şehirlerarası' }
        ],
        health_products: [
            { id: 'usageType', label: 'Kullanım Tipi', type: 'select', options: ['İç Kullanım', 'Dış Kullanım', 'Takviye'] },
            { id: 'prescriptionRequired', label: 'Reçete Gerekli mi?', type: 'checkbox' }
        ],
        shelter: [
            { id: 'capacity', label: 'Kapasite', type: 'number' },
            { id: 'serviceType', label: 'Hizmet Tipi', type: 'select', options: ['Geçici Barınma', 'Uzun Süreli Bakım', 'Rehabilitasyon'] }
        ],
        special: [
            { id: 'specialtyType', label: 'Uzmanlık Alanı', type: 'text' },
            { id: 'certification', label: 'Sertifikalar', type: 'text' }
        ],
        farm: [
            { id: 'animalTypes', label: 'Hayvan Türleri', type: 'multiselect', options: ['At', 'İnek', 'Koyun', 'Keçi', 'Kümes Hayvanları', 'Diğer'] },
            { id: 'landSize', label: 'Arazi Büyüklüğü', type: 'text', placeholder: 'Örn: 5 dönüm' }
        ],
        tech: [
            { id: 'techType', label: 'Teknoloji Tipi', type: 'select', options: ['Donanım', 'Yazılım', 'Hibrit'] },
            { id: 'compatibility', label: 'Uyumluluk', type: 'multiselect', options: ['iOS', 'Android', 'Web', 'Diğer'] }
        ]
    };

    // Alt kategori başlık tanımlamaları
    const SUB_CATEGORIES = {
        veterinary: ['Genel Sağlık Hizmetleri', 'Uzman Veteriner Klinikleri', 'Acil Veteriner Hizmetleri'],
        petshop: ['Mama ve Beslenme Ürünleri', 'Aksesuar ve Oyuncaklar', 'Özel Diyet ve Vitamin Ürünleri'],
        grooming: ['Pet Kuaför/Tıraş Salonları', 'Yıkama ve Bakım Merkezleri', 'Spa ve Masaj Hizmetleri'],
        boarding: ['Pet Oteller/Pansiyonlar', 'Gündüz Bakım Merkezleri', 'Uzun Süreli Bakım Hizmetleri'],
        training: ['Eğitim ve Davranış Düzeltme Okulları', 'Agility ve Spor Merkezleri', 'Sosyalleşme Grupları'],
        entertainment: ['Pet Cafeler ve Restoranlar', 'Hayvan Dostu Etkinlik Alanları', 'Pet Parkları İşletmeleri'],
        transport: ['Pet Taxi/Transfer Hizmetleri', 'Evcil Hayvan Taşıma ve Lojistik', 'Seyahat Danışmanlığı'],
        health_products: ['Özel İlaç ve Tedavi Ürünleri', 'Tamamlayıcı Sağlık Ürünleri', 'Medikal Ekipman Tedarikçileri'],
        shelter: ['Özel Bakım Gerektiren Hayvanlar İçin Hizmetler', 'Sahiplendirme Organizasyonları', 'Yaşlı Hayvan Bakım Hizmetleri'],
        special: ['Pet Fotoğrafçılık Stüdyoları', 'Hayvan Mezarlıkları ve Anma Hizmetleri', 'Genetik ve Üreme Danışmanlığı'],
        farm: ['At Çiftlikleri ve Biniciliği', 'Çiftlik Hayvanları Bakımı ve Tedavisi', 'Organik/Doğal Ürün Üreten Çiftlikler'],
        tech: ['Hayvan Takip Sistemleri', 'Akıllı Mama ve Su Ürünleri', 'Dijital Sağlık İzleme Hizmetleri']
    };

    // Kategori alan değişikliklerini yönetme fonksiyonu
    const handleCategoryFieldChange = (fieldId: string, value: any) => {
        setCategoryFields(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    // Form'u sıfırlama fonksiyonu - kategori alanlarını da sıfırla
    const resetServiceForm = () => {
        setServiceName('');
        setServiceDescription('');
        setServicePrice('');
        setServiceDuration('');
        setSelectedSubCategory('');
        setImagePreview({ image1: '', image2: '' });
        setEditingServiceId(null);
        setCategoryFields({});
    };

    // Kullanıcının işletme olup olmadığını kontrol et
    const checkBusinessPermission = async (userId: string) => {
        if (!userId) return false;

        try {
            console.log("İşletme yetkisi kontrol ediliyor:", userId);
            const businessRef = ref(db, `businesses/${userId}/profile`);
            const snapshot = await get(businessRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log("İşletme verisi bulundu:", data.businessName);
                return true;
            }

            console.log("İşletme verisi bulunamadı");
            return false;
        } catch (error) {
            console.error("İşletme yetkisi kontrolünde hata:", error);
            return false;
        }
    };

    // useEffect hook'larındaki dinleyiciler için referansları tutacak değişken
    const [activeListeners, setActiveListeners] = useState<(() => void)[]>([]);

    useEffect(() => {
        // Auth yüklendiğinde yetki kontrolü yap
        const authCheck = async () => {
            if (!loading) {
                if (!user) {
                    console.log("Kullanıcı girişi yok, yönlendiriliyor...");
                    router.push('/isletmeler');
                    return;
                }

                // İşletme yetkisini kontrol et
                const hasPermission = await checkBusinessPermission(user.uid);
                setIsAuthorized(hasPermission);

                if (!hasPermission) {
                    console.log("İşletme yetkisi yok, yönlendiriliyor...");
                    toast.error("Bu sayfaya erişim yetkiniz yok.");
                    router.push('/');
                }
            }
        };

        authCheck();
    }, [user, loading, router]);

    // İşletme profilini yükle - artık isAuthorized kontrolü ile
    useEffect(() => {
        if (!user || !isAuthorized) return;

        const businessProfileRef = ref(db, `businesses/${user.uid}/profile`);

        const unsubscribe = onValue(businessProfileRef, (snapshot) => {
            const profileData = snapshot.val();
            if (profileData) {
                console.log("İşletme profili yüklendi:", profileData.businessName);
                setBusinessProfile(profileData as BusinessProfile);
            } else {
                console.log("İşletme profili veri yok");
            }
            setProfileLoading(false);
        });

        // Dinleyiciyi aktif dinleyiciler listesine ekle
        setActiveListeners(prev => [...prev, unsubscribe]);

        return () => {
            unsubscribe();
            // Dinleyiciyi listeden kaldır
            setActiveListeners(prev => prev.filter(listener => listener !== unsubscribe));
        };
    }, [user, isAuthorized, db]);

    // İşletme hizmetlerini yükle
    useEffect(() => {
        if (!user || !isAuthorized) return;

        const businessServicesRef = ref(db, `businesses/${user.uid}/services`);

        const unsubscribe = onValue(businessServicesRef, (snapshot) => {
            const servicesData = snapshot.val();
            const servicesArray: Service[] = [];

            if (servicesData) {
                Object.keys(servicesData).forEach((key) => {
                    servicesArray.push({
                        id: key,
                        ...servicesData[key]
                    });
                });
            }

            setServices(servicesArray);
            setServicesLoading(false);
        });

        // Dinleyiciyi aktif dinleyiciler listesine ekle
        setActiveListeners(prev => [...prev, unsubscribe]);

        return () => {
            unsubscribe();
            // Dinleyiciyi listeden kaldır
            setActiveListeners(prev => prev.filter(listener => listener !== unsubscribe));
        };
    }, [user, isAuthorized, db]);

    // Hizmet silme fonksiyonu
    const handleDeleteService = async (serviceId: string) => {
        if (!user) return;

        if (window.confirm('Bu hizmeti silmek istediğinizden emin misiniz?')) {
            try {
                const serviceRef = ref(db, `businesses/${user.uid}/services/${serviceId}`);
                await set(serviceRef, null);
                toast.success('Hizmet başarıyla silindi');

                // Eğer silinen hizmet detayı görüntüleniyorsa, modalı kapat
                if (selectedService?.id === serviceId) {
                    setSelectedService(null);
                }
            } catch (error) {
                console.error('Hizmet silinirken hata:', error);
                toast.error('Hizmet silinirken bir hata oluştu');
            }
        }
    };

    // Hizmet düzenleme için form hazırlama
    const prepareServiceEdit = (service: Service) => {
        setServiceName(service.serviceName);
        setServiceDescription(service.description || '');
        setServicePrice(service.price || '');
        setServiceDuration(service.duration || '');
        setSelectedSubCategory(service.subCategory || null);
        setImagePreview({
            image1: service.images?.image1 || '',
            image2: service.images?.image2 || ''
        });
        setEditingServiceId(service.id);
        setSelectedService(null); // Detay modalını kapat
        setTimeout(() => {
            setShowServiceModal(true); // Düzenleme modalını aç
        }, 300); // Animasyon süresi kadar bekle
    };

    // Hizmet düzenleme sırasında resim değiştiğinde
    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                if (imageNumber === 1) {
                    setEditServiceImages(prev => ({ ...prev, file1: file }));
                    setEditImagePreview(prev => ({ ...prev, preview1: event.target?.result as string }));
                } else {
                    setEditServiceImages(prev => ({ ...prev, file2: file }));
                    setEditImagePreview(prev => ({ ...prev, preview2: event.target?.result as string }));
                }
            };

            reader.readAsDataURL(file);
        }
    };

    // Hizmet güncelleme fonksiyonu
    const handleUpdateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !editingServiceId) return;

        if (!serviceName.trim()) {
            toast.error('Lütfen bir hizmet adı girin');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Hizmet güncelleniyor...');

        try {
            const serviceRef = ref(db, `businesses/${user.uid}/services/${editingServiceId}`);

            // Resim güncelleme işlemi
            const uploadPromises = [];
            let image1Url = imagePreview.image1;
            let image2Url = imagePreview.image2;

            if (serviceImages.file1) {
                const image1Ref = storageRef(storage, `businesses/${user.uid}/services/${editingServiceId}/image1`);
                uploadPromises.push(
                    uploadBytes(image1Ref, serviceImages.file1)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image1Url = url; })
                );
            }

            if (serviceImages.file2) {
                const image2Ref = storageRef(storage, `businesses/${user.uid}/services/${editingServiceId}/image2`);
                uploadPromises.push(
                    uploadBytes(image2Ref, serviceImages.file2)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image2Url = url; })
                );
            }

            await Promise.all(uploadPromises);

            // Güncellenmiş hizmet verileri
            const updatedService = {
                serviceName,
                description: serviceDescription,
                price: servicePrice,
                duration: serviceDuration,
                images: {
                    image1: image1Url,
                    image2: image2Url
                },
                updatedAt: Date.now(),
                subCategory: selectedSubCategory
            };

            // Veritabanını güncelle
            await update(serviceRef, updatedService);

            // State'leri sıfırla
            resetServiceForm();
            setShowServiceModal(false);

            toast.success('Hizmet başarıyla güncellendi', { id: toastId });
        } catch (error) {
            console.error('Hizmet güncellenirken hata:', error);
            toast.error('Hizmet güncellenirken bir hata oluştu', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    // Hizmet durumunu değiştirme (aktif/pasif)
    const toggleServiceStatus = async (serviceId: string, currentStatus: string = 'active') => {
        if (!user) return;

        try {
            const newStatus = currentStatus === 'active' ? 'passive' : 'active';
            const serviceRef = ref(db, `businesses/${user.uid}/services/${serviceId}/status`);
            await set(serviceRef, newStatus);

            // Seçili hizmet varsa ve ID'si eşleşiyorsa, onun da durumunu güncelle
            if (selectedService && selectedService.id === serviceId) {
                setSelectedService({
                    ...selectedService,
                    status: newStatus
                });
            }

            toast.success(`Hizmet ${newStatus === 'active' ? 'aktif' : 'pasif'} duruma getirildi`);
        } catch (error) {
            console.error('Hizmet durumu değiştirilirken hata:', error);
            toast.error('Hizmet durumu değiştirilirken bir hata oluştu');
        }
    };

    // Çıkış yapma işlevi
    const handleLogout = async () => {
        try {
            // İlk olarak tüm aktif dinleyicileri kapat
            activeListeners.forEach(unsubscribe => unsubscribe());
            // Aktif dinleyiciler listesini temizle
            setActiveListeners([]);

            // Şimdi logout işlemini gerçekleştir
            await logout();
            toast.success('Başarıyla çıkış yapıldı');
            router.push('/isletmeler');
        } catch (error) {
            console.error('Çıkış yaparken hata:', error);
            toast.error('Çıkış yapılırken bir hata oluştu');
        }
    };

    // Resim dosyası seçildiğinde çalışacak fonksiyon
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageNumber: number) => {
        const file = e.target.files?.[0];
        if (file) {
            if (imageNumber === 1) {
                setServiceImages(prev => ({ ...prev, file1: file }));
                setImagePreview(prev => ({ ...prev, image1: URL.createObjectURL(file) }));
            } else {
                setServiceImages(prev => ({ ...prev, file2: file }));
                setImagePreview(prev => ({ ...prev, image2: URL.createObjectURL(file) }));
            }
        } else {
            if (imageNumber === 1) {
                setServiceImages(prev => ({ ...prev, file1: null }));
                setImagePreview(prev => ({ ...prev, image1: '' }));
            } else {
                setServiceImages(prev => ({ ...prev, file2: null }));
                setImagePreview(prev => ({ ...prev, image2: '' }));
            }
        }
    };

    // Hizmet ekleme fonksiyonu
    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!serviceName.trim()) {
            toast.error('Lütfen bir hizmet adı girin');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Hizmet ekleniyor...');

        try {
            // Yeni servis için referans ve ID oluştur
            const servicesRef = ref(db, `businesses/${user.uid}/services`);
            const newServiceRef = push(servicesRef);
            const serviceId = newServiceRef.key;

            if (!serviceId) {
                throw new Error('Servis ID oluşturulamadı');
            }

            // Resim yükleme işlemi
            const uploadPromises = [];
            let image1Url = '';
            let image2Url = '';

            if (serviceImages.file1) {
                const image1Ref = storageRef(storage, `businesses/${user.uid}/services/${serviceId}/image1`);
                uploadPromises.push(
                    uploadBytes(image1Ref, serviceImages.file1)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image1Url = url; })
                );
            }

            if (serviceImages.file2) {
                const image2Ref = storageRef(storage, `businesses/${user.uid}/services/${serviceId}/image2`);
                uploadPromises.push(
                    uploadBytes(image2Ref, serviceImages.file2)
                        .then(snapshot => getDownloadURL(snapshot.ref))
                        .then(url => { image2Url = url; })
                );
            }

            await Promise.all(uploadPromises);

            // categorySpecificFields'ı güvenli hale getir
            const safeFields = Object.entries(categoryFields).reduce((acc, [key, value]) => {
                const safeKey = key
                    .replace(/[.#$/[\]]/g, '_')
                    .replace(/\s+/g, '_');
                acc[safeKey] = value;
                return acc;
            }, {} as Record<string, any>);

            // Yeni hizmet verisi
            const newService = {
                id: serviceId,
                serviceName,
                description: serviceDescription,
                price: servicePrice,
                duration: serviceDuration,
                images: {
                    image1: image1Url,
                    image2: image2Url
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: 'active',
                categorySpecificFields: safeFields,
                subCategory: selectedSubCategory
            };

            await set(newServiceRef, newService);

            // Form alanlarını sıfırla
            resetServiceForm();
            setShowServiceModal(false);

            toast.success('Hizmet başarıyla eklendi', { id: toastId });
        } catch (error) {
            console.error('Hizmet eklenirken hata:', error);
            toast.error('Hizmet eklenirken bir hata oluştu', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    // Yükleme durumları
    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-gray-600">Bilgiler yükleniyor...</p>
            </div>
        );
    }

    // Profil bulunamadıysa
    if (!businessProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">İşletme Profili Bulunamadı</h1>
                    <p className="text-gray-600 mb-6">İşletme profilinize erişilemiyor. Lütfen tekrar giriş yapmayı deneyin.</p>
                    <div className="flex justify-center">
                        <Link href="/isletmeler" className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                            Giriş Sayfasına Dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 relative overflow-hidden">
            {/* Style tag for animations */}
            <style jsx>{backgroundAnimationStyles}</style>

            {/* Background Animation Elements - Korundu */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_15s_ease-in-out_infinite]"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_20s_ease-in-out_infinite]"></div>
                <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[float_18s_ease-in-out_infinite]"></div>
                <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[float_15s_ease-in-out_infinite]"></div>

                {/* Geometric shapes - Korundu */}
                <div className="absolute top-10 left-[10%] w-10 h-10 bg-indigo-500 rounded-md opacity-10 rotate-12 animate-[bobble_15s_ease-in-out_infinite]"></div>
                <div className="absolute top-[20%] right-[15%] w-6 h-6 bg-purple-500 rounded-full opacity-10 animate-[bobble_12s_ease-in-out_infinite]"></div>
                <div className="absolute bottom-[20%] left-[20%] w-8 h-8 bg-blue-500 rounded-md rotate-45 opacity-10 animate-[bobble_14s_ease-in-out_infinite]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-12 h-12 bg-indigo-500 rounded-full opacity-10 animate-[bobble_16s_ease-in-out_infinite]"></div>
            </div>

            {/* Toast bildirimleri */}
            <Toaster position="top-right" />

            {/* Navbar - Geliştirilmiş tasarım */}
            <header className="bg-gradient-to-r from-indigo-800 to-purple-700 text-white shadow-lg relative z-10">
                <div className="px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-full shadow-md transform hover:scale-105 transition-transform duration-300">
                            <span className="text-2xl text-indigo-700">🏢</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{businessProfile.businessName}</h1>
                            <div className="hidden md:flex items-center mt-1">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${businessProfile.verified ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                                <span className="text-sm text-indigo-100">
                                    {businessProfile.verified ? 'Doğrulanmış İşletme' : 'Doğrulama Bekliyor'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobil menü düğmesi - Hover efekti eklenmiş */}
                    <button
                        className="md:hidden bg-indigo-600 p-2 rounded-md shadow-md text-white hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Masaüstü navbar - Hover efektleri geliştirilmiş */}
                    <nav className="hidden md:flex space-x-2">
                        <button
                            onClick={() => setActiveTab('genel')}
                            className={`px-4 py-2.5 rounded-full flex items-center transition-all duration-300 ${activeTab === 'genel'
                                ? 'bg-white text-indigo-700 font-medium shadow-md transform scale-105'
                                : 'text-white hover:bg-indigo-600 hover:shadow-md transform hover:scale-105'}`}>
                            <span className="text-lg mr-2">📊</span>
                            <span>Genel Bakış</span>
                        </button>
                        <Link
                            href="/business/listings"
                            className="px-4 py-2.5 rounded-full flex items-center transition-all duration-300 text-white hover:bg-indigo-600 hover:shadow-md transform hover:scale-105">
                            <span className="text-lg mr-2">🐾</span>
                            <span>İlanlarım</span>
                        </Link>
                        <button
                            onClick={() => setActiveTab('mesajlar')}
                            className={`px-4 py-2.5 rounded-full flex items-center transition-all duration-300 ${activeTab === 'mesajlar'
                                ? 'bg-white text-indigo-700 font-medium shadow-md transform scale-105'
                                : 'text-white hover:bg-indigo-600 hover:shadow-md transform hover:scale-105'}`}>
                            <span className="text-lg mr-2">💬</span>
                            <span>Mesajlar</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('profil')}
                            className={`px-4 py-2.5 rounded-full flex items-center transition-all duration-300 ${activeTab === 'profil'
                                ? 'bg-white text-indigo-700 font-medium shadow-md transform scale-105'
                                : 'text-white hover:bg-indigo-600 hover:shadow-md transform hover:scale-105'}`}>
                            <span className="text-lg mr-2">👤</span>
                            <span>Profil</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('ayarlar')}
                            className={`px-4 py-2.5 rounded-full flex items-center transition-all duration-300 ${activeTab === 'ayarlar'
                                ? 'bg-white text-indigo-700 font-medium shadow-md transform scale-105'
                                : 'text-white hover:bg-indigo-600 hover:shadow-md transform hover:scale-105'}`}>
                            <span className="text-lg mr-2">⚙️</span>
                            <span>Ayarlar</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="ml-2 bg-gradient-to-r from-red-500 to-pink-600 px-4 py-2.5 rounded-full hover:shadow-lg transition-all duration-300 flex items-center transform hover:scale-105 hover:shadow-md">
                            <span className="text-lg mr-2">🚪</span>
                            <span>Çıkış</span>
                        </button>
                    </nav>
                </div>

                {/* Mobil menü - Hover efektleri eklenmiş */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-gradient-to-r from-indigo-800 to-indigo-700 p-4 border-t border-indigo-600 shadow-inner animate-fadeIn">
                        <nav className="flex flex-col space-y-3">
                            <button
                                onClick={() => {
                                    setActiveTab('genel');
                                    setMobileMenuOpen(false);
                                }}
                                className={`px-4 py-3 rounded-lg flex items-center transition-all duration-300 ${activeTab === 'genel'
                                    ? 'bg-white text-indigo-800 font-medium shadow-md'
                                    : 'hover:bg-indigo-700 transform hover:translate-x-1'}`}>
                                <span className="text-xl mr-3">📊</span>
                                <span>Genel Bakış</span>
                            </button>
                            <Link
                                href="/business/listings"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-3 rounded-lg flex items-center transition-all duration-300 ${activeTab === 'ilanlar'
                                    ? 'bg-white text-indigo-800 font-medium shadow-md'
                                    : 'hover:bg-indigo-700 transform hover:translate-x-1'}`}>
                                <span className="text-xl mr-3">🐾</span>
                                <span>İlanlarım</span>
                            </Link>
                            <button
                                onClick={() => {
                                    setActiveTab('mesajlar');
                                    setMobileMenuOpen(false);
                                }}
                                className={`px-4 py-3 rounded-lg flex items-center transition-all duration-300 ${activeTab === 'mesajlar'
                                    ? 'bg-white text-indigo-800 font-medium shadow-md'
                                    : 'hover:bg-indigo-700 transform hover:translate-x-1'}`}>
                                <span className="text-xl mr-3">💬</span>
                                <span>Mesajlar</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('profil');
                                    setMobileMenuOpen(false);
                                }}
                                className={`px-4 py-3 rounded-lg flex items-center transition-all duration-300 ${activeTab === 'profil'
                                    ? 'bg-white text-indigo-800 font-medium shadow-md'
                                    : 'hover:bg-indigo-700 transform hover:translate-x-1'}`}>
                                <span className="text-xl mr-3">👤</span>
                                <span>Profil</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('ayarlar');
                                    setMobileMenuOpen(false);
                                }}
                                className={`px-4 py-3 rounded-lg flex items-center transition-all duration-300 ${activeTab === 'ayarlar'
                                    ? 'bg-white text-indigo-800 font-medium shadow-md'
                                    : 'hover:bg-indigo-700 transform hover:translate-x-1'}`}>
                                <span className="text-xl mr-3">⚙️</span>
                                <span>Ayarlar</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center mt-2 transform hover:translate-x-1">
                                <span className="text-xl mr-3">🚪</span>
                                <span>Çıkış Yap</span>
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            {/* Ana İçerik */}
            <main className="container mx-auto p-6 relative z-10">
                {/* Durum Çubuğu - Sol kenarlık ve gölge eklenmiş */}
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 shadow-md rounded-lg p-5 mb-6 flex justify-between items-center border border-indigo-200 border-l-4 border-l-indigo-500 hover:shadow-lg transition-all duration-300">
                    <h2 className="text-xl font-bold text-indigo-800 flex items-center">
                        {activeTab === 'genel' && (
                            <>
                                <span className="bg-indigo-200 p-1 rounded-md mr-2 text-indigo-600 text-sm">📊</span>
                                <span>Genel Bakış</span>
                            </>
                        )}
                        {activeTab === 'ilanlar' && (
                            <>
                                <span className="bg-indigo-200 p-1 rounded-md mr-2 text-indigo-600 text-sm">🐾</span>
                                <span>İlanlarım</span>
                            </>
                        )}
                        {activeTab === 'mesajlar' && (
                            <>
                                <span className="bg-indigo-200 p-1 rounded-md mr-2 text-indigo-600 text-sm">💬</span>
                                <span>Mesajlarım</span>
                            </>
                        )}
                        {activeTab === 'profil' && (
                            <>
                                <span className="bg-indigo-200 p-1 rounded-md mr-2 text-indigo-600 text-sm">👤</span>
                                <span>İşletme Profili</span>
                            </>
                        )}
                        {activeTab === 'ayarlar' && (
                            <>
                                <span className="bg-indigo-200 p-1 rounded-md mr-2 text-indigo-600 text-sm">⚙️</span>
                                <span>Hesap Ayarları</span>
                            </>
                        )}
                    </h2>
                    <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${businessProfile.status === 'active'
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200'
                            : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-200'
                            }`}>
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5 animate-pulse bg-current"></span>
                            {businessProfile.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                        <span className="bg-white px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-100 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date().toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                </div>

                {/* Genel Bakış İçeriği - İstatistik kartları iyileştirilmiş */}
                {activeTab === 'genel' && (
                    <div className="flex flex-col space-y-6">
                        {/* İstatistik Kartları */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg shadow-md p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 border border-indigo-200 transform hover:-translate-y-1">
                                <div className="flex items-center">
                                    <div className="bg-indigo-200 p-3 rounded-lg mr-4 shadow-inner">
                                        <span className="text-2xl">🐾</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Aktif İlanlar</p>
                                        <p className="text-2xl font-bold text-indigo-800">0</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg shadow-md p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 border border-green-200 transform hover:-translate-y-1">
                                <div className="flex items-center">
                                    <div className="bg-green-200 p-3 rounded-lg mr-4 shadow-inner">
                                        <span className="text-2xl">👁️</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Toplam Görüntülenme</p>
                                        <p className="text-2xl font-bold text-green-800">0</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg shadow-md p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 border border-blue-200 transform hover:-translate-y-1">
                                <div className="flex items-center">
                                    <div className="bg-blue-200 p-3 rounded-lg mr-4 shadow-inner">
                                        <span className="text-2xl">💬</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Okunmamış Mesajlar</p>
                                        <p className="text-2xl font-bold text-blue-800">0</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg shadow-md p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 border border-purple-200 transform hover:-translate-y-1">
                                <div className="flex items-center">
                                    <div className="bg-purple-200 p-3 rounded-lg mr-4 shadow-inner">
                                        <span className="text-2xl">⭐</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Değerlendirmeler</p>
                                        <p className="text-2xl font-bold text-purple-800">0</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* İşletme Hizmetleri Kartı - Daha iyi gölgeler ve efektler */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-md p-4 sm:p-5 h-auto min-h-[500px] md:min-h-[350px] border border-indigo-100 hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <span className="bg-indigo-200 p-1.5 rounded-md mr-2 shadow-sm">
                                        <span className="text-indigo-700 text-lg">🏢</span>
                                    </span>
                                    {businessProfile.businessName} Hizmetleri
                                </h3>
                                <button
                                    onClick={() => setShowServiceModal(true)}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-2 w-full sm:w-auto rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center text-sm font-medium transform hover:-translate-y-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Hizmet Ekle
                                </button>
                            </div>
                            <div className="bg-white rounded-lg p-3 sm:p-4 h-auto min-h-[300px] md:h-[calc(100%-60px)] flex flex-col border border-gray-100 shadow-sm overflow-visible">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                                    <h4 className="font-medium text-indigo-800">Hizmet Bilgileri</h4>
                                    <div className="flex items-center w-full sm:w-auto">
                                        <select
                                            className="text-xs border border-gray-200 rounded p-2 bg-gray-50 w-full sm:w-auto"
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                        >
                                            <option value="newest">En Yeni</option>
                                            <option value="oldest">En Eski</option>
                                            <option value="price-asc">Fiyat (Artan)</option>
                                            <option value="price-desc">Fiyat (Azalan)</option>
                                        </select>
                                    </div>
                                </div>

                                {servicesLoading ? (
                                    <div className="flex-grow flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                                    </div>
                                ) : services.length > 0 ? (
                                    <div className="flex-1">
                                        <div className="grid grid-cols-1 gap-4">
                                            {services
                                                .sort((a, b) => {
                                                    if (sortBy === 'newest') return b.createdAt - a.createdAt;
                                                    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
                                                    if (sortBy === 'price-asc') {
                                                        return Number(a.price || 0) - Number(b.price || 0);
                                                    }
                                                    if (sortBy === 'price-desc') {
                                                        return Number(b.price || 0) - Number(a.price || 0);
                                                    }
                                                    return 0;
                                                })
                                                .map(service => (
                                                    <div key={service.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow relative">
                                                        <div className="flex flex-row justify-between items-start mb-2">
                                                            <div className="flex space-x-3">
                                                                {service.images.image1 && (
                                                                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                                                        <img
                                                                            src={service.images.image1}
                                                                            alt={service.serviceName}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h5 className="font-medium text-gray-800">{service.serviceName}</h5>
                                                                    {service.price && (
                                                                        <p className="text-sm font-medium text-indigo-600 mt-0.5">{service.price} TL</p>
                                                                    )}
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {new Date(service.createdAt).toLocaleDateString('tr-TR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-1">
                                                                <button
                                                                    onClick={() => setSelectedService(service)}
                                                                    className="p-1.5 bg-indigo-100 rounded-full text-indigo-600 hover:bg-indigo-200"
                                                                    title="Detayları Görüntüle"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteService(service.id)}
                                                                    className="p-1.5 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
                                                                    title="Hizmeti Sil"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                            <span className={`text-xs ${service.status === 'passive' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'} px-2 py-0.5 rounded-full flex items-center`}>
                                                                {service.status === 'passive' ? (
                                                                    <>
                                                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1"></span>
                                                                        Pasif
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                                                                        Aktif
                                                                    </>
                                                                )}
                                                            </span>
                                                            <button
                                                                onClick={() => setSelectedService(service)}
                                                                className="text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded-lg"
                                                            >
                                                                Detayları Gör
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow flex items-center justify-center text-center px-1">
                                        <div className="text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p>Henüz hizmet eklenmemiş.</p>
                                            <p className="text-sm mt-1">Hizmetlerinizi eklemek için "Hizmet Ekle" butonunu kullanın.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* İlanlarım İçeriği */}
                {/* İlanlarım tab'ının içeriğini kaldırıyoruz çünkü artık /business/listings sayfasına yönlendiriyoruz */}

                {/* Mesajlarım İçeriği */}
                {activeTab === 'mesajlar' && (
                    <div className="bg-white rounded-lg shadow p-5 h-[calc(100vh-230px)]">
                        <h3 className="text-lg font-semibold mb-4">Mesajlarım</h3>
                        <div className="border rounded-lg overflow-hidden h-[calc(100%-3rem)] flex items-center justify-center">
                            <div className="p-8 text-center text-gray-500">
                                Henüz mesajınız bulunmuyor.
                            </div>
                        </div>
                    </div>
                )}

                {/* İşletme Profili İçeriği */}
                {activeTab === 'profil' && (
                    <div className="bg-gradient-to-br from-white via-gray-50 to-indigo-50 rounded-lg shadow-md p-5 h-[calc(100vh-230px)] overflow-y-auto border border-indigo-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-indigo-100">
                            <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                                <span className="bg-indigo-100 p-1.5 rounded-md mr-2 shadow-sm text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </span>
                                İşletme Profili
                            </h3>
                            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center mt-3 md:mt-0 transform hover:-translate-y-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Profili Düzenle
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                                    <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                        <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                        </span>
                                        Temel Bilgiler
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                İşletme Adı
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.businessName}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                Kategori
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.businessCategory}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                Alt Kategori
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.businessSubCategory || '-'}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                Telefon
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                                    <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                        <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </span>
                                        Adres ve Konum
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                Adres
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.address}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                </svg>
                                                İlçe
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.location.district}</p>
                                        </div>
                                        <div className="group">
                                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                                Şehir
                                            </p>
                                            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.location.city}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                            <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                İşletme Durumu
                            </h4>
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
                                <div className="group bg-indigo-50 p-3 rounded-lg transition-all duration-300 hover:bg-indigo-100">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Onay Durumu
                                    </p>
                                    <div className="flex items-center mt-1">
                                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${businessProfile.verified ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></span>
                                        <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.verified ? 'Doğrulanmış' : 'Doğrulama Bekliyor'}</p>
                                    </div>
                                </div>

                                <div className="group bg-indigo-50 p-3 rounded-lg transition-all duration-300 hover:bg-indigo-100">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-indigo-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Çalışma Durumu
                                    </p>
                                    <div className="flex items-center mt-1">
                                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${businessProfile.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                        <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">{businessProfile.status === 'active' ? 'Aktif' : 'Pasif'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hesap Ayarları İçeriği */}
                {activeTab === 'ayarlar' && (
                    <div className="bg-gradient-to-br from-white via-gray-50 to-indigo-50 rounded-lg shadow-md p-5 h-[calc(100vh-230px)] overflow-y-auto border border-indigo-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-indigo-100">
                            <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                                <span className="bg-indigo-100 p-1.5 rounded-md mr-2 shadow-sm text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </span>
                                Hesap Ayarları
                            </h3>
                        </div>
                        <div className="space-y-5">
                            <div className="bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                                <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                    <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    Gizlilik ve Güvenlik
                                </h4>
                                <button className="text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-4 py-2 rounded-md hover:bg-indigo-100 transition-all duration-300 flex items-center transform hover:-translate-y-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Şifre Değiştir
                                </button>
                            </div>

                            <div className="bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                                <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                    <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </span>
                                    Bildirim Ayarları
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                                    <span className="font-medium text-gray-700 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        E-posta Bildirimleri
                                    </span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-5 shadow-sm border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200">
                                <h4 className="font-medium text-indigo-700 mb-4 flex items-center">
                                    <span className="bg-indigo-100 p-1 rounded-md mr-2 shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </span>
                                    Hesap İşlemleri
                                </h4>
                                <button className="text-white bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 rounded-md hover:shadow-md transition-all duration-300 flex items-center transform hover:-translate-y-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Hesabı Dondur
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Hizmet Ekleme Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 flex flex-col relative">
                        {/* Modal arka plan animasyonları */}
                        <div className="absolute -z-10 inset-0 overflow-hidden opacity-10 pointer-events-none">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_15s_ease-in-out_infinite]"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_20s_ease-in-out_infinite]"></div>
                            <div className="absolute top-1/3 -left-10 w-20 h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[float_18s_ease-in-out_infinite]"></div>
                        </div>

                        {/* Modal başlık */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <span className="mr-2">{editingServiceId ? '✏️' : '➕'}</span>
                                {editingServiceId ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
                            </h2>
                        </div>

                        <form onSubmit={editingServiceId ? handleUpdateService : handleAddService} className="flex flex-col">
                            {/* Scrollable form content */}
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)] md:max-h-[60vh] scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-amber-100">
                                {/* Hizmet adı */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">🏷️</span> Hizmet Adı <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="serviceName"
                                        placeholder="Sunduğunuz hizmetin adını giriniz..."
                                        value={serviceName}
                                        onChange={(e) => setServiceName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all hover:shadow-md"
                                        required
                                    />
                                </div>

                                {/* Hizmet açıklaması */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.2s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">📝</span> Hizmet Açıklaması
                                    </label>
                                    <textarea
                                        name="serviceDescription"
                                        placeholder="Hizmetiniz hakkında detaylı bilgi verin..."
                                        value={serviceDescription || ''}
                                        onChange={(e) => setServiceDescription(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all hover:shadow-md min-h-[100px]"
                                    />
                                </div>

                                {/* Alt kategori seçimi */}
                                {businessProfile?.businessCategory && SUB_CATEGORIES[businessProfile.businessCategory as keyof typeof SUB_CATEGORIES] && (
                                    <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.3s' }}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="text-amber-500 mr-2">🔖</span> Alt Kategori <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="subCategory"
                                            value={selectedSubCategory || ''}
                                            onChange={(e) => setSelectedSubCategory(e.target.value === '' ? null : e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all hover:shadow-md"
                                            required
                                        >
                                            <option value="">Seçiniz</option>
                                            {SUB_CATEGORIES[businessProfile.businessCategory as keyof typeof SUB_CATEGORIES].map((subCat) => (
                                                <option key={subCat} value={subCat}>
                                                    {subCat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Hizmet fiyatı */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.4s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">💰</span> Hizmet Fiyatı (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        name="price"
                                        placeholder="Örn: 100₺, Görüşmeye bağlı"
                                        value={servicePrice || ''}
                                        onChange={(e) => setServicePrice(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all hover:shadow-md"
                                    />
                                </div>

                                {/* Hizmet süresi */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">⏱️</span> Hizmet Süresi (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        name="duration"
                                        placeholder="Örn: 30 dakika, 1 saat, 2 gün"
                                        value={serviceDuration || ''}
                                        onChange={(e) => setServiceDuration(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all hover:shadow-md"
                                    />
                                </div>

                                {/* Fotoğraf yükleme */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.6s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">📸</span> Hizmet Fotoğrafı
                                    </label>
                                    <div className="flex items-center space-x-4">
                                        <div
                                            onClick={() => document.getElementById('image1')?.click()}
                                            className="relative h-28 w-28 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-amber-500 cursor-pointer hover:shadow-md transition-all overflow-hidden"
                                        >
                                            {imagePreview?.image1 ? (
                                                <img src={imagePreview.image1} alt="Önizleme" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="text-center p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    <p className="text-xs text-gray-500 mt-1">Resim Ekle</p>
                                                </div>
                                            )}
                                            <input
                                                id="image1"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageChange(e, 1)}
                                                className="hidden"
                                            />
                                        </div>
                                        <div className="flex-1 text-sm text-gray-500">
                                            <p>Hizmetinizi en iyi şekilde temsil eden bir görsel seçin.</p>
                                            <p className="text-xs mt-1 text-amber-600">* PNG, JPG formatları desteklenir.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Butonlar */}
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetServiceForm();
                                        setShowServiceModal(false);
                                    }}
                                    className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 flex items-center transition-all duration-300 hover:shadow-md"
                                >
                                    <span className="mr-2">❌</span> İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors shadow-md font-medium flex items-center"
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">💾</span> {editingServiceId ? 'Güncelle' : 'Hizmet Ekle'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hizmet Detay Modalı */}
            {selectedService && !isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] animate-[fadeIn_0.3s_ease-out_forwards] relative">
                        {/* Modal arka plan animasyonları */}
                        <div className="absolute -z-10 inset-0 overflow-hidden opacity-10 pointer-events-none">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_15s_ease-in-out_infinite]"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_20s_ease-in-out_infinite]"></div>
                            <div className="absolute top-1/3 -left-10 w-20 h-20 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[float_18s_ease-in-out_infinite]"></div>
                        </div>

                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <h2 className="text-xl font-bold flex items-center">
                                <span className="bg-white text-amber-600 p-2 rounded-full mr-3 flex items-center justify-center">
                                    <span className="text-xl">🔍</span>
                                </span>
                                {selectedService.serviceName}
                            </h2>
                            <button
                                onClick={() => setSelectedService(null)}
                                className="text-white hover:text-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="relative overflow-hidden rounded-lg shadow-md group">
                                    <img
                                        src={selectedService.images.image1}
                                        alt={selectedService.serviceName}
                                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <div className="relative overflow-hidden rounded-lg shadow-md group">
                                    {selectedService.images.image2 ? (
                                        <>
                                            <img
                                                src={selectedService.images.image2}
                                                alt={selectedService.serviceName}
                                                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </>
                                    ) : (
                                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                            <span className="text-4xl mb-2">📷</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 mt-6">
                                <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
                                    <h3 className="font-medium text-gray-700 mb-1 flex items-center">
                                        <span className="text-lg mr-2">💰</span> Fiyat
                                    </h3>
                                    <p className="text-xl font-bold text-amber-600">{selectedService.price || 'Belirtilmemiş'} {selectedService.price && 'TL'}</p>
                                </div>

                                <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.2s' }}>
                                    <h3 className="font-medium text-gray-700 mb-1 flex items-center">
                                        <span className="text-lg mr-2">🔄</span> Durumu
                                    </h3>
                                    <div className="flex items-center">
                                        <span className={`${selectedService.status === 'passive' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'} text-sm px-3 py-1 rounded-full font-medium mr-2`}>
                                            {selectedService.status === 'passive' ? 'Pasif' : 'Aktif'}
                                        </span>
                                        <button
                                            onClick={() => toggleServiceStatus(selectedService.id, selectedService.status || 'active')}
                                            className="text-sm text-amber-600 hover:text-amber-800 flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            {selectedService.status === 'passive' ? 'Aktif Yap' : 'Pasif Yap'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.3s' }}>
                                        <h3 className="font-medium text-gray-700 mb-1 flex items-center">
                                            <span className="text-lg mr-2">📅</span> Eklenme Tarihi
                                        </h3>
                                        <p>{new Date(selectedService.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>

                                    <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.4s' }}>
                                        <h3 className="font-medium text-gray-700 mb-1 flex items-center">
                                            <span className="text-lg mr-2">🔄</span> Son Güncelleme
                                        </h3>
                                        <p>{selectedService.updatedAt ? new Date(selectedService.updatedAt).toLocaleDateString('tr-TR') : 'Henüz güncellenmedi'}</p>
                                    </div>
                                </div>

                                {/* Kategori özel alanları */}
                                {selectedService.categorySpecificFields && Object.keys(selectedService.categorySpecificFields).length > 0 && (
                                    <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
                                        <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="text-lg mr-2">📋</span> Kategori Özel Bilgileri
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.entries(selectedService.categorySpecificFields).map(([key, value]) => {
                                                // Kategori alanlarının etiketlerini bul
                                                let fieldLabel = key;
                                                let formattedValue: string | React.ReactNode = Array.isArray(value)
                                                    ? value.join(', ')
                                                    : value?.toString() || '';

                                                // Field tanımının tipini bul
                                                let fieldType = '';
                                                let fieldEmoji = '📝'; // Varsayılan emoji

                                                if (businessProfile?.businessCategory) {
                                                    const fieldDef = CATEGORY_SPECIFIC_FIELDS[businessProfile.businessCategory as keyof typeof CATEGORY_SPECIFIC_FIELDS]?.find(f => f.id === key);
                                                    if (fieldDef) {
                                                        fieldLabel = fieldDef.label;
                                                        fieldType = fieldDef.type;

                                                        // Alan tipine göre emoji belirleme
                                                        if (key === 'duration' || key.toLowerCase().includes('süre')) {
                                                            fieldEmoji = '⏱️';
                                                        } else if (fieldType === 'checkbox') {
                                                            fieldEmoji = '✅';
                                                        } else if (key === 'stockCount') {
                                                            fieldEmoji = '🔢';
                                                        } else if (key.toLowerCase().includes('kapasite')) {
                                                            fieldEmoji = '👥';
                                                        } else if (key === 'animalTypes' || key.toLowerCase().includes('hayvan')) {
                                                            fieldEmoji = '🐾';
                                                        } else if (key === 'brand' || key.toLowerCase().includes('marka')) {
                                                            fieldEmoji = '🏷️';
                                                        } else if (key === 'weight' || key.toLowerCase().includes('ağırlık')) {
                                                            fieldEmoji = '⚖️';
                                                        }
                                                    }
                                                }

                                                // Değer formatlaması
                                                if (key === 'duration' || key.toLowerCase().includes('süre')) {
                                                    formattedValue = `${value} dk`;
                                                } else if (fieldType === 'checkbox' || typeof value === 'boolean') {
                                                    formattedValue = value === true || value === 'true' ? 'Evet' : 'Hayır';
                                                } else if (key === 'stockCount' || key.toLowerCase().includes('kapasite')) {
                                                    formattedValue = `${value} adet`;
                                                } else if (key === 'landSize') {
                                                    formattedValue = `${value} dönüm`;
                                                } else if (key === 'weight') {
                                                    // Eğer değer zaten kg, ml, vb. içeriyorsa olduğu gibi bırak
                                                    if (!value.toString().match(/[a-zA-Z]/)) {
                                                        formattedValue = `${value} birim`;
                                                    }
                                                }

                                                return (
                                                    <div key={key} className="flex justify-between py-1 px-3 rounded-md hover:bg-amber-100">
                                                        <span className="text-gray-600 flex items-center">
                                                            <span className="mr-2">{fieldEmoji}</span>
                                                            {fieldLabel}
                                                        </span>
                                                        <span className="font-medium text-amber-700">
                                                            {formattedValue}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Alt kategori */}
                                {selectedService.subCategory && (
                                    <div className="bg-amber-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md animate-[slideIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.6s' }}>
                                        <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="text-lg mr-2">🏷️</span> Alt Kategori
                                        </h3>
                                        <p className="font-medium text-amber-700 flex items-center">
                                            <span className="inline-block bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full">
                                                {selectedService.subCategory}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setSelectedService(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
                                >
                                    <span className="mr-2">❌</span> Kapat
                                </button>
                                <button
                                    onClick={() => prepareServiceEdit(selectedService)}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors shadow-md font-medium flex items-center"
                                >
                                    <span className="mr-2">✏️</span> Düzenle
                                </button>
                                <button
                                    onClick={() => handleDeleteService(selectedService.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                                >
                                    <span className="mr-2">🗑️</span> Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hizmet Düzenleme Modalı */}
            {selectedService && isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-[fadeIn_0.3s_ease-out_forwards] relative">
                        {/* Modal arka plan animasyonları */}
                        <div className="absolute -z-10 inset-0 overflow-hidden opacity-10 pointer-events-none">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_15s_ease-in-out_infinite]"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-[pulse_20s_ease-in-out_infinite]"></div>
                        </div>

                        {/* Modal başlık - sticky yapıldı */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sticky top-0 z-10">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold flex items-center">
                                    <span className="bg-white text-amber-600 p-1 rounded-full mr-2 flex items-center justify-center">
                                        <span className="text-xl">✏️</span>
                                    </span>
                                    Hizmet Düzenle
                                </h2>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-white hover:text-gray-200 focus:outline-none"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateService} className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-amber-100">
                            <div className="p-6 space-y-5">
                                {/* Hizmet adı giriş alanı */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.1s' }}>
                                    <label htmlFor="editServiceName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">📝</span> Hizmet Adı <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            id="editServiceName"
                                            value={editServiceName}
                                            onChange={(e) => setEditServiceName(e.target.value)}
                                            className="pl-10 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            placeholder="Örn: Kuaförlük, Veteriner Muayenesi, vb."
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Alt kategori seçimi */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.2s' }}>
                                    <label htmlFor="editSubCategory" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">🏷️</span> Alt Kategori <span className="text-gray-400 text-xs ml-1">(İsteğe bağlı)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                        </div>
                                        <select
                                            id="editSubCategory"
                                            value={selectedSubCategory || ''}
                                            onChange={(e) => setSelectedSubCategory(e.target.value || null)}
                                            className="pl-10 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        >
                                            <option value="">Alt kategori seçin (isteğe bağlı)</option>
                                            {businessProfile?.businessCategory && SUB_CATEGORIES[businessProfile.businessCategory as keyof typeof SUB_CATEGORIES]?.map((subCategory, index) => (
                                                <option key={index} value={subCategory}>
                                                    {subCategory}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Fiyat giriş alanı */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.3s' }}>
                                    <label htmlFor="editServicePrice" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2">💰</span> Hizmet Fiyatı <span className="text-gray-400 text-xs ml-1">(İsteğe bağlı)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            id="editServicePrice"
                                            value={editServicePrice}
                                            onChange={(e) => setEditServicePrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                                            className="pl-10 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            placeholder="Örn: 150"
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                                            TL
                                        </div>
                                    </div>
                                </div>

                                {/* Kategori özel alanları */}
                                {businessProfile?.businessCategory && CATEGORY_SPECIFIC_FIELDS[businessProfile.businessCategory as keyof typeof CATEGORY_SPECIFIC_FIELDS] && (
                                    <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.4s' }}>
                                        <div className="mt-6 mb-3">
                                            <h3 className="text-md font-medium text-gray-700 flex items-center">
                                                <span className="text-amber-500 mr-2">📋</span> Kategori Özel Bilgileri
                                            </h3>
                                            <p className="text-sm text-gray-500">İşletme kategorinize özel alanları doldurun</p>
                                        </div>
                                        <div className="space-y-4 bg-amber-50 p-4 rounded-lg">
                                            {CATEGORY_SPECIFIC_FIELDS[businessProfile.businessCategory as keyof typeof CATEGORY_SPECIFIC_FIELDS].map((field: CategoryField) => {
                                                // Text input
                                                if (field.type === 'text') {
                                                    return (
                                                        <div key={field.id}>
                                                            <label htmlFor={`edit_${field.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                {field.label}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                id={`edit_${field.id}`}
                                                                value={categoryFields[field.id] || ''}
                                                                onChange={(e) => handleCategoryFieldChange(field.id, e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                placeholder={field.placeholder}
                                                            />
                                                        </div>
                                                    );
                                                }

                                                // Number input
                                                if (field.type === 'number') {
                                                    return (
                                                        <div key={field.id}>
                                                            <label htmlFor={`edit_${field.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                {field.label}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                id={`edit_${field.id}`}
                                                                value={categoryFields[field.id] || ''}
                                                                onChange={(e) => handleCategoryFieldChange(field.id, e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    );
                                                }

                                                // Select
                                                if (field.type === 'select' && field.options) {
                                                    return (
                                                        <div key={field.id}>
                                                            <label htmlFor={`edit_${field.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                                                {field.label}
                                                            </label>
                                                            <select
                                                                id={`edit_${field.id}`}
                                                                value={categoryFields[field.id] || ''}
                                                                onChange={(e) => handleCategoryFieldChange(field.id, e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                            >
                                                                <option value="">Seçiniz</option>
                                                                {field.options.map((option: string) => (
                                                                    <option key={option} value={option}>
                                                                        {option}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                }

                                                // Checkbox
                                                if (field.type === 'checkbox') {
                                                    return (
                                                        <div key={field.id}>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`edit_${field.id}`}
                                                                    checked={!!categoryFields[field.id]}
                                                                    onChange={(e) => handleCategoryFieldChange(field.id, e.target.checked)}
                                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                                />
                                                                <label htmlFor={`edit_${field.id}`} className="ml-2 block text-sm text-gray-700">
                                                                    {field.label}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Multiselect
                                                if (field.type === 'multiselect' && field.options) {
                                                    return (
                                                        <div key={field.id}>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                {field.label}
                                                            </label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {field.options.map((option: string) => (
                                                                    <div key={option} className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`edit_${field.id}_${option}`}
                                                                            checked={(Array.isArray(categoryFields[field.id])
                                                                                ? (categoryFields[field.id] as string[]).includes(option)
                                                                                : false)}
                                                                            onChange={(e) => {
                                                                                const currentValues = categoryFields[field.id] || [];
                                                                                if (e.target.checked) {
                                                                                    handleCategoryFieldChange(field.id, [...currentValues, option]);
                                                                                } else {
                                                                                    handleCategoryFieldChange(field.id, Array.isArray(currentValues)
                                                                                        ? currentValues.filter((val: string) => val !== option)
                                                                                        : []);
                                                                                }
                                                                            }}
                                                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                                        />
                                                                        <label htmlFor={`edit_${field.id}_${option}`} className="ml-2 mr-4 text-sm text-gray-700">
                                                                            {option}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Resim yükleme alanı */}
                                <div className="animate-[fadeIn_0.3s_ease-out_forwards] opacity-0" style={{ animationDelay: '0.5s' }}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="text-amber-500 mr-2 animate-pulse">🖼️</span> Hizmet Görselleri <span className="text-red-500">*</span>
                                    </label>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* İlk resim */}
                                        <div>
                                            <div
                                                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-40 cursor-pointer transition-all ${editImagePreview.preview1 ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                                    }`}
                                                onClick={() => document.getElementById('editImage1')?.click()}
                                            >
                                                {editImagePreview.preview1 ? (
                                                    <div className="relative w-full h-full">
                                                        <img
                                                            src={editImagePreview.preview1}
                                                            alt="Önizleme 1"
                                                            className="h-full w-full object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditServiceImages(prev => ({ ...prev, file1: null }));
                                                                setEditImagePreview(prev => ({ ...prev, preview1: '' }));
                                                            }}
                                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="mt-2 text-sm text-gray-500">Resim 1 (Zorunlu)</span>
                                                        <span className="mt-1 text-xs text-gray-400">Tıklayarak seçin</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    id="editImage1"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleEditImageChange(e, 1)}
                                                />
                                            </div>
                                        </div>

                                        {/* İkinci resim */}
                                        <div>
                                            <div
                                                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-40 cursor-pointer transition-all ${editImagePreview.preview2 ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                                    }`}
                                                onClick={() => document.getElementById('editImage2')?.click()}
                                            >
                                                {editImagePreview.preview2 ? (
                                                    <div className="relative w-full h-full">
                                                        <img
                                                            src={editImagePreview.preview2}
                                                            alt="Önizleme 2"
                                                            className="h-full w-full object-contain"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditServiceImages(prev => ({ ...prev, file2: null }));
                                                                setEditImagePreview(prev => ({ ...prev, preview2: '' }));
                                                            }}
                                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="mt-2 text-sm text-gray-500">Resim 2 (İsteğe bağlı)</span>
                                                        <span className="mt-1 text-xs text-gray-400">Tıklayarak seçin</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    id="editImage2"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleEditImageChange(e, 2)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Düğmeler - sticky yapıldı */}
                            <div className="p-4 bg-gray-50 border-t sticky bottom-0 z-10 flex justify-end space-x-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center transition-all"
                                    disabled={isUpdating}
                                >
                                    <span className="mr-2">❌</span> İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors shadow-md font-medium flex items-center"
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">💾</span> Kaydet
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}