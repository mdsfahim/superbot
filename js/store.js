// ==========================================
// STORE, CHECKOUT & VALIDATION LOGIC
// ==========================================

// Global variable to remember what the user is trying to buy
window.pendingCheckout = { title: '', price: 0 };

// ==========================================
// STORE, CHECKOUT & VALIDATION LOGIC
// ==========================================

window.pendingCheckout = { title: '', price: 0 };
window.currentStoreCategory = 'All'; // Remembers what category we are viewing

// --- NEW: CATEGORY FILTER FUNCTION ---
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

// --- 1. RENDER STORE ITEMS (WITH SMART FILTERING) ---
window.renderStore = function(category = 'All') {
    const grid = document.getElementById('store-product-grid');
    if (!grid) return;

    // Immediately sync the balance card text when the page loads
    const storeBalanceEl = document.getElementById('store-page-balance');
    if (storeBalanceEl) storeBalanceEl.innerText = window.currentUser.balance.toLocaleString() + ' 🪙';

    const allItems = JSON.parse(localStorage.getItem('app_store_items')) || [];

    // --- THE SMART FILTER ENGINE ---
    let filteredItems = allItems;
    
    if (category !== 'All') {
        filteredItems = allItems.filter(item => {
            const title = item.title.toLowerCase();
            
            // If the admin explicitly saved a category, use it
            if (item.category && item.category === category) return true;

            // Otherwise, guess based on keywords in the title!
            if (category === 'Cash') return title.includes('bkash') || title.includes('nagad') || title.includes('rocket');
            if (category === 'Mobile') return title.includes('top-up') || title.includes('recharge') || title.includes('mb') || title.includes('gb');
            if (category === 'Crypto') return title.includes('binance') || title.includes('usdt') || title.includes('trx');
            
            return false;
        });
    }

    // Render logic
    if (filteredItems.length === 0) {
        grid.style.display = 'block';
        grid.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
                <p>No items found in ${category}.</p>
            </div>`;
        return;
    }

    // THE FIX: Force the 2-column layout and add the gap
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    grid.style.gap = '15px';
    
    let html = '';

    filteredItems.forEach(item => {
    
        let displayPrice = item.price >= 1000 ? (item.price / 1000) + 'k' : item.price;
        html += `
            <div class="store-product-card" onclick="window.openCheckout(${item.price}, '${item.title}')">
                <div class="product-image-wrapper" style="background: ${item.theme};">
                    <div class="product-icon">${item.icon}</div>
                </div>
                <div class="product-details">
                    <h4 class="product-title">${item.title}</h4>
                    <p class="product-subtitle">${item.subtitle}</p>
                    <div class="product-bottom">
                        <span class="product-price">${displayPrice} 🪙</span>
                        <button class="buy-btn">Buy</button>
                    </div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
};


// --- 2. OPEN CHECKOUT MENU ---
window.openCheckout = async function(price, title) {
    if (window.currentUser.balance < price) {
        window.safeHaptic('error');
        window.safeAlert(`Insufficient balance! You need ${price.toLocaleString()} 🪙.`);
        return; 
    }

    window.pendingCheckout.price = price;
    window.pendingCheckout.title = title;

    await window.openSubPage('withdraw', 'portal', 'Checkout');

    setTimeout(() => {
        const titleEl = document.getElementById('checkout-item-title');
        const priceEl = document.getElementById('checkout-item-price');
        if(titleEl) titleEl.innerText = title;
        if(priceEl) priceEl.innerText = price.toLocaleString() + ' 🪙';
    }, 100);
};

// --- 3. DYNAMIC CHECKOUT UI SWITCHER ---
window.updateCheckoutUI = function() {
    const method = document.getElementById('checkout-method').value;
    const label = document.getElementById('checkout-input-label');
    const input = document.getElementById('checkout-account');
    const suggestionsBox = document.getElementById('email-suggestions');

    // Hide suggestions and clear input when switching methods
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
    
    // Only run this if they are using the Email method
    if (method !== 'Email' || !suggestionsContainer) return;

    const val = inputEl.value;
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com', 'icloud.com'];

    // If they typed an '@', start showing suggestions
    if (val.includes('@')) {
        const parts = val.split('@');
        const username = parts[0];
        const typedDomain = parts[1].toLowerCase();

        // Find domains that start with whatever they typed after the '@'
        const matchedDomains = allowedDomains.filter(domain => domain.startsWith(typedDomain));
        
        // Hide if they already perfectly typed a domain, otherwise show matches
        const isExactMatch = matchedDomains.length === 1 && matchedDomains[0] === typedDomain;

        if (matchedDomains.length > 0 && !isExactMatch) {
            suggestionsContainer.style.display = 'flex';
            suggestionsContainer.innerHTML = ''; // Clear old pills

            // Create a pill for each matching domain
            matchedDomains.forEach(domain => {
                const pill = document.createElement('div');
                pill.innerText = domain;
                
                // Styling the pill to look premium
                pill.style.background = 'rgba(255,255,255,0.08)';
                pill.style.color = 'var(--text-muted)';
                pill.style.padding = '8px 14px';
                pill.style.borderRadius = '50px';
                pill.style.fontSize = '0.85rem';
                pill.style.cursor = 'pointer';
                pill.style.border = '1px solid rgba(255,255,255,0.1)';
                pill.style.whiteSpace = 'nowrap';
                
                // Add click animation and logic
                pill.onclick = function() {
                    window.safeHaptic('light');
                    inputEl.value = username + '@' + domain;
                    suggestionsContainer.style.display = 'none';
                    inputEl.focus(); // Keep their keyboard open
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

    // A. MOBILE NUMBER VALIDATION
    if (methodInput === 'Mobile') {
        const phoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
        
        if (!phoneRegex.test(accountInput)) {
            window.safeHaptic('error');
            window.safeAlert("Invalid number! Must be a valid 11-digit Bangladeshi number starting with 01 (e.g., 017... or +88017...).");
            return; // Stop the withdrawal!
        }
    } 
    
    // B. EMAIL DOMAIN VALIDATION
    else if (methodInput === 'Email') {
        const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com', 'icloud.com'];
        const emailParts = accountInput.split('@');
        
        if (emailParts.length !== 2 || emailParts[0] === "") {
            window.safeHaptic('error');
            window.safeAlert("Invalid email format! Make sure you include the '@' symbol.");
            return; // Stop the withdrawal!
        }
        
        const domain = emailParts[1].toLowerCase();
        
        if (!allowedDomains.includes(domain)) {
            window.safeHaptic('error');
            // NEW UPDATED MESSAGE HERE:
            window.safeAlert("Please use a valid email address. If your email is valid but not accepted, please contact the admin.");
            return; // Stop the withdrawal!
        }
    }

    // C. PROCESS THE TRANSACTION (Deduct Coins)
    const success = await window.processTransaction(-window.pendingCheckout.price, null);
    
    if (success) {
        try {
            // D. SAVE TO FIREBASE
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