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
    },
    {
        id: 'hamster',
        name: 'Hamster',
        breeds: [
            {
                id: 'syrian',
                name: 'Suriye Hamsteri',
                description: 'Büyük, sevimli ve genellikle yalnız yaşayan bir tür',
                characteristics: ['Büyük boy', 'Sevimli', 'Yalnız', 'Aktif', 'Meraklı', 'Temiz'],
                severity: 'low'
            },
            {
                id: 'roborovski',
                name: 'Roborovski Cüce Hamsteri',
                description: 'Çok küçük, hızlı ve sosyal bir tür',
                characteristics: ['Çok küçük', 'Hızlı', 'Sosyal', 'Aktif', 'Meraklı', 'Çevik'],
                severity: 'low'
            },
            {
                id: 'winter-white',
                name: 'Kış Beyazı Cüce Hamsteri',
                description: 'Küçük, sevimli ve sosyal bir tür',
                characteristics: ['Küçük boy', 'Sevimli', 'Sosyal', 'Meraklı', 'Oyuncu', 'Aktif'],
                severity: 'low'
            },
            {
                id: 'campbell',
                name: 'Campbell Cüce Hamsteri',
                description: 'Küçük, sevimli ve genellikle sosyal bir tür',
                characteristics: ['Küçük boy', 'Sevimli', 'Sosyal', 'Meraklı', 'Oyuncu', 'Aktif'],
                severity: 'low'
            },
            {
                id: 'chinese',
                name: 'Çin Hamsteri',
                description: 'Küçük, hızlı ve aktif bir tür',
                characteristics: ['Küçük boy', 'Hızlı', 'Aktif', 'Meraklı', 'Çevik', 'Sevimli'],
                severity: 'low'
            }
        ]
    },
    {
        id: 'guinea-pig',
        name: 'Guinea Pig',
        breeds: [
            {
                id: 'american',
                name: 'Amerikan Guinea Pig',
                description: 'Sakin, sevecen ve uyumlu bir tür',
                characteristics: ['Sakin', 'Sevecen', 'Uyumlu', 'Sosyal', 'Konuşkan', 'Oyuncu'],
                severity: 'low'
            },
            {
                id: 'abyssinian',
                name: 'Habeş Guinea Pig',
                description: 'Enerjik, meraklı ve sevecen bir tür',
                characteristics: ['Enerjik', 'Meraklı', 'Sevecen', 'Sosyal', 'Oyuncu', 'Konuşkan'],
                severity: 'low'
            },
            {
                id: 'peruvian',
                name: 'Peru Guinea Pig',
                description: 'Uzun tüylü, sakin ve sevecen bir tür',
                characteristics: ['Uzun tüylü', 'Sakin', 'Sevecen', 'Sosyal', 'Konuşkan', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'silkie',
                name: 'Silkie Guinea Pig',
                description: 'İpeksi tüylü, sakin ve sevecen bir tür',
                characteristics: ['İpeksi tüylü', 'Sakin', 'Sevecen', 'Sosyal', 'Konuşkan', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'teddy',
                name: 'Teddy Guinea Pig',
                description: 'Kıvırcık tüylü, sevimli ve sosyal bir tür',
                characteristics: ['Kıvırcık tüylü', 'Sevimli', 'Sosyal', 'Konuşkan', 'Oyuncu', 'Uyumlu'],
                severity: 'low'
            }
        ]
    },
    {
        id: 'ferret',
        name: 'Gelincik',
        breeds: [
            {
                id: 'standard',
                name: 'Standart Gelincik',
                description: 'Oyuncu, zeki ve enerjik bir tür',
                characteristics: ['Oyuncu', 'Zeki', 'Enerjik', 'Meraklı', 'Sosyal', 'Eğitilebilir'],
                severity: 'medium'
            },
            {
                id: 'angora',
                name: 'Ankara Gelinciği',
                description: 'Uzun tüylü, oyuncu ve zeki bir tür',
                characteristics: ['Uzun tüylü', 'Oyuncu', 'Zeki', 'Enerjik', 'Meraklı', 'Sosyal'],
                severity: 'medium'
            }
        ]
    },
    {
        id: 'turtle',
        name: 'Kaplumbağa',
        breeds: [
            {
                id: 'red-eared-slider',
                name: 'Kırmızı Yanaklı Su Kaplumbağası',
                description: 'Popüler, aktif ve uzun ömürlü bir tür',
                characteristics: ['Aktif', 'Su seven', 'Uzun ömürlü', 'Dayanıklı', 'Meraklı', 'Büyük boy'],
                severity: 'medium'
            },
            {
                id: 'box-turtle',
                name: 'Kutu Kaplumbağası',
                description: 'Karasal, sakin ve uzun ömürlü bir tür',
                characteristics: ['Karasal', 'Sakin', 'Uzun ömürlü', 'Utangaç', 'Dayanıklı', 'Bağımsız'],
                severity: 'medium'
            },
            {
                id: 'painted-turtle',
                name: 'Boyalı Kaplumbağa',
                description: 'Renkli, aktif ve uyumlu bir tür',
                characteristics: ['Renkli', 'Aktif', 'Uyumlu', 'Su seven', 'Dayanıklı', 'Meraklı'],
                severity: 'medium'
            },
            {
                id: 'map-turtle',
                name: 'Harita Kaplumbağası',
                description: 'Desenli, sakin ve su seven bir tür',
                characteristics: ['Desenli', 'Sakin', 'Su seven', 'Meraklı', 'Çekingen', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'greek-tortoise',
                name: 'Yunan Kara Kaplumbağası',
                description: 'Karasal, sakin ve uzun ömürlü bir tür',
                characteristics: ['Karasal', 'Sakin', 'Uzun ömürlü', 'Dayanıklı', 'Bağımsız', 'Otçul'],
                severity: 'medium'
            }
        ]
    },
    {
        id: 'fish',
        name: 'Balık',
        breeds: [
            {
                id: 'betta',
                name: 'Beta Balığı',
                description: 'Renkli, güzel ve genellikle yalnız yaşayan bir tür',
                characteristics: ['Renkli', 'Yalnız', 'Gösterişli', 'Dayanıklı', 'Enerjik', 'Savaşçı'],
                severity: 'low'
            },
            {
                id: 'goldfish',
                name: 'Japon Balığı',
                description: 'Popüler, dayanıklı ve uzun ömürlü bir tür',
                characteristics: ['Popüler', 'Dayanıklı', 'Uzun ömürlü', 'Sosyal', 'Sakin', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'guppy',
                name: 'Lepistes',
                description: 'Renkli, aktif ve sosyal bir tür',
                characteristics: ['Renkli', 'Aktif', 'Sosyal', 'Üretken', 'Uyumlu', 'Dayanıklı'],
                severity: 'low'
            },
            {
                id: 'tetra',
                name: 'Tetra',
                description: 'Küçük, sosyal ve aktif bir tür',
                characteristics: ['Küçük boy', 'Sosyal', 'Aktif', 'Sürü halinde', 'Renkli', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'angelfish',
                name: 'Melek Balığı',
                description: 'Zarif, sosyal ve büyük bir tür',
                characteristics: ['Zarif', 'Sosyal', 'Büyük boy', 'Gösterişli', 'Aktif', 'Teritoryal'],
                severity: 'medium'
            },
            {
                id: 'oscar',
                name: 'Oscar Balığı',
                description: 'Zeki, büyük ve aktif bir tür',
                characteristics: ['Zeki', 'Büyük boy', 'Aktif', 'Territoryal', 'Tanıma yeteneği', 'Meraklı'],
                severity: 'high'
            },
            {
                id: 'discus',
                name: 'Diskus Balığı',
                description: 'Renkli, hassas ve sosyal bir tür',
                characteristics: ['Renkli', 'Hassas', 'Sosyal', 'Gösterişli', 'Yassı', 'Sakin'],
                severity: 'high'
            },
            {
                id: 'koi',
                name: 'Koi Balığı',
                description: 'Büyük, renkli ve uzun ömürlü bir tür',
                characteristics: ['Büyük boy', 'Renkli', 'Uzun ömürlü', 'Sosyal', 'Tanıma yeteneği', 'Dayanıklı'],
                severity: 'high'
            }
        ]
    },
    {
        id: 'snake',
        name: 'Yılan',
        breeds: [
            {
                id: 'corn-snake',
                name: 'Mısır Yılanı',
                description: 'Uysal, renkli ve bakımı kolay bir tür',
                characteristics: ['Uysal', 'Renkli', 'Bakımı kolay', 'Orta boy', 'Zararsız', 'Uyumlu'],
                severity: 'medium'
            },
            {
                id: 'ball-python',
                name: 'Toparlak Piton',
                description: 'Sakin, uysal ve orta boyda bir tür',
                characteristics: ['Sakin', 'Uysal', 'Orta boy', 'Uyumlu', 'Zararsız', 'Dayanıklı'],
                severity: 'medium'
            },
            {
                id: 'king-snake',
                name: 'Kral Yılanı',
                description: 'Renkli, zararsız ve uysal bir tür',
                characteristics: ['Renkli', 'Zararsız', 'Uysal', 'Aktif', 'Dayanıklı', 'Orta boy'],
                severity: 'medium'
            },
            {
                id: 'milk-snake',
                name: 'Süt Yılanı',
                description: 'Renkli, zararsız ve uysal bir tür',
                characteristics: ['Renkli', 'Zararsız', 'Uysal', 'Aktif', 'Dayanıklı', 'Orta boy'],
                severity: 'medium'
            },
            {
                id: 'garter-snake',
                name: 'Garter Yılanı',
                description: 'Küçük, aktif ve zararsız bir tür',
                characteristics: ['Küçük boy', 'Aktif', 'Zararsız', 'Hızlı', 'Dayanıklı', 'Uyumlu'],
                severity: 'low'
            }
        ]
    },
    {
        id: 'lizard',
        name: 'Kertenkele',
        breeds: [
            {
                id: 'bearded-dragon',
                name: 'Sakallı Ejder',
                description: 'Sakin, uysal ve bakımı kolay bir tür',
                characteristics: ['Sakin', 'Uysal', 'Bakımı kolay', 'Sevimli', 'Tanıma yeteneği', 'Sosyal'],
                severity: 'medium'
            },
            {
                id: 'leopard-gecko',
                name: 'Leopar Gecko',
                description: 'Sevimli, uysal ve bakımı kolay bir tür',
                characteristics: ['Sevimli', 'Uysal', 'Bakımı kolay', 'Gece aktif', 'Dayanıklı', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'crested-gecko',
                name: 'Tepelikli Gecko',
                description: 'Sevimli, zararsız ve evcilleştirilebilir bir tür',
                characteristics: ['Sevimli', 'Zararsız', 'Evcilleştirilebilir', 'Zıplayan', 'Gece aktif', 'Uyumlu'],
                severity: 'low'
            },
            {
                id: 'blue-tongue-skink',
                name: 'Mavi Dilli Skink',
                description: 'Sakin, uysal ve zeki bir tür',
                characteristics: ['Sakin', 'Uysal', 'Zeki', 'Omnivore', 'Dayanıklı', 'Sevimli'],
                severity: 'medium'
            },
            {
                id: 'chameleon',
                name: 'Bukalemun',
                description: 'Renk değiştiren, hassas ve özel bakım gerektiren bir tür',
                characteristics: ['Renk değiştiren', 'Hassas', 'Özel bakım', 'Yavaş', 'Ürkek', 'Etkileyici'],
                severity: 'high'
            }
        ]
    },
    {
        id: 'hedgehog',
        name: 'Kirpi',
        breeds: [
            {
                id: 'african-pygmy',
                name: 'Afrika Cüce Kirpisi',
                description: 'Sevimli, sakin ve alışması kolay bir tür',
                characteristics: ['Sevimli', 'Sakin', 'Alışması kolay', 'Dikenli', 'Gece aktif', 'Meraklı'],
                severity: 'medium'
            }
        ]
    },
    {
        id: 'exotic',
        name: 'Egzotik Hayvanlar',
        breeds: [
            {
                id: 'sugar-glider',
                name: 'Şeker Uçuşkanı',
                description: 'Sevimli, sosyal ve aktif bir tür',
                characteristics: ['Sevimli', 'Sosyal', 'Aktif', 'Gece aktif', 'Uçan', 'Bağlanma yeteneği'],
                severity: 'high'
            },
            {
                id: 'chinchilla',
                name: 'Çinçilla',
                description: 'Yumuşak tüylü, aktif ve uzun ömürlü bir tür',
                characteristics: ['Yumuşak tüylü', 'Aktif', 'Uzun ömürlü', 'Gece aktif', 'Zıplayan', 'Temiz'],
                severity: 'medium'
            },
            {
                id: 'axolotl',
                name: 'Aksolotl',
                description: 'Suda yaşayan, sevimli ve dayanıklı bir tür',
                characteristics: ['Suda yaşayan', 'Sevimli', 'Dayanıklı', 'Yenilenebilir', 'Sakin', 'Özel görünüm'],
                severity: 'medium'
            },
            {
                id: 'tarantula',
                name: 'Tarantula',
                description: 'Sessiz, düşük bakım gerektiren bir tür',
                characteristics: ['Sessiz', 'Düşük bakım', 'Etkileyici', 'Uzun ömürlü', 'Yavaş', 'Saklanmacı'],
                severity: 'medium'
            },
            {
                id: 'bearded-dragon',
                name: 'Sakallı Ejder',
                description: 'Sakin, uysal ve bakımı kolay bir tür',
                characteristics: ['Sakin', 'Uysal', 'Bakımı kolay', 'Sevimli', 'Tanıma yeteneği', 'Sosyal'],
                severity: 'medium'
            }
        ]
    }
]; 