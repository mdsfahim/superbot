// ==========================================
// DEPOSIT & TOP-UP LOGIC
// ==========================================

window.initDepositLogic = async function() {
    const list = document.getElementById('deposit-methods-list');
    if (!list) return;

    try {
        const snap = await window.db.collection('deposit_methods').get();
        
        if (snap.empty) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; width: 100%; grid-column: 1 / -1;">No payment methods available right now.</div>`;
            return;
        }

        window.depositMethodsCache = [];
        let html = '';
        
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            window.depositMethodsCache.push(data);

            // THE FIX: Check if the admin provided an image link or an emoji
            let iconDisplay = '';
            if (data.icon && data.icon.startsWith('http')) {
                iconDisplay = `<img src="${data.icon}" style="width: 40px; height: 40px; object-fit: contain; margin-bottom: 10px; border-radius: 8px;">`;
            } else {
                iconDisplay = `<div style="font-size: 2rem; margin-bottom: 10px;">${data.icon}</div>`;
            }

            html += `
                <div onclick="window.selectDepositMethod('${doc.id}')" class="deposit-method-card" id="method-card-${doc.id}" style="background: var(--surface-color); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center;">
                    ${iconDisplay}
                    <div style="font-weight: bold; font-size: 0.9rem;">${data.title}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 5px;">${data.currency}</div>
                </div>
            `;
        });
        
        list.innerHTML = html;

    } catch (error) {
        console.error(error);
        list.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 20px; width: 100%; grid-column: 1 / -1;">Failed to load methods.</div>`;
    }
};

window.selectDepositMethod = function(id) {
    // Highlight selected card
    document.querySelectorAll('.deposit-method-card').forEach(c => c.style.borderColor = 'rgba(255,255,255,0.05)');
    const selectedCard = document.getElementById(`method-card-${id}`);
    if(selectedCard) selectedCard.style.borderColor = 'var(--success)';

    // Find data
    const method = window.depositMethodsCache.find(m => m.id === id);
    if (!method) return;

    // Show form and populate data
    document.getElementById('deposit-form-section').style.display = 'block';
    document.getElementById('deposit-target-address').value = method.address;
    document.getElementById('deposit-instructions').innerText = method.instructions || "Send funds to the address below.";
    
    document.getElementById('deposit-method-id').value = method.id;
    document.getElementById('deposit-method-name').value = method.title;
};

window.copyDepositAddress = function() {
    const input = document.getElementById('deposit-target-address');
    input.select();
    input.setSelectionRange(0, 99999); 
    navigator.clipboard.writeText(input.value);
    window.safeAlert("Address copied to clipboard!");
};

window.submitDepositRequest = async function(e) {
    e.preventDefault();
    
    const methodName = document.getElementById('deposit-method-name').value;
    const amountSent = document.getElementById('deposit-amount-sent').value.trim();
    const trxId = document.getElementById('deposit-trx-id').value.trim();

    const btn = document.getElementById('deposit-submit-btn');
    btn.disabled = true;
    btn.innerText = "Submitting...";

    try {
        await window.db.collection('deposit_requests').add({
            userId: window.currentUser.id,
            userName: window.currentUser.name,
            method: methodName,
            amountSent: amountSent,
            trxId: trxId,
            status: 'Pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.safeHaptic('success');
        window.safeAlert("Deposit request sent! Admin will review and add coins to your balance shortly.");
        
        // Reset form
        e.target.reset();
        document.getElementById('deposit-form-section').style.display = 'none';
        document.querySelectorAll('.deposit-method-card').forEach(c => c.style.borderColor = 'rgba(255,255,255,0.05)');

        // 👉 THE NEW LOGGING COMMAND 👈
        // Note: Amount is set to 0 here because the coins haven't been approved yet!
        window.logTransaction('Deposit', 0, `Pending Deposit: ${methodName}`, '💳');

    } catch (error) {
        console.error(error);
        window.safeAlert("Failed to submit. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit for Approval";
    }
};