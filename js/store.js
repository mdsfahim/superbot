// ==========================================
// STORE, CHECKOUT & VALIDATION LOGIC
// ==========================================

window.pendingCheckout = { title: '', price: 0 };
window.currentStoreCategory = 'All'; 

// --- CATEGORY FILTER FUNCTION ---
window.filterStore = function(category, btnElement) {
    window.safeHaptic('light');
    
    // 1. Reset all buttons to gray
    const buttons = document.querySelectorAll('.store-cat-btn');
    buttons.forEach(btn => {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--text-muted)';
    });

    // 2. Highlight the clicked button in blue
    if (btnElement) {
        btnElement.style.background = 'var(--accent-color)';
        btnElement.style.color = 'white';
    }

    // 3. Render the store with the new category filter
    window.renderStore(category);
};

// --- 1. RENDER STORE ITEMS (FIREBASE CONNECTED) ---
window.renderStore = async function(category = 'All') {
    const grid = document.getElementById('store-product-grid');
    if (!grid) return;

    // Immediately sync the balance card text
    const storeBalanceEl = document.getElementById('store-page-balance');
    if (storeBalanceEl) storeBalanceEl.innerText = window.currentUser.balance.toLocaleString() + ' 🪙';

    // Show loading text
    grid.style.display = 'block';
    grid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">Loading store...</div>`;

    try {
        // 👉 THE FIX 1: Fetching directly from Firebase instead of local memory!
        const snap = await window.db.collection('store').orderBy('createdAt', 'desc').get();
        let allItems = [];
        
        snap.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            allItems.push(data);
        });

        // --- THE SMART FILTER ENGINE ---
        let filteredItems = allItems;
        
        if (category !== 'All') {
            filteredItems = allItems.filter(item => {
                const title = item.title.toLowerCase();
                if (item.category && item.category === category) return true;
                if (category === 'Cash') return title.includes('bkash') || title.includes('nagad') || title.includes('rocket');
                if (category === 'Mobile') return title.includes('top-up') || title.includes('recharge') || title.includes('mb') || title.includes('gb');
                if (category === 'Crypto') return title.includes('binance') || title.includes('usdt') || title.includes('trx');
                return false;
            });
        }

        if (filteredItems.length === 0) {
            grid.style.display = 'block';
            grid.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🛒</div>
                    <p>No items found in ${category}.</p>
                </div>`;
            return;
        }

        // Force grid layout
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        grid.style.gap = '15px';
        
        let html = '';

        filteredItems.forEach(item => {
            let displayPrice = item.price >= 1000 ? (item.price / 1000) + 'k' : item.price;
            
            // 👉 THE FIX 2: Smart Icon Renderer for Image Links vs Emojis!
            let iconDisplay = '';
            if (item.icon && item.icon.startsWith('http')) {
                iconDisplay = `
                <div class="product-image-wrapper" style="background: ${item.theme}; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                    <img src="${item.icon}" style="width: 100%; height: 100%; object-fit: contain; padding: 6px;">
                </div>`;
            } else {
                iconDisplay = `
                <div class="product-image-wrapper" style="background: ${item.theme};">
                    <div class="product-icon">${item.icon}</div>
                </div>`;
            }

            html += `
                <div class="store-product-card" onclick="window.openCheckout(${item.price}, '${item.title}')">
                    ${iconDisplay}
                    <div class="product-details">
                        <h4 class="product-title">${item.title}</h4>
                        <p class="product-subtitle">${item.subtitle || ''}</p>
                        <div class="product-bottom">
                            <span class="product-price">${displayPrice} 🪙</span>
                            <button class="buy-btn">Buy</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;

    } catch (error) {
        console.error("Store Fetch Error:", error);
        grid.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 50px 20px;">Failed to load store from server.</div>`;
    }
};

// --- 2. OPEN CHECKOUT MENU ---
window.openCheckout = async function(price, title) {
    if (window.currentUser.balance < price) {
        window.safeHaptic('error');
        // THE FIX 3: Restored the proper Coin emoji
        window.safeAlert(`Insufficient balance! You need ${price.toLocaleString()} 🪙`);
        return; 
    }

    window.pendingCheckout.price = price;
    window.pendingCheckout.title = title;

    await window.openSubPage('withdraw', 'portal', 'Checkout');

    setTimeout(() => {
        const titleEl = document.getElementById('checkout-item-title');
        const priceEl = document.getElementById('checkout-item-price');
        if(titleEl) titleEl.innerText = title;
        // THE FIX 3: Restored the proper Coin emoji
        if(priceEl) priceEl.innerText = price.toLocaleString() + ' 🪙';
    }, 100);
};

