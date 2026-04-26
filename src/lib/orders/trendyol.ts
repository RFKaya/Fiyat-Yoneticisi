import * as XLSX from 'xlsx';
import { ParsedOrder, ParsedOrderItem } from './types';

/**
 * Trendyol Excel parser.
 *
 * Trendyol konsepti: Her satır bir ürün satırıdır.
 * Aynı sipariş numarasına sahip birden fazla satır, tek bir siparişin ürünleridir.
 *
 * Sütun haritası (0-indexed):
 *   F (5)  → Ödeme Yöntemi
 *   H (7)  → Sipariş Tarihi  (Örn: "2026-04-25 22:11:34")
 *   J (9)  → Sipariş Numarası
 *   K (10) → Ürün Adı
 *   L (11) → Sipariş Durumu
 *   M (12) → Ürün Adedi
 *   N (13) → Ürün Fiyatı
 */
export function parseTrendyol(buffer: ArrayBuffer): ParsedOrder[] {
  const bytes = new Uint8Array(buffer);

  let workbook;
  // Next.js dev server, console.error'ları yakalayıp ekranda kırmızı hata olarak gösterir.
  // xlsx kütüphanesi Trendyol dosyalarındaki bu hatayı aslında 'throw' etmez, sadece console.error basar.
  // Bu yüzden geçici olarak console.error'u susturuyoruz.
  const originalConsoleError = console.error;
  try {
    console.error = () => { };
    workbook = XLSX.read(bytes, { type: 'array' });
  } finally {
    console.error = originalConsoleError;
  }
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // header: 1 → index-bazlı erişim, range: 1 → ilk satırı (başlık) atla
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 }) as any[][];

  // Sipariş numarasına göre satırları grupla
  const orderMap = new Map<string, {
    rows: any[][];
    orderDate: Date;
    paymentMethod: string;
    status: string;
  }>();

  for (const row of data) {
    const orderNumber = String(row[9] || '').trim();
    if (!orderNumber) continue; // Sipariş numarası yoksa atla

    if (!orderMap.has(orderNumber)) {
      // İlk karşılaşılan satırdan sipariş meta verisini al
      const rawPayment = String(row[5] || '').trim();
      let paymentMethod = rawPayment;

      // Yemek kartı tespiti: Multinet, Pluxee, Sodexo, Setcard, Edenred içeriyorsa 'Yemek Kartı' yap
      const lowerPayment = paymentMethod.toLowerCase();
      if (
        lowerPayment.includes('multinet') ||
        lowerPayment.includes('pluxee') ||
        lowerPayment.includes('sodexo') ||
        lowerPayment.includes('setcard') ||
        lowerPayment.includes('edenred')
      ) {
        paymentMethod = 'Yemek Kartı';
      }

      orderMap.set(orderNumber, {
        rows: [],
        orderDate: parseDate(row[7]),
        paymentMethod,
        status: String(row[11] || '').trim(),
      });
    }

    orderMap.get(orderNumber)!.rows.push(row);
  }

  // Her grubu tek bir ParsedOrder'a dönüştür
  const orders: ParsedOrder[] = [];

  for (const [orderNumber, group] of orderMap) {
    const items: ParsedOrderItem[] = group.rows.map(row => {
      const quantity = typeof row[12] === 'number'
        ? row[12]
        : parseInt(String(row[12] || '1'), 10) || 1;

      const price = typeof row[13] === 'number'
        ? row[13]
        : parseFloat(String(row[13] || '0').replace(',', '.')) || 0;

      return {
        name: String(row[10] || '').trim(),
        quantity,
        price,
      };
    }).filter(item => item.name); // İsmi olmayan ürünleri atla

    // Toplam tutar = tüm ürünlerin (adet × fiyat) toplamı
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    orders.push({
      orderNumber,
      platform: 'trendyol' as const,
      orderDate: group.orderDate,
      paymentMethod: group.paymentMethod,
      status: group.status,
      totalAmount,
      items,
      raw: { rows: group.rows },
    });
  }

  return orders;
}

/**
 * Trendyol tarih formatını parse eder.
 * Örnek: "2026-04-25 22:11:34"
 */
function parseDate(val: any): Date {
  if (val instanceof Date) return val;

  if (typeof val === 'string') {
    // "2026-04-25 22:11:34" → ISO uyumlu hale getir
    const d = new Date(val.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }

  // Excel serial number fallback
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return new Date(d.y, d.m - 1, d.d, d.H, d.M, d.S);
  }

  return new Date();
}
