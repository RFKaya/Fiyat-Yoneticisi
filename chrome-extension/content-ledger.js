const debug = (...args) => console.log('[LedgerSync]', ...args);

let overlay = null;

function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ledger-sync-overlay';
    // Style it via JS too for maximum persistence
    Object.assign(overlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '0', // Will grow with content
        pointerEvents: 'none',
        zIndex: '999999'
    });
    document.body.appendChild(overlay);
    return overlay;
}

function syncButtons() {
    if (!window.location.pathname.includes('/ledger')) {
        if (overlay) overlay.style.display = 'none';
        return;
    }

    const container = ensureOverlay();
    container.style.display = 'block';
    
    const rows = document.querySelectorAll('.ledger-modern-table tbody tr[data-date]');
    if (rows.length === 0) return;

    // Get today's date in YYYY-MM-DD format (matches data-date)
    const today = new Date().toISOString().split('T')[0];

    // Update overlay height
    const table = document.querySelector('.ledger-modern-table');
    if (table) {
        container.style.height = `${document.documentElement.scrollHeight}px`;
    }

    rows.forEach(row => {
        const date = row.getAttribute('data-date');
        const rect = row.getBoundingClientRect();
        
        // ONLY SYNC FOR TODAY
        if (date === today) {
            updateButtonsForRect(row, date, rect);
        } else {
            removeButtonsForDate(date);
        }
    });

    // Cleanup logic: Only keep buttons for today
    const allButtons = container.querySelectorAll('.ledger-sync-btn');
    allButtons.forEach(btn => {
        if (btn.getAttribute('data-date') !== today) {
            btn.remove();
        }
    });
}

function removeButtonsForDate(date) {
    if (!overlay) return;
    overlay.querySelectorAll(`[data-date="${date}"]`).forEach(el => el.remove());
}

function updateButtonsForRect(row, date, rect) {
    const container = ensureOverlay();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Calculate absolute TOP position relative to document
    const absTop = rect.top + scrollY;
    
    // Find table's left position
    const table = document.querySelector('.ledger-modern-table');
    if (!table) return;
    const tableRect = table.getBoundingClientRect();
    const absLeft = tableRect.left + scrollX - 52; 

    // TGO Button
    let tgo = container.querySelector(`.ledger-sync-btn.tgo[data-date="${date}"]`);
    if (!tgo) {
        tgo = createSyncBtn('TGO', '#ff5a00', async () => {
            await syncPlatform('SYNC_TGO', tgo, row, [11, 12]);
        });
        tgo.classList.add('tgo');
        tgo.setAttribute('data-date', date);
        container.appendChild(tgo);
    }

    // GTR Button
    let gtr = container.querySelector(`.ledger-sync-btn.getir[data-date="${date}"]`);
    if (!gtr) {
        gtr = createSyncBtn('GTR', '#5d3ebc', async () => {
            await syncPlatform('SYNC_GETIR', gtr, row, [7, 8]);
        });
        gtr.classList.add('getir');
        gtr.setAttribute('data-date', date);
        container.appendChild(gtr);
    }

    // YS Button
    let ys = container.querySelector(`.ledger-sync-btn.ys[data-date="${date}"]`);
    if (!ys) {
        ys = createSyncBtn('YS', '#8e0000', async () => {
            await syncPlatform('SYNC_YEMEKSEPETI', ys, row, [9, 10]);
        });
        ys.classList.add('ys');
        ys.setAttribute('data-date', date);
        container.appendChild(ys);
    }

    // Apply positions
    tgo.style.left = `${absLeft}px`;
    tgo.style.top = `${absTop + 2}px`;
    
    gtr.style.left = `${absLeft}px`;
    gtr.style.top = `${absTop + 14}px`;
    
    ys.style.left = `${absLeft}px`;
    ys.style.top = `${absTop + 26}px`;
    
    // Toggle visibility based on viewport for performance/cleanliness
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
    tgo.style.visibility = isVisible ? 'visible' : 'hidden';
    gtr.style.visibility = isVisible ? 'visible' : 'hidden';
    ys.style.visibility = isVisible ? 'visible' : 'hidden';
}

function createSyncBtn(label, color, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ledger-sync-btn';
    btn.innerHTML = label;
    btn.style.background = color;
    btn.type = 'button';
    btn.onclick = (e) => {
        e.stopPropagation(); e.preventDefault();
        onClick();
    };
    return btn;
}

async function syncPlatform(action, btn, row, cells) {
    const originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '⌛';
    
    const date = row.getAttribute('data-date');
    chrome.runtime.sendMessage({ action, date }, (response) => {
        btn.classList.remove('loading');
        if (response && response.success) {
            btn.classList.add('success');
            btn.innerHTML = '✅';
            updateRowDataByCells(row, response.data, cells);
            setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('success'); }, 3000);
        } else {
            btn.classList.add('error');
            btn.innerHTML = '❌';
            const errorMsg = response ? response.error : 'Hata';
            alert(`${action} verisi çekilemedi: ` + errorMsg);
            setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('error'); }, 3000);
        }
    });
}

function updateRowDataByCells(row, data, [countIdx, revIdx]) {
    const countInput = row.cells[countIdx]?.querySelector('input');
    const revInput = row.cells[revIdx]?.querySelector('input');
    if (!countInput || !revInput) return;

    if (data.count !== undefined) setReactInputValue(countInput, String(data.count));
    if (data.revenue !== undefined) setReactInputValue(revInput, String(data.revenue).replace('.', ','));
}

function setReactInputValue(input, value) {
    const previousValue = input.value;
    input.value = value;
    const tracker = input._valueTracker;
    if (tracker) tracker.setValue(previousValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Event hooks
window.addEventListener('scroll', syncButtons, true);
window.addEventListener('resize', syncButtons);

// Regular sync to handle dynamic React updates
setInterval(syncButtons, 1000);

// Initial call
setTimeout(syncButtons, 500);

debug('Enhanced Floating Sync Overlay active');
