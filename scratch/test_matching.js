// Mocking the match logic and data structures
const products = [
  { id: "1", name: "Şalgam Suyu (300 ml)" },
  { id: "2", name: "Safiş Ayran (275 ml)" },
  { id: "3", name: "Safiş Acılı Ayran (275 ml)" }
];

function normalizeWeightUnit(text) {
  return text
    .replace(/(\d+(?:[.,]\d+)?)\s*ml\.?(?!\w)/gi, '$1 ml');
}

function stripCommonSuffixes(text) {
  return text.trim();
}

function stripFillerWords(text) {
  return text.trim();
}

function simpleNormalize(name) {
  return normalizeWeightUnit(name).toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeForMatch(name) {
  let n = normalizeWeightUnit(name).toLowerCase().trim();
  n = stripCommonSuffixes(n);
  n = stripFillerWords(n);
  n = n.replace(/[()\-]/g, ' ');
  return n.split(' ').filter(Boolean).sort().join(' ');
}

function findMatchingProduct(itemName, productsList) {
  const sMap = new Map();
  const aMap = new Map();
  for (const p of productsList) {
    sMap.set(simpleNormalize(p.name), p);
    aMap.set(normalizeForMatch(p.name), p);
  }

  // AŞAMA 1: Tam/Basit Eşleşme
  const simpleName = simpleNormalize(itemName);
  let product = sMap.get(simpleName);

  // AŞAMA 2: Agresif Eşleşme
  if (!product) {
    const advancedName = normalizeForMatch(itemName);
    product = aMap.get(advancedName);
  }

  // AŞAMA 3: Geri Çekilme Eşleşmesi (Parantezleri silip deneme)
  if (!product && simpleName.includes('(')) {
    let tempName = simpleName;
    while (!product && tempName.includes('(')) {
      const lastParenIndex = tempName.lastIndexOf('(');
      if (lastParenIndex === -1) break;
      tempName = tempName.substring(0, lastParenIndex).trim();
      if (!tempName) break;
      product = sMap.get(tempName) || aMap.get(normalizeForMatch(tempName));
    }
  }

  // AŞAMA 4: "Acılı/Acısız/Tatlı/Sade" fallback eşleşmesi
  if (!product) {
    const cleanFlavor = (text) => {
      // \b, Türkçe karakter sınırlarında (örn: acılı) JavaScript'te düzgün çalışmaz.
      // Bu yüzden özel karakter sınırları tanımlıyoruz.
      return text
        .replace(/(?:^|[\s()\-.,])(acılı|acili|acısız|acisiz|tatlı|tatli|sade)(?=$|[\s()\-.,])/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const itemNameNoFlavor = cleanFlavor(itemName);
    if (itemNameNoFlavor !== itemName) {
      const simpleNoFlavor = simpleNormalize(itemNameNoFlavor);
      product = sMap.get(simpleNoFlavor);

      if (!product) {
        const advancedNoFlavor = normalizeForMatch(itemNameNoFlavor);
        product = aMap.get(advancedNoFlavor);
      }
    }
  }

  return product || null;
}

const testCases = [
  { input: "Şalgam Suyu Acılı (300 ml)", expectedId: "1" },
  { input: "Safiş Acılı Ayran (275 ml)", expectedId: "3" },
  { input: "Safiş Ayran (275 ml)", expectedId: "2" },
  { input: "Şalgam Suyu (300 ml)", expectedId: "1" }
];

let success = true;
for (const tc of testCases) {
  const matched = findMatchingProduct(tc.input, products);
  const matchedId = matched ? matched.id : null;
  if (matchedId !== tc.expectedId) {
    console.error(`FAIL: Input "${tc.input}" matched ID: ${matchedId}, expected ID: ${tc.expectedId}`);
    success = false;
  } else {
    console.log(`PASS: "${tc.input}" matched product "${matched.name}" (ID: ${matchedId})`);
  }
}

if (success) {
  console.log("All matching tests passed successfully!");
} else {
  process.exit(1);
}
