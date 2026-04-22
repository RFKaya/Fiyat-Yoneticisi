# FiyatVizyon - Profesyonel Ürün Maliyet ve Fiyat Yönetim Paneli

FiyatVizyon; restoran, kafe ve perakende işletmelerinin karmaşık maliyet yapılarını basitleştiren, kâr marjlarını optimize eden ve tüm satış kanallarında (mağaza, online platformlar) fiyat istikrarı sağlayan kapsamlı bir yönetim aracıdır.

Artık Excel tabloları arasında kaybolmaya son! FiyatVizyon ile her bir malzemenin gramajından, platform komisyonlarına kadar her detayı tek bir merkezden yönetebilirsiniz.

## 🚀 Öne Çıkan Özellikler

### 📦 Birleşik Ürün ve Malzeme Yönetimi
*   **Merkezi Kontrol:** Malzemelerinizi (hammadde) ve ürünlerinizi aynı arayüz üzerinden yönetin.
*   **Dinamik Güncelleme:** Bir malzemenin fiyatı değiştiğinde, o malzemeyi kullanan tüm ürünlerin maliyetleri ve kâr analizleri anında güncellenir.
*   **Hızlı Düzenleme:** Satır içi (inline) düzenleme özelliği sayesinde sayfalar arasında geçiş yapmadan isim, fiyat ve kategori güncellemelerini saniyeler içinde tamamlayın.

### 🍳 Akıllı Reçete Sistemi
*   **Detaylı Maliyetlendirme:** Ürünlerinize ait reçeteleri gramaj bazlı oluşturun.
*   **Gerçek Zamanlı Hesaplama:** Malzeme miktarlarını değiştirdiğiniz anda ürün maliyetinin nasıl etkilendiğini görün.
*   **Görsel Hiyerarşi:** Genişletilebilir satır yapısı ile reçete detaylarını ihtiyaç duyduğunuzda görüntüleyin, ekran karmaşasından kurtulun.

### 📊 Gelişmiş Kâr ve Finans Analizi
*   **Maliyet Odaklı Analiz:** Kâr oranlarını sadece ciro üzerinden değil, maliyet üzerinden de hesaplayarak gerçek kârlılığınızı ölçün.
*   **Platform Bazlı Marjlar:** Mağaza içi satışlar ile online platformlar (Getir, Yemeksepeti, Trendyol, Migros Yemek vb.) için ayrı kâr hedefleri belirleyin.
*   **Komisyon ve KDV Yönetimi:** Banka komisyonu, platform hizmet bedelleri, KDV ve stopaj oranlarını otomatik hesaplamalara dahil edin.
*   **Akıllı İpuçları (Tooltips):** Her fiyatın arkasındaki gizli maliyetleri (KDV tutarı, komisyon miktarı, net kâr) detaylı tooltipler ile anında inceleyin.

### 📝 Sipariş ve Operasyon Takibi
*   **Sipariş Yönetimi:** Gelen siparişlerinizi modern bir tabloda takip edin.
*   **Detaylı Görünüm:** Her siparişin içeriğini, birim fiyatlarını ve toplam maliyetlerini tek tıkla açılan detay panellerinde görün.

### 🛡️ Güvenlik ve Performans
*   **Otomatik Yedekleme:** Verileriniz her 24 saatte bir otomatik olarak yedeklenir, veri kaybı riski minimize edilir.
*   **Premium Arayüz:** Glassmorphism (cam efekti) tasarımı, yumuşak geçişler ve optimize edilmiş yükleme ekranları ile modern bir kullanıcı deneyimi.
*   **Hızlı ve Esnek:** React Memo ve gelişmiş state yönetimi sayesinde binlerce ürün arasında bile kasmayan, akıcı bir arayüz.

## 🛠️ Teknoloji Yığını

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Dil:** [TypeScript](https://www.typescriptlang.org/)
*   **Veritabanı & ORM:** [Prisma](https://www.prisma.io/) ile SQLite/PostgreSQL
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
*   **İkonlar:** [Lucide React](https://lucide.dev/)
*   **Sürükle-Bırak:** [@dnd-kit](https://dndkit.com/) (Kategori ve ürün sıralama için)

## 🏁 Başlarken

### Gereksinimler

*   Node.js (v18.x veya üstü)
*   npm / yarn / pnpm

### Kurulum

1.  **Projeyi klonlayın:**
    ```bash
    git clone https://github.com/RFKaya/Fiyat-Yoneticisi.git
    cd Fiyat-Yoneticisi
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Veritabanını hazırlayın:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

4.  **Uygulamayı başlatın:**
    ```bash
    npm run dev
    ```

Uygulama varsayılan olarak `http://localhost:3000` (veya yapılandırılmış port) üzerinde çalışacaktır.

---

**FiyatVizyon** ile işletmenizin finansal kontrolünü elinize alın! 🚀