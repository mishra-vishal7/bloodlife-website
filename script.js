// ===============================
// MAIN APPLICATION
// ===============================

// Global Variables
let donors = [];
let notificationSystem;
let donorMap;
let bloodbankMap;
let userLocation = null;

// Indian Cities with Coordinates
const INDIAN_CITIES = {
    "Delhi": { lat: 28.6139, lng: 77.2090 },
    "Mumbai": { lat: 19.0760, lng: 72.8777 },
    "Bangalore": { lat: 12.9716, lng: 77.5946 },
    "Chennai": { lat: 13.0827, lng: 80.2707 },
    "Kolkata": { lat: 22.5726, lng: 88.3639 },
    "Hyderabad": { lat: 17.3850, lng: 78.4867 },
    "Pune": { lat: 18.5204, lng: 73.8567 },
    "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "Jaipur": { lat: 26.9124, lng: 75.7873 },
    "Lucknow": { lat: 26.8467, lng: 80.9462 }
};

// Blood Banks Data
const BLOOD_BANKS = [
    {
        name: "AIIMS Blood Bank",
        city: "Delhi",
        address: "Ansari Nagar, Delhi 110029",
        phone: "011-26588500",
        coordinates: { lat: 28.5674, lng: 77.2090 },
        type: "Government"
    },
    {
        name: "KEM Hospital Blood Bank",
        city: "Mumbai",
        address: "Parel, Mumbai 400012",
        phone: "022-24107000",
        coordinates: { lat: 19.0006, lng: 72.8428 },
        type: "Government"
    },
    {
        name: "St. John's Blood Bank",
        city: "Bangalore",
        address: "Koramangala, Bangalore 560034",
        phone: "080-25531333",
        coordinates: { lat: 12.9352, lng: 77.6245 },
        type: "Private"
    },
    {
        name: "Apollo Blood Bank",
        city: "Chennai",
        address: "Greams Road, Chennai 600006",
        phone: "044-28293333",
        coordinates: { lat: 13.0604, lng: 80.2496 },
        type: "Private"
    },
    {
        name: "Red Cross Blood Bank",
        city: "Kolkata",
        address: "Esplanade, Kolkata 700069",
        phone: "033-22445200",
        coordinates: { lat: 22.5726, lng: 88.3639 },
        type: "Charity"
    }
];

