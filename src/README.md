# FiyatVizyon - Ürün Fiyatlandırma ve Kâr Analiz Uygulaması

FiyatVizyon, restoran, kafe veya küçük işletme sahiplerinin ürün maliyetlerini hesaplamalarına, fiyatlarını belirlemelerine ve farklı satış kanalları (mağaza, online platformlar) için kâr marjlarını analiz etmelerine yardımcı olan bir web uygulamasıdır.

Bu proje [Firebase Studio](https://firebase.google.com/studio) kullanılarak geliştirilmiştir.

## Özellikler

- **Ürün ve Malzeme Yönetimi:** Ürünlerinizi ve bu ürünleri oluşturan malzemeleri (içerikleri) kolayca ekleyin, düzenleyin ve sıralayın.
- **Dinamik Reçete Oluşturma:** Her ürün için detaylı reçeteler oluşturun. Malzeme miktarlarını belirterek ürün maliyetlerini otomatik olarak hesaplayın.
- **Kâr Marjı Analizi:** Farklı kâr marjı yüzdelerine göre mağaza ve online satış fiyatlarınızı anında görün.
- **Esnek Komisyon ve KDV Hesaplamaları:** Mağaza satışları için banka komisyonu, online satışlar için platform komisyonu ve genel KDV oranlarını belirleyerek tüm hesaplamaların bu oranlara göre yapılmasını sağlayın.
- **Veri Kalıcılığı:** Tüm ürün, malzeme ve ayar verileriniz sunucu tarafında bir JSON dosyasında saklanır.

## Teknolojiler

- **Next.js:** Sunucu tarafı render ve statik site oluşturma özelliklerine sahip React framework'ü.
- **React:** Kullanıcı arayüzü oluşturmak için kullanılan JavaScript kütüphanesi.
- **TypeScript:** JavaScript'e statik tipler ekleyen dil.
- **Tailwind CSS:** Hızlı UI geliştirme için kullanılan bir CSS framework'ü.
- **ShadCN UI:** Tailwind CSS üzerine inşa edilmiş, yeniden kullanılabilir UI bileşenleri koleksiyonu.

## Başlarken

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler

- Node.js (v18 veya üstü)
- npm veya yarn

### Kurulum

1.  **Projeyi klonlayın:**
    ```bash
    git clone https://github.com/KULLANICI_ADINIZ/PROJE_ADINIZ.git
    cd PROJE_ADINIZ
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Uygulamayı başlatın:**
    ```bash
    npm run dev
    ```

    Uygulama varsayılan olarak `http://localhost:9002` adresinde çalışmaya başlayacaktır.

## Önemli Not: Veri Dosyası

Bu proje, tüm uygulama verilerini (`ürünler`, `malzemeler`, `ayarlar` vb.) `src/data/app-data.json` dosyasında saklar. Bu dosya kişisel verilerinizi içerdiğinden **kesinlikle public bir GitHub reposuna gönderilmemelidir.**

`.gitignore` dosyası bu dosyanın gelecekteki commit'lerde takip edilmesini engelleyecek şekilde ayarlanmıştır.

### Yanlışlıkla Commit'lenen Dosyayı Geçmişten Silme

Eğer bu dosyayı yanlışlıkla daha önce commit'leyip GitHub'a gönderdiyseniz, sadece dosyayı silip yeni bir commit yapmak yeterli değildir. Dosya, Git geçmişinde kalmaya devam edecektir. Dosyayı tüm geçmişten tamamen kaldırmak için aşağıdaki adımları **kendi terminalinizde** çalıştırmanız gerekir.

**DİKKAT: Bu işlem, projenizin Git geçmişini yeniden yazar ve geri alınamaz. İşleme başlamadan önce projenizin bir yedeğini almanızı şiddetle tavsiye ederiz.**

1.  Aşağıdaki komutu projenizin kök dizininde çalıştırın. Bu komut, tüm commit'leri tek tek kontrol eder ve `src/data/app-data.json` dosyasını bulduğu her yerden siler.

    ```bash
    git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch src/data/app-data.json' --prune-empty --tag-name-filter cat -- --all
    ```

2.  Komut tamamlandıktan sonra, yeniden yazılmış geçmişi GitHub'a göndermeniz gerekir. Bu işlem için "force push" (zorla gönderme) yapmalısınız.

    **UYARI: Bu komut, GitHub'daki geçmişi yerel makinenizdeki geçmişle değiştirecektir. Eğer başka birileriyle bu depo üzerinde çalışıyorsanız, bu komutu çalıştırmadan önce onlarla iletişime geçin.**

    ```bash
    git push origin --force --all
    git push origin --force --tags
    ```

Bu adımlardan sonra, `app-data.json` dosyanız hem mevcut projenizden hem de tüm Git geçmişinden tamamen kaldırılmış olacaktır.
