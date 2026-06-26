const API_BASE = '/api';

// Global state
let tenantId = localStorage.getItem('tenantId') || null;
let clinicCode = localStorage.getItem('clinicCode') || null;
let username = localStorage.getItem('username') || null;
let role = localStorage.getItem('role') || null;
let isDoctor = localStorage.getItem('isDoctor') === 'true';

let patientsCache = [];
let builderMedications = [];
let builderInvoiceItems = [];
let invoicePollers = new Map(); // Keep track of active invoice status pollers

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const sidebarNav = document.querySelector('.sidebar-nav');
const tabPanels = document.querySelectorAll('.tab-panel');
const tabTitle = document.getElementById('tab-title');
const currentTimeSpan = document.getElementById('current-time');
const notificationBanner = document.getElementById('notification-banner');
const notificationMessage = document.getElementById('notification-message');
const detailsModal = document.getElementById('details-modal');
const modalBody = document.getElementById('modal-body');
const modalTitle = document.getElementById('modal-title');
const closeModalBtn = document.querySelector('.close-modal');

// Display Profile info
const displayTenantId = document.getElementById('display-tenant-id');
const displayUsername = document.getElementById('display-username');
const displayRole = document.getElementById('display-role');
const btnCopyTenant = document.getElementById('btn-copy-tenant');
const btnLogout = document.getElementById('btn-logout');

// Helper to read cookies
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    setInterval(updateTime, 1000);
    
    setupAuthToggle();
    setupTabRouting();
    setupForms();
    setupAutocomplete();
    setupInvoiceBuilder();
    setupPrescriptionBuilder();
    
    // Copy clinic code click listener
    btnCopyTenant.addEventListener('click', () => {
        if (clinicCode) {
            navigator.clipboard.writeText(clinicCode);
            showNotification('Clinic code copied to clipboard!', 'success');
        }
    });

    btnLogout.addEventListener('click', logout);
    closeModalBtn.addEventListener('click', hideModal);

    // Close modal when clicking background
    window.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            hideModal();
        }
    });

    // Check if session exists on load
    if (username && clinicCode) {
        initializeDashboard();
    } else {
        showAuth();
    }
});

function updateTime() {
    const now = new Date();
    currentTimeSpan.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Intercept fetch calls to inject CSRF tokens
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Attach CSRF header on state-modifying requests
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken && method !== 'GET') {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }
    
    const config = { method, headers, credentials: 'same-origin' };
    if (body) {
        config.body = JSON.stringify(body);
    }
    
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (res.status === 401) {
        // 401 = authentication failure / token expired → force re-login
        if (username) {
            showNotification('Session expired. Please sign in again.', 'error');
            setTimeout(logout, 1500);
            return null;
        }
    }
    
    if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errData.message || 'API request failed');
    }
    
    if (res.status === 204) return null;
    return res.json().catch(() => null);
}


/* Authentication Views Logic */
function setupAuthToggle() {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    });
}

function showAuth() {
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
}

function initializeDashboard() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    displayTenantId.textContent = clinicCode;
    displayUsername.textContent = username;
    displayRole.textContent = role;

    // Reset visibility of restricted tabs
    const prescriptionTabNav = document.querySelector('[data-tab="prescriptions-tab"]');
    const settingsTabNav = document.querySelector('[data-tab="settings-tab"]');

    // 1. Only Doctors (or users flagged as doctors) can see Prescriptions
    if (role === 'DOCTOR' || isDoctor) {
        prescriptionTabNav.classList.remove('hidden');
    } else {
        prescriptionTabNav.classList.add('hidden');
    }

    // 2. Only Admins can manage and enroll Clinic Staff
    if (role === 'ADMIN') {
        settingsTabNav.classList.remove('hidden');
    } else {
        settingsTabNav.classList.add('hidden');
    }

    // Warm up the XSRF-TOKEN cookie with a GET so subsequent POSTs have a valid CSRF token
    fetch('/api/patients', { method: 'GET', credentials: 'same-origin' }).catch(() => {});

    // Load active tab data
    switchTab('patients-tab');
}


