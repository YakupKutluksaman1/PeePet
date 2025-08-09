'use client';

import { useState } from 'react';

export default function EngagementAdminPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dryRun, setDryRun] = useState(true);
    const [minDays, setMinDays] = useState(5);
    const [maxEmails, setMaxEmails] = useState(10);

    const checkInactiveUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/check-inactive-users?minDays=${minDays}&maxUsers=50`);
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Hata:', error);
            alert('Hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const sendEngagementEmails = async () => {
        if (!dryRun && !confirm('Gerçekten email göndermek istiyor musunuz?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/send-engagement-emails?dryRun=${dryRun}&minDays=${minDays}&maxEmails=${maxEmails}`, {
                method: 'POST'
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Hata:', error);
            alert('Hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const testSingleEmail = async () => {
        const userId = prompt('Test için kullanıcı ID girin:');
        const scenario = prompt('Senaryo girin (pending_match, pending_message, general_inactive, pending_follow, no_matches):');

        if (!userId || !scenario) return;

        setLoading(true);
        try {
            const response = await fetch('/api/send-engagement-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    scenario,
                    data: {
                        matchCount: 2,
                        messageCount: 3,
                        followRequestCount: 1,
                        petName: 'Test Pet'
                    }
                })
            });
            const data = await response.json();
            alert(data.message || data.error);
        } catch (error) {
            console.error('Hata:', error);
            alert('Hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Engagement Email Yönetimi</h1>

                {/* Kontrol Paneli */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Ayarlar</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum İnaktif Gün
                            </label>
                            <input
                                type="number"
                                value={minDays}
                                onChange={(e) => setMinDays(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                min="1"
                                max="30"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Maksimum Email Sayısı
                            </label>
                            <input
                                type="number"
                                value={maxEmails}
                                onChange={(e) => setMaxEmails(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                min="1"
                                max="100"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="dryRun"
                                checked={dryRun}
                                onChange={(e) => setDryRun(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="dryRun" className="text-sm font-medium text-gray-700">
                                Test Modu (Email gönderme)
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={checkInactiveUsers}
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            İnaktif Kullanıcıları Kontrol Et
                        </button>

                        <button
                            onClick={sendEngagementEmails}
                            disabled={loading}
                            className={`px-6 py-2 rounded-lg text-white disabled:opacity-50 ${dryRun
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {dryRun ? 'Test Et (Email Gönderme)' : 'Email Gönder (Gerçek)'}
                        </button>

                        <button
                            onClick={testSingleEmail}
                            disabled={loading}
                            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            Tek Email Test Et
                        </button>
                    </div>
                </div>

                {/* Sonuçlar */}
                {result && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Sonuçlar</h2>

                        {result.summary && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{result.summary.sent}</div>
                                    <div className="text-sm text-green-700">Gönderilen</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
                                    <div className="text-sm text-red-700">Başarısız</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</div>
                                    <div className="text-sm text-yellow-700">Atlanan</div>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">İşlem devam ediyor...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