// ===============================
// NOTIFICATION SYSTEM
// ===============================
class NotificationSystem {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('bloodlife_notifications')) || [];
        this.setupNotificationPanel();
        this.updateNotificationBadge();
    }
    
    sendNotification(type, recipient, message, data = {}) {
        const notification = {
            id: Date.now(),
            type,
            recipient,
            message,
            data,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        this.notifications.unshift(notification);
        this.saveToStorage();
        this.showImmediateNotification(notification);
        this.updateNotificationBadge();
        
        console.log(`📢 Notification: ${message}`);
        return notification;
    }
    
    sendRegistrationNotification(userData) {
        const message = `Welcome ${userData.name}! You are now registered as a blood donor (${userData.blood}). Thank you for saving lives!`;
        
        return this.sendNotification(
            'registration',
            userData.phone,
            message,
            { user: userData }
        );
    }
    
    sendEmergencyNotification(emergencyData, matchingDonors) {
        // Notify patient
        this.sendNotification(
            'emergency',
            emergencyData.contact,
            `Emergency request sent! ${matchingDonors.length} donors notified.`,
            emergencyData
        );
        
        // Notify matching donors
        matchingDonors.forEach(donor => {
            this.sendNotification(
                'donor_match',
                donor.phone,
                `🚨 URGENT: ${emergencyData.patientName} needs ${emergencyData.bloodNeeded} at ${emergencyData.hospital}`,
                { emergency: emergencyData, donor: donor }
            );
        });
        
        return matchingDonors.length;
    }
    
    showImmediateNotification(notification) {
        this.updateNotificationList();
        this.showToastNotification(notification);
    }
    
    showToastNotification(notification) {
        const toast = document.createElement('div');
        toast.className = `toast-notification notification-${notification.type}`;
        toast.innerHTML = `
            <div class="toast-icon">${this.getNotificationIcon(notification.type)}</div>
            <div class="toast-message">
                <div class="toast-title">${this.getNotificationTitle(notification.type)}</div>
                <div class="toast-text">${notification.message}</div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    
    setupNotificationPanel() {
        // Setup notification icon click
        const notificationIcon = document.querySelector('.notification-icon-nav');
        if (notificationIcon) {
            notificationIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationPanel();
            });
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationPanel');
            const icon = document.querySelector('.notification-icon-nav');
            
            if (panel && panel.classList.contains('show') && 
                !panel.contains(e.target) && 
                !icon.contains(e.target)) {
                panel.classList.remove('show');
            }
        });
    }
    
    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('show');
            this.updateNotificationList();
        }
    }
    
    updateNotificationList() {
        const list = document.getElementById('notificationList');
        if (list) {
            list.innerHTML = this.renderNotifications();
        }
    }
    
    renderNotifications() {
        if (this.notifications.length === 0) {
            return '<div class="no-notifications">No notifications yet</div>';
        }
        
        return this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 onclick="notificationSystem.markAsRead(${notification.id})">
                <div class="notification-item-icon">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${this.getNotificationTitle(notification.type)}</div>
                    <div class="notification-item-message">${notification.message}</div>
                    <div class="notification-item-time">
                        ${this.formatTimeAgo(notification.timestamp)}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveToStorage();
            this.updateNotificationBadge();
            this.updateNotificationList();
        }
    }
    
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveToStorage();
        this.updateNotificationBadge();
        this.updateNotificationList();
    }
    
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const count = this.notifications.filter(n => !n.read).length;
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            'registration': '📝',
            'emergency': '🚨',
            'donor_match': '🩸',
            'reminder': '⏰'
        };
        return icons[type] || '🔔';
    }
    
    getNotificationTitle(type) {
        const titles = {
            'registration': 'Registration Complete',
            'emergency': 'Emergency Alert!',
            'donor_match': 'Blood Request',
            'reminder': 'Reminder'
        };
        return titles[type] || 'Notification';
    }
    
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('bloodlife_notifications', JSON.stringify(this.notifications));
        } catch (e) {
            console.error('Failed to save notifications:', e);
        }
    }
}

// ===============================
// GOOGLE MAPS INTEGRATION
// ===============================
function initGoogleMaps() {
    console.log('🗺️ Initializing Google Maps...');
    
    // Initialize Donor Map
    donorMap = new google.maps.Map(document.getElementById("googleMap"), {
        center: { lat: 28.6139, lng: 77.2090 },
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    // Initialize Blood Bank Map
    bloodbankMap = new google.maps.Map(document.getElementById("bloodbankMap"), {
        center: { lat: 28.6139, lng: 77.2090 },
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    // Get user location
    getUserLocation();
    
    // Load initial data
    setTimeout(() => {
        loadDonorsOnMap();
        loadBloodBanks();
    }, 1000);
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Center map on user location
                donorMap.setCenter(userLocation);
                donorMap.setZoom(12);
                
                // Add user marker
                addUserMarker(userLocation);
                
                // Find nearby donors
                findNearbyDonors();
            },
            (error) => {
                console.log('Geolocation failed, using default location');
                userLocation = { lat: 28.6139, lng: 77.2090 };
            }
        );
    }
}

function addUserMarker(location) {
    new google.maps.Marker({
        position: location,
        map: donorMap,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2
        },
        title: "Your Location"
    });
}

function loadDonorsOnMap() {
    // Clear existing markers first
    const markers = document.querySelectorAll('[id^="marker-"]');
    markers.forEach(marker => marker.remove());
    
    donors.forEach((donor, index) => {
        const cityCoords = INDIAN_CITIES[donor.city] || INDIAN_CITIES["Delhi"];
        const offsetLat = cityCoords.lat + (Math.random() * 0.05 - 0.025);
        const offsetLng = cityCoords.lng + (Math.random() * 0.05 - 0.025);
        
        const marker = new google.maps.Marker({
            position: { lat: offsetLat, lng: offsetLng },
            map: donorMap,
            title: donor.name,
            icon: {
                url: `http://maps.google.com/mapfiles/ms/icons/red-dot.png`
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px; max-width: 250px;">
                    <h5 style="color: #dc3545; margin-bottom: 5px;">${donor.name}</h5>
                    <p><strong>Blood Group:</strong> ${donor.blood}</p>
                    <p><strong>Phone:</strong> ${donor.phone}</p>
                    <p><strong>City:</strong> ${donor.city}</p>
                    <button onclick="contactDonor('${donor.phone}', '${donor.name}')" 
                            style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                        Contact Donor
                    </button>
                </div>
            `
        });
        
        marker.addListener("click", () => {
            infoWindow.open(donorMap, marker);
        });
    });
    
    updateMapStats();
}

function loadBloodBanks() {
    BLOOD_BANKS.forEach(bank => {
        const marker = new google.maps.Marker({
            position: bank.coordinates,
            map: bloodbankMap,
            title: bank.name,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px; max-width: 250px;">
                    <h5 style="color: #0d6efd; margin-bottom: 5px;">${bank.name}</h5>
                    <p><strong>Address:</strong> ${bank.address}</p>
                    <p><strong>Phone:</strong> ${bank.phone}</p>
                    <p><strong>Type:</strong> ${bank.type}</p>
                </div>
            `
        });
        
        marker.addListener("click", () => {
            infoWindow.open(bloodbankMap, marker);
        });
    });
    
    updateBloodBankList();
}

