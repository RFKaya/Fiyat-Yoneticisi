/**
 * Yemeksepeti Scraper
 */

const debug = (...args) => console.log('[YemekScraper]', ...args);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_YEMEKSEPETI') {
        debug('Scrape request received for date:', request.date);
        
        (async () => {
            try {
                // Wait a bit more for content to be fully ready
                await new Promise(r => setTimeout(r, 2000));
                
                const data = extractYemekData();
                sendResponse({ success: true, data });
            } catch (error) {
                debug('Error during Yemeksepeti scraping:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
    }
    return true; 
});

function extractYemekData() {
    debug('Starting extraction (skipping footer/totals)...');
    
    const headers = Array.from(document.querySelectorAll('th'));
    const targetHeader = headers.find(h => h.innerText.includes('Nihai ara toplam'));
    
    if (!targetHeader) {
        debug('Header "Nihai ara toplam" not found. Falling back...');
        return fallbackSearch();
    }

    const colIndex = Array.from(targetHeader.parentElement.children).indexOf(targetHeader);
    
    // Only target tbody rows to avoid headers/footers
    const rows = document.querySelectorAll('table tbody tr');
    let count = 0;
    let revenue = 0;
    const logData = [];

    rows.forEach((row, i) => {
        // Skip footer or summary rows that might be inside tbody
        const rowText = row.innerText.trim();
        if (/toplam|total|ara toplam|özet/i.test(rowText)) {
            debug(`Skipping summary row ${i+1}: ${rowText.substring(0, 30)}...`);
            return;
        }

        const cell = row.cells[colIndex];
        if (cell) {
            const priceText = cell.innerText.trim();
            const valMatch = priceText.match(/([\d\.,]+)/);
            if (valMatch) {
                const val = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.'));
                if (val > 0) {
                    revenue += val;
                    count++;
                    logData.push({ row: i+1, price: val });
                }
            }
        }
    });

    console.table(logData);
    debug('Final calculation:', { count, total: revenue });

    if (count === 0 && revenue === 0) {
        return fallbackSearch();
    }

    return { count, revenue: parseFloat(revenue.toFixed(2)) };
}

function fallbackSearch() {
    const bodyText = document.body.innerText;
    const priceRegex = /([\d\.,]+)\s*[₺TL]/g;
    let prices = [];
    let match;
    while ((match = priceRegex.exec(bodyText)) !== null) {
        const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (val > 0) prices.push(val);
    }
    
    if (prices.length === 0) {
        throw new Error('Yemeksepeti verileri bulunamadı. Lütfen Siparişler sayfasının doğru yüklendiğinden emin olun.');
    }

    return { 
        count: prices.length, 
        revenue: prices.reduce((a, b) => a + b, 0)
    };
}

debug('Yemeksepeti scraper initialized');
