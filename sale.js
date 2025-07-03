import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp, query, where, writeBatch, getDocs, orderBy, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyB5z3SC6H8SSVz9OI5GwZ6z45ZH6_qefoU", authDomain: "appmanageshop2.firebaseapp.com", projectId: "appmanageshop2", storageBucket: "appmanageshop2.appspot.com", messagingSenderId: "1033090468638", appId: "1:1033090468638:web:469da6ed32a3c5b769970f" };
const salesApp = initializeApp(firebaseConfig, "salesApp");
const auth = getAuth(salesApp);
const db = getFirestore(salesApp);

const Notification = {
    show(message, type = 'success') {
        const el = document.getElementById('notification');
        el.textContent = message;
        el.className = `fixed px-6 py-4 rounded-lg text-white font-medium z-50`;
        el.classList.add('show', type === 'success' ? 'bg-green-500' : 'bg-red-500');
        setTimeout(() => el.classList.remove('show'), 3000);
    }
};
const formatCurrencyKHR = (number) => new Intl.NumberFormat('km-KH', { style: 'currency', currency: 'KHR', minimumFractionDigits: 0 }).format(number);

const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const formatDateHeader = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'ថ្ងៃនេះ';
    if (dateStr === yesterdayStr) return 'ម្សិលមិញ';
    
    const day = date.getDate();
    const month = khmerMonths[date.getMonth()];
    return `${day} ${month}`;
};


const Auth = {
    init() {
        this.cacheDOMElements();
        this.bindEvents();
        this.loadProvinces();
        onAuthStateChanged(auth, this.handleAuthStateChange.bind(this));
    },
    cacheDOMElements() {
        this.loginView = document.getElementById('login-view');
        this.signupView = document.getElementById('signup-view');
        this.mainAppView = document.getElementById('main-app-view');
        this.loadingView = document.getElementById('loading-view');
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.logoutBtn = document.getElementById('logout-btn');
        this.showSignupBtn = document.getElementById('show-signup');
        this.showLoginBtn = document.getElementById('show-login');
    },
    bindEvents() {
        if (this.loginForm) this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
        if (this.signupForm) this.signupForm.addEventListener('submit', this.handleSignup.bind(this));
        if (this.logoutBtn) this.logoutBtn.addEventListener('click', () => signOut(auth));
        if (this.showSignupBtn) this.showSignupBtn.addEventListener('click', (e) => { e.preventDefault(); this.switchView('signup'); });
        if (this.showLoginBtn) this.showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); this.switchView('login'); });
    },
    async loadProvinces() {
        const selectEl = document.getElementById('signup-province');
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="" disabled selected>-- ជ្រើសរើសតំបន់ --</option>';
        try {
            const q = query(collection(db, "regions"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const region = doc.data();
                const option = new Option(region.name, region.name);
                selectEl.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading regions: ", error);
            selectEl.innerHTML = '<option value="">មិនអាចទាញយកតំបន់បានទេ</option>';
        }
    },
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = viewName.includes('app') ? 'block' : 'flex';
        }
        document.documentElement.classList.toggle('no-scroll', ['login', 'loading', 'signup'].includes(viewName));
        document.body.classList.toggle('no-scroll', ['login', 'loading', 'signup'].includes(viewName));
    },
    async handleAuthStateChange(user) {
        if (user) {
            this.switchView('loading');
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists() && userDocSnap.data().status === 'approved') {
                    App.init(user.uid, userDocSnap.data());
                    this.switchView('main-app');
                } else {
                    Notification.show('គណនីរបស់អ្នកមិនមានសិទ្ធិ ឬមិនទាន់បានយល់ព្រម', 'error');
                    signOut(auth);
                }
            } catch (error) {
                console.error("Auth State Change Error:", error);
                Notification.show('មានបញ្ហាក្នុងការពិនិត្យសិទ្ធិ', 'error');
                signOut(auth);
            }
        } else {
            this.switchView('login');
        }
    },
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            Notification.show('អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ', 'error');
        }
    },
    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const province = document.getElementById('signup-province').value;
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        if (!name || !phone || !province || !email || !password) {
            Notification.show('សូមបំពេញព័ត៌មានឲ្យបានគ្រប់គ្រាន់', 'error');
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            await setDoc(doc(db, "users", newUser.uid), { name, phone, province, email, role: 'employee', status: 'pending', createdAt: serverTimestamp() });
            await signOut(auth);
            Notification.show("ការចុះឈ្មោះបានជោគជ័យ! សូមរង់ចាំការយល់ព្រមពី Admin។", "success");
            this.signupForm.reset();
            this.switchView('login');
        } catch (error) {
            Notification.show(error.code === 'auth/email-already-in-use' ? 'អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ។' : 'មានបញ្ហាក្នុងការចុះឈ្មោះ។', 'error');
            console.error("Signup error:", error);
        }
    },
};