function updateBloodBankList() {
    const container = document.getElementById('bloodbankResults');
    if (!container) return;
    
    container.innerHTML = BLOOD_BANKS.map(bank => `
        <div class="bloodbank-item" onclick="focusOnBloodBank('${bank.name}')">
            <h6><i class="fas fa-hospital me-2 text-primary"></i>${bank.name}</h6>
            <p><i class="fas fa-map-marker-alt me-2"></i>${bank.address}</p>
            <p><i class="fas fa-phone me-2"></i>${bank.phone}</p>
            <span class="badge bg-info">${bank.type}</span>
        </div>
    `).join('');
}

function focusOnBloodBank(bankName) {
    const bank = BLOOD_BANKS.find(b => b.name === bankName);
    if (bank) {
        bloodbankMap.setCenter(bank.coordinates);
        bloodbankMap.setZoom(15);
    }
}

function findNearbyDonors() {
    if (!userLocation) {
        alert('Please enable location services to find nearby donors');
        return;
    }
    
    const radius = parseInt(document.getElementById('radiusSlider').value);
    document.getElementById('radiusValue').textContent = `${radius} km`;
    
    // Center map on user
    donorMap.setCenter(userLocation);
    donorMap.setZoom(12);
    
    // Show notification
    showNotification(`Finding donors within ${radius} km radius...`, 'info');
}

function showAllDonors() {
    donorMap.setCenter({ lat: 28.6139, lng: 77.2090 });
    donorMap.setZoom(6);
    showNotification('Showing all donors across India', 'info');
}

function searchBloodBanks() {
    const searchTerm = document.getElementById('bloodbankSearch').value.toLowerCase();
    if (searchTerm) {
        showNotification(`Searching for blood banks: ${searchTerm}`, 'info');
    }
}

function updateMapStats() {
    document.getElementById('donorsCount').textContent = donors.length;
}

// ===============================
// APPLICATION INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 BloodLife Website Loading...');
    
    // Initialize notification system
    notificationSystem = new NotificationSystem();
    
    // Load sample data
    loadSampleData();
    
    // Initialize counters
    initializeCounters();
    
    // Initialize eligibility test
    initializeEligibilityTest();
    
    // Setup forms
    setupForms();
    
    // Display initial donors
    displayDonors(donors.slice(0, 6));
    
    // Initialize Google Maps
    setTimeout(() => {
        if (typeof google !== 'undefined') {
            initGoogleMaps();
        }
    }, 2000);
    
    // Update live time
    updateLiveTime();
    
    // Send welcome notification
    setTimeout(() => {
        notificationSystem.sendNotification(
            'welcome',
            'system',
            'Welcome to BloodLife! Real-time donor map is now active.',
            { type: 'system' }
        );
    }, 3000);
    
    console.log('✅ BloodLife Ready!');
});

