/**
 * Trendyol Go Scraper
 */

const debug = (...args) => console.log('[TgoScraper]', ...args);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_TGO') {
        debug('Scrape request received');
        
        // Wait a bit for the data to load if navigation just happened
        // Normally background manages this, but extra check here
        
        try {
            const data = extractTgoData();
            sendResponse({ success: true, data });
        } catch (error) {
            debug('Error during scraping:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep message channel open
});

function extractTgoData() {
    // User mentioned: 
    // "Filtreleme Sonuçları: 6 sipariş"
    // "Toplam Ciro: 2.197,00 TL"

    // We'll search for these texts in the DOM
    const bodyText = document.body.innerText;
    
    // Find "Filtreleme Sonuçları: X sipariş"
    // Regex for: Filtreleme Sonuçları: (\d+) sipariş
    const countMatch = bodyText.match(/Filtreleme Sonuçları:\s*(\d+)\s*sipariş/i);
    const count = countMatch ? parseInt(countMatch[1]) : 0;

    // Find "Toplam Ciro: X.XXX,XX TL"
    // Regex for: Toplam Ciro:\s*([\d\.,]+)\s*TL
    const revMatch = bodyText.match(/Toplam Ciro:\s*([\d\.,]+)\s*TL/i);
    
    let revenue = 0;
    if (revMatch) {
        // "2.197,00" -> "2197.00"
        revenue = revMatch[1].replace(/\./g, '').replace(',', '.');
        revenue = parseFloat(revenue);
    }

    if (!countMatch && !revMatch) {
        throw new Error('Veriler sayfada bulunamadı. Lütfen "Teslim Edilenler" sayfasında olduğunuzdan emin olun.');
    }

    return { count, revenue };
}

debug('TGO Scraper initialized');
