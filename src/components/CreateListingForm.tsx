import { useState } from 'react';
import { useListing } from '../context/ListingContext';
import { cities } from '../data/cities';

export const CreateListingForm = () => {
    const { createListing } = useListing();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        petType: 'dog' as const,
        petName: '',
        petAge: '',
        petGender: 'male' as const,
        breed: '',
        city: '',
        district: '',
        phone: '',
        email: '',
        photos: [] as string[]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createListing({
                ...formData,
                status: 'active' as const,
                ownerId: 'current-user-id' // TODO: Gerçek kullanıcı ID'si ile değiştirilecek
            });
            // Form başarıyla gönderildi
        } catch (error) {
            console.error('İlan oluşturulurken hata:', error);
        }
    };

    const districts: string[] = [];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Başlık
                </label>
                <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Açıklama
                </label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="petType" className="block text-sm font-medium text-gray-700">
                    Hayvan Türü
                </label>
                <select
                    id="petType"
                    value={formData.petType}
                    onChange={(e) => setFormData({ ...formData, petType: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                >
                    <option value="dog">Köpek</option>
                    <option value="cat">Kedi</option>
                    <option value="rabbit">Tavşan</option>
                    <option value="bird">Kuş</option>
                    <option value="other">Diğer</option>
                </select>
            </div>

            <div>
                <label htmlFor="petName" className="block text-sm font-medium text-gray-700">
                    Hayvan İsmi
                </label>
                <input
                    type="text"
                    id="petName"
                    value={formData.petName}
                    onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="petAge" className="block text-sm font-medium text-gray-700">
                    Hayvan Yaşı
                </label>
                <input
                    type="text"
                    id="petAge"
                    value={formData.petAge}
                    onChange={(e) => setFormData({ ...formData, petAge: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="petGender" className="block text-sm font-medium text-gray-700">
                    Hayvan Cinsiyeti
                </label>
                <select
                    id="petGender"
                    value={formData.petGender}
                    onChange={(e) => setFormData({ ...formData, petGender: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                >
                    <option value="male">Erkek</option>
                    <option value="female">Dişi</option>
                </select>
            </div>

            <div>
                <label htmlFor="breed" className="block text-sm font-medium text-gray-700">
                    Irk
                </label>
                <input
                    type="text"
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    Şehir
                </label>
                <select
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value, district: '' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                >
                    <option value="">Şehir Seçin</option>
                    {cities.map((city) => (
                        <option key={city.id} value={city.name}>
                            {city.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                    İlçe
                </label>
                <select
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    disabled={!formData.city}
                >
                    <option value="">İlçe Seçin</option>
                    {districts.map((district) => (
                        <option key={district} value={district}>
                            {district}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Telefon
                </label>
                <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-posta
                </label>
                <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>

            <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                İlan Oluştur
            </button>
        </form>
    );
}; 