const App = {
    currentUser: null,
    currentUserId: null,
    map: null,
    handStock: { cases: 0, lots: 0, packs: 0 },
    unsubscribeHandStock: null,
    selectedDepot: null,
    userMarker: null,
    depotLayer: L.markerClusterGroup(),
    reportSummary: {},

    async init(uid, userData) {
        this.currentUserId = uid;
        this.currentUser = userData;
        this.cacheDOMElements();
        this.bindEvents();
        this.renderHeader();
        this.listenToHandStock();
        this.renderAllTabs();
        this.switchTab('map');
    },
    
    cacheDOMElements() {
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.selectedDepotBar = document.getElementById('selected-depot-bar');
        this.selectedDepotName = document.getElementById('selected-depot-name');
        this.modal = document.getElementById('universal-modal');
        this.modalContent = document.getElementById('modal-content');
    },

    bindEvents() {
        this.tabButtons.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab)));
        this.selectedDepotBar.addEventListener('click', (e) => {
            if (e.target.id === 'clear-depot-btn') this.clearSelectedDepot();
            else if (e.target.id === 'could-not-sell-btn') this.showCouldNotSellModal();
            else if (e.target.id === 'damaged-exchange-btn') this.showDamagedExchangeModal();
        });
        this.modal.addEventListener('click', e => { if (e.target === this.modal) this.closeModal(); });
    },

    listenToHandStock() {
        if (this.unsubscribeHandStock) this.unsubscribeHandStock();
        const stockRef = doc(db, "handStocks", this.currentUserId);
        this.unsubscribeHandStock = onSnapshot(stockRef, (docSnap) => {
            this.handStock = docSnap.exists() ? docSnap.data() : { cases: 0, lots: 0, packs: 0 };
            this.updateHandStockDisplay();
        });
    },

    updateHandStockDisplay() {
        const stockContainer = document.getElementById('current-stock-display');
        if (stockContainer) {
            const casesDisplay = stockContainer.querySelector('div:nth-child(1) p.text-2xl');
            const lotsDisplay = stockContainer.querySelector('div:nth-child(2) p.text-2xl');
            const packsDisplay = stockContainer.querySelector('div:nth-child(3) p.text-2xl');

            if (casesDisplay) casesDisplay.textContent = this.handStock.cases || 0;
            if (lotsDisplay) lotsDisplay.textContent = this.handStock.lots || 0;
            if (packsDisplay) packsDisplay.textContent = this.handStock.packs || 0;
        }
    },
    
    renderAllTabs() {
        this.renderSalesTab();
        this.renderOperationsTab();
        this.renderDepotsTab();
        this.initMap();
    },

    renderHeader() {
        document.getElementById('employee-name').textContent = this.currentUser.name;
        document.getElementById('employee-phone').textContent = this.currentUser.phone;
    },

    switchTab(tabId) {
        this.tabContents.forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(`${tabId}-content`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('animate-fadeIn');
        }
        this.tabButtons.forEach(b => {
            b.classList.remove('active');
            if (b.dataset.tab === tabId) b.classList.add('active');
        });

        if (tabId === 'map' && this.map) setTimeout(() => this.map.invalidateSize(), 1);
        if (tabId === 'report') this.renderReportTab();
        if (tabId === 'operations') this.updateHandStockDisplay();
    },

    selectDepot(depot) {
        this.selectedDepot = depot;
        this.renderSelectedDepotBar();
        this.switchTab('sales');
    },

    clearSelectedDepot() {
        this.selectedDepot = null;
        this.renderSelectedDepotBar();
    },

    renderSelectedDepotBar() {
        this.selectedDepotBar.classList.toggle('hidden', !this.selectedDepot);
        if (this.selectedDepot) {
            this.selectedDepotName.textContent = this.selectedDepot.name;
        }
    },

    renderSalesTab() {
        const container = document.getElementById('sales-content');
        onSnapshot(collection(db, "products"), (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `<p class="text-center text-gray-500">មិនមានផលិតផលសម្រាប់លក់ទេ។ សូមទាក់ទង Admin។</p>`;
                return;
            }
            const productCardsHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                const pId = doc.id;
                const stockDisplay = p.stock ? `${p.stock.cases || 0} កេស, ${p.stock.lots || 0} ឡូ, ${p.stock.packs || 0} កញ្ចប់` : 'មិនមានข้อมูลสต็อก';
                return `
                    <div class="bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                        <img src="${p.image || 'https://placehold.co/600x400/a5b4fc/ffffff?text=Image'}" alt="${p.name}" class="aspect-video object-cover">
                        <div class="p-4 flex flex-col flex-grow">
                            <h3 class="font-bold text-md truncate">${p.name}</h3>
                            <p class="text-xs text-gray-500">${stockDisplay}</p>
                            <div class="flex-grow"></div>
                            <p class="text-lg font-bold text-indigo-600 mt-2">${formatCurrencyKHR(p.price)}</p>
                            <button class="sale-btn mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2" data-product-id='${pId}'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.16"/></svg>
                                <span class="ml-2">លក់</span>
                            </button>
                        </div>
                    </div>`;
            }).join('');
            container.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">${productCardsHTML}</div>`;
            container.querySelectorAll('.sale-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleSale(e.currentTarget.dataset.productId)));
        });
    },

    renderOperationsTab() {
        document.getElementById('operations-content').innerHTML = `
            <div class="space-y-6">
                <div class="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">ទំនិញក្នុងដៃ</h3>
                    <div id="current-stock-display" class="grid grid-cols-3 gap-4 text-center">
                        <div><p class="text-2xl font-bold text-indigo-600">0</p><p class="text-sm text-gray-500">កេស</p></div>
                        <div><p class="text-2xl font-bold text-indigo-600">0</p><p class="text-sm text-gray-500">ឡូ</p></div>
                        <div><p class="text-2xl font-bold text-indigo-600">0</p><p class="text-sm text-gray-500">កញ្ចប់</p></div>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">ដកទំនិញពីឃ្លាំង</h3>
                    <form id="stock-takeout-form" class="space-y-4">
                        <div class="grid grid-cols-3 gap-4">
                            <div><label class="block text-xs text-gray-500 mb-1">កេស</label><input type="number" id="takeout-case" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">ឡូ</label><input type="number" id="takeout-lot" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">កញ្ចប់</label><input type="number" id="takeout-pack" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                        </div>
                        <button type="submit" class="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg font-semibold">បញ្ជាក់ការដក</button>
                    </form>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">បញ្ចូលទំនិញចូលឃ្លាំងវិញ</h3>
                    <form id="stock-return-form" class="space-y-4">
                        <div class="grid grid-cols-3 gap-4">
                            <div><label class="block text-xs text-gray-500 mb-1">កេស</label><input type="number" id="return-case" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">ឡូ</label><input type="number" id="return-lot" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                            <div><label class="block text-xs text-gray-500 mb-1">កញ្ចប់</label><input type="number" id="return-pack" min="0" class="w-full px-3 py-2 border rounded-md" value="0"></div>
                        </div>
                        <button type="submit" class="w-full sm:w-auto bg-red-600 text-white px-6 py-2 rounded-lg font-semibold">បញ្ជាក់ការបញ្ចូលវិញ</button>
                    </form>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">ប្តូរកាវហួសសុពលភាព</h3>
                    <form id="expired-exchange-form" class="space-y-4">
                        <div><label for="expired-quantity" class="block text-sm font-medium text-gray-700">ចំនួនដបដែលបានប្តូរ</label><input type="number" id="expired-quantity" min="1" class="mt-1 w-full px-4 py-2 border rounded-lg" required></div>
                        <button type="submit" class="w-full sm:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold">រក្សាទុក</button>
                    </form>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">កត់ត្រាចំណាយ</h3>
                    <form id="expense-form" class="space-y-4">
                        <div><label for="expense-desc" class="block text-sm font-medium text-gray-700">បរិយាយ</label><input type="text" id="expense-desc" placeholder="ឧ. ថ្លៃសាំង" class="mt-1 w-full px-4 py-2 border rounded-lg" required></div>
                        <div><label for="expense-amount" class="block text-sm font-medium text-gray-700">ចំនួនទឹកប្រាក់ (៛)</label><input type="number" id="expense-amount" min="0" class="mt-1 w-full px-4 py-2 border rounded-lg" required></div>
                        <button type="submit" class="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">រក្សាទុក</button>
                    </form>
                </div>
            </div>`;
        document.getElementById('stock-takeout-form').addEventListener('submit', (e) => this.handleStockTakeout(e));
        document.getElementById('stock-return-form').addEventListener('submit', (e) => this.handleStockReturn(e));
        document.getElementById('expired-exchange-form').addEventListener('submit', (e) => this.handleExpiredExchange(e));
        document.getElementById('expense-form').addEventListener('submit', (e) => this.handleExpense(e));
        this.updateHandStockDisplay();
    },

    renderDepotsTab() {
        const container = document.getElementById('depots-content');
        onSnapshot(query(collection(db, "depots"), orderBy("createdAt", "desc")), (snapshot) => {
            const rows = snapshot.docs.map(d => {
                const depot = d.data();
                const soldDate = depot.lastSoldDate ? depot.lastSoldDate.toDate().toLocaleDateString('en-GB') : 'N/A';
                const statusClass = depot.saleStatus === 'Sold' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                return `<tr class="hover:bg-gray-50">
                            <td class="px-4 py-3"><div class="font-semibold">${depot.name}</div><div class="text-xs text-gray-500">${depot.province}</div></td>
                            <td class="px-4 py-3"><p>${depot.lastSoldBy || 'N/A'}</p><p class="text-xs">${soldDate}</p></td>
                            <td class="px-4 py-3">${depot.lastSoldProduct || 'N/A'}</td>
                            <td class="px-4 py-3"><span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${depot.saleStatus || 'Not Sold'}</span></td>
                        </tr>`;
            }).join('');
            container.innerHTML = snapshot.empty ? `<p class="text-center text-gray-500">មិនទាន់មានដេប៉ូ។</p>` :
                `<div class="bg-white rounded-lg shadow-sm border overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50"><tr>
                            <th class="px-4 py-3 text-left font-semibold">ដេប៉ូ</th>
                            <th class="px-4 py-3 text-left font-semibold">លក់ចុងក្រោយ</th>
                            <th class="px-4 py-3 text-left font-semibold">ទំនិញ</th>
                            <th class="px-4 py-3 text-left font-semibold">ស្ថានភាព</th>
                        </tr></thead>
                        <tbody class="divide-y">${rows}</tbody>
                    </table>
                </div>`;
        });
    },
    
    async renderReportTab() {
        const container = document.getElementById('report-content');
        container.innerHTML = `<div class="text-center text-gray-500 py-10">កំពុងទាញយករបាយការណ៍...</div>`;
        try {
            const salesQuery = query(collection(db, "sales"), where("userId", "==", this.currentUserId));
            const expensesQuery = query(collection(db, "expenses"), where("userId", "==", this.currentUserId));
            const transactionsQuery = query(collection(db, "transactions"), where("userId", "==", this.currentUserId));
            const depotsQuery = query(collection(db, "depots"), where("createdById", "==", this.currentUserId));

            const [salesSnap, expensesSnap, transactionsSnap, depotsSnap] = await Promise.all([getDocs(salesQuery), getDocs(expensesQuery), getDocs(transactionsQuery), getDocs(depotsQuery)]);
            
            const totalSalesIncome = salesSnap.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);
            const totalExpenseAmount = expensesSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            const salesCount = salesSnap.size;
            const newDepotsCount = depotsSnap.size;
            let failedSalesCount = 0;
            let expiredExchangeCount = 0;

            let allActivities = [];
            salesSnap.forEach(doc => allActivities.push({ id: doc.id, type: 'sale', ...doc.data() }));
            expensesSnap.forEach(doc => allActivities.push({ id: doc.id, type: 'expense', ...doc.data() }));
            transactionsSnap.forEach(doc => {
                const data = doc.data();
                allActivities.push({ id: doc.id, ...data });
                if (data.type === 'sale_failed') failedSalesCount++;
                if (data.type === 'expired_exchange') expiredExchangeCount += (data.quantity || 0);
            });

            this.reportSummary = { totalSalesIncome, totalExpenseAmount, salesCount, failedSalesCount, newDepotsCount, expiredExchangeCount };
            
            const summaryHTML = `
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold text-gray-800">របាយការណ៍សង្ខេប (សរុប)</h3>
                            <button id="share-report-btn" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
                                <span>Share</span>
                            </button>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">ចំណូលសរុប</p><p class="text-xl font-bold text-green-600">${formatCurrencyKHR(totalSalesIncome)}</p></div>
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">ចំណាយសរុប</p><p class="text-xl font-bold text-red-600">${formatCurrencyKHR(totalExpenseAmount)}</p></div>
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">លក់បាន</p><p class="text-xl font-bold">${salesCount} ដង</p></div>
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">លក់មិនបាន</p><p class="text-xl font-bold">${failedSalesCount} ដង</p></div>
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">បង្កើតដេប៉ូថ្មី</p><p class="text-xl font-bold">${newDepotsCount} ដេប៉ូ</p></div>
                            <div class="bg-white p-4 rounded-lg shadow-sm"><p class="text-sm text-gray-500">ប្តូរកាវហួសសុពលភាព</p><p class="text-xl font-bold">${expiredExchangeCount} ដប</p></div>
                        </div>
                    </div>`;
            
            allActivities.sort((a, b) => (b.date?.toMillis() || b.createdAt?.toMillis() || 0) - (a.date?.toMillis() || a.createdAt?.toMillis() || 0));
            
            let recentActivitiesHTML = '';
            let lastPrintedDate = null; 

            allActivities.forEach(act => {
                const activityTimestamp = act.date || act.createdAt;
                
                if (activityTimestamp) {
                    const activityDate = activityTimestamp.toDate();
                    const activityDateString = activityDate.toISOString().split('T')[0];

                    if (activityDateString !== lastPrintedDate) {
                        const dateHeaderText = formatDateHeader(activityDate);
                        recentActivitiesHTML += `<div class="date-header bg-gray-100 p-2 text-sm font-bold text-gray-600">${dateHeaderText}</div>`;
                        lastPrintedDate = activityDateString;
                    }
                }

                const time = activityTimestamp ? activityTimestamp.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                let detail = '', amount = '', icon = '', color = '';
                switch (act.type) {
                    case 'sale': icon = `🛍️`; color = 'text-green-600'; detail = `លក់ ${act.productName || ''} ទៅឲ្យ ${act.depotName || ''}`; amount = `+ ${formatCurrencyKHR(act.price || 0)}`; break;
                    case 'sale_failed': icon = `✖️`; color = 'text-red-500'; detail = `លក់មិនបានឲ្យ ${act.depotName || ''}`; amount = act.reason; break;
                    case 'expense': icon = `💸`; color = 'text-red-600'; detail = `ចំណាយ: ${act.description || ''}`; amount = `- ${formatCurrencyKHR(act.amount || 0)}`; break;
                    case 'takeout': icon = `📦`; color = 'text-blue-600'; detail = `បានដកទំនិញពីឃ្លាំង: ${act.items?.cases ?? 0} កេស, ${act.items?.lots ?? 0} ឡូ, ${act.items?.packs ?? 0} កញ្ចប់`; amount = ''; break;
                    case 'return': icon = `↩️`; color = 'text-red-700'; detail = `បានបញ្ជូនទំនិញចូលឃ្លាំងវិញ: ${act.items?.cases ?? 0} កេស, ${act.items?.lots ?? 0} ឡូ, ${act.items?.packs ?? 0} កញ្ចប់`; amount = ''; break;
                    case 'damaged_exchange': icon = `🔄`; color = 'text-orange-500'; detail = `ប្តូរកាវខូចជូន ${act.depotName || ''}`; amount = `${act.items.cases}c, ${act.items.lots}l, ${act.items.packs}p`; break;
                    case 'expired_exchange': icon = `⚠️`; color = 'text-orange-500'; detail = `ប្តូរកាវហួសសុពលភាព`; amount = `${act.quantity} ដប`; break;
                    default: detail = 'ប្រតិបត្តិការមិនស្គាល់'; break;
                }
                recentActivitiesHTML += `
                        <div class="flex items-start space-x-4 p-3 border-b border-gray-200 bg-white">
                            <div class="text-2xl pt-1">${icon}</div>
                            <div class="flex-grow">
                                <p class="font-semibold">${detail}</p>
                                <p class="text-sm text-gray-500">${time}</p>
                            </div>
                            <div class="font-semibold ${color} text-right">${amount}</div>
                        </div>`;
            });

            container.innerHTML = summaryHTML + `<h3 class="text-xl font-bold mt-8 mb-4">ប្រតិបត្តិការទាំងអស់</h3><div class="rounded-lg shadow-sm border">${recentActivitiesHTML || '<p class="p-4 text-center text-gray-500">មិនមានប្រតិបត្តិការ</p>'}</div>`;
            document.getElementById('share-report-btn').addEventListener('click', () => this.handleShareReport());
        } catch (error) {
            console.error("Report Error:", error);
            container.innerHTML = `<p class="text-center text-red-500 py-10">មានបញ្ហាក្នុងការទាញយករបាយការណ៍។ សូមពិនិត្យ Security Rules។</p>`;
        }
    },

    handleShareReport() {
        const summary = this.reportSummary;
        const employeeName = this.currentUser.name;
        const reportDate = new Date().toLocaleDateString('en-GB');
        const shareText = `*របាយការណ៍សង្ខេបសម្រាប់ ${employeeName}*\n*កាលបរិច្ឆេទ: ${reportDate}*\n-----------------------------------\n- ចំណូលសរុប: ${formatCurrencyKHR(summary.totalSalesIncome)}\n- ចំណាយសរុប: ${formatCurrencyKHR(summary.totalExpenseAmount)}\n- លក់បាន: ${summary.salesCount} ដង\n- លក់មិនបាន: ${summary.failedSalesCount} ដង\n- បង្កើតដេប៉ូថ្មី: ${summary.newDepotsCount} ដេប៉ូ\n- ប្តូរកាវហួសសុពលភាព: ${summary.expiredExchangeCount} ដប`;
        if (navigator.share) {
            navigator.share({ title: `របាយការណ៍របស់ ${employeeName}`, text: shareText }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText);
            Notification.show("អត្ថបទ​របាយការណ៍​ត្រូវ​បាន​ចម្លង!", "success");
        }
    },

    initMap() {
        const container = document.getElementById('map-content');
        container.innerHTML = `
                <div class="bg-white p-4 rounded-xl shadow-sm border mb-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <input id="depot-name-input" type="text" placeholder="ឈ្មោះដេប៉ូថ្មី" class="flex-grow w-full sm:w-auto px-4 py-2 border rounded-lg">
                    <button id="pin-new-depot" class="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-8-6-8-12a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>Pin ដេប៉ូនៅទីតាំងខ្ញុំ</span>
                    </button>
                </div>
                <div id="map"></div>`;
        this.map = L.map('map').setView([12.5657, 104.9910], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        this.depotLayer = L.markerClusterGroup();
        this.map.addLayer(this.depotLayer);
        this.startLiveLocation();
        this.listenForDepots();
        document.getElementById('pin-new-depot').addEventListener('click', () => this.handlePinNewDepot());
    },

    startLiveLocation() {
        if (!navigator.geolocation) {
            Notification.show("Geolocation is not supported by your browser", "error");
            return;
        }
        const userIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3049/3049543.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
        navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            const latLng = [latitude, longitude];
            if (!this.userMarker) {
                this.userMarker = L.marker(latLng, { icon: userIcon }).addTo(this.map).bindPopup("ទីតាំងរបស់អ្នក");
                this.map.setView(latLng, 15);
            } else {
                this.userMarker.setLatLng(latLng);
            }
        }, () => {
            Notification.show("Unable to retrieve your location. Please grant permission.", "error");
        }, { enableHighAccuracy: true });
    },

    listenForDepots() {
        onSnapshot(collection(db, "depots"), (snapshot) => {
            this.depotLayer.clearLayers();
            snapshot.forEach(doc => {
                const depot = doc.data();
                if (depot.location) {
                    const marker = L.marker([depot.location.lat, depot.location.lng]);
                    let tooltipContent = `<strong class="text-indigo-700">${depot.name}</strong>`;
                    if (depot.saleStatus) {
                        const statusColor = depot.saleStatus === 'Sold' ? 'text-green-600' : 'text-red-600';
                        const soldDate = depot.lastSoldDate ? depot.lastSoldDate.toDate().toLocaleDateString('en-GB') : '';
                        tooltipContent += `<br><span class="${statusColor}">${depot.saleStatus}</span> ${soldDate}`;
                    }
                    marker.bindTooltip(tooltipContent, { permanent: true, direction: 'top', offset: [0, -15], className: 'leaflet-tooltip-permanent' });
                    marker.on('click', () => {
                        this.selectDepot({ id: doc.id, ...depot });
                    });
                    this.depotLayer.addLayer(marker);
                }
            });
        });
    },
    
    async handlePinNewDepot() {
        const depotNameInput = document.getElementById('depot-name-input');
        const name = depotNameInput.value.trim();
        if (!name) {
            Notification.show("សូមបញ្ចូលឈ្មោះដេប៉ូជាមុនសិន", "error");
            return;
        }
        if (!this.userMarker) {
            Notification.show("មិនអាចកំណត់ទីតាំងរបស់អ្នកបានទេ។ សូមប្រាកដថាអ្នកបានអនុញ្ញាតឲ្យเข้าถึงទីតាំង។", "error");
            return;
        }
        
        const userLocation = this.userMarker.getLatLng();
        let provinceFromApi = '';
        let districtFromApi = '';

        Notification.show("កំពុងស្រង់យកតំបន់...", 'success');

        try {
            const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.lat}&lon=${userLocation.lng}`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                provinceFromApi = data.address.state || '';
                districtFromApi = data.address.county || '';
            }

            await addDoc(collection(db, "depots"), {
                name: name,
                location: { lat: userLocation.lat, lng: userLocation.lng },
                createdById: this.currentUserId,
                createdBy: this.currentUser.name,
                province: provinceFromApi || this.currentUser.province,
                district: districtFromApi,
                createdAt: serverTimestamp(),
                saleStatus: 'Not Sold'
            });

            Notification.show(`បានបង្កើតដេប៉ូ "${name}" នៅ "${districtFromApi}, ${provinceFromApi}" ដោយជោគជ័យ!`, 'success');
            depotNameInput.value = '';

        } catch (error) {
            console.error("Error pinning new depot with reverse geocoding:", error);
            Notification.show("មានបញ្ហាក្នុងការបង្កើតដេប៉ូថ្មី", "error");
        }
    },

    async handleSale(productId) {
        if (!this.selectedDepot) {
            Notification.show("សូមជ្រើសរើសដេប៉ូពីផែនទីជាមុនសិន!", "error");
            this.switchTab('map');
            return;
        }
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
            Notification.show("រកមិនឃើញផលិតផល!", "error");
            return;
        }
        const product = productSnap.data();
        const cost = product.stock || { cases: 0, lots: 0, packs: 0 };
        
        if (this.handStock.cases < cost.cases || this.handStock.lots < cost.lots || this.handStock.packs < cost.packs) {
            Notification.show('ទំនិញក្នុងដៃមិនគ្រប់គ្រាន់!', 'error');
            return;
        }

        if (!confirm(`តើអ្នក​ប្រាកដ​ថា​ចង់​លក់ "${product.name}" ទៅ​ឲ្យដេប៉ូ "${this.selectedDepot.name}"?`)) return;

        try {
            const batch = writeBatch(db);
            const stockRef = doc(db, "handStocks", this.currentUserId);
            const newStock = {
                cases: this.handStock.cases - cost.cases,
                lots: this.handStock.lots - cost.lots,
                packs: this.handStock.packs - cost.packs
            };
            batch.set(stockRef, newStock, { merge: true });

            const salesRef = doc(collection(db, "sales"));
            batch.set(salesRef, {
                userId: this.currentUserId,
                userName: this.currentUser.name,
                province: this.currentUser.province,
                productId,
                productName: product.name,
                depotId: this.selectedDepot.id,
                depotName: this.selectedDepot.name,
                price: product.price,
                date: serverTimestamp()
            });

            const depotRef = doc(db, "depots", this.selectedDepot.id);
            batch.update(depotRef, {
                lastSoldBy: this.currentUser.name,
                lastSoldDate: serverTimestamp(),
                lastSoldProduct: product.name,
                saleStatus: 'Sold'
            });

            await batch.commit();
            Notification.show(`បានលក់ "${product.name}"!`, "success");
            this.clearSelectedDepot();
        } catch (error) {
            console.error("Sale Error: ", error);
            Notification.show("មានបញ្ហាក្នុងការលក់", "error");
        }
    },

    async handleStockTakeout(e) {
        e.preventDefault();
        const form = e.target;
        // ការកែប្រែឲ្យអាន ID ឲ្យត្រូវกับตัวแปร
        const cases = parseInt(form.querySelector('#takeout-case').value) || 0;
        const lots = parseInt(form.querySelector('#takeout-lot').value) || 0;
        const packs = parseInt(form.querySelector('#takeout-pack').value) || 0;

        if (cases === 0 && lots === 0 && packs === 0) return;

        const newStock = {
            cases: (this.handStock.cases || 0) + cases,
            lots: (this.handStock.lots || 0) + lots,
            packs: (this.handStock.packs || 0) + packs
        };

        try {
            const batch = writeBatch(db);
            const stockRef = doc(db, "handStocks", this.currentUserId);
            batch.set(stockRef, newStock, { merge: true });

            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, { type: 'takeout', userId: this.currentUserId, userName: this.currentUser.name, items: { cases, lots, packs }, date: serverTimestamp() });

            await batch.commit();
            Notification.show('បានបន្ថែមទំនិញចូលក្នុងដៃ!', 'success');
            form.reset();
        } catch (error) {
            console.error("Takeout Error: ", error);
            Notification.show("Error processing takeout.", "error");
        }
    },

    async handleStockReturn(e) {
        e.preventDefault();
        const form = e.target;
        // ការកែប្រែឲ្យអាន ID ឲ្យត្រូវกับตัวแปร
        const cases = parseInt(form.querySelector('#return-case').value) || 0;
        const lots = parseInt(form.querySelector('#return-lot').value) || 0;
        const packs = parseInt(form.querySelector('#return-pack').value) || 0;
        
        if (cases === 0 && lots === 0 && packs === 0) return;
        
        if (this.handStock.cases < cases || this.handStock.lots < lots || this.handStock.packs < packs) {
            Notification.show('ទំនិញក្នុងដៃមិនគ្រប់គ្រាន់សម្រាប់កាត់កងទេ!', 'error');
            return;
        }

        const newStock = {
            cases: (this.handStock.cases || 0) - cases,
            lots: (this.handStock.lots || 0) - lots,
            packs: (this.handStock.packs || 0) - packs
        };

        try {
            const batch = writeBatch(db);
            const stockRef = doc(db, "handStocks", this.currentUserId);
            batch.set(stockRef, newStock, { merge: true });

            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, { type: 'return', userId: this.currentUserId, userName: this.currentUser.name, items: { cases, lots, packs }, date: serverTimestamp() });

            await batch.commit();
            Notification.show('បានកត់ត្រាការបញ្ជូនទំនិញចូលឃ្លាំងវិញ!', 'success');
            form.reset();
        } catch (error) {
            console.error("Return Error: ", error);
            Notification.show("Error processing return.", "error");
        }
    },
    

    async handleExpense(e) {
        e.preventDefault();
        const desc = document.getElementById('expense-desc').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        if (!desc || !amount || amount <= 0) {
            Notification.show('សូមបំពេញព័ត៌មានចំណាយឲ្យបានត្រឹមត្រូវ', 'error');
            return;
        }
        try {
            await addDoc(collection(db, "expenses"), {
                userId: this.currentUserId,
                userName: this.currentUser.name,
                description: desc,
                amount: amount,
                date: serverTimestamp()
            });
            Notification.show('បានកត់ត្រាចំណាយដោយជោគជ័យ!', 'success');
            e.target.reset();
        } catch (error) {
            console.error("Expense Error:", error);
            Notification.show("មានបញ្ហាក្នុងការកត់ត្រាចំណាយ", "error");
        }
    },

    async handleExpiredExchange(e) {
        e.preventDefault();
        const quantity = parseInt(document.getElementById('expired-quantity').value);
        if (!quantity || quantity <= 0) {
            Notification.show('សូមใส่จำนวนឲ្យត្រឹមត្រូវ', 'error');
            return;
        }
        try {
            await addDoc(collection(db, "transactions"), {
                type: 'expired_exchange',
                userId: this.currentUserId,
                userName: this.currentUser.name,
                quantity: quantity,
                date: serverTimestamp()
            });
            Notification.show('បានកត់ត្រាការប្តូរកាវ!', 'success');
            e.target.reset();
        } catch (error) {
            console.error("Expired Exchange Error:", error);
            Notification.show("Error saving exchange transaction.", "error");
        }
    },

    async handleCouldNotSell() {
        const form = document.getElementById('fail-reason-form');
        const selectedRadio = form.querySelector('input[name="fail_reason"]:checked');
        if (!selectedRadio) {
            Notification.show("សូមជ្រើសរើសមូលហេតុ", 'error');
            return;
        }
        let reason = selectedRadio.value;
        if (reason === 'other') {
            reason = document.getElementById('other-reason-text').value.trim();
            if (!reason) {
                Notification.show("សូមបំពេញហេតុផលផ្សេងៗ", 'error');
                return;
            }
        }
        try {
            const batch = writeBatch(db);
            const transactionRef = doc(collection(db, "transactions"));
            batch.set(transactionRef, {
                type: 'sale_failed',
                userId: this.currentUserId,
                userName: this.currentUser.name,
                province: this.currentUser.province,
                depotId: this.selectedDepot.id,
                depotName: this.selectedDepot.name,
                reason: reason,
                date: serverTimestamp()
            });

            const depotRef = doc(db, "depots", this.selectedDepot.id);
            batch.update(depotRef, {
                saleStatus: 'Sale Failed',
                lastSoldDate: serverTimestamp()
            });

            await batch.commit();
            Notification.show("បានកត់ត្រាប្រតិបត្តិការលក់មិនបាន", "success");
            this.closeModal();
            this.clearSelectedDepot();
        } catch (error) {
            console.error("Could not sell error:", error);
            Notification.show("មានបញ្ហាក្នុងការកត់ត្រា", "error");
        }
    },

    showCouldNotSellModal() {
        if (!this.selectedDepot) return;
        const reasons = ["ដេប៉ូបិទ", "ទំនិញមិនទាន់អស់", "ប្ដូរទៅប្រើផលិតផលគូប្រជែង"];
        const reasonsHTML = reasons.map(r => `<label class="flex items-center space-x-3"><input type="radio" name="fail_reason" value="${r}" class="text-indigo-600"><span>${r}</span></label>`).join('');
        this.modal.style.display = 'flex';
        this.modalContent.innerHTML = `
                <div class="p-6">
                    <h3 class="text-lg font-semibold mb-4">មូលហេតុដែលលក់មិនបានឲ្យ "${this.selectedDepot.name}"</h3>
                    <form id="fail-reason-form" class="space-y-3">
                        ${reasonsHTML}
                        <label class="flex items-center space-x-3">
                            <input type="radio" name="fail_reason" value="other" class="text-indigo-600">
                            <span>ផ្សេងៗ:</span>
                        </label>
                        <textarea id="other-reason-text" class="w-full border rounded p-2" rows="2" placeholder="បំពេញហេតុផល..."></textarea>
                    </form>
                </div>
                <div class="bg-gray-100 p-4 flex justify-end space-x-3">
                    <button type="button" id="cancel-fail" class="bg-gray-200 px-4 py-2 rounded-lg">បោះបង់</button>
                    <button type="button" id="submit-fail" class="bg-blue-600 text-white px-4 py-2 rounded-lg">បញ្ជូន</button>
                </div>`;
        document.getElementById('cancel-fail').addEventListener('click', () => this.closeModal());
        document.getElementById('submit-fail').addEventListener('click', () => this.handleCouldNotSell());
    },

    showDamagedExchangeModal() {
        if (!this.selectedDepot) return;
        this.modal.style.display = 'flex';
        this.modalContent.innerHTML = `
                <div class="p-6">
                    <h3 class="text-lg font-semibold mb-4">ប្តូរកាវខូចជូន "${this.selectedDepot.name}"</h3>
                    <form id="damage-form" class="space-y-4">
                        <p class="text-sm text-gray-600">បំពេញចំនួនដែលបានប្តូរចេញពីស្តុករបស់អ្នក។</p>
                        <div class="grid grid-cols-3 gap-2">
                            <div><label class="text-sm">កេស</label><input name="cases" type="number" value="0" min="0" class="w-full border rounded p-2 mt-1"></div>
                            <div><label class="text-sm">ឡូ</label><input name="lots" type="number" value="0" min="0" class="w-full border rounded p-2 mt-1"></div>
                            <div><label class="text-sm">កញ្ចប់</label><input name="packs" type="number" value="0" min="0" class="w-full border rounded p-2 mt-1"></div>
                        </div>
                    </form>
                </div>
                <div class="bg-gray-100 p-4 flex justify-end space-x-3">
                    <button type="button" id="cancel-damage" class="bg-gray-200 px-4 py-2 rounded-lg">បោះបង់</button>
                    <button type="button" id="submit-damage" class="bg-orange-500 text-white px-4 py-2 rounded-lg">បញ្ជាក់ការប្តូរ</button>
                </div>`;
        document.getElementById('cancel-damage').addEventListener('click', () => this.closeModal());
        document.getElementById('submit-damage').addEventListener('click', () => this.handleDamagedExchange());
    },

    async handleDamagedExchange() {
        const form = document.getElementById('damage-form');
        const cases = parseInt(form.cases.value) || 0;
        const lots = parseInt(form.lots.value) || 0;
        const packs = parseInt(form.packs.value) || 0;
        if (cases === 0 && lots === 0 && packs === 0) return;
        if (this.handStock.cases < cases || this.handStock.lots < lots || this.handStock.packs < packs) {
            Notification.show('ទំនិញក្នុងដៃមិនគ្រប់គ្រាន់សម្រាប់ប្តូរទេ!', 'error');
            return;
        }
        try {
            const batch = writeBatch(db);
            const stockRef = doc(db, "handStocks", this.currentUserId);
            const newStock = {
                cases: this.handStock.cases - cases,
                lots: this.handStock.lots - lots,
                packs: this.handStock.packs - packs
            };
            batch.set(stockRef, newStock, { merge: true });

            const transacRef = doc(collection(db, "transactions"));
            batch.set(transacRef, {
                type: 'damaged_exchange',
                userId: this.currentUserId,
                userName: this.currentUser.name,
                depotId: this.selectedDepot.id,
                depotName: this.selectedDepot.name,
                items: { cases, lots, packs },
                date: serverTimestamp()
            });
            
            await batch.commit();
            Notification.show('បានកត់ត្រាការប្តូរទំនិញខូចដោយជោគជ័យ!', 'success');
            this.closeModal();
        } catch (error) {
            console.error("Damaged exchange error:", error);
            Notification.show("មានបញ្ហាក្នុងការកត់ត្រា", "error");
        }
    },

    closeModal() {
        this.modal.style.display = 'none';
        this.modalContent.innerHTML = '';
    }
};

Auth.init();