// ===============================
// SAMPLE DATA
// ===============================
function loadSampleData() {
    donors = [
        {
            id: 1,
            name: "Rahul Sharma",
            blood: "O+",
            phone: "9876543210",
            city: "Delhi",
            lastDonation: "2023-12-01",
            available: true,
            verified: true,
            email: "rahul@example.com"
        },
        {
            id: 2,
            name: "Priya Singh",
            blood: "A+",
            phone: "9876543211",
            city: "Mumbai",
            lastDonation: "2023-11-20",
            available: true,
            verified: true,
            email: "priya@example.com"
        },
        {
            id: 3,
            name: "Amit Verma",
            blood: "B-",
            phone: "9876543212",
            city: "Bangalore",
            lastDonation: "2023-10-15",
            available: false,
            verified: true,
            email: "amit@example.com"
        },
        {
            id: 4,
            name: "Sonal Gupta",
            blood: "AB+",
            phone: "9876543213",
            city: "Delhi",
            lastDonation: "2023-12-10",
            available: true,
            verified: false,
            email: "sonal@example.com"
        },
        {
            id: 5,
            name: "Rajesh Kumar",
            blood: "O-",
            phone: "9876543214",
            city: "Chennai",
            lastDonation: "2023-09-25",
            available: true,
            verified: true,
            email: "rajesh@example.com"
        },
        {
            id: 6,
            name: "Anjali Patel",
            blood: "A-",
            phone: "9876543215",
            city: "Ahmedabad",
            lastDonation: "2023-11-30",
            available: true,
            verified: true,
            email: "anjali@example.com"
        },
        {
            id: 7,
            name: "Vikram Singh",
            blood: "B+",
            phone: "9876543216",
            city: "Kolkata",
            lastDonation: "2023-12-05",
            available: true,
            verified: true,
            email: "vikram@example.com"
        },
        {
            id: 8,
            name: "Neha Reddy",
            blood: "AB-",
            phone: "9876543217",
            city: "Hyderabad",
            lastDonation: "2023-10-20",
            available: false,
            verified: false,
            email: "neha@example.com"
        }
    ];
    
    console.log(`✅ Loaded ${donors.length} sample donors`);
}

// ===============================
// COUNTER ANIMATION
// ===============================
function initializeCounters() {
    const counters = document.querySelectorAll('.counter[data-count]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        animateCounter(counter, target);
    });
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const duration = 2000;
    const stepTime = duration / 100;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, stepTime);
}

// ===============================
// ELIGIBILITY TEST
// ===============================
const eligibilityQuestions = [
    {
        question: "What is your age?",
        options: ["18-60 Years", "61-65 Years", "Below 18", "Above 65"],
        scores: [10, 5, 0, 0]
    },
    {
        question: "What is your weight?",
        options: ["50kg or more", "45-49kg", "Less than 45kg"],
        scores: [10, 5, 0]
    },
    {
        question: "Have you donated blood in last 3 months?",
        options: ["No", "Yes"],
        scores: [10, 0]
    },
    {
        question: "Do you have diabetes?",
        options: ["No", "Yes, controlled", "Yes, uncontrolled"],
        scores: [10, 5, 0]
    }
];

let currentQuestionIndex = 0;
let eligibilityScore = 0;

function initializeEligibilityTest() {
    document.querySelectorAll('.btn-option').forEach(button => {
        button.addEventListener('click', handleEligibilityAnswer);
    });
}

function handleEligibilityAnswer(event) {
    const score = parseInt(event.target.getAttribute('data-score') || '0');
    eligibilityScore += score;
    
    currentQuestionIndex++;
    
    if (currentQuestionIndex < eligibilityQuestions.length) {
        updateEligibilityQuestion();
    } else {
        showEligibilityResult();
    }
}

function updateEligibilityQuestion() {
    const question = eligibilityQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / eligibilityQuestions.length) * 100;
    
    document.getElementById('questionText').textContent = question.question;
    document.getElementById('currentQ').textContent = currentQuestionIndex + 1;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    const optionsDiv = document.querySelector('.options');
    optionsDiv.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn btn-option';
        button.textContent = option;
        button.setAttribute('data-score', question.scores[index]);
        button.addEventListener('click', handleEligibilityAnswer);
        optionsDiv.appendChild(button);
    });
}

