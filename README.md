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

`.gitignore` dosyası bu dosyanın takip edilmesini engelleyecek şekilde ayarlanmıştır. Eğer bu dosyayı yanlışlıkla daha önce commitlediyseniz, aşağıdaki komutu çalıştırarak Git geçmişinden kaldırabilirsiniz:

```bash
git rm --cached src/data/app-data.json
```

Ardından değişiklikleri yeni bir commit ile kaydedin.

```bash
git commit -m "chore: Remove app-data.json from tracking"
```
