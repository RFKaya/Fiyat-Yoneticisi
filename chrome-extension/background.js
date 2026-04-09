/**
 * Background Service Worker
 */

const debug = (...args) => console.log('[Background]', ...args);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SYNC_TGO') {
        const date = request.date; // "2026-04-03" (YYYY-MM-DD)
        
        debug('Sync TGO requested for:', date);
        
        handleTgoSync(date).then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    } else if (request.action === 'SYNC_GETIR') {
        const date = request.date;
        debug('Sync GETIR requested for:', date);
        handleGetirSync(date).then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    } else if (request.action === 'SYNC_YEMEKSEPETI') {
        const date = request.date;
        debug('Sync YEMEKSEPETI requested for:', date);
        handleYemekSync(date).then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
    }
    return true; // Keep message channel open
});

async function handleYemekSync(date) {
    // 1. Find or create the tab
    const tabs = await chrome.tabs.query({ url: "*://partner-app.yemeksepeti.com/*" });
    let tab;

    if (tabs.length === 0) {
        tab = await chrome.tabs.create({ url: `https://partner-app.yemeksepeti.com/orders?from=${date}&to=${date}` });
        // Wait for page load
        await new Promise(r => setTimeout(r, 4000));
    } else {
        tab = tabs[0];
        await chrome.tabs.update(tab.id, { url: `https://partner-app.yemeksepeti.com/orders?from=${date}&to=${date}`, active: true });
        // Wait for page load after URL change
        await new Promise(r => setTimeout(r, 4000));
    }

    // 2. Send message to scrape
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_YEMEKSEPETI', date }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: 'Yemeksepeti sekmesiyle iletişim kurulamadı.' });
            } else {
                resolve(response);
            }
        });
    });
}

async function handleGetirSync(date) {
    const tabs = await chrome.tabs.query({ url: "*://restoran.getiryemek.com/*" });
    if (tabs.length === 0) {
        throw new Error('Açık bir GetirYemek restoran sekmesi bulunamadı.');
    }
    const getirTab = tabs[0];
    
    // Scrape directly or handle navigation if needed. 
    // The user mentioned skipping to 'active' then clicking. 
    // Let's ensure we are at least on the base 'orders' path.
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(getirTab.id, { action: 'SCRAPE_GETIR', date }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: 'Getir sekmesiyle iletişim kurulamadı.' });
            } else {
                resolve(response);
            }
        });
    });
}

async function handleTgoSync(date) {
    // 1. Find the TGO tab
    const tabs = await chrome.tabs.query({ url: "*://partner.tgoyemek.com/*" });
    
    if (tabs.length === 0) {
        throw new Error('Açık bir Trendyol Go (tgoyemek) sekmesi bulunamadı.');
    }
    
    const tgoTab = tabs[0];
    
    // 2. Determine target URL
    // If we're not on the 'history/delivered' page, navigate there
    const currentUrl = new URL(tgoTab.url);
    if (!currentUrl.pathname.endsWith('/order/history/delivered')) {
        // Find the meal ID from the current URL
        const mealIdMatch = tgoTab.url.match(/meal\/([^\/]+)/);
        if (!mealIdMatch) {
            throw new Error('Trendyol Go sayfasında bir restoran ID\'si bulunamadı. Lütfen panelde aktif olduğunuzdan emin olun.');
        }
        
        const mealId = mealIdMatch[1];
        const targetUrl = `https://partner.tgoyemek.com/meal/${mealId}/order/history/delivered`;
        
        debug('Navigating TGO tab to:', targetUrl);
        await chrome.tabs.update(tgoTab.id, { url: targetUrl });
        
        // Wait for page to load
        await new Promise(resolve => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tgoTab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            });
        });

        // Small extra delay for React hydration/data fetching
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 3. Send scrape request to the tab
    // We use a promise to handle the response
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tgoTab.id, { action: 'SCRAPE_TGO', date }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: 'TGO sekmesiyle iletişim kurulamadı. Lütfen sayfayı yenileyin.' });
            } else {
                resolve(response);
            }
        });
    });
}
