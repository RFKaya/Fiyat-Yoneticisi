/**
 * GetirYemek Scraper
 */

const debug = (...args) => console.log('[GetirScraper]', ...args);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_GETIR') {
        const isFrame = window.self !== window.top;
        debug(`Scrape request received in ${isFrame ? 'IFRAME' : 'MAIN FRAME'} - ${window.location.href}`);
        
        (async () => {
            try {
                // 1. Check if we're already on the "Geçmiş Siparişler" tab
                let data = extractGetirData(true);
                if (data) {
                    debug('Data found directly in this frame!');
                    sendResponse({ success: true, data });
                    return;
                }

                // 2. Not found, search specifically for the AntD tab button
                debug('Target data not found, searching for AntD tab button...');
                const tabs = document.querySelectorAll('.ant-tabs-tab-btn');
                let targetTab = null;

                for (const tab of tabs) {
                    if (tab.innerText.includes('Geçmiş Siparişler')) {
                        targetTab = tab;
                        break;
                    }
                }

                if (targetTab) {
                    debug('Found navigation tab! Clicking:', targetTab.innerText);
                    targetTab.click();
                    // Wait for content (AJAX) to load
                    await new Promise(r => setTimeout(r, 3000));
                    
                    data = extractGetirData();
                    sendResponse({ success: true, data });
                } else if (!isFrame) {
                    debug('Tab not found in main frame. Trying text search fallback...');
                    // Fallback to broad text search
                    const elements = document.querySelectorAll('button, a, div[role="button"], span, div');
                    let fallbackBtn = null;
                    for (const el of elements) {
                        if (el.innerText.includes('Geçmiş Siparişler') && el.offsetHeight > 0) {
                            fallbackBtn = el;
                            break;
                        }
                    }
                    if (fallbackBtn) {
                        fallbackBtn.click();
                        await new Promise(r => setTimeout(r, 4000));
                        sendResponse({ success: true, data: extractGetirData() });
                    }
                }
            } catch (error) {
                if (!error.message.includes('bulunmadı')) {
                    sendResponse({ success: false, error: error.message });
                }
            }
        })();
        return true; 
    }
});

function extractGetirData(silent = false) {
    const bodyText = document.body.innerText;
    debug('Body text snippet:', bodyText.substring(0, 300));
    
    // Look for the AntD structure we just learned:
    // "Geçmiş Siparişler" followed by a number in a sibling span/div
    const tabActive = document.querySelector('.ant-tabs-tab-active');
    let count = 0;
    if (tabActive && tabActive.innerText.includes('Geçmiş Siparişler')) {
        // Try to find the number in the tab title (e.g. "Geçmiş Siparişler 2")
        const countMatch = tabActive.innerText.match(/Geçmiş Siparişler\s*(\d+)/i);
        if (countMatch) count = parseInt(countMatch[1]);
    }

    // Fallback regex for count in body: "1 sipariş bulundu"
    if (!count) {
        const countMatch = bodyText.match(/(\d+)\s*sipariş\s*bulundu/i);
        if (countMatch) count = parseInt(countMatch[1]);
    }

    // Revenue search: "Toplam: 325₺" or "Toplam: 325,00 TL"
    const revMatch = bodyText.match(/Toplam:\s*([\d\.,]+)\s*[₺TL]/i) || bodyText.match(/Tutar:\s*([\d\.,]+)\s*[₺TL]/i);
    let revenue = 0;
    if (revMatch) {
        revenue = revMatch[1].replace(/\./g, '').replace(',', '.');
        revenue = parseFloat(revenue);
    }

    if (!count && !revenue) {
        if (silent) return null;
        throw new Error('Getir verileri sayfada bulunamadı.');
    }

    debug('Extracted successfully:', { count, revenue });
    return { count, revenue };
}

debug('Getir scraper initialized');
