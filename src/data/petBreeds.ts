export interface PetBreed {
    id: string;
    name: string;
    description: string;
    characteristics: string[];
    severity: 'low' | 'medium' | 'high';
}

export interface PetType {
    id: string;
    name: string;
    breeds: PetBreed[];
}

export const petTypes: PetType[] = [
    {
        id: 'dog',
        name: 'Köpek',
        breeds: [
            {
                id: 'german-shepherd',
                name: 'Alman Çoban Köpeği',
                description: 'Zeki, koruyucu ve çalışkan bir ırk',
                characteristics: ['Koruyucu', 'Sadık', 'Eğitilebilir', 'Güçlü', 'Zeki', 'Çalışkan'],
                severity: 'medium'
            },
            {
                id: 'labrador',
                name: 'Labrador Retriever',
                description: 'Dost canlısı, enerjik ve zeki bir ırk',
                characteristics: ['Dost canlısı', 'Enerjik', 'Zeki', 'Aile köpeği', 'Sosyal', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'bulldog',
                name: 'Buldog',
                description: 'Sakin, sevecen ve koruyucu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Koruyucu', 'Sadık', 'Uyumlu', 'Güçlü'],
                severity: 'medium'
            },
            {
                id: 'golden-retriever',
                name: 'Golden Retriever',
                description: 'Sıcakkanlı, zeki ve sadık bir ırk',
                characteristics: ['Aile köpeği', 'Eğitilebilir', 'Sosyal', 'Enerjik', 'Sadık', 'Zeki'],
                severity: 'low'
            },
            {
                id: 'french-bulldog',
                name: 'Fransız Buldoğu',
                description: 'Sevimli, sosyal ve uyumlu bir ırk',
                characteristics: ['Sevimli', 'Sosyal', 'Uyumlu', 'Oyuncu', 'Meraklı', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'husky',
                name: 'Sibirya Kurdu',
                description: 'Enerjik, bağımsız ve sosyal bir ırk',
                characteristics: ['Enerjik', 'Bağımsız', 'Sosyal', 'Güçlü', 'Oyuncu', 'Zeki'],
                severity: 'high'
            },
            {
                id: 'beagle',
                name: 'Beagle',
                description: 'Meraklı, sosyal ve enerjik bir ırk',
                characteristics: ['Meraklı', 'Sosyal', 'Enerjik', 'Oyuncu', 'Dost canlısı', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'alaskan-malamute',
                name: 'Alaska Kurdu',
                description: 'Güçlü, dayanıklı ve sadık bir ırk',
                characteristics: ['Güçlü', 'Dayanıklı', 'Sadık', 'Enerjik', 'Sosyal', 'Zeki'],
                severity: 'high'
            },
            {
                id: 'poodle',
                name: 'Kaniş',
                description: 'Zeki, zarif ve eğitilebilir bir ırk',
                characteristics: ['Zeki', 'Zarif', 'Eğitilebilir', 'Sosyal', 'Aktif', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'chihuahua',
                name: 'Chihuahua',
                description: 'Küçük, cesur ve sadık bir ırk',
                characteristics: ['Küçük boy', 'Cesur', 'Sadık', 'Enerjik', 'Bağımsız', 'Sevimli'],
                severity: 'low'
            },
            {
                id: 'dachshund',
                name: 'Dakhund',
                description: 'Cesur, meraklı ve sevecen bir ırk',
                characteristics: ['Cesur', 'Meraklı', 'Sevecen', 'Oyuncu', 'Bağımsız', 'Zeki'],
                severity: 'medium'
            },
            {
                id: 'australian-cattle-dog',
                name: 'Avustralya Sığır Çobanı Köpeği',
                description: 'Çalışkan, zeki ve enerjik bir ırk',
                characteristics: ['Çalışkan', 'Zeki', 'Enerjik', 'Sadık', 'Güçlü', 'Dikkatli'],
                severity: 'high'
            },
            {
                id: 'bernese-mountain',
                name: 'Bernese Dağ Köpeği',
                description: 'Sakin, sevecen ve güçlü bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Güçlü', 'Sadık', 'Uyumlu', 'Zeki'],
                severity: 'medium'
            },
            {
                id: 'pug',
                name: 'Pug',
                description: 'Sevimli, sosyal ve uyumlu bir ırk',
                characteristics: ['Sevimli', 'Sosyal', 'Uyumlu', 'Oyuncu', 'Sevecen', 'Bağımsız'],
                severity: 'low'
            },
            {
                id: 'rottweiler',
                name: 'Rottweiler',
                description: 'Güçlü, koruyucu ve sadık bir ırk',
                characteristics: ['Güçlü', 'Koruyucu', 'Sadık', 'Zeki', 'Eğitilebilir', 'Dikkatli'],
                severity: 'high'
            },
            {
                id: 'airedale-terrier',
                name: 'Airedale Terrier',
                description: 'Zeki, enerjik ve cesur bir ırk',
                characteristics: ['Zeki', 'Enerjik', 'Cesur', 'Bağımsız', 'Oyuncu', 'Dikkatli'],
                severity: 'medium'
            },
            {
                id: 'american-staffordshire',
                name: 'Amerikan Staffordshire Terrier',
                description: 'Güçlü, sadık ve cesur bir ırk',
                characteristics: ['Güçlü', 'Sadık', 'Cesur', 'Enerjik', 'Zeki', 'Dikkatli'],
                severity: 'high'
            },
            {
                id: 'border-collie',
                name: 'Border Collie',
                description: 'Çok zeki, enerjik ve çalışkan bir ırk',
                characteristics: ['Çok zeki', 'Enerjik', 'Çalışkan', 'Sadık', 'Dikkatli', 'Eğitilebilir'],
                severity: 'high'
            },
            {
                id: 'australian-shepherd',
                name: 'Avustralya Çoban Köpeği',
                description: 'Zeki, enerjik ve çalışkan bir ırk',
                characteristics: ['Zeki', 'Enerjik', 'Çalışkan', 'Sadık', 'Dikkatli', 'Eğitilebilir'],
                severity: 'high'
            },
            {
                id: 'affenpinscher',
                name: 'Affenpinscher',
                description: 'Cesur, meraklı ve sevimli bir ırk',
                characteristics: ['Cesur', 'Meraklı', 'Sevimli', 'Bağımsız', 'Oyuncu', 'Dikkatli'],
                severity: 'medium'
            }
        ]
    },
    {
        id: 'cat',
        name: 'Kedi',
        breeds: [
            {
                id: 'siamese',
                name: 'Siyam Kedisi',
                description: 'Konuşkan, zeki ve sosyal bir ırk',
                characteristics: ['Konuşkan', 'Zeki', 'Sosyal', 'Enerjik', 'Bağımsız', 'Sevecen'],
                severity: 'medium'
            },
            {
                id: 'british-shorthair',
                name: 'British Shorthair',
                description: 'Sakin, sevecen ve bağımsız bir ırk',
                characteristics: ['Sakin', 'Bağımsız', 'Sevecen', 'Uyumlu', 'Zeki', 'Sadık'],
                severity: 'low'
            },
            {
                id: 'maine-coon',
                name: 'Maine Coon',
                description: 'Büyük, sosyal ve sevecen bir ırk',
                characteristics: ['Büyük boy', 'Sosyal', 'Sevecen', 'Zeki', 'Oyuncu', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'persian',
                name: 'İran Kedisi',
                description: 'Uzun tüylü, sakin ve asil bir ırk',
                characteristics: ['Sakin', 'Nazik', 'Uzun tüylü', 'Asil', 'Sevecen', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'ragdoll',
                name: 'Ragdoll Kedisi',
                description: 'Sakin, sevecen ve uysal bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uysal', 'Sosyal', 'Nazik', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'sphynx',
                name: 'Sfenks Kedisi',
                description: 'Sosyal, enerjik ve sevecen bir ırk',
                characteristics: ['Sosyal', 'Enerjik', 'Sevecen', 'Oyuncu', 'Meraklı', 'Bağımsız'],
                severity: 'high'
            },
            {
                id: 'abyssinian',
                name: 'Habeş Kedisi',
                description: 'Aktif, zeki ve meraklı bir ırk',
                characteristics: ['Aktif', 'Zeki', 'Meraklı', 'Enerjik', 'Bağımsız', 'Oyuncu'],
                severity: 'medium'
            },
            {
                id: 'american-shorthair',
                name: 'Amerikan Shorthair',
                description: 'Sakin, uyumlu ve sevecen bir ırk',
                characteristics: ['Sakin', 'Uyumlu', 'Sevecen', 'Sosyal', 'Zeki', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'birman',
                name: 'Birman Kedisi',
                description: 'Sakin, sevecen ve nazik bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Nazik', 'Sosyal', 'Uyumlu', 'Sadık'],
                severity: 'low'
            },
            {
                id: 'exotic-shorthair',
                name: 'Exotic Shorthair',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'scottish-fold',
                name: 'Scottish Fold',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'bombay',
                name: 'Bombay Kedisi',
                description: 'Sosyal, sevecen ve zeki bir ırk',
                characteristics: ['Sosyal', 'Sevecen', 'Zeki', 'Enerjik', 'Oyuncu', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'siberian',
                name: 'Sibirya Kedisi',
                description: 'Güçlü, sosyal ve sevecen bir ırk',
                characteristics: ['Güçlü', 'Sosyal', 'Sevecen', 'Zeki', 'Oyuncu', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'russian-blue',
                name: 'Mavi Rus Kedisi',
                description: 'Sakin, zeki ve sevecen bir ırk',
                characteristics: ['Sakin', 'Zeki', 'Sevecen', 'Bağımsız', 'Uyumlu', 'Sadık'],
                severity: 'low'
            },
            {
                id: 'devon-rex',
                name: 'Devon Rex',
                description: 'Enerjik, sosyal ve sevecen bir ırk',
                characteristics: ['Enerjik', 'Sosyal', 'Sevecen', 'Oyuncu', 'Meraklı', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'norwegian-forest',
                name: 'Norveç Orman Kedisi',
                description: 'Güçlü, sosyal ve sevecen bir ırk',
                characteristics: ['Güçlü', 'Sosyal', 'Sevecen', 'Zeki', 'Oyuncu', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'munchkin',
                name: 'Munchkin',
                description: 'Sevimli, sosyal ve enerjik bir ırk',
                characteristics: ['Sevimli', 'Sosyal', 'Enerjik', 'Oyuncu', 'Meraklı', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'american-curl',
                name: 'American Curl',
                description: 'Sosyal, sevecen ve zeki bir ırk',
                characteristics: ['Sosyal', 'Sevecen', 'Zeki', 'Enerjik', 'Oyuncu', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'american-bobtail',
                name: 'Amerikan Bobtail',
                description: 'Sosyal, sevecen ve zeki bir ırk',
                characteristics: ['Sosyal', 'Sevecen', 'Zeki', 'Enerjik', 'Oyuncu', 'Uyumlu'],
                severity: 'low'
            }
        ]
    },
    {
        id: 'rabbit',
        name: 'Tavşan',
        breeds: [
            {
                id: 'holland-lop',
                name: 'Hollanda Lop Tavşanı',
                description: 'Sarkık kulaklı, sevimli ve sakin bir ırk',
                characteristics: ['Sakin', 'Sosyal', 'Sarkık kulaklı', 'Sevimli', 'Uyumlu', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'lionhead',
                name: 'Aslanbaş Tavşanı',
                description: 'Yeleli, sevimli ve aktif bir ırk',
                characteristics: ['Aktif', 'Sevimli', 'Yeleli', 'Sosyal', 'Oyuncu', 'Meraklı'],
                severity: 'low'
            },
            {
                id: 'rex',
                name: 'Rex Tavşanı',
                description: 'Yumuşak tüylü, sakin ve sevecen bir ırk',
                characteristics: ['Yumuşak tüylü', 'Sakin', 'Sevecen', 'Sosyal', 'Uyumlu', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'angora',
                name: 'Ankara Tavşanı',
                description: 'Uzun tüylü, zarif ve sakin bir ırk',
                characteristics: ['Uzun tüylü', 'Zarif', 'Sakin', 'Sevecen', 'Uyumlu', 'Nazik'],
                severity: 'high'
            },
            {
                id: 'english-lop',
                name: 'English Lop',
                description: 'Uzun kulaklı, sakin ve sevecen bir ırk',
                characteristics: ['Uzun kulaklı', 'Sakin', 'Sevecen', 'Sosyal', 'Uyumlu', 'Nazik'],
                severity: 'medium'
            },
            {
                id: 'american-fuzzy-lop',
                name: 'Amerikan Fuzzy Lop Tavşanı',
                description: 'Yumuşak tüylü, sevimli ve sosyal bir ırk',
                characteristics: ['Yumuşak tüylü', 'Sevimli', 'Sosyal', 'Oyuncu', 'Uyumlu', 'Meraklı'],
                severity: 'low'
            },
            {
                id: 'mini-lop',
                name: 'Mini Lop',
                description: 'Sarkık kulaklı, sevimli ve sosyal bir ırk',
                characteristics: ['Sarkık kulaklı', 'Sevimli', 'Sosyal', 'Oyuncu', 'Uyumlu', 'Meraklı'],
                severity: 'low'
            },
            {
                id: 'french-lop',
                name: 'French Lop',
                description: 'Büyük, sakin ve sevecen bir ırk',
                characteristics: ['Büyük boy', 'Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik'],
                severity: 'medium'
            },
            {
                id: 'mini-rex',
                name: 'Mini Rex',
                description: 'Yumuşak tüylü, sevimli ve sosyal bir ırk',
                characteristics: ['Yumuşak tüylü', 'Sevimli', 'Sosyal', 'Oyuncu', 'Uyumlu', 'Meraklı'],
                severity: 'low'
            },
            {
                id: 'polish',
                name: 'Polonya Tavşanı',
                description: 'Küçük, sevimli ve aktif bir ırk',
                characteristics: ['Küçük boy', 'Sevimli', 'Aktif', 'Oyuncu', 'Meraklı', 'Sosyal'],
                severity: 'low'
            },
            {
                id: 'checkered-giant',
                name: 'Checkered Giant Tavşanı',
                description: 'Büyük, sakin ve sevecen bir ırk',
                characteristics: ['Büyük boy', 'Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik'],
                severity: 'medium'
            },
            {
                id: 'jersey-wooly',
                name: 'Jersey Wooly',
                description: 'Yumuşak tüylü, sevimli ve sosyal bir ırk',
                characteristics: ['Yumuşak tüylü', 'Sevimli', 'Sosyal', 'Oyuncu', 'Uyumlu', 'Meraklı'],
                severity: 'low'
            },
            {
                id: 'silver-fox',
                name: 'Silver Fox Tavşanı',
                description: 'Yumuşak tüylü, sakin ve sevecen bir ırk',
                characteristics: ['Yumuşak tüylü', 'Sakin', 'Sevecen', 'Sosyal', 'Uyumlu', 'Nazik'],
                severity: 'medium'
            },
            {
                id: 'hotot',
                name: 'Hotot Tavşanı',
                description: 'Sevimli, sosyal ve uyumlu bir ırk',
                characteristics: ['Sevimli', 'Sosyal', 'Uyumlu', 'Oyuncu', 'Meraklı', 'Nazik'],
                severity: 'low'
            },
            {
                id: 'florida-white',
                name: 'Florida Beyaz Tavşanı',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'tan',
                name: 'Tan Tavşanı',
                description: 'Aktif, sosyal ve sevecen bir ırk',
                characteristics: ['Aktif', 'Sosyal', 'Sevecen', 'Oyuncu', 'Meraklı', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'californian',
                name: 'Kaliforniya Tavşanı',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'beveren',
                name: 'Beveren Tavşanı',
                description: 'Büyük, sakin ve sevecen bir ırk',
                characteristics: ['Büyük boy', 'Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik'],
                severity: 'medium'
            },
            {
                id: 'himalayan',
                name: 'Himalayan Tavşanı',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'english',
                name: 'İngiliz Tavşanı',
                description: 'Sakin, sevecen ve uyumlu bir ırk',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Nazik', 'Oyuncu'],
                severity: 'low'
            }
        ]
    },
    {
        id: 'bird',
        name: 'Kuş',
        breeds: [
            {
                id: 'budgerigar',
                name: 'Muhabbet Kuşu',
                description: 'Sosyal, zeki ve konuşkan bir tür',
                characteristics: ['Sosyal', 'Zeki', 'Konuşkan', 'Oyuncu', 'Meraklı', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'cockatiel',
                name: 'Sultan Papağanı',
                description: 'Sevecen, sosyal ve zeki bir tür',
                characteristics: ['Sevecen', 'Sosyal', 'Zeki', 'Konuşkan', 'Oyuncu', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'lovebird',
                name: 'Cennet Papağanı',
                description: 'Sevecen, sosyal ve enerjik bir tür',
                characteristics: ['Sevecen', 'Sosyal', 'Enerjik', 'Oyuncu', 'Meraklı', 'Bağımsız'],
                severity: 'low'
            },
            {
                id: 'amazon',
                name: 'Amazon Papağanı',
                description: 'Zeki, konuşkan ve sosyal bir tür',
                characteristics: ['Zeki', 'Konuşkan', 'Sosyal', 'Enerjik', 'Oyuncu', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'african-grey',
                name: 'Afrika Gri Papağanı',
                description: 'Çok zeki, konuşkan ve duygusal bir tür',
                characteristics: ['Çok zeki', 'Konuşkan', 'Duygusal', 'Sosyal', 'Meraklı', 'Bağımsız'],
                severity: 'high'
            },
            {
                id: 'macaw',
                name: 'Ara Papağanı',
                description: 'Büyük, renkli ve sosyal bir tür',
                characteristics: ['Büyük boy', 'Renkli', 'Sosyal', 'Zeki', 'Enerjik', 'Bağımsız'],
                severity: 'high'
            },
            {
                id: 'cockatoo',
                name: 'Kakadu',
                description: 'Sosyal, duygusal ve zeki bir tür',
                characteristics: ['Sosyal', 'Duygusal', 'Zeki', 'Konuşkan', 'Enerjik', 'Bağımsız'],
                severity: 'high'
            },
            {
                id: 'conure',
                name: 'Konur',
                description: 'Enerjik, sosyal ve oyuncu bir tür',
                characteristics: ['Enerjik', 'Sosyal', 'Oyuncu', 'Konuşkan', 'Meraklı', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'parrotlet',
                name: 'Papağanlet',
                description: 'Küçük, zeki ve cesur bir tür',
                characteristics: ['Küçük boy', 'Zeki', 'Cesur', 'Sosyal', 'Oyuncu', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'canary',
                name: 'Kanarya',
                description: 'Güzel öten, sakin ve uyumlu bir tür',
                characteristics: ['Güzel öten', 'Sakin', 'Uyumlu', 'Sosyal', 'Meraklı', 'Bağımsız'],
                severity: 'low'
            },
            {
                id: 'finch',
                name: 'İskete',
                description: 'Küçük, sosyal ve uyumlu bir tür',
                characteristics: ['Küçük boy', 'Sosyal', 'Uyumlu', 'Meraklı', 'Oyuncu', 'Bağımsız'],
                severity: 'low'
            },
            {
                id: 'zebra-finch',
                name: 'Zebra İsketesi',
                description: 'Küçük, sosyal ve uyumlu bir tür',
                characteristics: ['Küçük boy', 'Sosyal', 'Uyumlu', 'Meraklı', 'Oyuncu', 'Bağımsız'],
                severity: 'low'
            },
            {
                id: 'gouldian-finch',
                name: 'Gouldian İsketesi',
                description: 'Renkli, sosyal ve uyumlu bir tür',
                characteristics: ['Renkli', 'Sosyal', 'Uyumlu', 'Meraklı', 'Oyuncu', 'Bağımsız'],
                severity: 'medium'
            }
        ]
    }
]; 