async function logout() {
    // Clear status pollers
    invoicePollers.forEach(poller => clearInterval(poller));
    invoicePollers.clear();

    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
            }
        });
    } catch (e) {
        // Ignored
    }

    localStorage.clear();
    tenantId = null;
    clinicCode = null;
    username = null;
    role = null;
    isDoctor = false;
    showAuth();
}

/* UI Tab Switching Routing */
function setupTabRouting() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    tabPanels.forEach(panel => panel.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Update headers and load lists
    if (tabId === 'patients-tab') {
        tabTitle.textContent = 'Patients Directory';
        loadPatients();
    } else if (tabId === 'prescriptions-tab') {
        tabTitle.textContent = 'Digital Prescriptions';
        loadPatientsDropdowns();
        loadPrescriptions();
    } else if (tabId === 'billing-tab') {
        tabTitle.textContent = 'Clinic Billing ledger';
        loadPatientsDropdowns();
        loadInvoices();
    } else if (tabId === 'settings-tab') {
        tabTitle.textContent = 'Clinic Operations & Staff';
    }
}

/* Dynamic List Loaders */
async function loadPatients() {
    try {
        const patients = await apiCall('/patients');
        patientsCache = patients || [];
        renderPatients(patientsCache);
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

function renderPatients(patients) {
    const listContainer = document.getElementById('patients-list');
    listContainer.innerHTML = '';
    
    if (patients.length === 0) {
        listContainer.innerHTML = '<div class="no-data">No patients registered in this clinic.</div>';
        return;
    }

    patients.forEach(pat => {
        const dob = pat.dateOfBirth ? pat.dateOfBirth : 'N/A';
        const card = document.createElement('div');
        card.className = 'data-card glass';
        card.innerHTML = `
            <div class="data-card-header">
                <h3><i class="fa-solid fa-user-injured accent-color"></i> ${escapeHtml(pat.name)}</h3>
                <span class="badge badge-role">${escapeHtml(pat.gender || 'N/A')}</span>
            </div>
            <div class="data-card-body">
                <p><strong>Phone:</strong> ${escapeHtml(pat.phone)}</p>
                <p><strong>Email:</strong> ${escapeHtml(pat.email || 'N/A')}</p>
                <p><strong>DOB:</strong> ${dob}</p>
                <p><strong>Consent Active:</strong> ${new Date(pat.consentGivenAt).toLocaleString()}</p>
            </div>
        `;
        card.addEventListener('click', () => showPatientDetails(pat));
        listContainer.appendChild(card);
    });
}

async function loadPrescriptions() {
    try {
        const prescriptions = await apiCall('/prescriptions/patient/' + document.getElementById('pres-patient-id').value);
        renderPrescriptions(prescriptions || []);
    } catch (e) {
        // If empty patient selected, or search fails, load all prescriptions if possible
        // Spring RLS will protect it. We can just list if patient selection is valid.
        const patientId = document.getElementById('pres-patient-id').value;
        if (patientId) {
            showNotification(e.message, 'error');
        } else {
            renderPrescriptions([]);
        }
    }
}

async function loadAllPrescriptionsForSelectedPatient() {
    const patientId = document.getElementById('pres-patient-id').value;
    if (!patientId) {
        renderPrescriptions([]);
        return;
    }
    try {
        const prescriptions = await apiCall('/prescriptions/patient/' + patientId);
        renderPrescriptions(prescriptions || []);
    } catch (e) {
        renderPrescriptions([]);
    }
}

function renderPrescriptions(prescriptions) {
    const listContainer = document.getElementById('prescriptions-list');
    listContainer.innerHTML = '';
    
    if (prescriptions.length === 0) {
        listContainer.innerHTML = '<div class="no-data">Select a patient above to view their prescription history.</div>';
        return;
    }

    prescriptions.forEach(p => {
        const date = new Date(p.createdAt).toLocaleDateString();
        const card = document.createElement('div');
        card.className = 'data-card glass';
        card.innerHTML = `
            <div class="data-card-header">
                <h3>Prescription</h3>
                <span class="time-stamp">${date}</span>
            </div>
            <div class="data-card-body">
                <p><strong>Doctor:</strong> ${escapeHtml(p.doctorUsername)}</p>
                <p><strong>Diagnosis:</strong> ${escapeHtml(p.diagnosis || 'None')}</p>
                <p><strong>Meds Count:</strong> ${p.items.length}</p>
            </div>
        `;
        card.addEventListener('click', () => showPrescriptionDetails(p));
        listContainer.appendChild(card);
    });
}

async function loadInvoices() {
    // The backend has POST /api/invoices and GET /api/invoices/{id} but no list-all endpoint.
    // Invoices generated in this session are kept in the local sessionInvoices array and polled for status.
    renderLocalInvoices();
}

let sessionInvoices = [];

function renderLocalInvoices() {
    const listContainer = document.getElementById('invoices-list');
    listContainer.innerHTML = '';
    
    if (sessionInvoices.length === 0) {
        listContainer.innerHTML = '<div class="no-data">No invoices generated in this session yet.</div>';
        return;
    }

    sessionInvoices.forEach(inv => {
        const date = new Date(inv.createdAt).toLocaleDateString();
        let deliveryBadge = `<span class="badge badge-pending">PENDING</span>`;
        if (inv.deliveryStatus === 'DELIVERED') {
            deliveryBadge = `<span class="badge badge-delivered">DELIVERED</span>`;
        } else if (inv.deliveryStatus === 'FAILED') {
            deliveryBadge = `<span class="badge badge-failed">FAILED</span>`;
        }

        const card = document.createElement('div');
        card.className = 'data-card glass';
        card.innerHTML = `
            <div class="data-card-header">
                <h3>${escapeHtml(inv.invoiceNumber)}</h3>
                ${deliveryBadge}
            </div>
            <div class="data-card-body">
                <p><strong>Total Amount:</strong> INR ${inv.totalAmount.toFixed(2)}</p>
                <p><strong>Payment Status:</strong> <span class="badge badge-role">${inv.status}</span></p>
                <p><strong>Created:</strong> ${date}</p>
            </div>
        `;
        card.addEventListener('click', () => showInvoiceDetails(inv));
        listContainer.appendChild(card);
    });
}

// Polling background worker updates
function startInvoicePolling(invoiceId) {
    if (invoicePollers.has(invoiceId)) return;
    
    const interval = setInterval(async () => {
        try {
            const updatedInv = await apiCall(`/invoices/${invoiceId}`);
            if (updatedInv) {
                // Update local session list
                const idx = sessionInvoices.findIndex(i => i.id === invoiceId);
                if (idx !== -1) {
                    sessionInvoices[idx] = updatedInv;
                    renderLocalInvoices();
                    
                    // If processing completed (either DELIVERED or FAILED), stop polling
                    if (updatedInv.deliveryStatus === 'DELIVERED' || updatedInv.deliveryStatus === 'FAILED') {
                        clearInterval(interval);
                        invoicePollers.delete(invoiceId);
                        showNotification(`Invoice ${updatedInv.invoiceNumber} async delivery status: ${updatedInv.deliveryStatus}!`, 'success');
                    }
                }
            }
        } catch (e) {
            console.error("Error polling invoice", e);
        }
    }, 2000); // Poll every 2 seconds
    
    invoicePollers.set(invoiceId, interval);
}

/* Dropdown loaders */
function loadPatientsDropdowns() {
    const dropdowns = [
        document.getElementById('pres-patient-id'),
        document.getElementById('inv-patient-id')
    ];
    
    dropdowns.forEach(drop => {
        const val = drop.value;
        drop.innerHTML = '<option value="">Select Patient</option>';
        patientsCache.forEach(pat => {
            const opt = document.createElement('option');
            opt.value = pat.id;
            opt.textContent = `${pat.name} (${pat.phone})`;
            drop.appendChild(opt);
        });
        drop.value = val;
    });
}

/* Detail View Modal Popups */
function showModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    detailsModal.classList.remove('hidden');
}

function hideModal() {
    detailsModal.classList.add('hidden');
}

function showPatientDetails(pat) {
    const html = `
        <div class="modal-section">
            <div class="modal-section-title">Demographics</div>
            <p><strong>Name:</strong> ${escapeHtml(pat.name)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(pat.phone)}</p>
            <p><strong>Email:</strong> ${escapeHtml(pat.email || 'N/A')}</p>
            <p><strong>DOB:</strong> ${pat.dateOfBirth || 'N/A'}</p>
            <p><strong>Gender:</strong> ${escapeHtml(pat.gender || 'N/A')}</p>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">Consent Logs</div>
            <p><strong>Consent Provided:</strong> Yes (India DPDP rules checked)</p>
            <p><strong>Consent Timestamp:</strong> ${new Date(pat.consentGivenAt).toLocaleString()}</p>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">Contact Address</div>
            <p>${escapeHtml(pat.street || '')}</p>
            <p>${escapeHtml(pat.city || '')}, ${escapeHtml(pat.state || '')} - ${escapeHtml(pat.postalCode || '')}</p>
        </div>
    `;
    showModal('Patient Details', html);
}

function showPrescriptionDetails(p) {
    const patientName = patientsCache.find(pat => pat.id === p.patientId)?.name || 'Patient';
    let itemsHtml = '';
    p.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td><strong>${escapeHtml(item.medicineName)}</strong></td>
                <td>${escapeHtml(item.dosage || 'N/A')}</td>
                <td>${escapeHtml(item.frequency || 'N/A')}</td>
                <td>${escapeHtml(item.duration || 'N/A')}</td>
            </tr>
        `;
    });

    const html = `
        <div class="modal-section">
            <div class="modal-section-title">Metadata</div>
            <p><strong>Patient Name:</strong> ${escapeHtml(patientName)}</p>
            <p><strong>Prescribing Doctor:</strong> ${escapeHtml(p.doctorUsername)}</p>
            <p><strong>Date:</strong> ${new Date(p.createdAt).toLocaleString()}</p>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">Clinical Findings</div>
            <p><strong>Diagnosis:</strong> ${escapeHtml(p.diagnosis || 'N/A')}</p>
            <p><strong>Consultation Notes:</strong> ${escapeHtml(p.consultationNotes || 'N/A')}</p>
        </div>
        <div class="modal-section">
            <div class="modal-section-title">Medication Items</div>
            <table class="builder-table">
                <thead>
                    <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Freq</th>
                        <th>Dur</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>
    `;
    showModal('Prescription Details', html);
}

function showInvoiceDetails(inv) {
    const patientName = patientsCache.find(pat => pat.id === inv.patientId)?.name || 'Patient';
    let linesHtml = '';
    inv.items.forEach(item => {
        linesHtml += `
            <tr>
                <td>${escapeHtml(item.itemName)}</td>
                <td>${item.quantity}</td>
                <td>INR ${item.unitPrice.toFixed(2)}</td>
                <td>INR ${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
        `;
    });

    const pdfLink = inv.pdfUrl ? `<p><strong>PDF Bill Document:</strong> <a href="${inv.pdfUrl}" target="_blank" class="accent-color">Open Pre-signed PDF Link <i class="fa-solid fa-arrow-up-right-from-square"></i></a></p>` : '';

    const html = `
        <div class="modal-section">
            <div class="modal-section-title">Ledger</div>
            <p><strong>Invoice Number:</strong> ${escapeHtml(inv.invoiceNumber)}</p>
            <p><strong>Patient Name:</strong> ${escapeHtml(patientName)}</p>
            <p><strong>Billing Status:</strong> ${escapeHtml(inv.status)}</p>
            <p><strong>WhatsApp Delivery Status:</strong> ${escapeHtml(inv.deliveryStatus)}</p>
            <p><strong>Created At:</strong> ${new Date(inv.createdAt).toLocaleString()}</p>
            ${pdfLink}
        </div>
        <div class="modal-section">
            <div class="modal-section-title">Invoice Lines</div>
            <table class="builder-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${linesHtml}
                </tbody>
            </table>
            <p style="text-align: right; margin-top: 10px; font-weight: 600; font-size: 1rem;">Total Amount: INR ${inv.totalAmount.toFixed(2)}</p>
        </div>
    `;
    showModal('Invoice Details', html);
}

/* Autocomplete search catalog */
function setupAutocomplete() {
    const input = document.getElementById('builder-med-name');
    const dropdown = document.getElementById('med-autocomplete-dropdown');
    
    input.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }

        try {
            const results = await apiCall(`/prescriptions/medicines/search?query=${encodeURIComponent(query)}`);
            renderAutocomplete(results || []);
        } catch (e) {
            dropdown.classList.add('hidden');
        }
    }, 250));

    // Hide dropdown when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.classList.add('hidden');
        }
    });
}

function renderAutocomplete(results) {
    const dropdown = document.getElementById('med-autocomplete-dropdown');
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item text-muted">No catalog matches. Free text entry will be logged.</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    results.forEach(med => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            ${escapeHtml(med.name)}
            <span class="generic-desc">${escapeHtml(med.genericComposition || '')} - ${escapeHtml(med.dosageForm || '')}</span>
        `;
        item.addEventListener('click', () => {
            document.getElementById('builder-med-name').value = med.name;
            dropdown.classList.add('hidden');
        });
        dropdown.appendChild(item);
    });
    
    dropdown.classList.remove('hidden');
}