function showEligibilityResult() {
    const percentage = (eligibilityScore / 40) * 100;
    const resultContainer = document.getElementById('resultContainer');
    const questionContainer = document.getElementById('questionContainer');
    
    questionContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    
    if (percentage >= 80) {
        resultTitle.textContent = "🎉 You Are Eligible!";
        resultTitle.className = "text-success";
        resultMessage.textContent = `Your score: ${Math.round(percentage)}%. You can donate blood.`;
        
        notificationSystem.sendNotification(
            'registration',
            'user',
            'Congratulations! You are eligible to donate blood.',
            { eligible: true, score: percentage }
        );
    } else if (percentage >= 50) {
        resultTitle.textContent = "⚠ Maybe Eligible";
        resultTitle.className = "text-warning";
        resultMessage.textContent = `Your score: ${Math.round(percentage)}%. Consult a doctor.`;
    } else {
        resultTitle.textContent = "❌ Not Eligible";
        resultTitle.className = "text-danger";
        resultMessage.textContent = `Your score: ${Math.round(percentage)}%. Cannot donate currently.`;
    }
}

// ===============================
// DONOR MANAGEMENT
// ===============================
function displayDonors(donorList) {
    const container = document.getElementById('donorResults');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (donorList.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-user-slash fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No donors found</h4>
                <p class="text-muted">Try different search criteria</p>
            </div>
        `;
        return;
    }
    
    donorList.forEach(donor => {
        const donorCard = createDonorCard(donor);
        container.appendChild(donorCard);
    });
}

function createDonorCard(donor) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const availableBadge = donor.available 
        ? '<span class="badge bg-success ms-2">Available</span>' 
        : '<span class="badge bg-secondary ms-2">Not Available</span>';
    
    col.innerHTML = `
        <div class="donor-card">
            <div class="card-body">
                <h5 class="donor-name">${donor.name}</h5>
                <div class="mb-3">
                    <span class="blood-badge">${donor.blood}</span>
                    ${availableBadge}
                </div>
                <div class="donor-info">
                    <p><i class="fas fa-phone text-danger"></i> ${donor.phone}</p>
                    <p><i class="fas fa-map-marker-alt text-danger"></i> ${donor.city}</p>
                    <p><i class="fas fa-calendar-alt text-danger"></i> Last Donation: ${donor.lastDonation}</p>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-danger" onclick="contactDonor('${donor.phone}', '${donor.name}')">
                        <i class="fas fa-phone-alt"></i> Call
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="requestFromDonor(${donor.id})">
                        <i class="fas fa-heart"></i> Request
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function searchDonors() {
    const bloodGroup = document.getElementById('searchBlood').value;
    const city = document.getElementById('searchCity').value;
    
    let filteredDonors = donors;
    
    if (bloodGroup) {
        filteredDonors = filteredDonors.filter(d => d.blood === bloodGroup);
    }
    
    if (city) {
        filteredDonors = filteredDonors.filter(d => d.city === city);
    }
    
    // Filter available donors only
    filteredDonors = filteredDonors.filter(d => d.available === true);
    
    displayDonors(filteredDonors);
    
    // Show notification
    showNotification(`Found ${filteredDonors.length} donor(s)`, filteredDonors.length > 0 ? 'success' : 'info');
}

// ===============================
// FORM HANDLING
// ===============================
function setupForms() {
    // Donor Registration Form
    const donorForm = document.getElementById('donorForm');
    if (donorForm) {
        donorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newDonor = {
                id: donors.length + 1,
                name: document.getElementById('donorName').value.trim(),
                blood: document.getElementById('donorBlood').value,
                phone: document.getElementById('donorPhone').value.trim(),
                city: document.getElementById('donorCity').value,
                email: document.getElementById('donorEmail').value.trim(),
                lastDonation: document.getElementById('lastDonation').value || 'Never',
                available: true,
                verified: false,
                registrationDate: new Date().toISOString()
            };
            
            // Validation
            if (!newDonor.name || !newDonor.blood || !newDonor.phone || !newDonor.city) {
                showNotification('Please fill all required fields', 'warning');
                return;
            }
            
            // Phone validation
            if (newDonor.phone.length !== 10 || !/^\d+$/.test(newDonor.phone)) {
                showNotification('Please enter valid 10-digit phone', 'warning');
                return;
            }
            
            // Add to donors list
            donors.unshift(newDonor);
            this.reset();
            
            // ✅ Send Registration Notification
            notificationSystem.sendRegistrationNotification(newDonor);
            
            showNotification(`Thank you ${newDonor.name}! You are now registered.`, 'success');
            
            // Update map
            loadDonorsOnMap();
            
            // Update display
            displayDonors([newDonor, ...donors.slice(0, 5)]);
            
            // Update counters
            animateCounters();
        });
    }
    
    // Emergency Request Form
    const emergencyForm = document.getElementById('emergencyForm');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emergencyData = {
                patientName: document.getElementById('patientName').value.trim(),
                bloodNeeded: document.getElementById('emergencyBlood').value,
                hospital: document.getElementById('hospital').value.trim(),
                contact: document.getElementById('emergencyContact').value.trim(),
                city: document.getElementById('emergencyCity').value,
                urgency: document.getElementById('urgencyLevel').value,
                notes: document.getElementById('emergencyNotes').value.trim(),
                timestamp: new Date().toISOString()
            };
            
            // Validation
            if (!emergencyData.patientName || !emergencyData.bloodNeeded || 
                !emergencyData.hospital || !emergencyData.contact || 
                !emergencyData.city || !emergencyData.urgency) {
                showNotification('Please fill all required fields', 'warning');
                return;
            }
            
            // Find matching donors
            const matchingDonors = donors.filter(d => 
                d.blood === emergencyData.bloodNeeded && 
                d.available === true &&
                d.city === emergencyData.city
            ).slice(0, 10);
            
            // ✅ Send Emergency Notifications
            const notifiedCount = notificationSystem.sendEmergencyNotification(emergencyData, matchingDonors);
            
            // Show success message
            let message = `🚨 Emergency alert sent!`;
            if (matchingDonors.length > 0) {
                message += ` ${notifiedCount} donor(s) notified.`;
                showNotification(message, 'success');
            } else {
                message += ' No available donors found.';
                showNotification(message, 'warning');
            }
            
            // Reset form
            this.reset();
            
            console.log(`🚨 Emergency: ${emergencyData.patientName} needs ${emergencyData.bloodNeeded} at ${emergencyData.hospital}`);
        });
    }
}

