// Storage Manager
class StorageManager {
    constructor() {
        this.storageKey = 'mechShopData';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                jobs: [],
                equipment: [],
                parts: [],
                clients: [],
                invoices: [],
                crew: [],
                timeEntries: [],
                activity: [],
                invitations: []
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    addActivity(message) {
        const data = this.getData();
        data.activity.unshift({
            id: Date.now(),
            message,
            timestamp: new Date().toISOString()
        });
        // Keep only last 20 activities
        data.activity = data.activity.slice(0, 20);
        this.saveData(data);
    }
}

// App Manager
class MechShopApp {
    constructor() {
        this.storage = new StorageManager();
        this.currentView = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupInstallButton();
        this.setupModals();
        this.setupInvitationManagement();
        this.checkCrewMode();
        this.updateDashboard();
        this.renderAllViews();
    }

    checkCrewMode() {
        // Check if crew member is logged in and restore restricted mode
        const isCrewMode = sessionStorage.getItem('isCrewMode') === 'true';
        if (isCrewMode) {
            document.querySelector('.main-nav').style.display = 'none';
            document.querySelector('.crew-mode-selector').style.display = 'none';
            
            // Show crew view
            this.switchView('crew');
            document.getElementById('crewLogin').style.display = 'block';
            document.querySelector('.crew-login-container').style.display = 'none';
            document.getElementById('crewDashboard').style.display = 'block';
            
            // Update crew info
            const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
            const data = this.storage.getData();
            const crew = data.crew.find(c => c.id === crewId);
            if (crew) {
                document.getElementById('crewWelcome').textContent = `Welcome, ${crew.name}`;
                this.updateCrewStatus();
                this.updateCrewJobList();
                this.updateCrewTodayLog();
            }
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const viewName = btn.dataset.view;
                this.switchView(viewName);
            });
        });
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === viewName);
        });

        this.currentView = viewName;
        
        // Render the view
        if (viewName === 'dashboard') {
            this.updateDashboard();
        } else if (viewName === 'jobs') {
            this.renderJobs();
        } else if (viewName === 'clients') {
            this.renderClients();
        } else if (viewName === 'equipment') {
            this.renderEquipment();
        } else if (viewName === 'parts') {
            this.renderParts();
        } else if (viewName === 'crew') {
            this.renderCrew();
        } else if (viewName === 'invoices') {
            this.renderInvoices();
        }
    }

    setupInstallButton() {
        let deferredPrompt;
        const installBtn = document.getElementById('installBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
        });

        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    setupModals() {
        const modal = document.getElementById('modal');
        const closeBtn = document.querySelector('.close');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // Add button listeners
        document.getElementById('addJobBtn').addEventListener('click', () => this.showJobModal());
        document.getElementById('addClientBtn').addEventListener('click', () => this.showClientModal());
        document.getElementById('addEquipmentBtn').addEventListener('click', () => this.showEquipmentModal());
        document.getElementById('addPartBtn').addEventListener('click', () => this.showPartModal());
        document.getElementById('addCrewBtn').addEventListener('click', () => this.showCrewModal());
        document.getElementById('addInvoiceBtn').addEventListener('click', () => this.showInvoiceModal());

        // Setup crew mode selector
        this.setupCrewModeSelector();

        // Setup search and filters
        this.setupSearch('jobSearch', 'jobStatusFilter', 'jobs');
        this.setupSearch('equipmentSearch', 'equipmentTypeFilter', 'equipment');
        this.setupSearch('partsSearch', 'partsStockFilter', 'parts');
        this.setupSearch('clientSearch', null, 'clients');
        this.setupSearch('crewSearch', 'crewStatusFilter', 'crew');
        this.setupSearch('invoiceSearch', 'invoiceStatusFilter', 'invoices');
    }

    setupSearch(searchId, filterId, type) {
        const searchInput = document.getElementById(searchId);
        const filterSelect = filterId ? document.getElementById(filterId) : null;

        searchInput?.addEventListener('input', () => this.filterItems(type));
        filterSelect?.addEventListener('change', () => this.filterItems(type));
    }

    filterItems(type) {
        const searchId = `${type}Search`;
        const filterId = type === 'jobs' ? 'jobStatusFilter' : 
                        type === 'equipment' ? 'equipmentTypeFilter' : 
                        type === 'parts' ? 'partsStockFilter' :
                        type === 'crew' ? 'crewStatusFilter' :
                        type === 'invoices' ? 'invoiceStatusFilter' : null;
        
        const searchTerm = document.getElementById(searchId).value.toLowerCase();
        const filterValue = filterId ? document.getElementById(filterId).value : null;

        if (type === 'jobs') this.renderJobs(searchTerm, filterValue);
        else if (type === 'clients') this.renderClients(searchTerm);
        else if (type === 'equipment') this.renderEquipment(searchTerm, filterValue);
        else if (type === 'parts') this.renderParts(searchTerm, filterValue);
        else if (type === 'crew') this.renderCrew(searchTerm, filterValue);
        else if (type === 'invoices') this.renderInvoices(searchTerm, filterValue);
    }

    updateDashboard() {
        const data = this.storage.getData();
        
        // Update counts
        const activeJobs = data.jobs.filter(j => j.status === 'in-progress').length;
        const pendingJobs = data.jobs.filter(j => j.status === 'pending').length;
        
        document.getElementById('activeJobsCount').textContent = activeJobs;
        document.getElementById('pendingJobsCount').textContent = pendingJobs;
        document.getElementById('equipmentCount').textContent = data.equipment.length;
        document.getElementById('partsCount').textContent = data.parts.length;

        // Update recent activity
        const activityList = document.getElementById('recentActivityList');
        if (data.activity.length === 0) {
            activityList.innerHTML = '<li>No recent activity</li>';
        } else {
            activityList.innerHTML = data.activity.slice(0, 10).map(a => {
                const date = new Date(a.timestamp);
                return `<li><strong>${date.toLocaleString()}</strong>: ${a.message}</li>`;
            }).join('');
        }
    }

    // Client Methods
    renderClients(searchTerm = '') {
        const data = this.storage.getData();
        let clients = data.clients;

        // Apply search - search by name, phone, email, or any VIN
        if (searchTerm) {
            clients = clients.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.phone.toLowerCase().includes(searchTerm) ||
                c.email.toLowerCase().includes(searchTerm) ||
                c.equipment.some(e => e.vin.toLowerCase().includes(searchTerm))
            );
        }

        const clientsList = document.getElementById('clientsList');
        
        if (clients.length === 0) {
            clientsList.innerHTML = '<div class="empty-state"><p>No clients found. Click "+ New Client" to add one.</p></div>';
            return;
        }

        clientsList.innerHTML = clients.map(client => `
            <div class="client-card">
                <div class="client-header">
                    <h3 class="client-name">${client.name}</h3>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="app.editClient(${client.id})">Edit</button>
                        <button class="btn-delete" onclick="app.deleteClient(${client.id})">Delete</button>
                    </div>
                </div>
                <div class="client-contact">
                    <div class="contact-item">
                        <span class="contact-label">Phone</span>
                        <span class="contact-value">${client.phone}</span>
                    </div>
                    <div class="contact-item">
                        <span class="contact-label">Email</span>
                        <span class="contact-value">${client.email}</span>
                    </div>
                    <div class="contact-item">
                        <span class="contact-label">Company</span>
                        <span class="contact-value">${client.company || 'N/A'}</span>
                    </div>
                </div>
                ${client.address ? `
                <div class="item-details">
                    <div class="item-detail"><strong>Address:</strong> <span>${client.address}</span></div>
                </div>
                ` : ''}
                ${client.equipment && client.equipment.length > 0 ? `
                <div class="equipment-list">
                    <h4>Equipment Units (${client.equipment.length})</h4>
                    ${client.equipment.map(eq => `
                        <div class="equipment-item">
                            <div class="equipment-info">
                                <div class="equipment-vin">VIN: ${eq.vin}</div>
                                <div class="equipment-details">${eq.year} ${eq.make} ${eq.model} - ${eq.type}</div>
                            </div>
                            <button class="btn-history" onclick="app.showServiceHistory('${eq.vin}')">Service History</button>
                        </div>
                    `).join('')}
                </div>
                ` : '<div class="empty-state"><p>No equipment registered for this client</p></div>'}
            </div>
        `).join('');
    }

    showClientModal(client = null) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        const equipmentHtml = client?.equipment?.map((eq, index) => `
            <div class="form-group" style="border: 1px solid #ddd; padding: 1rem; border-radius: 5px; margin-bottom: 1rem;">
                <h4>Unit ${index + 1} <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remove</button></h4>
                <div class="form-row">
                    <div>
                        <label>VIN</label>
                        <input type="text" class="equipment-vin" value="${eq.vin}" required>
                    </div>
                    <div>
                        <label>Year</label>
                        <input type="number" class="equipment-year" value="${eq.year}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div>
                        <label>Make</label>
                        <input type="text" class="equipment-make" value="${eq.make}" required>
                    </div>
                    <div>
                        <label>Model</label>
                        <input type="text" class="equipment-model" value="${eq.model}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select class="equipment-type" required>
                        <option value="Truck" ${eq.type === 'Truck' ? 'selected' : ''}>Truck</option>
                        <option value="Excavator" ${eq.type === 'Excavator' ? 'selected' : ''}>Excavator</option>
                        <option value="Loader" ${eq.type === 'Loader' ? 'selected' : ''}>Loader</option>
                        <option value="Dozer" ${eq.type === 'Dozer' ? 'selected' : ''}>Dozer</option>
                        <option value="Other" ${eq.type === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
        `).join('') || '';
        
        modalBody.innerHTML = `
            <h2>${client ? 'Edit Client' : 'New Client'}</h2>
            <form id="clientForm">
                <div class="invoice-section">
                    <h3>Client Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="clientName">Client Name *</label>
                            <input type="text" id="clientName" value="${client?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="clientCompany">Company</label>
                            <input type="text" id="clientCompany" value="${client?.company || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="clientPhone">Phone *</label>
                            <input type="tel" id="clientPhone" value="${client?.phone || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="clientEmail">Email</label>
                            <input type="email" id="clientEmail" value="${client?.email || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="clientAddress">Address</label>
                        <textarea id="clientAddress">${client?.address || ''}</textarea>
                    </div>
                </div>
                <div class="invoice-section">
                    <h3>Equipment/Vehicles</h3>
                    <div id="equipmentContainer">
                        ${equipmentHtml}
                    </div>
                    <button type="button" class="btn-add-line" onclick="app.addEquipmentToClient()">+ Add Equipment</button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${client ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;

        document.getElementById('clientForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClient(client?.id);
        });

        modal.classList.add('active');
    }

    addEquipmentToClient() {
        const container = document.getElementById('equipmentContainer');
        const count = container.children.length + 1;
        const equipmentDiv = document.createElement('div');
        equipmentDiv.className = 'form-group';
        equipmentDiv.style.cssText = 'border: 1px solid #ddd; padding: 1rem; border-radius: 5px; margin-bottom: 1rem;';
        equipmentDiv.innerHTML = `
            <h4>Unit ${count} <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remove</button></h4>
            <div class="form-row">
                <div>
                    <label>VIN</label>
                    <input type="text" class="equipment-vin" required>
                </div>
                <div>
                    <label>Year</label>
                    <input type="number" class="equipment-year" required>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <label>Make</label>
                    <input type="text" class="equipment-make" required>
                </div>
                <div>
                    <label>Model</label>
                    <input type="text" class="equipment-model" required>
                </div>
            </div>
            <div class="form-group">
                <label>Type</label>
                <select class="equipment-type" required>
                    <option value="Truck">Truck</option>
                    <option value="Excavator">Excavator</option>
                    <option value="Loader">Loader</option>
                    <option value="Dozer">Dozer</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        `;
        container.appendChild(equipmentDiv);
    }

    saveClient(id = null) {
        const data = this.storage.getData();
        
        // Collect equipment data
        const equipmentItems = Array.from(document.querySelectorAll('#equipmentContainer > div')).map(div => ({
            vin: div.querySelector('.equipment-vin').value,
            year: div.querySelector('.equipment-year').value,
            make: div.querySelector('.equipment-make').value,
            model: div.querySelector('.equipment-model').value,
            type: div.querySelector('.equipment-type').value
        }));

        const clientData = {
            id: id || Date.now(),
            name: document.getElementById('clientName').value,
            company: document.getElementById('clientCompany').value,
            phone: document.getElementById('clientPhone').value,
            email: document.getElementById('clientEmail').value,
            address: document.getElementById('clientAddress').value,
            equipment: equipmentItems
        };

        if (id) {
            const index = data.clients.findIndex(c => c.id === id);
            data.clients[index] = clientData;
            this.storage.addActivity(`Updated client: ${clientData.name}`);
        } else {
            data.clients.push(clientData);
            this.storage.addActivity(`Added new client: ${clientData.name}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderClients();
        this.updateDashboard();
    }

    editClient(id) {
        const data = this.storage.getData();
        const client = data.clients.find(c => c.id === id);
        this.showClientModal(client);
    }

    deleteClient(id) {
        if (!confirm('Are you sure you want to delete this client?')) return;
        
        const data = this.storage.getData();
        const client = data.clients.find(c => c.id === id);
        data.clients = data.clients.filter(c => c.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted client: ${client.name}`);
        this.renderClients();
        this.updateDashboard();
    }

    showServiceHistory(vin) {
        const data = this.storage.getData();
        
        // Find all jobs related to this VIN
        const serviceHistory = data.jobs
            .filter(job => job.vin === vin)
            .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <h2>Service History - VIN: ${vin}</h2>
            ${serviceHistory.length === 0 ? 
                '<div class="empty-state"><p>No service history found for this vehicle</p></div>' :
                `<div class="history-timeline">
                    ${serviceHistory.map(job => `
                        <div class="history-item">
                            <div class="history-dot"></div>
                            <div class="history-date">${job.dueDate} - ${this.formatStatus(job.status)}</div>
                            <div class="history-job">${job.title}</div>
                            <div class="history-description">${job.description}</div>
                            <div class="history-description"><strong>Priority:</strong> ${job.priority} | <strong>Assigned To:</strong> ${job.assignedTo}</div>
                        </div>
                    `).join('')}
                </div>`
            }
            <div class="form-actions">
                <button type="button" class="btn-primary" onclick="document.getElementById('modal').classList.remove('active')">Close</button>
            </div>
        `;

        modal.classList.add('active');
    }

    renderJobs(searchTerm = '', filterValue = 'all') {
        const data = this.storage.getData();
        let jobs = data.jobs;

        // Apply filters
        if (searchTerm) {
            jobs = jobs.filter(j => {
                const client = j.clientId ? data.clients.find(c => c.id === j.clientId) : null;
                return j.title.toLowerCase().includes(searchTerm) ||
                    j.equipment.toLowerCase().includes(searchTerm) ||
                    j.description.toLowerCase().includes(searchTerm) ||
                    (j.vin && j.vin.toLowerCase().includes(searchTerm)) ||
                    (client && client.name.toLowerCase().includes(searchTerm));
            });
        }
        if (filterValue !== 'all') {
            jobs = jobs.filter(j => j.status === filterValue);
        }

        const jobsList = document.getElementById('jobsList');
        
        if (jobs.length === 0) {
            jobsList.innerHTML = '<div class="empty-state"><p>No jobs found. Click "+ New Job" to create one.</p></div>';
            return;
        }

        jobsList.innerHTML = jobs.map(job => {
            const client = job.clientId ? data.clients.find(c => c.id === job.clientId) : null;
            return `
            <div class="item-card">
                <div class="item-header">
                    <h3 class="item-title">${job.title}</h3>
                    <span class="item-status status-${job.status}">${this.formatStatus(job.status)}</span>
                </div>
                <div class="item-details">
                    ${client ? `<div class="item-detail"><strong>Client:</strong> <span>${client.name}</span></div>` : ''}
                    ${job.vin ? `<div class="item-detail"><strong>VIN:</strong> <span>${job.vin}</span></div>` : ''}
                    ${job.vehicleInfo ? `<div class="item-detail"><strong>Vehicle:</strong> <span>${job.vehicleInfo}</span></div>` : ''}
                    <div class="item-detail"><strong>Equipment:</strong> <span>${job.equipment}</span></div>
                    <div class="item-detail"><strong>Priority:</strong> <span>${job.priority}</span></div>
                    ${job.assignedTo ? `<div class="item-detail"><strong>Assigned To:</strong> <span>${job.assignedTo}</span></div>` : ''}
                    ${job.startDate ? `<div class="item-detail"><strong>Start Date:</strong> <span>${job.startDate}</span></div>` : ''}
                    ${job.dueDate ? `<div class="item-detail"><strong>Due Date:</strong> <span>${job.dueDate}</span></div>` : ''}
                    ${job.estimatedHours ? `<div class="item-detail"><strong>Est. Hours:</strong> <span>${job.estimatedHours} hrs</span></div>` : ''}
                    ${job.estimatedCost ? `<div class="item-detail"><strong>Est. Cost:</strong> <span>$${job.estimatedCost.toFixed(2)}</span></div>` : ''}
                    <div class="item-detail"><strong>Description:</strong> <span>${job.description}</span></div>
                    ${job.notes ? `<div class="item-detail\"><strong>Notes:</strong> <span>${job.notes}</span></div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="app.editJob(${job.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deleteJob(${job.id})">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    renderEquipment(searchTerm = '', filterValue = 'all') {
        const data = this.storage.getData();
        let equipment = data.equipment;

        // Apply filters
        if (searchTerm) {
            equipment = equipment.filter(e => 
                e.name.toLowerCase().includes(searchTerm) ||
                e.model.toLowerCase().includes(searchTerm) ||
                e.serialNumber.toLowerCase().includes(searchTerm)
            );
        }
        if (filterValue !== 'all') {
            equipment = equipment.filter(e => e.type === filterValue);
        }

        const equipmentList = document.getElementById('equipmentList');
        
        if (equipment.length === 0) {
            equipmentList.innerHTML = '<div class="empty-state"><p>No equipment found. Click "+ Add Equipment" to add one.</p></div>';
            return;
        }

        equipmentList.innerHTML = equipment.map(eq => `
            <div class="item-card">
                <div class="item-header">
                    <h3 class="item-title">${eq.name}</h3>
                    <span class="item-status status-in-progress">${eq.type}</span>
                </div>
                <div class="item-details">
                    <div class="item-detail"><strong>Model:</strong> <span>${eq.model}</span></div>
                    <div class="item-detail"><strong>Serial #:</strong> <span>${eq.serialNumber}</span></div>
                    <div class="item-detail"><strong>Year:</strong> <span>${eq.year}</span></div>
                    <div class="item-detail"><strong>Hours:</strong> <span>${eq.hours}</span></div>
                    <div class="item-detail"><strong>Last Service:</strong> <span>${eq.lastService}</span></div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="app.editEquipment(${eq.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deleteEquipment(${eq.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    renderParts(searchTerm = '', filterValue = 'all') {
        const data = this.storage.getData();
        let parts = data.parts;

        // Apply filters
        if (searchTerm) {
            parts = parts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.partNumber.toLowerCase().includes(searchTerm) ||
                p.supplier.toLowerCase().includes(searchTerm)
            );
        }
        if (filterValue !== 'all') {
            parts = parts.filter(p => {
                if (filterValue === 'in-stock') return p.quantity > p.minQuantity;
                if (filterValue === 'low-stock') return p.quantity > 0 && p.quantity <= p.minQuantity;
                if (filterValue === 'out-of-stock') return p.quantity === 0;
                return true;
            });
        }

        const partsList = document.getElementById('partsList');
        
        if (parts.length === 0) {
            partsList.innerHTML = '<div class="empty-state"><p>No parts found. Click "+ Add Part" to add one.</p></div>';
            return;
        }

        partsList.innerHTML = parts.map(part => {
            let stockStatus = 'in-stock';
            if (part.quantity === 0) stockStatus = 'out-of-stock';
            else if (part.quantity <= part.minQuantity) stockStatus = 'low-stock';

            return `
            <div class="item-card">
                <div class="item-header">
                    <h3 class="item-title">${part.name}</h3>
                    <span class="item-status status-${stockStatus}">${stockStatus === 'in-stock' ? 'In Stock' : stockStatus === 'low-stock' ? 'Low Stock' : 'Out of Stock'}</span>
                </div>
                <div class="item-details">
                    <div class="item-detail"><strong>Part #:</strong> <span>${part.partNumber}</span></div>
                    <div class="item-detail"><strong>Supplier:</strong> <span>${part.supplier}</span></div>
                    <div class="item-detail"><strong>Quantity:</strong> <span>${part.quantity}</span></div>
                    <div class="item-detail"><strong>Min Quantity:</strong> <span>${part.minQuantity}</span></div>
                    <div class="item-detail"><strong>Unit Price:</strong> <span>$${part.unitPrice}</span></div>
                    <div class="item-detail"><strong>Location:</strong> <span>${part.location}</span></div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="app.editPart(${part.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deletePart(${part.id})">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    renderAllViews() {
        this.renderJobs();
        this.renderClients();
        this.renderEquipment();
        this.renderParts();
        this.renderInvoices();
    }

    formatStatus(status) {
        return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Invoice Methods
    renderInvoices(searchTerm = '', filterValue = 'all') {
        const data = this.storage.getData();
        let invoices = data.invoices;

        // Apply filters
        if (searchTerm) {
            invoices = invoices.filter(inv => {
                const client = inv.clientId ? data.clients.find(c => c.id === inv.clientId) : null;
                return inv.invoiceNumber.toLowerCase().includes(searchTerm) ||
                    (client && client.name.toLowerCase().includes(searchTerm)) ||
                    inv.notes?.toLowerCase().includes(searchTerm);
            });
        }
        if (filterValue !== 'all') {
            invoices = invoices.filter(inv => inv.status === filterValue);
        }

        const invoicesList = document.getElementById('invoicesList');
        
        if (invoices.length === 0) {
            invoicesList.innerHTML = '<div class="empty-state"><p>No invoices found. Click "+ New Invoice" to create one.</p></div>';
            return;
        }

        invoicesList.innerHTML = invoices.map(invoice => {
            const client = invoice.clientId ? data.clients.find(c => c.id === invoice.clientId) : null;
            return `
            <div class="invoice-card">
                <div class="invoice-header-row">
                    <div>
                        <div class="invoice-number">Invoice #${invoice.invoiceNumber}</div>
                        <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">${client ? client.name : 'No Client'}</div>
                    </div>
                    <div class="text-right">
                        <div class="invoice-amount">$${invoice.total.toFixed(2)}</div>
                        <span class="item-status status-${invoice.status}">${this.formatStatus(invoice.status)}</span>
                    </div>
                </div>
                <div class="invoice-grid">
                    <div class="item-detail">
                        <strong>Date:</strong> ${invoice.date}
                    </div>
                    <div class="item-detail">
                        <strong>Due Date:</strong> ${invoice.dueDate}
                    </div>
                    ${invoice.vin ? `<div class="item-detail"><strong>VIN:</strong> ${invoice.vin}</div>` : ''}
                    <div class="item-detail">
                        <strong>Items:</strong> ${invoice.lineItems.length}
                    </div>
                </div>
                ${invoice.notes ? `<div class="item-details"><div class="item-detail"><strong>Notes:</strong> <span>${invoice.notes}</span></div></div>` : ''}
                <div class="item-actions">
                    <button class="btn-history" onclick="app.viewInvoice(${invoice.id})">View</button>
                    <button class="btn-edit" onclick="app.editInvoice(${invoice.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deleteInvoice(${invoice.id})">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    showInvoiceModal(invoice = null) {
        const data = this.storage.getData();
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        const clientOptions = data.clients.map(c => 
            `<option value="${c.id}" ${invoice?.clientId === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const selectedClient = invoice?.clientId ? data.clients.find(c => c.id === invoice.clientId) : null;
        const vinOptions = selectedClient?.equipment?.map(e => 
            `<option value="${e.vin}" ${invoice?.vin === e.vin ? 'selected' : ''}>${e.vin} - ${e.year} ${e.make} ${e.model}</option>`
        ).join('') || '';

        const lineItemsHtml = invoice?.lineItems?.map((item, index) => `
            <tr class="line-item-row" data-index="${index}">
                <td><input type="text" class="item-description" value="${item.description}" placeholder="Description" /></td>
                <td><input type="number" class="item-quantity" value="${item.quantity}" min="0" step="0.01" onchange="app.calculateInvoiceTotal()" /></td>
                <td><input type="number" class="item-rate" value="${item.rate}" min="0" step="0.01" onchange="app.calculateInvoiceTotal()" /></td>
                <td class="item-amount">$${(item.quantity * item.rate).toFixed(2)}</td>
                <td><input type="text" class="item-notes" value="${item.notes || ''}" placeholder="Internal notes..." /></td>
                <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove(); app.calculateInvoiceTotal()">×</button></td>
            </tr>
        `).join('') || '';
        
        modalBody.innerHTML = `
            <h2>${invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
            <form id="invoiceForm">
                <div class="invoice-section">
                    <h3>Invoice Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="invoiceNumber">Invoice Number *</label>
                            <input type="text" id="invoiceNumber" value="${invoice?.invoiceNumber || 'INV-' + Date.now()}" required>
                        </div>
                        <div class="form-group">
                            <label for="invoiceDate">Invoice Date *</label>
                            <input type="date" id="invoiceDate" value="${invoice?.date || new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="invoiceDueDate">Due Date *</label>
                            <input type="date" id="invoiceDueDate" value="${invoice?.dueDate || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="invoiceClient">Client *</label>
                            <select id="invoiceClient" onchange="app.updateInvoiceVinDropdown()" required>
                                <option value="">Select Client</option>
                                ${clientOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="invoiceVin">Vehicle VIN (Optional)</label>
                            <select id="invoiceVin" ${!invoice?.clientId ? 'disabled' : ''}>
                                <option value="">Select VIN</option>
                                ${vinOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="invoiceStatus">Status *</label>
                            <select id="invoiceStatus" required>
                                <option value="draft" ${invoice?.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="sent" ${invoice?.status === 'sent' ? 'selected' : ''}>Sent</option>
                                <option value="paid" ${invoice?.status === 'paid' ? 'selected' : ''}>Paid</option>
                                <option value="overdue" ${invoice?.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="invoice-section">
                    <h3>Line Items</h3>
                    <table class="line-items-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Notes (Internal)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="lineItemsBody">
                            ${lineItemsHtml || '<tr class="line-item-row"><td colspan="5" class="empty-state">No items added yet</td></tr>'}
                        </tbody>
                    </table>
                    <button type="button" class="btn-add-line" onclick="app.addInvoiceLineItem()">+ Add Line Item</button>
                    
                    <div class="invoice-totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span id="invoiceSubtotal">$0.00</span>
                        </div>
                        <div class="total-row">
                            <span>Tax (<input type="number" id="invoiceTaxRate" value="${invoice?.taxRate || 0}" min="0" max="100" step="0.1" style="width: 60px; padding: 0.25rem;" onchange="app.calculateInvoiceTotal()">%):</span>
                            <span id="invoiceTax">$0.00</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>Total:</span>
                            <span id="invoiceTotal">$0.00</span>
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Additional Information</h3>
                    <div class="form-group">
                        <label for="invoiceNotes">Notes</label>
                        <textarea id="invoiceNotes" rows="3">${invoice?.notes || ''}</textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${invoice ? 'Update Invoice' : 'Create Invoice'}</button>
                </div>
            </form>
        `;

        document.getElementById('invoiceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInvoice(invoice?.id);
        });

        modal.classList.add('active');
        
        // Calculate initial total
        setTimeout(() => this.calculateInvoiceTotal(), 100);
    }

    updateInvoiceVinDropdown() {
        const data = this.storage.getData();
        const clientId = parseInt(document.getElementById('invoiceClient').value);
        const vinSelect = document.getElementById('invoiceVin');
        
        if (!clientId) {
            vinSelect.disabled = true;
            vinSelect.innerHTML = '<option value="">Select VIN</option>';
            return;
        }

        const client = data.clients.find(c => c.id === clientId);
        if (client && client.equipment && client.equipment.length > 0) {
            vinSelect.disabled = false;
            vinSelect.innerHTML = '<option value="">Select VIN</option>' + 
                client.equipment.map(e => 
                    `<option value="${e.vin}">${e.vin} - ${e.year} ${e.make} ${e.model}</option>`
                ).join('');
        } else {
            vinSelect.disabled = true;
            vinSelect.innerHTML = '<option value="">No vehicles for this client</option>';
        }
    }

    addInvoiceLineItem() {
        const tbody = document.getElementById('lineItemsBody');
        
        // Remove empty state if exists
        const emptyRow = tbody.querySelector('td[colspan]');
        if (emptyRow) {
            emptyRow.parentElement.remove();
        }

        const newRow = document.createElement('tr');
        newRow.className = 'line-item-row';
        newRow.innerHTML = `
            <td><input type="text" class="item-description" placeholder="Description" /></td>
            <td><input type="number" class="item-quantity" value="1" min="0" step="0.01" onchange="app.calculateInvoiceTotal()" /></td>
            <td><input type="number" class="item-rate" value="0" min="0" step="0.01" onchange="app.calculateInvoiceTotal()" /></td>
            <td class="item-amount">$0.00</td>
            <td><input type="text" class="item-notes" placeholder="Internal notes..." /></td>
            <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove(); app.calculateInvoiceTotal()">×</button></td>
        `;
        tbody.appendChild(newRow);
        this.calculateInvoiceTotal();
    }

    calculateInvoiceTotal() {
        const rows = document.querySelectorAll('#lineItemsBody .line-item-row');
        let subtotal = 0;

        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity')?.value || 0);
            const rate = parseFloat(row.querySelector('.item-rate')?.value || 0);
            const amount = quantity * rate;
            
            const amountCell = row.querySelector('.item-amount');
            if (amountCell) {
                amountCell.textContent = '$' + amount.toFixed(2);
            }
            
            subtotal += amount;
        });

        const taxRate = parseFloat(document.getElementById('invoiceTaxRate')?.value || 0);
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        const subtotalEl = document.getElementById('invoiceSubtotal');
        const taxEl = document.getElementById('invoiceTax');
        const totalEl = document.getElementById('invoiceTotal');

        if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
        if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
        if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    }

    saveInvoice(id = null) {
        const data = this.storage.getData();
        
        // Collect line items
        const lineItems = Array.from(document.querySelectorAll('#lineItemsBody .line-item-row'))
            .filter(row => !row.querySelector('td[colspan]'))
            .map(row => ({
                description: row.querySelector('.item-description')?.value || '',
                quantity: parseFloat(row.querySelector('.item-quantity')?.value || 0),
                rate: parseFloat(row.querySelector('.item-rate')?.value || 0),
                notes: row.querySelector('.item-notes')?.value || ''
            }))
            .filter(item => item.description || item.quantity || item.rate);

        const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const taxRate = parseFloat(document.getElementById('invoiceTaxRate').value);
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        const invoiceData = {
            id: id || Date.now(),
            invoiceNumber: document.getElementById('invoiceNumber').value,
            date: document.getElementById('invoiceDate').value,
            dueDate: document.getElementById('invoiceDueDate').value,
            clientId: parseInt(document.getElementById('invoiceClient').value),
            vin: document.getElementById('invoiceVin').value,
            status: document.getElementById('invoiceStatus').value,
            lineItems: lineItems,
            taxRate: taxRate,
            subtotal: subtotal,
            tax: tax,
            total: total,
            notes: document.getElementById('invoiceNotes').value
        };

        if (id) {
            const index = data.invoices.findIndex(inv => inv.id === id);
            data.invoices[index] = invoiceData;
            this.storage.addActivity(`Updated invoice: ${invoiceData.invoiceNumber}`);
        } else {
            data.invoices.push(invoiceData);
            this.storage.addActivity(`Created new invoice: ${invoiceData.invoiceNumber}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderInvoices();
        this.updateDashboard();
    }

    editInvoice(id) {
        const data = this.storage.getData();
        const invoice = data.invoices.find(inv => inv.id === id);
        this.showInvoiceModal(invoice);
    }

    deleteInvoice(id) {
        if (!confirm('Are you sure you want to delete this invoice?')) return;
        
        const data = this.storage.getData();
        const invoice = data.invoices.find(inv => inv.id === id);
        data.invoices = data.invoices.filter(inv => inv.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted invoice: ${invoice.invoiceNumber}`);
        this.renderInvoices();
        this.updateDashboard();
    }

    viewInvoice(id) {
        const data = this.storage.getData();
        const invoice = data.invoices.find(inv => inv.id === id);
        const client = invoice.clientId ? data.clients.find(c => c.id === invoice.clientId) : null;
        
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 1rem;">
                    <h1 style="color: var(--primary-color); margin-bottom: 0.5rem;">🔧 Mech Shop Manager</h1>
                    <h2 style="color: var(--accent-color);">INVOICE</h2>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <h3 style="color: var(--secondary-color); margin-bottom: 0.5rem;">Bill To:</h3>
                        <strong>${client?.name || 'N/A'}</strong><br>
                        ${client?.company ? client.company + '<br>' : ''}
                        ${client?.phone ? 'Phone: ' + client.phone + '<br>' : ''}
                        ${client?.email ? 'Email: ' + client.email + '<br>' : ''}
                        ${client?.address ? client.address : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-bottom: 0.5rem;"><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
                        <div style="margin-bottom: 0.5rem;"><strong>Date:</strong> ${invoice.date}</div>
                        <div style="margin-bottom: 0.5rem;"><strong>Due Date:</strong> ${invoice.dueDate}</div>
                        <div style="margin-bottom: 0.5rem;"><strong>Status:</strong> <span class="item-status status-${invoice.status}">${this.formatStatus(invoice.status)}</span></div>
                        ${invoice.vin ? `<div><strong>VIN:</strong> ${invoice.vin}</div>` : ''}
                    </div>
                </div>

                <table class="line-items-table" style="margin-bottom: 2rem;">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Description</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.lineItems.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td style="text-align: right;">$${item.rate.toFixed(2)}</td>
                                <td style="text-align: right;">$${(item.quantity * item.rate).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-left: auto; width: 300px;">
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ddd;">
                        <span>Subtotal:</span>
                        <span>$${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ddd;">
                        <span>Tax (${invoice.taxRate}%):</span>
                        <span>$${invoice.tax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 1rem 0; font-size: 1.3rem; font-weight: bold; color: var(--accent-color); border-top: 2px solid var(--primary-color);">
                        <span>Total:</span>
                        <span>$${invoice.total.toFixed(2)}</span>
                    </div>
                </div>

                ${invoice.notes ? `
                <div style="margin-top: 2rem; padding: 1rem; background-color: var(--bg-light); border-radius: 5px;">
                    <strong>Notes:</strong><br>
                    ${invoice.notes}
                </div>
                ` : ''}

                <div class="form-actions" style="margin-top: 2rem;">
                    <button type="button" class="btn-secondary" onclick="window.print()">Print</button>
                    <button type="button" class="btn-edit" onclick="app.editInvoice(${invoice.id}); document.getElementById('modal').classList.remove('active'); setTimeout(() => app.editInvoice(${invoice.id}), 100)">Edit</button>
                    <button type="button" class="btn-primary" onclick="document.getElementById('modal').classList.remove('active')">Close</button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    // Job Methods
    showJobModal(job = null) {
        const data = this.storage.getData();
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        // Get client list for dropdown
        const clientOptions = data.clients.map(c => 
            `<option value="${c.id}" ${job?.clientId === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        // Get VINs for the selected client
        const selectedClient = job?.clientId ? data.clients.find(c => c.id === job.clientId) : null;
        const vinOptions = selectedClient?.equipment?.map(e => 
            `<option value="${e.vin}" ${job?.vin === e.vin ? 'selected' : ''}>${e.vin} - ${e.year} ${e.make} ${e.model}</option>`
        ).join('') || '';
        
        modalBody.innerHTML = `
            <h2>${job ? 'Edit Job' : 'New Job'}</h2>
            <form id="jobForm">
                <div class="invoice-section">
                    <h3>Client & Vehicle Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobClientName">Client Name *</label>
                            <input type="text" id="jobClientName" value="${job && selectedClient ? selectedClient.name : ''}" 
                                   placeholder="Start typing client name..." 
                                   oninput="app.searchClients(this.value)" 
                                   onfocus="app.searchClients(this.value)"
                                   autocomplete="off" required>
                            <div id="clientSuggestions" class="autocomplete-suggestions"></div>
                            <input type="hidden" id="jobClientId" value="${job?.clientId || ''}">
                        </div>
                        <div class="form-group">
                            <label for="jobClientPhone">Client Phone</label>
                            <input type="tel" id="jobClientPhone" value="${job && selectedClient ? selectedClient.phone : ''}" placeholder="Phone number">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobVinInput">Vehicle VIN *</label>
                            <input type="text" id="jobVinInput" value="${job?.vin || ''}" 
                                   placeholder="Enter VIN or start typing..." 
                                   oninput="app.searchVINs(this.value)"
                                   onfocus="app.searchVINs(this.value)"
                                   autocomplete="off" required>
                            <div id="vinSuggestions" class="autocomplete-suggestions"></div>
                        </div>
                        <div class="form-group">
                            <label for="jobVehicleInfo">Vehicle Description</label>
                            <input type="text" id="jobVehicleInfo" value="${job?.vehicleInfo || ''}" placeholder="e.g., 2020 Kenworth T680">
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Job Details</h3>
                    <div class="form-group">
                        <label for="jobTitle">Job Title *</label>
                        <input type="text" id="jobTitle" value="${job?.title || ''}" placeholder="e.g., Engine Overhaul, Brake Replacement" required>
                    </div>
                    <div class="form-group">
                        <label for="jobDescription">Description *</label>
                        <textarea id="jobDescription" rows="3" placeholder="Detailed description of work to be performed" required>${job?.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobEquipment">Equipment/Component *</label>
                            <input type="text" id="jobEquipment" value="${job?.equipment || ''}" placeholder="e.g., Cummins X15 Engine" required>
                        </div>
                        <div class="form-group">
                            <label for="jobPriority">Priority *</label>
                            <select id="jobPriority" required>
                                <option value="Low" ${job?.priority === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Medium" ${job?.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="High" ${job?.priority === 'High' ? 'selected' : ''}>High</option>
                                <option value="Critical" ${job?.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Assignment & Schedule</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobStatus">Status *</label>
                            <select id="jobStatus" required>
                                <option value="pending" ${job?.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="in-progress" ${job?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${job?.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="jobAssignedTo">Assigned To</label>
                            <input type="text" id="jobAssignedTo" value="${job?.assignedTo || ''}" placeholder="Technician name">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobStartDate">Start Date</label>
                            <input type="date" id="jobStartDate" value="${job?.startDate || ''}">
                        </div>
                        <div class="form-group">
                            <label for="jobDueDate">Due Date</label>
                            <input type="date" id="jobDueDate" value="${job?.dueDate || ''}">
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Additional Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="jobEstimatedHours">Estimated Hours</label>
                            <input type="number" step="0.5" id="jobEstimatedHours" value="${job?.estimatedHours || ''}" placeholder="0.0">
                        </div>
                        <div class="form-group">
                            <label for="jobEstimatedCost">Estimated Cost</label>
                            <input type="number" step="0.01" id="jobEstimatedCost" value="${job?.estimatedCost || ''}" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="jobNotes">Internal Notes</label>
                        <textarea id="jobNotes" rows="2" placeholder="Any additional notes or special instructions">${job?.notes || ''}</textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${job ? 'Update Job' : 'Create Job'}</button>
                </div>
            </form>
        `;

        document.getElementById('jobForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveJob(job?.id);
        });

        modal.classList.add('active');
    }

    searchClients(searchTerm) {
        const data = this.storage.getData();
        const suggestionsDiv = document.getElementById('clientSuggestions');
        
        if (!searchTerm || searchTerm.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.style.display = 'none';
            return;
        }

        const matches = data.clients.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm)
        ).slice(0, 5);

        if (matches.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item no-results">No existing clients found</div>';
            suggestionsDiv.style.display = 'block';
            return;
        }

        suggestionsDiv.innerHTML = matches.map(client => `
            <div class="suggestion-item" onclick="app.selectClient(${client.id})">
                <strong>${client.name}</strong>
                ${client.company ? `<span class="suggestion-detail"> - ${client.company}</span>` : ''}
                <span class="suggestion-detail"> | ${client.phone}</span>
            </div>
        `).join('');
        suggestionsDiv.style.display = 'block';
    }

    selectClient(clientId) {
        const data = this.storage.getData();
        const client = data.clients.find(c => c.id === clientId);
        
        if (!client) return;

        // Populate form fields
        document.getElementById('jobClientName').value = client.name;
        document.getElementById('jobClientPhone').value = client.phone;
        document.getElementById('jobClientId').value = client.id;
        
        // Hide suggestions
        document.getElementById('clientSuggestions').style.display = 'none';
        
        // If client has vehicles, show a notification
        if (client.equipment && client.equipment.length > 0) {
            const vinInput = document.getElementById('jobVinInput');
            vinInput.placeholder = `Client has ${client.equipment.length} vehicle(s). Start typing VIN...`;
            vinInput.focus();
        }
    }

    searchVINs(searchTerm) {
        const data = this.storage.getData();
        const suggestionsDiv = document.getElementById('vinSuggestions');
        
        if (!searchTerm || searchTerm.length < 3) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.style.display = 'none';
            return;
        }

        // Search through all client equipment
        const matches = [];
        data.clients.forEach(client => {
            if (client.equipment) {
                client.equipment.forEach(vehicle => {
                    if (vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase())) {
                        matches.push({
                            ...vehicle,
                            clientId: client.id,
                            clientName: client.name
                        });
                    }
                });
            }
        });

        if (matches.length === 0) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item no-results">No matching VINs found</div>';
            suggestionsDiv.style.display = 'block';
            return;
        }

        suggestionsDiv.innerHTML = matches.slice(0, 5).map(vehicle => `
            <div class="suggestion-item" onclick="app.selectVIN('${vehicle.vin}', ${vehicle.clientId})">
                <strong>${vehicle.vin}</strong>
                <span class="suggestion-detail"> | ${vehicle.year} ${vehicle.make} ${vehicle.model}</span>
                <span class="suggestion-detail"> | Client: ${vehicle.clientName}</span>
            </div>
        `).join('');
        suggestionsDiv.style.display = 'block';
    }

    selectVIN(vin, clientId) {
        const data = this.storage.getData();
        const client = data.clients.find(c => c.id === clientId);
        const vehicle = client?.equipment?.find(v => v.vin === vin);
        
        if (!vehicle) return;

        // Populate VIN field
        document.getElementById('jobVinInput').value = vin;
        
        // Populate vehicle info
        document.getElementById('jobVehicleInfo').value = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        
        // If client isn't already selected, populate client info too
        if (!document.getElementById('jobClientId').value && client) {
            document.getElementById('jobClientName').value = client.name;
            document.getElementById('jobClientPhone').value = client.phone;
            document.getElementById('jobClientId').value = client.id;
        }
        
        // Hide suggestions
        document.getElementById('vinSuggestions').style.display = 'none';
    }

    updateVinDropdown() {
        const data = this.storage.getData();
        const clientId = parseInt(document.getElementById('jobClient').value);
        const vinSelect = document.getElementById('jobVin');
        
        if (!clientId) {
            vinSelect.disabled = true;
            vinSelect.innerHTML = '<option value="">Select VIN</option>';
            return;
        }

        const client = data.clients.find(c => c.id === clientId);
        if (client && client.equipment && client.equipment.length > 0) {
            vinSelect.disabled = false;
            vinSelect.innerHTML = '<option value="">Select VIN</option>' + 
                client.equipment.map(e => 
                    `<option value="${e.vin}">${e.vin} - ${e.year} ${e.make} ${e.model}</option>`
                ).join('');
        } else {
            vinSelect.disabled = true;
            vinSelect.innerHTML = '<option value="">No vehicles for this client</option>';
        }
    }

    saveJob(id = null) {
        const data = this.storage.getData();
        let clientId = document.getElementById('jobClientId').value;
        const clientName = document.getElementById('jobClientName').value;
        const clientPhone = document.getElementById('jobClientPhone').value;
        
        // If no existing client selected, create a new one
        if (!clientId && clientName) {
            const newClient = {
                id: Date.now(),
                name: clientName,
                phone: clientPhone || '',
                email: '',
                company: '',
                address: '',
                equipment: []
            };
            data.clients.push(newClient);
            clientId = newClient.id;
            this.storage.addActivity(`Auto-created new client: ${clientName}`);
        }

        const vin = document.getElementById('jobVinInput').value;
        const vehicleInfo = document.getElementById('jobVehicleInfo').value;
        
        // If VIN provided and client exists, check if we need to add vehicle to client
        if (vin && clientId) {
            const client = data.clients.find(c => c.id == clientId);
            if (client) {
                const existingVehicle = client.equipment?.find(v => v.vin === vin);
                if (!existingVehicle && vehicleInfo) {
                    // Parse vehicle info (basic attempt)
                    const parts = vehicleInfo.split(' ');
                    const year = parts[0] || new Date().getFullYear();
                    const make = parts[1] || 'Unknown';
                    const model = parts.slice(2).join(' ') || 'Unknown';
                    
                    if (!client.equipment) client.equipment = [];
                    client.equipment.push({
                        vin: vin,
                        year: year,
                        make: make,
                        model: model,
                        type: 'Truck'
                    });
                    this.storage.addActivity(`Auto-added vehicle ${vin} to client ${client.name}`);
                }
            }
        }

        const jobData = {
            id: id || Date.now(),
            clientId: clientId ? parseInt(clientId) : null,
            vin: vin,
            vehicleInfo: vehicleInfo,
            title: document.getElementById('jobTitle').value,
            equipment: document.getElementById('jobEquipment').value,
            description: document.getElementById('jobDescription').value,
            status: document.getElementById('jobStatus').value,
            priority: document.getElementById('jobPriority').value,
            assignedTo: document.getElementById('jobAssignedTo').value,
            startDate: document.getElementById('jobStartDate').value,
            dueDate: document.getElementById('jobDueDate').value,
            estimatedHours: parseFloat(document.getElementById('jobEstimatedHours').value) || 0,
            estimatedCost: parseFloat(document.getElementById('jobEstimatedCost').value) || 0,
            notes: document.getElementById('jobNotes').value
        };

        if (id) {
            const index = data.jobs.findIndex(j => j.id === id);
            data.jobs[index] = jobData;
            this.storage.addActivity(`Updated job: ${jobData.title}`);
        } else {
            data.jobs.push(jobData);
            this.storage.addActivity(`Created new job: ${jobData.title}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderJobs();
        this.renderClients(); // Refresh in case we added a client
        this.updateDashboard();
    }

    editJob(id) {
        const data = this.storage.getData();
        const job = data.jobs.find(j => j.id === id);
        this.showJobModal(job);
    }

    deleteJob(id) {
        if (!confirm('Are you sure you want to delete this job?')) return;
        
        const data = this.storage.getData();
        const job = data.jobs.find(j => j.id === id);
        data.jobs = data.jobs.filter(j => j.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted job: ${job.title}`);
        this.renderJobs();
        this.updateDashboard();
    }

    // Equipment Methods
    showEquipmentModal(equipment = null) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>${equipment ? 'Edit Equipment' : 'Add Equipment'}</h2>
            <form id="equipmentForm">
                <div class="form-group">
                    <label for="equipmentName">Equipment Name</label>
                    <input type="text" id="equipmentName" value="${equipment?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="equipmentType">Type</label>
                    <select id="equipmentType" required>
                        <option value="excavator" ${equipment?.type === 'excavator' ? 'selected' : ''}>Excavator</option>
                        <option value="loader" ${equipment?.type === 'loader' ? 'selected' : ''}>Loader</option>
                        <option value="dozer" ${equipment?.type === 'dozer' ? 'selected' : ''}>Dozer</option>
                        <option value="dump-truck" ${equipment?.type === 'dump-truck' ? 'selected' : ''}>Dump Truck</option>
                        <option value="other" ${equipment?.type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="equipmentModel">Model</label>
                    <input type="text" id="equipmentModel" value="${equipment?.model || ''}" required>
                </div>
                <div class="form-group">
                    <label for="equipmentSerial">Serial Number</label>
                    <input type="text" id="equipmentSerial" value="${equipment?.serialNumber || ''}" required>
                </div>
                <div class="form-group">
                    <label for="equipmentYear">Year</label>
                    <input type="number" id="equipmentYear" value="${equipment?.year || ''}" required>
                </div>
                <div class="form-group">
                    <label for="equipmentHours">Operating Hours</label>
                    <input type="number" id="equipmentHours" value="${equipment?.hours || ''}" required>
                </div>
                <div class="form-group">
                    <label for="equipmentLastService">Last Service Date</label>
                    <input type="date" id="equipmentLastService" value="${equipment?.lastService || ''}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${equipment ? 'Update' : 'Add'}</button>
                </div>
            </form>
        `;

        document.getElementById('equipmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEquipment(equipment?.id);
        });

        modal.classList.add('active');
    }

    saveEquipment(id = null) {
        const data = this.storage.getData();
        const equipmentData = {
            id: id || Date.now(),
            name: document.getElementById('equipmentName').value,
            type: document.getElementById('equipmentType').value,
            model: document.getElementById('equipmentModel').value,
            serialNumber: document.getElementById('equipmentSerial').value,
            year: document.getElementById('equipmentYear').value,
            hours: document.getElementById('equipmentHours').value,
            lastService: document.getElementById('equipmentLastService').value
        };

        if (id) {
            const index = data.equipment.findIndex(e => e.id === id);
            data.equipment[index] = equipmentData;
            this.storage.addActivity(`Updated equipment: ${equipmentData.name}`);
        } else {
            data.equipment.push(equipmentData);
            this.storage.addActivity(`Added new equipment: ${equipmentData.name}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderEquipment();
        this.updateDashboard();
    }

    editEquipment(id) {
        const data = this.storage.getData();
        const equipment = data.equipment.find(e => e.id === id);
        this.showEquipmentModal(equipment);
    }

    deleteEquipment(id) {
        if (!confirm('Are you sure you want to delete this equipment?')) return;
        
        const data = this.storage.getData();
        const equipment = data.equipment.find(e => e.id === id);
        data.equipment = data.equipment.filter(e => e.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted equipment: ${equipment.name}`);
        this.renderEquipment();
        this.updateDashboard();
    }

    // Parts Methods
    showPartModal(part = null) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>${part ? 'Edit Part' : 'Add Part'}</h2>
            <form id="partForm">
                <div class="form-group">
                    <label for="partName">Part Name</label>
                    <input type="text" id="partName" value="${part?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partNumber">Part Number</label>
                    <input type="text" id="partNumber" value="${part?.partNumber || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partSupplier">Supplier</label>
                    <input type="text" id="partSupplier" value="${part?.supplier || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partQuantity">Quantity</label>
                    <input type="number" id="partQuantity" value="${part?.quantity || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partMinQuantity">Minimum Quantity</label>
                    <input type="number" id="partMinQuantity" value="${part?.minQuantity || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partUnitPrice">Unit Price</label>
                    <input type="number" step="0.01" id="partUnitPrice" value="${part?.unitPrice || ''}" required>
                </div>
                <div class="form-group">
                    <label for="partLocation">Storage Location</label>
                    <input type="text" id="partLocation" value="${part?.location || ''}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${part ? 'Update' : 'Add'}</button>
                </div>
            </form>
        `;

        document.getElementById('partForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePart(part?.id);
        });

        modal.classList.add('active');
    }

    savePart(id = null) {
        const data = this.storage.getData();
        const partData = {
            id: id || Date.now(),
            name: document.getElementById('partName').value,
            partNumber: document.getElementById('partNumber').value,
            supplier: document.getElementById('partSupplier').value,
            quantity: parseInt(document.getElementById('partQuantity').value),
            minQuantity: parseInt(document.getElementById('partMinQuantity').value),
            unitPrice: parseFloat(document.getElementById('partUnitPrice').value),
            location: document.getElementById('partLocation').value
        };

        if (id) {
            const index = data.parts.findIndex(p => p.id === id);
            data.parts[index] = partData;
            this.storage.addActivity(`Updated part: ${partData.name}`);
        } else {
            data.parts.push(partData);
            this.storage.addActivity(`Added new part: ${partData.name}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderParts();
        this.updateDashboard();
    }

    editPart(id) {
        const data = this.storage.getData();
        const part = data.parts.find(p => p.id === id);
        this.showPartModal(part);
    }

    deletePart(id) {
        if (!confirm('Are you sure you want to delete this part?')) return;
        
        const data = this.storage.getData();
        const part = data.parts.find(p => p.id === id);
        data.parts = data.parts.filter(p => p.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted part: ${part.name}`);
        this.renderParts();
        this.updateDashboard();
    }

    // Crew Management Methods
    setupCrewModeSelector() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchCrewMode(mode);
            });
        });
        
        // Start time display update
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    switchCrewMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        document.querySelectorAll('.crew-mode').forEach(view => {
            view.classList.toggle('active', view.id === `crew${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        });

        if (mode === 'management') {
            this.renderCrew();
        } else if (mode === 'timesheet') {
            this.renderTimesheet();
        } else if (mode === 'login') {
            this.updateCrewLoginDropdown();
        }
    }

    updateCurrentTime() {
        const timeEl = document.getElementById('currentTime');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString();
        }
    }

    renderCrew(searchTerm = '', filterValue = 'all') {
        const data = this.storage.getData();
        let crew = data.crew;

        // Apply filters
        if (searchTerm) {
            crew = crew.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                c.employeeId.toLowerCase().includes(searchTerm) ||
                c.position.toLowerCase().includes(searchTerm)
            );
        }
        if (filterValue !== 'all') {
            crew = crew.filter(c => {
                if (filterValue === 'clocked-in') {
                    return c.currentlyClocked;
                }
                return c.status === filterValue;
            });
        }

        const crewList = document.getElementById('crewList');
        
        if (crew.length === 0) {
            crewList.innerHTML = '<div class="empty-state"><p>No crew members found. Click "+ Add Crew Member" to add one.</p></div>';
            return;
        }

        crewList.innerHTML = crew.map(member => {
            const badgeClass = member.currentlyClocked ? 'badge-clocked-in' : 
                               member.status === 'active' ? 'badge-active' : 'badge-inactive';
            const badgeText = member.currentlyClocked ? 'Clocked In' : member.status;
            
            return `
            <div class="crew-member-card">
                <div class="crew-member-header">
                    <div>
                        <div class="crew-member-name">${member.name}</div>
                        <div style="color: #666; font-size: 0.9rem; margin-top: 0.25rem;">${member.position}</div>
                    </div>
                    <span class="crew-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="item-details">
                    <div class="item-detail"><strong>Employee ID:</strong> <span>${member.employeeId}</span></div>
                    <div class="item-detail"><strong>Phone:</strong> <span>${member.phone}</span></div>
                    <div class="item-detail"><strong>Email:</strong> <span>${member.email}</span></div>
                    <div class="item-detail"><strong>Hourly Rate:</strong> <span>$${member.hourlyRate}/hr</span></div>
                    ${member.currentlyClocked ? `
                        <div class="item-detail" style="color: var(--success-color); font-weight: 600;">
                            <strong>Current Job:</strong> <span>${member.currentJob || 'No job selected'}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-history" onclick="app.viewCrewTimesheet(${member.id})">View Timesheet</button>
                    <button class="btn-edit" onclick="app.editCrew(${member.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deleteCrew(${member.id})">Delete</button>
                </div>
            </div>
        `}).join('');
    }

    showCrewModal(member = null) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>${member ? 'Edit Crew Member' : 'Add Crew Member'}</h2>
            <form id="crewForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="crewName">Full Name *</label>
                        <input type="text" id="crewName" value="${member?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="crewEmployeeId">Employee ID *</label>
                        <input type="text" id="crewEmployeeId" value="${member?.employeeId || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="crewPosition">Position *</label>
                        <input type="text" id="crewPosition" value="${member?.position || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="crewHourlyRate">Hourly Rate *</label>
                        <input type="number" step="0.01" id="crewHourlyRate" value="${member?.hourlyRate || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="crewPhone">Phone</label>
                        <input type="tel" id="crewPhone" value="${member?.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label for="crewEmail">Email</label>
                        <input type="email" id="crewEmail" value="${member?.email || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="crewUsername">Username</label>
                        <input type="text" id="crewUsername" value="${member?.username || ''}" placeholder="Login username" autocomplete="off">
                        <small style="color: #666; font-size: 0.85rem;">For crew member login</small>
                    </div>
                    <div class="form-group">
                        <label for="crewPassword">Password</label>
                        <input type="password" id="crewPassword" value="${member?.password || ''}" placeholder="Login password" autocomplete="new-password">
                        <small style="color: #666; font-size: 0.85rem;">Minimum 6 characters</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="crewPin">PIN Code (4 digits) *</label>
                        <input type="password" id="crewPin" value="${member?.pin || ''}" maxlength="4" pattern="[0-9]{4}" placeholder="Enter 4-digit PIN" required>
                        <small style="color: #666; font-size: 0.85rem;">For quick clock-in</small>
                    </div>
                    <div class="form-group">
                        <label for="crewStatus">Status *</label>
                        <select id="crewStatus" required>
                            <option value="active" ${member?.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${member?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">${member ? 'Update' : 'Add'}</button>
                </div>
            </form>
        `;

        document.getElementById('crewForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCrew(member?.id);
        });

        modal.classList.add('active');
    }

    saveCrew(id = null) {
        const data = this.storage.getData();
        const pin = document.getElementById('crewPin').value;
        const username = document.getElementById('crewUsername').value.trim();
        const password = document.getElementById('crewPassword').value;
        
        // Validate PIN
        if (!/^\d{4}$/.test(pin)) {
            alert('PIN must be exactly 4 digits');
            return;
        }
        
        // Validate username and password if provided
        if (username) {
            if (username.length < 3) {
                alert('Username must be at least 3 characters long');
                return;
            }
            
            // Check if username already exists (for other crew members)
            const usernameExists = data.crew.some(c => c.id !== id && c.username && c.username.toLowerCase() === username.toLowerCase());
            if (usernameExists) {
                alert('Username already taken. Please choose a different username.');
                return;
            }
            
            if (!password || password.length < 6) {
                alert('Password is required and must be at least 6 characters long when username is set');
                return;
            }
        }

        const crewData = {
            id: id || Date.now(),
            name: document.getElementById('crewName').value,
            employeeId: document.getElementById('crewEmployeeId').value,
            position: document.getElementById('crewPosition').value,
            hourlyRate: parseFloat(document.getElementById('crewHourlyRate').value),
            phone: document.getElementById('crewPhone').value,
            email: document.getElementById('crewEmail').value,
            username: username || (id ? data.crew.find(c => c.id === id)?.username || null : null),
            password: password || (id ? data.crew.find(c => c.id === id)?.password || null : null),
            pin: pin,
            status: document.getElementById('crewStatus').value,
            currentlyClocked: id ? data.crew.find(c => c.id === id)?.currentlyClocked || false : false,
            currentJob: id ? data.crew.find(c => c.id === id)?.currentJob || null : null
        };

        if (id) {
            const index = data.crew.findIndex(c => c.id === id);
            data.crew[index] = crewData;
            this.storage.addActivity(`Updated crew member: ${crewData.name}`);
        } else {
            data.crew.push(crewData);
            this.storage.addActivity(`Added new crew member: ${crewData.name}`);
        }

        this.storage.saveData(data);
        document.getElementById('modal').classList.remove('active');
        this.renderCrew();
        this.updateDashboard();
    }

    editCrew(id) {
        const data = this.storage.getData();
        const member = data.crew.find(c => c.id === id);
        this.showCrewModal(member);
    }

    deleteCrew(id) {
        if (!confirm('Are you sure you want to delete this crew member?')) return;
        
        const data = this.storage.getData();
        const member = data.crew.find(c => c.id === id);
        
        // Check if crew member is currently clocked in
        if (member.currentlyClocked) {
            alert('Cannot delete a crew member who is currently clocked in. Please clock them out first.');
            return;
        }

        data.crew = data.crew.filter(c => c.id !== id);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted crew member: ${member.name}`);
        this.renderCrew();
        this.updateDashboard();
    }

    // Time Tracking Methods
    updateCrewLoginDropdown() {
        const data = this.storage.getData();
        const select = document.getElementById('crewLoginSelect');
        
        select.innerHTML = '<option value="">Select crew member...</option>' + 
            data.crew.filter(c => c.status === 'active').map(c => 
                `<option value="${c.id}">${c.name} - ${c.position}</option>`
            ).join('');
    }

    // Invitation Management Methods
    setupInvitationManagement() {
        // Check if accessing via invitation link
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        if (inviteCode) {
            this.handleInvitationLink(inviteCode);
        }
    }

    showInviteCrewModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>Invite Crew Member</h2>
            <p style="color: #666; margin-bottom: 1.5rem;">Generate an invitation code for a new crew member. They will be able to sign up with crew-only permissions.</p>
            <form id="inviteForm">
                <div class="form-group">
                    <label for="invitePosition">Position</label>
                    <input type="text" id="invitePosition" placeholder="e.g., Mechanic, Welder" required>
                </div>
                <div class="form-group">
                    <label for="inviteHourlyRate">Hourly Rate</label>
                    <input type="number" step="0.01" id="inviteHourlyRate" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label for="inviteExpiry">Invitation Expires</label>
                    <select id="inviteExpiry" required>
                        <option value="24">24 hours</option>
                        <option value="72" selected>3 days</option>
                        <option value="168">7 days</option>
                        <option value="720">30 days</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">Generate Invitation</button>
                </div>
            </form>
        `;

        document.getElementById('inviteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateInvitation();
        });

        modal.classList.add('active');
    }

    generateInvitation() {
        const data = this.storage.getData();
        const position = document.getElementById('invitePosition').value;
        const hourlyRate = parseFloat(document.getElementById('inviteHourlyRate').value);
        const expiryHours = parseInt(document.getElementById('inviteExpiry').value);
        
        // Generate unique invitation code
        const inviteCode = 'INV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);
        
        const invitation = {
            id: Date.now(),
            code: inviteCode,
            position: position,
            hourlyRate: hourlyRate,
            createdAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
            status: 'pending',
            usedBy: null
        };
        
        data.invitations.push(invitation);
        this.storage.saveData(data);
        this.storage.addActivity(`Generated crew invitation for ${position}`);
        
        // Show invitation details
        this.showInvitationDetails(invitation);
    }

    showInvitationDetails(invitation) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${invitation.code}`;
        
        modalBody.innerHTML = `
            <h2>✅ Invitation Generated</h2>
            <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                <div style="margin-bottom: 1rem;">
                    <strong>Invitation Code:</strong>
                    <div style="font-size: 1.5rem; color: var(--primary-color); font-family: monospace; margin: 0.5rem 0;">
                        ${invitation.code}
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Position:</strong> ${invitation.position}<br>
                    <strong>Hourly Rate:</strong> $${invitation.hourlyRate}/hr<br>
                    <strong>Expires:</strong> ${new Date(invitation.expiresAt).toLocaleString()}
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong>Invitation Link:</strong>
                    <div style="background: white; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; word-break: break-all; font-size: 0.85rem;">
                        ${inviteLink}
                    </div>
                </div>
                <button class="btn-primary" onclick="navigator.clipboard.writeText('${inviteLink}').then(() => alert('Link copied to clipboard!'))">📋 Copy Link</button>
                <button class="btn-secondary" onclick="navigator.clipboard.writeText('${invitation.code}').then(() => alert('Code copied to clipboard!'))">📋 Copy Code</button>
            </div>
            <div style="text-align: center;">
                <button class="btn-primary" onclick="app.viewInvitations()">View All Invitations</button>
                <button class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Close</button>
            </div>
        `;
    }

    viewInvitations() {
        const data = this.storage.getData();
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        // Clean up expired invitations
        const now = new Date();
        data.invitations.forEach(inv => {
            if (inv.status === 'pending' && new Date(inv.expiresAt) < now) {
                inv.status = 'expired';
            }
        });
        this.storage.saveData(data);
        
        const invitations = data.invitations.sort((a, b) => b.id - a.id);
        
        modalBody.innerHTML = `
            <h2>Crew Invitations</h2>
            <div style="max-height: 500px; overflow-y: auto; margin: 1rem 0;">
                ${invitations.length === 0 ? '<p style="text-align: center; color: #666;">No invitations yet</p>' : ''}
                ${invitations.map(inv => {
                    const statusColors = {
                        pending: '#FFA500',
                        used: '#4CAF50',
                        expired: '#f44336'
                    };
                    return `
                        <div style="background: #f9f9f9; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid ${statusColors[inv.status]};">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div>
                                    <strong style="font-size: 1.1rem; font-family: monospace;">${inv.code}</strong>
                                    <span style="margin-left: 1rem; padding: 0.25rem 0.5rem; background: ${statusColors[inv.status]}; color: white; border-radius: 4px; font-size: 0.85rem;">
                                        ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                    </span>
                                </div>
                                ${inv.status === 'pending' ? `<button class="btn-delete" onclick="app.revokeInvitation(${inv.id})" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Revoke</button>` : ''}
                            </div>
                            <div style="font-size: 0.9rem; color: #666;">
                                <div><strong>Position:</strong> ${inv.position} | <strong>Rate:</strong> $${inv.hourlyRate}/hr</div>
                                <div><strong>Created:</strong> ${new Date(inv.createdAt).toLocaleString()}</div>
                                <div><strong>Expires:</strong> ${new Date(inv.expiresAt).toLocaleString()}</div>
                                ${inv.usedBy ? `<div><strong>Used by:</strong> ${inv.usedBy}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="text-align: center;">
                <button class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Close</button>
            </div>
        `;
        
        modal.classList.add('active');
    }

    revokeInvitation(invitationId) {
        if (!confirm('Are you sure you want to revoke this invitation?')) return;
        
        const data = this.storage.getData();
        const invitation = data.invitations.find(i => i.id === invitationId);
        
        if (invitation) {
            invitation.status = 'expired';
            this.storage.saveData(data);
            this.storage.addActivity(`Revoked invitation ${invitation.code}`);
            this.viewInvitations();
        }
    }

    handleInvitationLink(inviteCode) {
        const data = this.storage.getData();
        const invitation = data.invitations.find(i => i.code === inviteCode);
        
        if (!invitation) {
            alert('Invalid invitation code');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        if (invitation.status !== 'pending') {
            alert('This invitation has already been used or expired');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        if (new Date(invitation.expiresAt) < new Date()) {
            invitation.status = 'expired';
            this.storage.saveData(data);
            alert('This invitation has expired');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Show crew registration form
        this.showCrewRegistrationForm(invitation);
    }

    showCrewRegistrationForm(invitation) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>🎉 Welcome to the Team!</h2>
            <p style="color: #666; margin-bottom: 1.5rem;">Complete your registration to join as ${invitation.position}</p>
            <form id="crewRegistrationForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="regName">Full Name *</label>
                        <input type="text" id="regName" required>
                    </div>
                    <div class="form-group">
                        <label for="regEmployeeId">Employee ID *</label>
                        <input type="text" id="regEmployeeId" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="regPhone">Phone</label>
                        <input type="tel" id="regPhone">
                    </div>
                    <div class="form-group">
                        <label for="regEmail">Email</label>
                        <input type="email" id="regEmail">
                    </div>
                </div>
                <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <strong>📝 Login Credentials</strong>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #666;">Create your login credentials to access the app</p>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="regUsername">Username *</label>
                        <input type="text" id="regUsername" placeholder="Choose a username" autocomplete="off" required>
                        <small style="color: #666; font-size: 0.85rem;">This will be your login username</small>
                    </div>
                    <div class="form-group">
                        <label for="regPin">PIN Code (4 digits) *</label>
                        <input type="password" id="regPin" maxlength="4" pattern="[0-9]{4}" placeholder="4-digit PIN" required>
                        <small style="color: #666; font-size: 0.85rem;">For quick clock-in on shared devices</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="regPassword">Password *</label>
                        <input type="password" id="regPassword" placeholder="Create password" minlength="6" autocomplete="new-password" required>
                        <small style="color: #666; font-size: 0.85rem;">Minimum 6 characters</small>
                    </div>
                    <div class="form-group">
                        <label for="regPasswordConfirm">Confirm Password *</label>
                        <input type="password" id="regPasswordConfirm" placeholder="Re-enter password" minlength="6" autocomplete="new-password" required>
                    </div>
                </div>
                <div style="background: #e8f5e9; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <strong>Position:</strong> ${invitation.position}<br>
                    <strong>Hourly Rate:</strong> $${invitation.hourlyRate}/hr
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="window.history.replaceState({}, document.title, window.location.pathname); document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">Complete Registration</button>
                </div>
            </form>
        `;

        document.getElementById('crewRegistrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.completeCrewRegistration(invitation);
        });

        modal.classList.add('active');
        
        // Remove invite param from URL but keep modal open
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    completeCrewRegistration(invitation) {
        const pin = document.getElementById('regPin').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        
        // Validate PIN
        if (!/^\d{4}$/.test(pin)) {
            alert('PIN must be exactly 4 digits');
            return;
        }
        
        // Validate username
        if (username.length < 3) {
            alert('Username must be at least 3 characters long');
            return;
        }
        
        // Validate password
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== passwordConfirm) {
            alert('Passwords do not match');
            return;
        }
        
        const data = this.storage.getData();
        
        // Check if username already exists
        const usernameExists = data.crew.some(c => c.username && c.username.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            alert('Username already taken. Please choose a different username.');
            return;
        }
        
        // Create new crew member
        const crewData = {
            id: Date.now(),
            name: document.getElementById('regName').value,
            employeeId: document.getElementById('regEmployeeId').value,
            position: invitation.position,
            hourlyRate: invitation.hourlyRate,
            phone: document.getElementById('regPhone').value,
            email: document.getElementById('regEmail').value,
            username: username,
            password: password,
            pin: pin,
            status: 'active',
            currentlyClocked: false,
            currentJob: null,
            registeredViaInvite: true
        };
        
        data.crew.push(crewData);
        
        // Mark invitation as used
        invitation.status = 'used';
        invitation.usedBy = crewData.name;
        
        this.storage.saveData(data);
        this.storage.addActivity(`${crewData.name} registered as ${crewData.position}`);
        
        // Show success and auto-login
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>✅ Registration Complete!</h2>
            <p style="text-align: center; color: #666; margin: 1rem 0;">
                Welcome aboard, ${crewData.name}!<br>
                Your account has been created successfully.
            </p>
            <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; text-align: left;">
                <strong style="color: #2ecc71; display: block; margin-bottom: 1rem;">📋 Your Login Credentials</strong>
                <div style="font-size: 0.95rem; line-height: 2;">
                    <strong>Username:</strong> <span style="font-family: monospace; background: white; padding: 0.25rem 0.5rem; border-radius: 4px;">${username}</span><br>
                    <strong>PIN:</strong> <span style="font-family: monospace; background: white; padding: 0.25rem 0.5rem; border-radius: 4px;">${pin}</span>
                </div>
                <p style="margin-top: 1rem; font-size: 0.85rem; color: #666;">
                    💡 Save these credentials! You'll need them to login.
                </p>
            </div>
            <div style="text-align: center;">
                <button class="btn-primary" onclick="app.autoLoginNewCrew(${crewData.id})">Login Now</button>
            </div>
        `;
    }

    autoLoginNewCrew(crewId) {
        // Close modal
        document.getElementById('modal').classList.remove('active');
        
        // Navigate to crew login
        this.switchView('crew');
        this.switchCrewMode('login');
        
        // Store crew session
        sessionStorage.setItem('loggedInCrew', crewId);
        sessionStorage.setItem('isCrewMode', 'true');
        
        // Hide navigation and show crew dashboard
        document.querySelector('.main-nav').style.display = 'none';
        document.querySelector('.crew-mode-selector').style.display = 'none';
        document.querySelector('.crew-login-container').style.display = 'none';
        document.getElementById('crewDashboard').style.display = 'block';
        
        // Update UI
        const data = this.storage.getData();
        const crew = data.crew.find(c => c.id === crewId);
        if (crew) {
            document.getElementById('crewWelcome').textContent = `Welcome, ${crew.name}`;
            this.updateCrewStatus();
            this.updateCrewJobList();
            this.updateCrewTodayLog();
        }
    }

    switchLoginTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.login-tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            btn.style.color = isActive ? 'var(--primary-color)' : '#666';
            btn.style.borderBottomColor = isActive ? 'var(--primary-color)' : 'transparent';
        });
        
        // Update forms
        document.getElementById('usernameLoginForm').style.display = tab === 'username' ? 'block' : 'none';
        document.getElementById('quickLoginForm').style.display = tab === 'quick' ? 'block' : 'none';
    }

    crewLoginWithCredentials() {
        const data = this.storage.getData();
        const username = document.getElementById('crewLoginUsername').value.trim();
        const password = document.getElementById('crewLoginPassword').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        // Find crew member by username
        const crew = data.crew.find(c => c.username && c.username.toLowerCase() === username.toLowerCase());
        
        if (!crew) {
            alert('Invalid username or password');
            return;
        }

        if (crew.password !== password) {
            alert('Invalid username or password');
            return;
        }

        if (crew.status !== 'active') {
            alert('Your account is inactive. Please contact the administrator.');
            return;
        }

        // Successful login
        this.completeCrewLogin(crew);
    }

    crewLoginWithPin() {
        const data = this.storage.getData();
        const crewId = parseInt(document.getElementById('crewLoginSelect').value);
        const pin = document.getElementById('crewLoginPin').value;

        if (!crewId) {
            alert('Please select a crew member');
            return;
        }

        const crew = data.crew.find(c => c.id === crewId);
        if (!crew) {
            alert('Crew member not found');
            return;
        }

        if (crew.pin !== pin) {
            alert('Incorrect PIN code');
            return;
        }

        if (crew.status !== 'active') {
            alert('Your account is inactive. Please contact the administrator.');
            return;
        }

        // Successful login
        this.completeCrewLogin(crew);
    }

    completeCrewLogin(crew) {
        // Store logged in crew member
        sessionStorage.setItem('loggedInCrew', crew.id);
        sessionStorage.setItem('isCrewMode', 'true');
        
        // Hide navigation and other content for crew members
        document.querySelector('.main-nav').style.display = 'none';
        document.querySelector('.crew-mode-selector').style.display = 'none';
        
        // Show crew dashboard
        document.querySelector('.crew-login-container').style.display = 'none';
        document.getElementById('crewDashboard').style.display = 'block';
        
        // Update UI
        document.getElementById('crewWelcome').textContent = `Welcome, ${crew.name}`;
        this.updateCrewStatus();
        this.updateCrewJobList();
        this.updateCrewTodayLog();
        
        // Clear login forms
        document.getElementById('crewLoginUsername').value = '';
        document.getElementById('crewLoginPassword').value = '';
        document.getElementById('crewLoginPin').value = '';
    }

    crewLogout() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);

        if (crew && crew.currentlyClocked) {
            if (!confirm('You are currently clocked in. Are you sure you want to logout?')) {
                return;
            }
        }

        sessionStorage.removeItem('loggedInCrew');
        sessionStorage.removeItem('isCrewMode');
        
        // Restore navigation and mode selector for admin
        document.querySelector('.main-nav').style.display = 'flex';
        document.querySelector('.crew-mode-selector').style.display = 'flex';
        
        document.querySelector('.crew-login-container').style.display = 'flex';
        document.getElementById('crewDashboard').style.display = 'none';
        document.getElementById('crewLoginSelect').value = '';
        document.getElementById('crewLoginPin').value = '';
    }

    updateCrewStatus() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);

        if (!crew) return;

        const statusEl = document.getElementById('crewStatus');
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');
        const jobCard = document.getElementById('jobSelectionCard');

        if (crew.currentlyClocked) {
            statusEl.textContent = 'Status: Clocked In';
            statusEl.className = 'crew-status-text clocked-in';
            clockInBtn.style.display = 'none';
            clockOutBtn.style.display = 'block';
            jobCard.style.display = 'block';
        } else {
            statusEl.textContent = 'Status: Clocked Out';
            statusEl.className = 'crew-status-text';
            clockInBtn.style.display = 'block';
            clockOutBtn.style.display = 'none';
            jobCard.style.display = 'none';
        }
    }

    updateCrewJobList() {
        const data = this.storage.getData();
        const select = document.getElementById('crewJobSelect');
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);

        const activeJobs = data.jobs.filter(j => j.status === 'in-progress' || j.status === 'pending');
        
        select.innerHTML = '<option value="">No job selected</option>' + 
            activeJobs.map(j => 
                `<option value="${j.id}" ${crew?.currentJob == j.id ? 'selected' : ''}>${j.title} - ${j.equipment}</option>`
            ).join('');

        this.updateCurrentJobInfo();
    }

    updateCurrentJobInfo() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);
        const infoDiv = document.getElementById('currentJobInfo');

        if (!crew || !crew.currentJob) {
            infoDiv.innerHTML = '<p style="color: #666;">No job selected</p>';
            return;
        }

        const job = data.jobs.find(j => j.id == crew.currentJob);
        if (job) {
            infoDiv.innerHTML = `
                <strong>Current Job:</strong> ${job.title}<br>
                <strong>Equipment:</strong> ${job.equipment}<br>
                <strong>Priority:</strong> ${job.priority}
            `;
        }
    }

    clockIn() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);

        if (!crew) return;

        const now = new Date();
        
        // Create time entry
        const timeEntry = {
            id: Date.now(),
            crewId: crewId,
            crewName: crew.name,
            clockIn: now.toISOString(),
            clockOut: null,
            jobId: null,
            jobTitle: null,
            duration: 0
        };

        data.timeEntries.push(timeEntry);
        
        // Update crew status
        const crewIndex = data.crew.findIndex(c => c.id === crewId);
        data.crew[crewIndex].currentlyClocked = true;
        data.crew[crewIndex].currentTimeEntryId = timeEntry.id;

        this.storage.saveData(data);
        this.storage.addActivity(`${crew.name} clocked in`);
        
        this.updateCrewStatus();
        this.updateCrewTodayLog();
    }

    clockOut() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);

        if (!crew || !crew.currentlyClocked) return;

        const now = new Date();
        const timeEntry = data.timeEntries.find(t => t.id === crew.currentTimeEntryId);

        if (timeEntry) {
            timeEntry.clockOut = now.toISOString();
            const clockInTime = new Date(timeEntry.clockIn);
            timeEntry.duration = (now - clockInTime) / (1000 * 60 * 60); // hours
        }

        // Update crew status
        const crewIndex = data.crew.findIndex(c => c.id === crewId);
        data.crew[crewIndex].currentlyClocked = false;
        data.crew[crewIndex].currentJob = null;
        data.crew[crewIndex].currentTimeEntryId = null;

        this.storage.saveData(data);
        this.storage.addActivity(`${crew.name} clocked out`);
        
        this.updateCrewStatus();
        this.updateCrewTodayLog();
    }

    changeCrewJob() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const crew = data.crew.find(c => c.id === crewId);
        const jobId = document.getElementById('crewJobSelect').value;

        if (!crew || !crew.currentlyClocked) return;

        const job = jobId ? data.jobs.find(j => j.id == jobId) : null;

        // Update current time entry with job info
        const timeEntry = data.timeEntries.find(t => t.id === crew.currentTimeEntryId);
        if (timeEntry) {
            timeEntry.jobId = jobId ? parseInt(jobId) : null;
            timeEntry.jobTitle = job ? job.title : null;
        }

        // Update crew current job
        const crewIndex = data.crew.findIndex(c => c.id === crewId);
        data.crew[crewIndex].currentJob = jobId ? parseInt(jobId) : null;

        this.storage.saveData(data);
        this.storage.addActivity(`${crew.name} switched to job: ${job ? job.title : 'None'}`);
        
        this.updateCurrentJobInfo();
        this.updateCrewTodayLog();
    }

    updateCrewTodayLog() {
        const data = this.storage.getData();
        const crewId = parseInt(sessionStorage.getItem('loggedInCrew'));
        const logDiv = document.getElementById('crewTodayLog');

        const today = new Date().toDateString();
        const todayEntries = data.timeEntries.filter(t => 
            t.crewId === crewId && new Date(t.clockIn).toDateString() === today
        );

        if (todayEntries.length === 0) {
            logDiv.innerHTML = '<div class="empty-state"><p>No time entries for today</p></div>';
            return;
        }

        logDiv.innerHTML = todayEntries.map(entry => {
            const clockIn = new Date(entry.clockIn);
            const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
            const isActive = !entry.clockOut;
            
            let durationText = '';
            if (clockOut) {
                durationText = `${entry.duration.toFixed(2)} hrs`;
            } else {
                const now = new Date();
                const currentDuration = (now - clockIn) / (1000 * 60 * 60);
                durationText = `${currentDuration.toFixed(2)} hrs (In Progress)`;
            }

            return `
                <div class="time-log-item ${isActive ? 'active' : ''}">
                    <div>
                        <div class="time-log-time">${clockIn.toLocaleTimeString()} - ${clockOut ? clockOut.toLocaleTimeString() : 'In Progress'}</div>
                        <div style="font-size: 0.9rem; color: #666;">${entry.jobTitle || 'No job assigned'}</div>
                    </div>
                    <div class="time-log-duration">${durationText}</div>
                </div>
            `;
        }).join('');
    }

    renderTimesheet() {
        const data = this.storage.getData();
        const startDateInput = document.getElementById('timesheetStartDate');
        const endDateInput = document.getElementById('timesheetEndDate');

        // Set default dates (last 7 days)
        if (!startDateInput.value) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDateInput.value = startDate.toISOString().split('T')[0];
            endDateInput.value = endDate.toISOString().split('T')[0];
        }

        this.filterTimesheet();
    }

    filterTimesheet() {
        const data = this.storage.getData();
        const startDate = new Date(document.getElementById('timesheetStartDate').value);
        const endDate = new Date(document.getElementById('timesheetEndDate').value);
        endDate.setHours(23, 59, 59);

        const timesheetList = document.getElementById('timesheetList');

        // Group entries by crew member
        const entriesByCrew = {};
        data.timeEntries.forEach(entry => {
            const entryDate = new Date(entry.clockIn);
            if (entryDate >= startDate && entryDate <= endDate) {
                if (!entriesByCrew[entry.crewId]) {
                    entriesByCrew[entry.crewId] = {
                        name: entry.crewName,
                        entries: []
                    };
                }
                entriesByCrew[entry.crewId].entries.push(entry);
            }
        });

        if (Object.keys(entriesByCrew).length === 0) {
            timesheetList.innerHTML = '<div class="empty-state"><p>No time entries found for the selected date range</p></div>';
            return;
        }

        timesheetList.innerHTML = Object.entries(entriesByCrew).map(([crewId, crewData]) => {
            const totalHours = crewData.entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
            const crew = data.crew.find(c => c.id == crewId);
            const totalCost = crew ? totalHours * crew.hourlyRate : 0;

            return `
                <div class="timesheet-card">
                    <div class="timesheet-header">
                        <div>
                            <h3>${crewData.name}</h3>
                            <p style="color: #666; margin-top: 0.25rem;">${crewData.entries.length} entries</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-color);">${totalHours.toFixed(2)} hrs</div>
                            <div style="color: #666;">Total Cost: $${totalCost.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="timesheet-entries">
                        ${crewData.entries.map(entry => {
                            const clockIn = new Date(entry.clockIn);
                            const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                            return `
                                <div class="timesheet-entry">
                                    <div class="entry-time">${clockIn.toLocaleDateString()}<br>${clockIn.toLocaleTimeString()}</div>
                                    <div>${entry.jobTitle || 'No job assigned'}</div>
                                    <div class="entry-duration">${entry.duration ? entry.duration.toFixed(2) + ' hrs' : 'In Progress'}</div>
                                    <div>${clockOut ? clockOut.toLocaleTimeString() : 'Clocked In'}</div>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn-edit" style="padding: 0.5rem; font-size: 0.85rem;" onclick="app.editTimeEntry(${entry.id})">Edit</button>
                                        <button class="btn-delete" style="padding: 0.5rem; font-size: 0.85rem;" onclick="app.deleteTimeEntry(${entry.id})">Delete</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    viewCrewTimesheet(crewId) {
        this.switchCrewMode('timesheet');
        
        // Set date range to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('timesheetStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('timesheetEndDate').value = endDate.toISOString().split('T')[0];
        
        // Filter to show only this crew member
        const data = this.storage.getData();
        const startDateObj = startDate;
        const endDateObj = endDate;
        endDateObj.setHours(23, 59, 59);

        const timesheetList = document.getElementById('timesheetList');
        const crew = data.crew.find(c => c.id === crewId);
        
        const entries = data.timeEntries.filter(entry => {
            const entryDate = new Date(entry.clockIn);
            return entry.crewId === crewId && entryDate >= startDateObj && entryDate <= endDateObj;
        });

        if (entries.length === 0) {
            timesheetList.innerHTML = '<div class="empty-state"><p>No time entries found for this crew member in the last 30 days</p></div>';
            return;
        }

        const totalHours = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
        const totalCost = totalHours * crew.hourlyRate;

        timesheetList.innerHTML = `
            <div class="timesheet-card">
                <div class="timesheet-header">
                    <div>
                        <h3>${crew.name}</h3>
                        <p style="color: #666; margin-top: 0.25rem;">${entries.length} entries (Last 30 days)</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.3rem; font-weight: bold; color: var(--accent-color);">${totalHours.toFixed(2)} hrs</div>
                        <div style="color: #666;">Total Cost: $${totalCost.toFixed(2)}</div>
                    </div>
                </div>
                <div class="timesheet-entries">
                    ${entries.map(entry => {
                        const clockIn = new Date(entry.clockIn);
                        const clockOut = entry.clockOut ? new Date(entry.clockOut) : null;
                        return `
                            <div class="timesheet-entry">
                                <div class="entry-time">${clockIn.toLocaleDateString()}<br>${clockIn.toLocaleTimeString()}</div>
                                <div>${entry.jobTitle || 'No job assigned'}</div>
                                <div class="entry-duration">${entry.duration ? entry.duration.toFixed(2) + ' hrs' : 'In Progress'}</div>
                                <div>${clockOut ? clockOut.toLocaleTimeString() : 'Clocked In'}</div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn-edit" style="padding: 0.5rem; font-size: 0.85rem;" onclick="app.editTimeEntry(${entry.id})">Edit</button>
                                    <button class="btn-delete" style="padding: 0.5rem; font-size: 0.85rem;" onclick="app.deleteTimeEntry(${entry.id})">Delete</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    editTimeEntry(entryId) {
        const data = this.storage.getData();
        const entry = data.timeEntries.find(e => e.id === entryId);
        
        if (!entry) {
            alert('Time entry not found');
            return;
        }

        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        // Format dates for input fields
        const clockInDate = new Date(entry.clockIn);
        const clockInDateStr = clockInDate.toISOString().split('T')[0];
        const clockInTimeStr = clockInDate.toTimeString().split(' ')[0].substring(0, 5);
        
        let clockOutDateStr = '';
        let clockOutTimeStr = '';
        if (entry.clockOut) {
            const clockOutDate = new Date(entry.clockOut);
            clockOutDateStr = clockOutDate.toISOString().split('T')[0];
            clockOutTimeStr = clockOutDate.toTimeString().split(' ')[0].substring(0, 5);
        }

        // Get job list
        const jobOptions = data.jobs.map(j => 
            `<option value="${j.id}" ${entry.jobId == j.id ? 'selected' : ''}>${j.title} - ${j.equipment}</option>`
        ).join('');
        
        modalBody.innerHTML = `
            <h2>Edit Time Entry</h2>
            <form id="timeEntryForm">
                <div class="form-group">
                    <label>Crew Member</label>
                    <input type="text" value="${entry.crewName}" disabled class="form-control">
                </div>
                
                <div class="invoice-section">
                    <h3>Clock In</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="clockInDate">Date *</label>
                            <input type="date" id="clockInDate" value="${clockInDateStr}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="clockInTime">Time *</label>
                            <input type="time" id="clockInTime" value="${clockInTimeStr}" required class="form-control">
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Clock Out</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="clockOutDate">Date</label>
                            <input type="date" id="clockOutDate" value="${clockOutDateStr}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="clockOutTime">Time</label>
                            <input type="time" id="clockOutTime" value="${clockOutTimeStr}" class="form-control">
                        </div>
                    </div>
                    <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">Leave empty if still clocked in</p>
                </div>

                <div class="form-group">
                    <label for="timeEntryJob">Job Assignment</label>
                    <select id="timeEntryJob" class="form-control">
                        <option value="">No job assigned</option>
                        ${jobOptions}
                    </select>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn-primary">Update Time Entry</button>
                </div>
            </form>
        `;

        document.getElementById('timeEntryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTimeEntry(entryId);
        });

        modal.classList.add('active');
    }

    saveTimeEntry(entryId) {
        const data = this.storage.getData();
        const entry = data.timeEntries.find(e => e.id === entryId);
        
        if (!entry) return;

        // Get form values
        const clockInDate = document.getElementById('clockInDate').value;
        const clockInTime = document.getElementById('clockInTime').value;
        const clockOutDate = document.getElementById('clockOutDate').value;
        const clockOutTime = document.getElementById('clockOutTime').value;
        const jobId = document.getElementById('timeEntryJob').value;

        // Validate
        if (!clockInDate || !clockInTime) {
            alert('Clock in date and time are required');
            return;
        }

        // Update clock in
        const clockIn = new Date(`${clockInDate}T${clockInTime}`);
        entry.clockIn = clockIn.toISOString();

        // Update clock out if provided
        if (clockOutDate && clockOutTime) {
            const clockOut = new Date(`${clockOutDate}T${clockOutTime}`);
            
            // Validate clock out is after clock in
            if (clockOut <= clockIn) {
                alert('Clock out time must be after clock in time');
                return;
            }
            
            entry.clockOut = clockOut.toISOString();
            entry.duration = (clockOut - clockIn) / (1000 * 60 * 60); // hours
        } else {
            entry.clockOut = null;
            entry.duration = 0;
            
            // If this entry was marked as clocked out but now isn't, update crew status
            const crew = data.crew.find(c => c.id === entry.crewId);
            if (crew && crew.currentTimeEntryId === entryId) {
                const crewIndex = data.crew.findIndex(c => c.id === entry.crewId);
                data.crew[crewIndex].currentlyClocked = true;
            }
        }

        // Update job
        if (jobId) {
            const job = data.jobs.find(j => j.id == jobId);
            entry.jobId = parseInt(jobId);
            entry.jobTitle = job ? job.title : null;
        } else {
            entry.jobId = null;
            entry.jobTitle = null;
        }

        this.storage.saveData(data);
        this.storage.addActivity(`Updated time entry for ${entry.crewName}`);
        
        document.getElementById('modal').classList.remove('active');
        this.renderTimesheet();
    }

    deleteTimeEntry(entryId) {
        if (!confirm('Are you sure you want to delete this time entry?')) return;
        
        const data = this.storage.getData();
        const entry = data.timeEntries.find(e => e.id === entryId);
        
        if (!entry) return;

        // Check if this is an active time entry (crew member is clocked in)
        const crew = data.crew.find(c => c.id === entry.crewId && c.currentTimeEntryId === entryId);
        if (crew) {
            alert('Cannot delete an active time entry. Please clock out the crew member first.');
            return;
        }

        data.timeEntries = data.timeEntries.filter(e => e.id !== entryId);
        this.storage.saveData(data);
        this.storage.addActivity(`Deleted time entry for ${entry.crewName}`);
        
        this.renderTimesheet();
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MechShopApp();
});