// --- 3. DYNAMIC CHECKOUT UI SWITCHER ---
window.updateCheckoutUI = function() {
    const method = document.getElementById('checkout-method').value;
    const label = document.getElementById('checkout-input-label');
    const input = document.getElementById('checkout-account');
    const suggestionsBox = document.getElementById('email-suggestions');

    if(suggestionsBox) suggestionsBox.style.display = 'none';
    input.value = ''; 

    if (method === 'Mobile') {
        label.innerText = 'Account Number';
        input.placeholder = 'e.g. 01XXXXXXXXX or +8801XXXXXXXXX';
    } else if (method === 'Email') {
        label.innerText = 'Account Email';
        input.placeholder = 'e.g. yourname@gmail.com';
    }
};

// --- 4. EMAIL SUGGESTION PILLS ---
window.handleEmailSuggestions = function() {
    const method = document.getElementById('checkout-method').value;
    const inputEl = document.getElementById('checkout-account');
    const suggestionsContainer = document.getElementById('email-suggestions');
    
    if (method !== 'Email' || !suggestionsContainer) return;

    const val = inputEl.value;
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com', 'icloud.com'];

    if (val.includes('@')) {
        const parts = val.split('@');
        const username = parts[0];
        const typedDomain = parts[1].toLowerCase();

        const matchedDomains = allowedDomains.filter(domain => domain.startsWith(typedDomain));
        const isExactMatch = matchedDomains.length === 1 && matchedDomains[0] === typedDomain;

        if (matchedDomains.length > 0 && !isExactMatch) {
            suggestionsContainer.style.display = 'flex';
            suggestionsContainer.innerHTML = ''; 

            matchedDomains.forEach(domain => {
                const pill = document.createElement('div');
                pill.innerText = domain;
                
                pill.style.background = 'rgba(255,255,255,0.08)';
                pill.style.color = 'var(--text-muted)';
                pill.style.padding = '8px 14px';
                pill.style.borderRadius = '50px';
                pill.style.fontSize = '0.85rem';
                pill.style.cursor = 'pointer';
                pill.style.border = '1px solid rgba(255,255,255,0.1)';
                pill.style.whiteSpace = 'nowrap';
                
                pill.onclick = function() {
                    window.safeHaptic('light');
                    inputEl.value = username + '@' + domain;
                    suggestionsContainer.style.display = 'none';
                    inputEl.focus(); 
                };
                
                suggestionsContainer.appendChild(pill);
            });
        } else {
            suggestionsContainer.style.display = 'none';
        }
    } else {
        suggestionsContainer.style.display = 'none';
    }
};

// --- 5. VALIDATION & FIREBASE SAVING ---
window.confirmWithdrawal = async function() {
    const accountInput = document.getElementById('checkout-account').value.trim();
    const methodInput = document.getElementById('checkout-method').value;

    if (!accountInput) {
        window.safeAlert("Please enter your account details.");
        return;
    }

    if (methodInput === 'Mobile') {
        const phoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
        if (!phoneRegex.test(accountInput)) {
            window.safeHaptic('error');
            window.safeAlert("Invalid number! Must be a valid 11-digit Bangladeshi number starting with 01.");
            return; 
        }
    } else if (methodInput === 'Email') {
        const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com', 'icloud.com'];
        const emailParts = accountInput.split('@');
        
        if (emailParts.length !== 2 || emailParts[0] === "") {
            window.safeHaptic('error');
            window.safeAlert("Invalid email format! Make sure you include the '@' symbol.");
            return; 
        }
        
        const domain = emailParts[1].toLowerCase();
        
        if (!allowedDomains.includes(domain)) {
            window.safeHaptic('error');
            window.safeAlert("Please use a valid email address. If your email is valid but not accepted, contact the admin.");
            return; 
        }
    }

    const success = await window.processTransaction(-window.pendingCheckout.price, null);
    
    if (success) {
        try {
            await window.db.collection('withdrawals').add({
                userId: window.currentUser.id,
                userName: window.currentUser.name,
                itemTitle: window.pendingCheckout.title,
                amount: window.pendingCheckout.price,
                methodType: methodInput,
                accountDetails: accountInput,
                status: 'Pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.safeHaptic('success');
            window.safeAlert(`Success! Your request for ${window.pendingCheckout.title} has been sent to the admin.`);
            
            document.getElementById('checkout-account').value = '';
            window.closeSubPage();
            
        } catch (error) {
            console.error("Failed to save withdrawal to Firebase:", error);
            window.safeAlert("Payment deducted, but request failed to log. Please contact admin.");
        }
    }
};