/* Builder tables functions */
function setupPrescriptionBuilder() {
    const btnAdd = document.getElementById('btn-add-medication');
    const tbody = document.getElementById('builder-med-list');
    
    btnAdd.addEventListener('click', () => {
        const name = document.getElementById('builder-med-name').value.trim();
        const dosage = document.getElementById('builder-med-dosage').value.trim();
        const freq = document.getElementById('builder-med-freq').value.trim();
        const dur = document.getElementById('builder-med-dur').value.trim();

        if (!name) {
            showNotification('Medicine name is required', 'warning');
            return;
        }

        const medication = { medicineName: name, dosage, frequency: freq, duration: dur };
        builderMedications.push(medication);
        
        renderMedicationsBuilder();

        // Clear input row
        document.getElementById('builder-med-name').value = '';
        document.getElementById('builder-med-dosage').value = '';
        document.getElementById('builder-med-freq').value = '';
        document.getElementById('builder-med-dur').value = '';
    });

    document.getElementById('pres-patient-id').addEventListener('change', loadAllPrescriptionsForSelectedPatient);
}

function renderMedicationsBuilder() {
    const tbody = document.getElementById('builder-med-list');
    tbody.innerHTML = '';

    builderMedications.forEach((med, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(med.medicineName)}</strong></td>
            <td>${escapeHtml(med.dosage || 'N/A')}</td>
            <td>${escapeHtml(med.frequency || 'N/A')}</td>
            <td>${escapeHtml(med.duration || 'N/A')}</td>
            <td><button type="button" class="btn-remove-item" onclick="removeMedicationFromBuilder(${idx})"><i class="fa-solid fa-trash-can"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.removeMedicationFromBuilder = function(idx) {
    builderMedications.splice(idx, 1);
    renderMedicationsBuilder();
};

function setupInvoiceBuilder() {
    const btnAdd = document.getElementById('btn-add-billable');
    
    btnAdd.addEventListener('click', () => {
        const name = document.getElementById('builder-inv-name').value.trim();
        const qty = parseInt(document.getElementById('builder-inv-qty').value);
        const price = parseFloat(document.getElementById('builder-inv-price').value);

        if (!name || isNaN(qty) || qty < 1 || isNaN(price) || price < 0) {
            showNotification('Valid item name, quantity, and unit price are required', 'warning');
            return;
        }

        const item = { itemName: name, quantity: qty, unitPrice: price };
        builderInvoiceItems.push(item);
        
        renderInvoiceBuilder();

        // Clear row
        document.getElementById('builder-inv-name').value = '';
        document.getElementById('builder-inv-qty').value = '1';
        document.getElementById('builder-inv-price').value = '';
    });
}

function renderInvoiceBuilder() {
    const tbody = document.getElementById('builder-inv-list');
    tbody.innerHTML = '';

    builderInvoiceItems.forEach((item, idx) => {
        const total = item.quantity * item.unitPrice;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.itemName)}</td>
            <td>${item.quantity}</td>
            <td>INR ${item.unitPrice.toFixed(2)}</td>
            <td>INR ${total.toFixed(2)}</td>
            <td><button type="button" class="btn-remove-item" onclick="removeInvoiceItemFromBuilder(${idx})"><i class="fa-solid fa-trash-can"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.removeInvoiceItemFromBuilder = function(idx) {
    builderInvoiceItems.splice(idx, 1);
    renderInvoiceBuilder();
};

/* Form Submission Actions */
function setupForms() {
    // 1. LOGIN
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('login-username').value.trim(),
            password: document.getElementById('login-password').value,
            clinicCode: document.getElementById('login-clinic-code').value.trim()
        };

        try {
            const data = await apiCall('/auth/login', 'POST', payload);
            if (data) {
                tenantId = data.tenantId;
                clinicCode = data.clinicCode;
                username = data.username;
                role = data.role;
                isDoctor = data.isDoctor;

                localStorage.setItem('tenantId', tenantId);
                localStorage.setItem('clinicCode', clinicCode);
                localStorage.setItem('username', username);
                localStorage.setItem('role', role);
                localStorage.setItem('isDoctor', isDoctor);

                showNotification('Signed in successfully!', 'success');
                initializeDashboard();
                loginForm.reset();
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // 2. TENANT REGISTRATION
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('reg-username').value.trim(),
            password: document.getElementById('reg-password').value,
            email: document.getElementById('reg-email').value.trim(),
            fullName: document.getElementById('reg-fullname').value.trim(),
            clinicName: document.getElementById('reg-clinic-name').value.trim()
        };

        try {
            const data = await apiCall('/auth/register', 'POST', payload);
            if (data) {
                // Autologin after registration
                tenantId = data.tenantId;
                clinicCode = data.clinicCode;
                username = data.username;
                role = data.role;
                isDoctor = data.isDoctor;

                localStorage.setItem('tenantId', tenantId);
                localStorage.setItem('clinicCode', clinicCode);
                localStorage.setItem('username', username);
                localStorage.setItem('role', role);
                localStorage.setItem('isDoctor', isDoctor);

                // Show clinic info alert
                showModal('Registration Successful', `
                    <div style="text-align: center;">
                        <i class="fa-solid fa-circle-check accent-color" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h3 style="margin-bottom: 15px;">Your Clinic has been registered!</h3>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">
                            Copy this **Clinic Code** and share it with your staff. They will need it during login.
                        </p>
                        <div class="tenant-badge" style="display: block; width: 100%; text-align: center; font-size: 1.1rem; font-family: monospace;">
                            <strong>${clinicCode}</strong>
                        </div>
                    </div>
                `);

                initializeDashboard();
                registerForm.reset();
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // 3. PATIENT ENROLLMENT
    document.getElementById('patient-registration-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('pat-name').value.trim(),
            phone: document.getElementById('pat-phone').value.trim(),
            email: document.getElementById('pat-email').value.trim(),
            dateOfBirth: document.getElementById('pat-dob').value || null,
            gender: document.getElementById('pat-gender').value || null,
            street: document.getElementById('pat-street').value.trim() || null,
            city: document.getElementById('pat-city').value.trim() || null,
            state: document.getElementById('pat-state').value.trim() || null,
            postalCode: document.getElementById('pat-postal').value.trim() || null,
            consentGiven: document.getElementById('pat-consent').checked
        };

        try {
            const pat = await apiCall('/patients', 'POST', payload);
            if (pat) {
                showNotification('Patient registered successfully!', 'success');
                document.getElementById('patient-registration-form').reset();
                loadPatients();
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // 4. PRESCRIPTION GENERATION
    document.getElementById('prescription-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('pres-patient-id').value;
        const diagnosis = document.getElementById('pres-diagnosis').value.trim();
        const consultationNotes = document.getElementById('pres-notes').value.trim();

        if (builderMedications.length === 0) {
            showNotification('Prescription must contain at least one medication', 'warning');
            return;
        }

        const payload = {
            patientId,
            diagnosis,
            consultationNotes,
            items: builderMedications
        };

        try {
            const data = await apiCall('/prescriptions', 'POST', payload);
            if (data) {
                showNotification('Prescription written and logged!', 'success');
                document.getElementById('prescription-form').reset();
                builderMedications = [];
                renderMedicationsBuilder();
                loadPrescriptions();
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // 5. INVOICE GENERATION
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('inv-patient-id').value;
        const paymentMethod = document.getElementById('inv-payment-method').value || null;

        if (builderInvoiceItems.length === 0) {
            showNotification('Invoice must contain at least one line item', 'warning');
            return;
        }

        const payload = {
            patientId,
            paymentMethod,
            items: builderInvoiceItems
        };

        try {
            const data = await apiCall('/invoices', 'POST', payload);
            if (data) {
                showNotification('Invoice created! Async delivery enqueued in background.', 'success');
                document.getElementById('invoice-form').reset();
                builderInvoiceItems = [];
                renderInvoiceBuilder();
                
                // Add to local session ledger and trigger polling to watch status transitions
                sessionInvoices.unshift(data);
                renderLocalInvoices();
                startInvoicePolling(data.id);
            }
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // 6. ENROLL CLINIC STAFF (SETTINGS)
    document.getElementById('enroll-staff-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('staff-username').value.trim(),
            password: document.getElementById('staff-password').value,
            fullName: document.getElementById('staff-fullname').value.trim(),
            email: document.getElementById('staff-email').value.trim(),
            role: document.getElementById('staff-role').value,
            isDoctor: document.getElementById('staff-is-doctor').checked
        };

        try {
            await apiCall('/auth/users', 'POST', payload);
            showNotification('Staff enrolled successfully under this clinic!', 'success');
            document.getElementById('enroll-staff-form').reset();
        } catch (err) {
            showNotification(err.message, 'error');
        }
    });

    // Patient Search filter input
    document.getElementById('patient-search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = patientsCache.filter(pat => 
            pat.name.toLowerCase().includes(query) || 
            pat.phone.includes(query) || 
            (pat.email && pat.email.toLowerCase().includes(query))
        );
        renderPatients(filtered);
    });
}

/* Helper functions */
function showNotification(message, type = 'info') {
    notificationMessage.textContent = message;
    
    // Clear styles
    notificationBanner.className = 'notification-banner';
    notificationBanner.classList.add(type);
    notificationBanner.classList.remove('hidden');

    setTimeout(() => {
        notificationBanner.classList.add('hidden');
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
