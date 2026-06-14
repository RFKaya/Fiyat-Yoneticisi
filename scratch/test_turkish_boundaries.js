const fillerWords = [
  "standart", "özel", "ozel", "yeni", "popüler", "populer", "yarım", "yarim",
  "porsiyon", "porsıyon", "tam", "adet", "tane", "pors", "aile boyu", "aile boy",
  "aile", "mega", "orta boy", "orta", "küçük boy", "kucuk boy", "küçük", "kucuk",
  "büyük boy", "buyuk boy", "büyük", "buyuk", "boyu", "boy", "double", "duble",
  "tek", "tekli", "çift", "cift", "çiftli", "ciftli", "ekstra", "extra", "süper", "super"
];

// 1. Test using standard \b
const regexStandard = new RegExp('\\b(' + fillerWords.map(w => w.replace(/\s+/g, '\\s+')).join('|') + ')\\b', 'gi');

// 2. Test using unicode-safe boundaries
const regexSafe = new RegExp('(?:^|[\\s()\\-.,])(' + fillerWords.map(w => w.replace(/\s+/g, '\\s+')).join('|') + ')(?=$|[\\s()\\-.,])', 'gi');

const testCases = [
  "Aile Boyu Çiğ Köfte (750 g)",
  "Büyük Boy Ayran",
  "Çiğ Köfte Porsiyon",
  "Ekstra Sürüm"
];

console.log("=== Testing Standard \\bRegex ===");
for (const tc of testCases) {
  const res = tc.replace(regexStandard, ' ').replace(/\s+/g, ' ').trim();
  console.log(`"${tc}" -> "${res}"`);
}

console.log("\n=== Testing Unicode-Safe Regex ===");
for (const tc of testCases) {
  const res = tc.replace(regexSafe, ' ').replace(/\s+/g, ' ').trim();
  console.log(`"${tc}" -> "${res}"`);
}
