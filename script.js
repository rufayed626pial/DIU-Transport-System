// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9TXrIqiLoC3iw14BAtNehw_Ika1d2yBA",
  authDomain: "diu-transport-system-2dbce.firebaseapp.com",
  databaseURL: "https://diu-transport-system-2dbce-default-rtdb.firebaseio.com",
  projectId: "diu-transport-system-2dbce",
  storageBucket: "diu-transport-system-2dbce.firebasestorage.app",
  messagingSenderId: "315145652438",
  appId: "1:315145652438:web:90b84a345adac93636e177"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Firebase services
const auth = firebase.auth();
const database = firebase.database();
const busesRef = database.ref('buses');
const usersRef = database.ref('users');
const adminsRef = database.ref('admins');

// Define routeMap globally
const routeMap = {
    'dhanmondi': 'Dhanmondi ↔ DSC',
    'uttara': 'Uttara - Rajlokkhi ↔ DSC',
    'baipail': 'Baipail ↔ Nabinagar ↔ C&B ↔ DSC',
    'dhamrai': 'Dhamrai Bus Stand ↔ Nabinagar ↔ C&B ↔ DSC',
    'savar': 'Savar ↔ C&B ↔ DSC',
    'narayanganj': 'Narayanganj Chasara ↔ Dhanmondi ↔ DSC',
    'green': 'Green Model Town ↔ Mugdha ↔ Malibag ↔ Rampura ↔ DSC',
    'sony': 'Sony Cinema Hall ↔ DSC',
    'uttara-moylar': 'Uttara Moylar Mor ↔ DSC',
    'tongi': 'Tongi College gate ↔ DSC',
    'konabari': 'Konabari Pukur Par ↔ Zirabo ↔ Ashulia Bazar ↔ DSC',
    'ecb': 'ECB Chattor ↔ Mirpur ↔ DSC'
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded");
    
    // DOM Elements
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link');
    const loginBtn = document.getElementById('login-btn');
    const searchForm = document.getElementById('bus-search');
    const busModal = document.getElementById('bus-modal');
    const noBusModal = document.getElementById('no-bus-modal');
    const loginModal = document.getElementById('login-modal');
    const modalData = document.getElementById('modal-data');
    const closeModals = document.querySelectorAll('.close-modal');
    const tryAgainBtn = document.querySelector('.no-bus-message .try-again-btn'); 
    const mainFooter = document.getElementById('main-footer');
    const homeLogoLink = document.getElementById('home-logo-link');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Auth related elements
    const authTitle = document.getElementById('auth-title');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const forgotPasswordFormContainer = document.getElementById('forgot-password-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    
    let diuBuses = []; // Will hold bus data from Firebase
    let currentUser = null; // Current logged in user
    let isAdmin = false; // Track admin status
    
    // Initialize the app
    initializeApp();

    // ==================== FIREBASE FUNCTIONS ====================
    
    // Setup real-time bus data listener
    function setupBusDataListener() {
        busesRef.on('value', (snapshot) => {
            diuBuses = [];
            snapshot.forEach((childSnapshot) => {
                diuBuses.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            console.log("Real-time bus data updated:", diuBuses);
        }, (error) => {
            console.error("Error fetching bus data:", error);
            showNotification("Error loading bus data. Please try again.", "error");
        });
    }
    
    // Check if user is admin
    function checkAdminStatus(uid) {
        return adminsRef.child(uid).once('value')
            .then(snapshot => snapshot.exists());
    }
    
    // Register a new user
    function registerUser(userData) {
        return auth.createUserWithEmailAndPassword(userData.email, userData.password)
            .then((userCredential) => {
                return usersRef.child(userCredential.user.uid).set({
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                return { success: true, message: 'Registration successful' };
            })
            .catch((error) => {
                return { success: false, message: error.message };
            });
    }
    
    // Login user
    async function loginUser(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userSnapshot = await usersRef.child(userCredential.user.uid).once('value');
            const isAdmin = await checkAdminStatus(userCredential.user.uid);
            
            let adminData = {};
            if (isAdmin) {
                const adminSnapshot = await adminsRef.child(userCredential.user.uid).once('value');
                adminData = adminSnapshot.val() || {};
            }
            
            currentUser = {
                id: userCredential.user.uid,
                ...userSnapshot.val(),
                isAdmin: isAdmin,
                adminEmail: adminData.email || '',
                adminSince: adminData.createdAt || null
            };
            
            sessionStorage.setItem('diuTransportCurrentUser', JSON.stringify(currentUser));
            return { success: true, message: 'Login successful', user: currentUser };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    // Check if user is logged in
    function checkUserLoggedIn() {
        const storedUser = sessionStorage.getItem('diuTransportCurrentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            isAdmin = currentUser.isAdmin || false;
            return true;
        }
        return false;
    }
    
    // Logout user
    function logoutUser() {
        auth.signOut().then(() => {
            currentUser = null;
            isAdmin = false;
            sessionStorage.removeItem('diuTransportCurrentUser');
            showNotification('You have been logged out successfully', 'success');
            updateLoginButton();
            if (window.location.hash === '#admin') {
                showSection('#home');
            }
        }).catch((error) => {
            showNotification('Error logging out: ' + error.message, 'error');
        });
    }
    
    // CRUD Operations for Buses
    function createBus(busData) {
        if (!currentUser?.isAdmin) {
            showNotification('Admin privileges required', 'error');
            return Promise.reject('Unauthorized');
        }
        
        return busesRef.push().set({
            ...busData,
            createdBy: currentUser.id,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification('Bus added successfully', 'success');
            return true;
        })
        .catch((error) => {
            showNotification('Error adding bus: ' + error.message, 'error');
            throw error;
        });
    }
    
    function updateBus(busId, busData) {
        if (!currentUser?.isAdmin) {
            showNotification('Admin privileges required', 'error');
            return Promise.reject('Unauthorized');
        }
        
        return busesRef.child(busId).update({
            ...busData,
            updatedBy: currentUser.id,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            showNotification('Bus updated successfully', 'success');
            return true;
        })
        .catch((error) => {
            showNotification('Error updating bus: ' + error.message, 'error');
            throw error;
        });
    }
    
    function deleteBus(busId) {
        if (!currentUser?.isAdmin) {
            showNotification('Admin privileges required', 'error');
            return Promise.reject('Unauthorized');
        }
        
        return busesRef.child(busId).remove()
            .then(() => {
                showNotification('Bus deleted successfully', 'success');
                return true;
            })
            .catch((error) => {
                showNotification('Error deleting bus: ' + error.message, 'error');
                throw error;
            });
    }
    
    // Admin management functions
    function loadAdminManagement() {
        // Load current admins
        adminsRef.once('value').then(snapshot => {
            const adminsList = document.getElementById('admins-list');
            if (!snapshot.exists()) {
                adminsList.innerHTML = '<p>No admins found</p>';
                return;
            }
            
            let html = '<div class="admin-list">';
            snapshot.forEach(adminSnapshot => {
                const adminData = adminSnapshot.val();
                html += `
                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-email">${adminData.email}</span>
                            <small class="admin-date">Added: ${new Date(adminData.createdAt).toLocaleDateString()}</small>
                        </div>
                        ${adminSnapshot.key !== currentUser.id ? `
                        <button class="btn btn-danger remove-admin" data-uid="${adminSnapshot.key}">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                        ` : ''}
                    </div>
                `;
            });
            html += '</div>';
            adminsList.innerHTML = html;
            
            // Add remove admin event listeners
            document.querySelectorAll('.remove-admin').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const uid = e.target.dataset.uid;
                    removeAdmin(uid);
                });
            });
        });
        
        // Grant admin privileges
        document.getElementById('grant-admin-btn').addEventListener('click', () => {
            const email = document.getElementById('admin-email').value.trim();
            if (!email) {
                showNotification('Please enter an email', 'error');
                return;
            }
            
            // Find user by email
            auth.getUserByEmail(email).then(userRecord => {
                return makeAdmin(userRecord.uid, email);
            }).then(() => {
                showNotification('Admin privileges granted to ' + email, 'success');
                document.getElementById('admin-email').value = '';
                loadAdminManagement();
            }).catch(error => {
                showNotification('Error: ' + error.message, 'error');
            });
        });
    }
    
    function makeAdmin(uid, email) {
        return adminsRef.child(uid).set({
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    function removeAdmin(uid) {
        if (uid === currentUser.id) {
            showNotification("You can't remove your own admin privileges", 'error');
            return Promise.reject("Can't remove self");
        }
        
        if (confirm('Remove admin privileges from this user?')) {
            return adminsRef.child(uid).remove()
                .then(() => {
                    showNotification('Admin privileges removed', 'success');
                    loadAdminManagement();
                });
        }
        return Promise.reject("Cancelled by user");
    }
    
    // Search buses with filters
    
    function searchBuses(routeCode, type, time) {
    return new Promise((resolve) => {
        console.log("Searching buses with:", {
            routeCode, 
            type,
            time
        });
        
        const filteredBuses = diuBuses.filter(bus => {
            // Route matching - compare with the route code in database
            const matchesRoute = !routeCode || bus.route === routeCode;
            
            // Type matching
            const matchesType = !type || bus.type === type;
            
            // Time matching
            let matchesTime = !time;
            if (time && bus.schedule) {
                matchesTime = bus.schedule[time] === true;
            }
            
            console.log("Checking bus:", bus.id, {
                route: bus.route,
                type: bus.type,
                schedule: bus.schedule,
                matchesRoute,
                matchesType,
                matchesTime
            });
            
            return matchesRoute && matchesType && matchesTime;
        });
        
        console.log("Found buses:", filteredBuses);
        resolve(filteredBuses);
    });
}

// Updated search form submission handler
if (searchForm) {
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedRoute = document.getElementById('route').value;
        const selectedType = document.getElementById('bus-type').value;
        const selectedTime = document.getElementById('time').value;
        
        document.querySelector('.search-btn').classList.add('animate__pulse');
        
        try {
            const filteredBuses = await searchBuses(selectedRoute, selectedType, selectedTime);
            
            if (filteredBuses.length > 0) {
                showBusModal(filteredBuses[0]);
            } else {
                noBusModal.style.display = 'flex';
                showNotification("No buses found matching your criteria", "info");
            }
        } catch (error) {
            console.error("Search error:", error);
            showNotification("Error searching for buses", "error");
        } finally {
            document.querySelector('.search-btn').classList.remove('animate__pulse');
        }
    });
}
    
    // ==================== APP INITIALIZATION ====================
    function initializeApp() {
        console.log("Initializing DIU Transport System with Firebase...");
        
        // Hide loading overlay
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.visibility = 'hidden';
            }
        }, 1500);
        
        // Set up real-time listeners
        setupBusDataListener();
        
        // Set up auth state listener
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userSnapshot = await usersRef.child(user.uid).once('value');
                isAdmin = await checkAdminStatus(user.uid);
                
                let adminData = {};
                if (isAdmin) {
                    const adminSnapshot = await adminsRef.child(user.uid).once('value');
                    adminData = adminSnapshot.val() || {};
                }
                
                currentUser = {
                    id: user.uid,
                    ...userSnapshot.val(),
                    isAdmin: isAdmin,
                    adminEmail: adminData.email || '',
                    adminSince: adminData.createdAt || null
                };
                
                sessionStorage.setItem('diuTransportCurrentUser', JSON.stringify(currentUser));
                updateLoginButton();
                
                // Refresh admin panel if on admin page
                if (window.location.hash === '#admin') {
                    loadSectionContent('#admin');
                }
            } else {
                currentUser = null;
                isAdmin = false;
                sessionStorage.removeItem('diuTransportCurrentUser');
                updateLoginButton();
            }
        });
        
        // Check if user is already logged in
        if (checkUserLoggedIn()) {
            updateLoginButton();
        }
        
        // Populate time options
        populateTimeOptions();
        
        // Show home section and hide footer
        showSection('#home');
        toggleFooter(false);
    }
    
    // ==================== HELPER FUNCTIONS ====================
    function populateTimeOptions() {
        const timeSelect = document.getElementById('time');
        if (timeSelect) {
            const times = ['7:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM', '6:00 PM'];
            
            timeSelect.innerHTML = '<option value="">Select Time</option>';
            
            times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        }
    }
    
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
        });
        
        const section = document.querySelector(sectionId);
        if (section) {
            section.classList.add('active-section');
            loadSectionContent(sectionId);
        }
        
        // Update active nav link
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === sectionId) {
                link.classList.add('active');
            }
        });
    }
    
    function toggleFooter(show) {
        if (mainFooter) {
            if (show) {
                mainFooter.classList.add('active-footer');
            } else {
                mainFooter.classList.remove('active-footer');
            }
        }
    }
    
    function updateLoginButton() {
        if (loginBtn) {
            if (currentUser) {
                let adminBadge = '';
                if (currentUser.isAdmin) {
                    adminBadge = ' <span class="admin-badge">Admin</span>';
                }
                loginBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.name}${adminBadge}`;
            } else {
                loginBtn.innerHTML = `<i class="fas fa-user"></i> Login`;
            }
        }
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        const timeout = setTimeout(() => {
            removeNotification(notification);
        }, 5000);
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeout);
            removeNotification(notification);
        });
    }
    
    function removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    function showBusModal(bus) {
        let busTypeBadge = '';
        if (bus.type === 'female') {
            busTypeBadge = '<i class="fas fa-female"></i> Female Special';
        } else if (bus.type === 'faculty') {
            busTypeBadge = '<i class="fas fa-chalkboard-teacher"></i> Faculty Bus';
        } else {
            busTypeBadge = '<i class="fas fa-user-graduate"></i> Student Bus';
        }
        
        if (bus.ac !== undefined) {
            busTypeBadge += bus.ac ? ' <i class="fas fa-snowflake"></i> AC' : ' <i class="fas fa-fan"></i> Non-AC';
        }
        
        modalData.innerHTML = `
            <div class="bus-details animate__animated animate__fadeIn">
                <div class="bus-image-container">
                    <img src="${bus.image || '../css/img/bus2.webp'}" alt="${bus.name}" class="bus-image">
                    <div class="bus-badge">${busTypeBadge}</div>
                </div>
                <div class="bus-info">
                    <h3>${bus.name}</h3>
                    <p class="bus-route"><i class="fas fa-route"></i> <strong>${bus.route}</strong></p>
                    <div class="detail-row">
                        <span><i class="fas fa-id-card"></i> Registration:</span>
                        <span>${bus.registration}</span>
                    </div>
                    <div class="detail-row">
                        <span><i class="fas fa-user-tie"></i> Driver:</span>
                        <span>${bus.driver}</span>
                    </div>
                    <div class="detail-row">
                        <span><i class="fas fa-user"></i> Helper:</span>
                        <span>${bus.helper}</span>
                    </div>
                    <div class="detail-row">
                        <span><i class="fas fa-phone"></i> Contact:</span>
                        <span><a href="tel:${bus.phone}">${bus.phone}</a></span>
                    </div>
                    <div class="bus-schedule">
                        <h4><i class="fas fa-clock"></i> Available Times:</h4>
                        <div class="schedule-times">
                            ${Object.entries(bus.schedule || {})
                                .filter(([time, available]) => available)
                                .map(([time]) => `<span class="time-badge">${time}</span>`)
                                .join('')}
                        </div>
                    </div>
                    ${isAdmin ? `
                    <div class="admin-bus-actions">
                        <button class="btn edit-bus-btn" data-id="${bus.id}">
                            <i class="fas fa-edit"></i> Edit Bus
                        </button>
                        <button class="btn delete-bus-btn" data-id="${bus.id}">
                            <i class="fas fa-trash"></i> Delete Bus
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Add event listeners for admin actions
        if (isAdmin) {
            document.querySelectorAll('.edit-bus-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const busId = e.target.getAttribute('data-id');
                    editBus(busId);
                });
            });
            
            document.querySelectorAll('.delete-bus-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const busId = e.target.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this bus?')) {
                        deleteBus(busId).then(() => {
                            busModal.style.display = 'none';
                        });
                    }
                });
            });
        }
        
        busModal.style.display = 'flex';
    }
    
    function editBus(busId) {
        const bus = diuBuses.find(b => b.id === busId);
        if (!bus) return;
        
        // Create form container if it doesn't exist
        let formContainer = document.getElementById('bus-form-container');
        if (!formContainer) {
            formContainer = document.createElement('div');
            formContainer.id = 'bus-form-container';
            formContainer.style.marginTop = '20px';
            document.querySelector('.modal-content').appendChild(formContainer);
        }
        
        formContainer.innerHTML = `
            <h3>Edit Bus</h3>
            <form id="bus-form" class="admin-form" data-bus-id="${busId}">
                <div class="form-group">
                    <label>Bus Name</label>
                    <input type="text" id="bus-name" value="${bus.name}" required>
                </div>
                <div class="form-group">
                    <label>Bus Type</label>
                    <select id="bus-type-admin" required>
                        <option value="student" ${bus.type === 'student' ? 'selected' : ''}>Student Bus</option>
                        <option value="faculty" ${bus.type === 'faculty' ? 'selected' : ''}>Faculty Bus</option>
                        <option value="female" ${bus.type === 'female' ? 'selected' : ''}>Female Special</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Route</label>
                    <input type="text" id="bus-route" value="${bus.route}" required>
                </div>
                <div class="form-group">
                    <label>Registration</label>
                    <input type="text" id="bus-registration" value="${bus.registration}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Driver Name</label>
                        <input type="text" id="bus-driver" value="${bus.driver}" required>
                    </div>
                    <div class="form-group">
                        <label>Helper Name</label>
                        <input type="text" id="bus-helper" value="${bus.helper}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" id="bus-phone" value="${bus.phone}" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bus-ac" ${bus.ac ? 'checked' : ''}> AC Bus
                    </label>
                </div>
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="text" id="bus-image" value="${bus.image || '../css/img/bus2.webp'}">
                </div>
                <div class="form-group">
                    <label>Schedule</label>
                    <div class="schedule-options">
                        ${['7:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM', '6:00 PM']
                            .map(time => `
                                <label>
                                    <input type="checkbox" name="schedule" value="${time}" 
                                        ${bus.schedule && bus.schedule[time] ? 'checked' : ''}> ${time}
                                </label>
                            `).join('')}
                    </div>
                </div>
                <button type="submit" class="btn">Save Changes</button>
                <button type="button" id="cancel-edit-btn" class="btn btn-cancel">Cancel</button>
            </form>
        `;
        
        // Handle form submission
        document.getElementById('bus-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const schedule = {};
            document.querySelectorAll('input[name="schedule"]:checked').forEach(checkbox => {
                schedule[checkbox.value] = true;
            });
            
            const updatedBus = {
                id: busId,
                name: document.getElementById('bus-name').value,
                type: document.getElementById('bus-type-admin').value,
                route: document.getElementById('bus-route').value,
                registration: document.getElementById('bus-registration').value,
                driver: document.getElementById('bus-driver').value,
                helper: document.getElementById('bus-helper').value,
                phone: document.getElementById('bus-phone').value,
                ac: document.getElementById('bus-ac').checked,
                image: document.getElementById('bus-image').value || '../css/img/bus2.webp',
                schedule: schedule
            };
            
            updateBus(busId, updatedBus).then(() => {
                formContainer.style.display = 'none';
                showBusModal(updatedBus);
            });
        });
        
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            formContainer.style.display = 'none';
        });
    }
    
    // ==================== EVENT LISTENERS ====================
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href');
            
            navLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            
            showSection(sectionId);
            
            if (sectionId === '#contact') {
                toggleFooter(true);
            } else {
                toggleFooter(false);
            }
        });
    });
    
    // Home logo click
    if (homeLogoLink) {
        homeLogoLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('#home');
            navLinks.forEach(link => link.classList.remove('active'));
            document.querySelector('.nav-link[href="#home"]').classList.add('active');
            toggleFooter(false);
        });
    }
    
    // Auth form switching
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'none';
            registerFormContainer.style.display = 'block';
            forgotPasswordFormContainer.style.display = 'none';
            authTitle.textContent = 'Create Account';
        });
    }
    
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
            forgotPasswordFormContainer.style.display = 'none';
            authTitle.textContent = 'DIU Transport Portal';
        });
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'none';
            registerFormContainer.style.display = 'none';
            forgotPasswordFormContainer.style.display = 'block';
            authTitle.textContent = 'Reset Password';
        });
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
            forgotPasswordFormContainer.style.display = 'none';
            authTitle.textContent = 'DIU Transport Portal';
        });
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            loginUser(email, password).then((result) => {
                if (result.success) {
                    updateLoginButton();
                    loginModal.style.display = 'none';
                    showNotification('Login successful! Welcome back, ' + result.user.name, 'success');
                    loginForm.reset();
                    
                    // Redirect to admin dashboard if admin
                    if (result.user.isAdmin && window.location.hash !== '#admin') {
                        showSection('#admin');
                        document.querySelector('.nav-link[href="#admin"]').classList.add('active');
                    }
                } else {
                    showNotification(result.message, 'error');
                }
            });
        });
    }
    
    // Registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const phone = document.getElementById('register-phone').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            registerUser({
                name,
                email,
                phone,
                password
            }).then((result) => {
                if (result.success) {
                    loginFormContainer.style.display = 'block';
                    registerFormContainer.style.display = 'none';
                    forgotPasswordFormContainer.style.display = 'none';
                    authTitle.textContent = 'DIU Transport Portal';
                    showNotification('Registration successful! Please login with your new account', 'success');
                    registerForm.reset();
                } else {
                    showNotification(result.message, 'error');
                }
            });
        });
    }
    
    // Forgot password form submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value;
            
            auth.sendPasswordResetEmail(email).then(() => {
                showNotification('Password reset link sent to your email', 'success');
                loginFormContainer.style.display = 'block';
                registerFormContainer.style.display = 'none';
                forgotPasswordFormContainer.style.display = 'none';
                authTitle.textContent = 'DIU Transport Portal';
                forgotPasswordForm.reset();
            }).catch((error) => {
                showNotification(error.message, 'error');
            });
        });
    }
    
    // Bus search form submission
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const selectedRoute = document.getElementById('route').value;
            const selectedType = document.getElementById('bus-type').value;
            const selectedTime = document.getElementById('time').value;
            
            document.querySelector('.search-btn').classList.add('animate__pulse');
            
            try {
                const filteredBuses = await searchBuses(selectedRoute, selectedType, selectedTime);
                
                if (filteredBuses.length > 0) {
                    showBusModal(filteredBuses[0]);
                } else {
                    noBusModal.style.display = 'flex';
                    showNotification("No buses found matching your criteria", "info");
                }
            } catch (error) {
                console.error("Search error:", error);
                showNotification("Error searching for buses", "error");
            } finally {
                document.querySelector('.search-btn').classList.remove('animate__pulse');
            }
        });
    }
    
    // Login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            if (currentUser) {
                if (confirm('Do you want to logout?')) {
                    logoutUser();
                }
            } else {
                this.classList.add('animate__pulse');
                setTimeout(() => {
                    this.classList.remove('animate__pulse');
                }, 500);
                loginModal.style.display = 'flex';
            }
        });
    }
    
    // Close modals
    if (closeModals) {
        closeModals.forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
    }
    
    // Try again button
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', function() {
            noBusModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Contact form submission
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'contact-form') {
            e.preventDefault();
            showNotification('Thank you for your message! We will contact you soon!');
            e.target.reset();
        }
    });
    
    // ==================== SECTION CONTENT LOADING ====================
    function loadSectionContent(sectionId) {
        const section = document.querySelector(sectionId);
        let contentDiv = section.querySelector('.section-content');
        if (!contentDiv) {
            contentDiv = document.createElement('div');
            contentDiv.classList.add('section-content');
            section.appendChild(contentDiv);
        }
        
        switch(sectionId) {
            case '#about':
                contentDiv.innerHTML = `
                    <h2 class="section-title animate__animated animate__fadeInDown">About Our Transport System</h2>
                    <div class="about-content animate__animated animate__fadeIn">
                        <div class="about-card">
                            <div class="about-text">
                                <h3>Modern Fleet & Extensive Coverage</h3>
                                <p>Daffodil International University operates a robust transport system with a modern fleet of buses providing safe, comfortable, and reliable commuting for our university community.</p>
                                <div class="about-features-grid">
                                    <div class="feature-item">
                                        <i class="fas fa-bus"></i>
                                        <strong>Fleet Size</strong>
                                        <span>Over 100+ contemporary buses for all routes.</span>
                                    </div>
                                    <div class="feature-item">
                                        <i class="fas fa-route"></i>
                                        <strong>Wide Route Network</strong>
                                        <span>Meticulously planned routes connecting major hubs.</span>
                                    </div>
                                    <div class="feature-item">
                                        <i class="fas fa-calendar-alt"></i>
                                        <strong>Strict Adherence to Schedule</strong>
                                        <span>Consistent and reliable departure/arrival times.</span>
                                    </div>
                                    <div class="feature-item">
                                        <i class="fas fa-shield-alt"></i>
                                        <strong>Enhanced Safety Measures</strong>
                                        <span>Regular maintenance and professional drivers.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            case '#services':
                contentDiv.innerHTML = `
                    <h2 class="section-title animate__animated animate__fadeInDown">Our Comprehensive Bus Services</h2>
                    <div class="services-grid animate__animated animate__fadeIn">
                        <div class="service-card">
                            <i class="fas fa-map-marked-alt"></i>
                            <h3>Extensive Route Network</h3>
                            <p class="service-description">Our transport system provides broad coverage across Dhaka and surrounding areas.</p>
                        </div>
                        <div class="service-card">
                            <i class="fas fa-layer-group"></i>
                            <h3>Diverse Bus Categories</h3>
                            <p class="service-description">Our fleet includes student buses, faculty buses, and female special buses.</p>
                        </div>
                        <div class="service-card">
                            <i class="fas fa-calendar-check"></i>
                            <h3>Standardized Daily Schedules</h3>
                            <p class="service-description">Our bus services adhere to a strict and standardized daily timetable.</p>
                        </div>
                    </div>
                `;
                break;
                
            case '#contact':
                contentDiv.innerHTML = `
                    <h2 class="section-title animate__animated animate__fadeInDown">Contact Transport Department</h2>
                    <div class="contact-container animate__animated animate__fadeIn">
                        <div class="contact-info">
                            <h3><i class="fas fa-headset"></i> Get In Touch</h3>
                            <p>Contact us for any inquiries regarding the DIU transport services.</p>
                            <div class="contact-details-grid">
                                <div class="contact-detail-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <p><strong>Transport Office Address:</strong> Daffodil International University, Daffodil Smart City, Birulia, Savar, Dhaka</p>
                                </div>
                                <div class="contact-detail-item">
                                    <i class="fas fa-phone"></i>
                                    <p><strong>General Inquiries:</strong> <a href="tel:+8801834710071">+8801834710071</a></p>
                                </div>
                                <div class="contact-detail-item">
                                    <i class="fas fa-envelope"></i>
                                    <p><strong>Email:</strong> <a href="mailto:transport@diu.edu.bd">transport@diu.edu.bd</a></p>
                                </div>
                            </div>
                        </div>
                        <div class="contact-form">
                            <h3><i class="fas fa-paper-plane"></i> Submit Your Inquiry</h3>
                            <form id="contact-form">
                                <div class="form-group">
                                    <input type="text" placeholder="Your Full Name" required>
                                </div>
                                <div class="form-group">
                                    <input type="email" placeholder="Your Email" required>
                                </div>
                                <div class="form-group">
                                    <textarea placeholder="Your Message" rows="6" required></textarea>
                                </div>
                                <button type="submit" class="btn">Send Message</button>
                            </form>
                        </div>
                    </div>
                `;
                break;
                
            case '#admin':
                if (!currentUser) {
                    contentDiv.innerHTML = '<p>Please login to access admin features</p>';
                    return;
                }
                
                // Check admin status
                checkAdminStatus(currentUser.id).then((isAdmin) => {
                    if (!isAdmin) {
                        contentDiv.innerHTML = '<p>Access denied. Admin privileges required.</p>';
                        return;
                    }
                    
                    contentDiv.innerHTML = `
                        <div class="admin-dashboard">
                            <h2>Admin Dashboard</h2>
                            <div class="admin-welcome">
                                Logged in as: ${currentUser.email} (Admin since: ${currentUser.adminSince ? new Date(currentUser.adminSince).toLocaleDateString() : 'N/A'})
                            </div>
                            
                            <div class="admin-tabs">
                                <button class="tab-btn active" data-tab="buses">Manage Buses</button>
                                <button class="tab-btn" data-tab="admins">Manage Admins</button>
                            </div>
                            
                            <div id="buses-tab" class="admin-tab-content active">
                                <div class="admin-actions">
                                    <button id="add-bus-btn" class="btn btn-primary">
                                        <i class="fas fa-plus"></i> Add New Bus
                                    </button>
                                </div>
                                <div id="buses-list" class="admin-list"></div>
                            </div>
                            
                            <div id="admins-tab" class="admin-tab-content">
                                <div class="admin-form">
                                    <input type="email" id="admin-email" placeholder="Enter user email">
                                    <button id="grant-admin-btn" class="btn btn-primary">
                                        <i class="fas fa-user-shield"></i> Grant Admin
                                    </button>
                                </div>
                                <div id="admins-list" class="admin-list"></div>
                            </div>
                        </div>
                    `;
                    
                    // Initialize tabs
                    document.querySelectorAll('.tab-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                            
                            this.classList.add('active');
                            document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
                        });
                    });
                    
                    // Load initial tab content
                    loadBusesForAdmin();
                    loadAdminManagement();
                    
                    // Add new bus button
                    document.getElementById('add-bus-btn').addEventListener('click', () => {
                        showAddBusForm();
                    });
                });
                break;
                
            default:
                if (contentDiv) {
                    contentDiv.innerHTML = ''; 
                }
                break;
        }
    }
    
    function loadBusesForAdmin() {
        const busList = document.getElementById('buses-list');
        if (!busList) return;
        
        busList.innerHTML = '<p>Loading buses...</p>';
        
        busesRef.once('value').then((snapshot) => {
            busList.innerHTML = '';
            
            if (!snapshot.exists()) {
                busList.innerHTML = '<p>No buses found</p>';
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                const bus = childSnapshot.val();
                const busElement = document.createElement('div');
                busElement.className = 'admin-bus-item';
                busElement.innerHTML = `
                    <div class="bus-info">
                        <h3>${bus.name} <span class="bus-type">(${bus.type})</span></h3>
                        <p><i class="fas fa-route"></i> ${bus.route}</p>
                        <p><i class="fas fa-id-card"></i> ${bus.registration}</p>
                        <small>Added: ${new Date(bus.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div class="bus-actions">
                        <button class="btn btn-edit" data-id="${childSnapshot.key}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-delete" data-id="${childSnapshot.key}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="btn btn-view" data-id="${childSnapshot.key}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                `;
                busList.appendChild(busElement);
            });
            
            // Add event listeners
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const busId = e.target.getAttribute('data-id');
                    editBusFromAdmin(busId);
                });
            });
            
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const busId = e.target.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this bus?')) {
                        deleteBus(busId).then(() => {
                            loadBusesForAdmin();
                        });
                    }
                });
            });
            
            document.querySelectorAll('.btn-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const busId = e.target.getAttribute('data-id');
                    const bus = diuBuses.find(b => b.id === busId);
                    if (bus) {
                        showBusModal(bus);
                    }
                });
            });
        });
    }
    
    function showAddBusForm() {
        const formContainer = document.createElement('div');
        formContainer.id = 'add-bus-form-container';
        formContainer.style.marginTop = '20px';
        formContainer.innerHTML = `
            <h3>Add New Bus</h3>
            <form id="bus-form" class="admin-form">
                <div class="form-group">
                    <label>Bus Name</label>
                    <input type="text" id="bus-name" required>
                </div>
                <div class="form-group">
                    <label>Bus Type</label>
                    <select id="bus-type" name="bus-type" required>
                        <option value="" disabled selected>Select bus type</option>
                        <option value="student">Student Bus</option>
                        <option value="faculty">Faculty Bus</option>
                        <option value="female">Female Special</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Route</label>
                    <select id="bus-route" required>
                        <option value="" disabled selected>Select your bus route</option>
                        <option value="dhanmondi">Dhanmondi ↔ DSC</option>
                        <option value="uttara">Uttara ↔ Rajlokkhi ↔ DSC</option>
                        <option value="baipail">Baipail ↔ Nabinagar ↔ C&B ↔ DSC</option>
                        <option value="dhamrai">Dhamrai Bus Stand ↔ Nabinagar ↔ C&B ↔ DSC</option>
                        <option value="savar">Savar ↔ C&B ↔ DSC</option>
                        <option value="narayanganj">Narayanganj Chasara ↔ Dhanmondi ↔ DSC</option>
                        <option value="green">Green Model Town ↔ Mugdha ↔ Malibag ↔ Rampura ↔ DSC</option>
                        <option value="sony">Sony Cinema Hall ↔ DSC</option>
                        <option value="uttara-moylar">Uttara Moylar Mor ↔ DSC</option>
                        <option value="tongi">Tongi College gate ↔ DSC</option>
                        <option value="konabari">Konabari Pukur Par ↔ Zirabo ↔ Ashulia Bazar ↔ DSC</option>
                        <option value="ecb">ECB Chattor ↔ Mirpur ↔ DSC</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Registration Number</label>
                    <input type="text" id="bus-registration" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Driver Name</label>
                        <input type="text" id="bus-driver" required>
                    </div>
                    <div class="form-group">
                        <label>Helper Name</label>
                        <input type="text" id="bus-helper" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" id="bus-phone" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bus-ac"> AC Bus
                    </label>
                </div>
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="text" id="bus-image" placeholder="https://example.com/bus.jpghttps://pd.daffodilvarsity.edu.bd/web/image/76447/DIU%20Transport%20%284%29.jpg">
                </div>
                <div class="form-group">
                    <label>Schedule</label>
                    <div class="schedule-options">
                        ${['7:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM', '6:00 PM']
                            .map(time => `
                                <label class="schedule-option">
                                    <input type="checkbox" name="schedule" value="${time}"> ${time}
                                </label>
                            `).join('')}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Save Bus</button>
                <button type="button" id="cancel-bus-btn" class="btn btn-secondary">Cancel</button>
            </form>
        `;
        
        document.getElementById('buses-list').prepend(formContainer);
        
        // Handle form submission
        document.getElementById('bus-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const schedule = {};
            document.querySelectorAll('input[name="schedule"]:checked').forEach(checkbox => {
                schedule[checkbox.value] = true;
            });
            
            const busData = {
                name: document.getElementById('bus-name').value,
                type: document.getElementById('bus-type').value,
                route: document.getElementById('bus-route').value,
                registration: document.getElementById('bus-registration').value,
                driver: document.getElementById('bus-driver').value,
                helper: document.getElementById('bus-helper').value,
                phone: document.getElementById('bus-phone').value,
                ac: document.getElementById('bus-ac').checked,
                image: document.getElementById('bus-image').value || '../css/img/bus2.webp',
                schedule: schedule
            };
            
            createBus(busData).then(() => {
                formContainer.remove();
                loadBusesForAdmin();
            });
        });
        
        document.getElementById('cancel-bus-btn').addEventListener('click', () => {
            formContainer.remove();
        });
    }
    
    function editBusFromAdmin(busId) {
        const bus = diuBuses.find(b => b.id === busId);
        if (!bus) return;
        
        const formContainer = document.createElement('div');
        formContainer.id = 'edit-bus-form-container';
        formContainer.style.marginTop = '20px';
        formContainer.innerHTML = `
            <h3>Edit Bus</h3>
            <form id="bus-form" class="admin-form" data-bus-id="${busId}">
                <div class="form-group">
                    <label>Bus Name</label>
                    <input type="text" id="bus-name" value="${bus.name}" required>
                </div>
                <div class="form-group">
                    <label>Bus Type</label>
                    <select id="bus-type" required>
                        <option value="student" ${bus.type === 'student' ? 'selected' : ''}>Student Bus</option>
                        <option value="faculty" ${bus.type === 'faculty' ? 'selected' : ''}>Faculty Bus</option>
                        <option value="female" ${bus.type === 'female' ? 'selected' : ''}>Female Special</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Route</label>
                    <select id="bus-route" class="form-select" required>
                        <option value="">Choose Route</option>
                        <option value="dhanmondi">Dhanmondi ↔ DSC</option>
                        <option value="uttara">Uttara ↔ Rajlokkhi ↔ DSC</option>
                        <option value="baipail">Baipail ↔ Nabinagar ↔ C&B ↔ DSC</option>
                        <option value="dhamrai">Dhamrai Bus Stand ↔ Nabinagar ↔ C&B ↔ DSC</option>
                        <option value="savar">Savar ↔ C&B ↔ DSC</option>
                        <option value="narayanganj">Narayanganj Chasara ↔ Dhanmondi ↔ DSC</option>
                        <option value="green">Green Model Town ↔ Mugdha ↔ Malibag ↔ Rampura ↔ DSC</option>
                        <option value="sony">Sony Cinema Hall ↔ DSC</option>
                        <option value="uttara-moylar">Uttara Moylar Mor ↔ DSC</option>
                        <option value="tongi">Tongi College gate ↔ DSC</option>
                        <option value="konabari">Konabari Pukur Par ↔ Zirabo ↔ Ashulia Bazar ↔ DSC</option>
                        <option value="ecb">ECB Chattor ↔ Mirpur ↔ DSC</option>
                    </select> 
                </div>
                <div class="form-group">
                    <label>Registration Number</label>
                    <input type="text" id="bus-registration" value="${bus.registration}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Driver Name</label>
                        <input type="text" id="bus-driver" value="${bus.driver}" required>
                    </div>
                    <div class="form-group">
                        <label>Helper Name</label>
                        <input type="text" id="bus-helper" value="${bus.helper}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Contact Phone</label>
                    <input type="tel" id="bus-phone" value="${bus.phone}" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bus-ac" ${bus.ac ? 'checked' : ''}> AC Bus
                    </label>
                </div>
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="text" id="bus-image" value="${bus.image || ''}">
                </div>
                <div class="form-group">
                    <label>Schedule</label>
                    <div class="schedule-options">
                        ${['7:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:30 PM', '4:00 PM', '6:00 PM']
                            .map(time => `
                                <label class="schedule-option">
                                    <input type="checkbox" name="schedule" value="${time}" 
                                        ${bus.schedule && bus.schedule[time] ? 'checked' : ''}> ${time}
                                </label>
                            `).join('')}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" id="cancel-edit-btn" class="btn btn-secondary">Cancel</button>
            </form>
        `;
        
        const busElement = document.querySelector(`.btn-edit[data-id="${busId}"]`).closest('.admin-bus-item');
        busElement.after(formContainer);
        
        // Handle form submission
        document.getElementById('bus-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const schedule = {};
            document.querySelectorAll('input[name="schedule"]:checked').forEach(checkbox => {
                schedule[checkbox.value] = true;
            });
            
            const updatedBus = {
                name: document.getElementById('bus-name').value,
                type: document.getElementById('bus-type').value,
                route: document.getElementById('bus-route').value,
                registration: document.getElementById('bus-registration').value,
                driver: document.getElementById('bus-driver').value,
                helper: document.getElementById('bus-helper').value,
                phone: document.getElementById('bus-phone').value,
                ac: document.getElementById('bus-ac').checked,
                image: document.getElementById('bus-image').value || 'https://pd.daffodilvarsity.edu.bd/web/image/76447/DIU%20Transport%20%284%29.jpg',
                schedule: schedule
            };
            
            updateBus(busId, updatedBus).then(() => {
                formContainer.remove();
                loadBusesForAdmin();
            });
        });
        
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            formContainer.remove();
        });
    }
});