// ===============================
// UTILITY FUNCTIONS
// ===============================
function contactDonor(phone, name) {
    if (confirm(`Call ${name} at ${phone}?`)) {
        showNotification(`Calling ${name}...`, 'info');
        // In real app: window.location.href = `tel:${phone}`;
    }
}

function requestFromDonor(donorId) {
    const donor = donors.find(d => d.id === donorId);
    if (!donor) return;
    
    const requestDetails = prompt(`Enter request details for ${donor.name}:`, 
        "Urgent blood requirement. Please contact as soon as possible.");
    
    if (requestDetails) {
        notificationSystem.sendNotification(
            'donor_match',
            donor.phone,
            `Blood request: ${requestDetails}`,
            { donor: donor, request: requestDetails }
        );
        
        showNotification(`Request sent to ${donor.name}`, 'success');
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();
    
    const typeIcons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const notification = document.createElement('div');
    notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="me-3" style="font-size: 1.5rem">${typeIcons[type] || '🔔'}</span>
            <div>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        border-radius: 10px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function updateLiveTime() {
    const now = new Date();
    const timeString = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    const liveTimeElement = document.getElementById('liveTime');
    if (liveTimeElement) {
        liveTimeElement.textContent = timeString;
    }
}

// Update time every minute
setInterval(updateLiveTime, 60000);

// ===============================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ===============================
window.notificationSystem = notificationSystem;
window.searchDonors = searchDonors;
window.contactDonor = contactDonor;
window.requestFromDonor = requestFromDonor;
window.restartTest = restartTest;
window.findNearbyDonors = findNearbyDonors;
window.showAllDonors = showAllDonors;
window.searchBloodBanks = searchBloodBanks;

// Restart eligibility test
function restartTest() {
    currentQuestionIndex = 0;
    eligibilityScore = 0;
    
    document.getElementById('resultContainer').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    
    updateEligibilityQuestion();
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = targetElement.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});