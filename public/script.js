// Current state
let currentPage = 1;
const itemsPerPage = 10;
let loggedInUser = null;
let selectedMassager = null;
let currentBooking = null;
let userRole = 'client';

// API base URL
const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:5000/api' 
  : '/api';

// DOM elements
const massagersContainer = document.getElementById('massagers-container');
const paginationElement = document.getElementById('pagination');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const bookingModal = document.getElementById('booking-modal');
const paymentModal = document.getElementById('payment-modal');
const ratingModal = document.getElementById('rating-modal');
const profileModal = document.getElementById('profile-modal');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const bookNowBtn = document.getElementById('book-now-btn');
const installBtn = document.getElementById('install-btn');
const logoutBtn = document.getElementById('logout-btn');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const proceedToPaymentBtn = document.getElementById('proceed-to-payment');
const confirmPaymentBtn = document.getElementById('confirm-payment');
const submitRatingBtn = document.getElementById('submit-rating');

// API service functions
const apiService = {
  // Generic fetch function with auth handling
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('dimple_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  },
  
  // Auth endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  async getProfile() {
    return this.request('/auth/me');
  },
  
  // Massager endpoints
  async getMassagers(page = 1, limit = 10) {
    return this.request(`/massagers?page=${page}&limit=${limit}`);
  },
  
  async getMassager(id) {
    return this.request(`/massagers/${id}`);
  },
  
  async searchMassagers(filters) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/massagers/search?${queryParams}`);
  },
  
  async getMassagerAvailability(id, date) {
    return this.request(`/massagers/${id}/availability?date=${date}`);
  },
  
  // Booking endpoints
  async getBookings() {
    return this.request('/bookings');
  },
  
  async getBooking(id) {
    return this.request(`/bookings/${id}`);
  },
  
  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  },
  
  async updateBooking(id, updates) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },
  
  async cancelBooking(id, reason) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled', cancellationReason: reason })
    });
  },
  
  // Payment endpoints
  async initiatePayment(paymentData) {
    return this.request('/payments/telebirr/initiate', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },
  
  async getPayment(id) {
    return this.request(`/payments/${id}`);
  },
  
  // Rating endpoints
  async getMassagerRatings(massagerId, page = 1, limit = 10) {
    return this.request(`/ratings/massager/${massagerId}?page=${page}&limit=${limit}`);
  },
  
  async createRating(ratingData) {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData)
    });
  },
  
  async updateRating(id, updates) {
    return this.request(`/ratings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
};

// Initialize the app
function init() {
  checkAuthStatus();
  loadMassagers();
  setupEventListeners();
  generateManifest();
}

// Load massagers from API
async function loadMassagers() {
  try {
    showLoader(massagersContainer);
    
    const response = await apiService.getMassagers(currentPage, itemsPerPage);
    
    if (response.success) {
      renderMassagers(response.data);
      renderPagination(response.pagination);
    } else {
      showError('Failed to load massagers');
    }
  } catch (error) {
    console.error('Error loading massagers:', error);
    showError('Failed to load massagers. Please try again.');
  }
}

// Render massagers for current page
function renderMassagers(massagers) {
  massagersContainer.innerHTML = '';
  
  if (massagers.length === 0) {
    massagersContainer.innerHTML = `
      <div class="no-results">
        <p>No massagers available at the moment. Please check back later.</p>
      </div>
    `;
    return;
  }
  
  massagers.forEach(massager => {
    const card = document.createElement('div');
    card.className = 'massager-card';
    card.innerHTML = `
      <div class="massager-image">${massager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
      <div class="massager-info">
        <h3 class="massager-name">${massager.name}</h3>
        <div class="massager-specialty">Specialty: ${massager.services.join(', ')}</div>
        <div class="massager-rating">Rating: ${massager.rating.average} ⭐ (${massager.rating.count} reviews)</div>
        <div class="massager-location">Location: ${massager.location}</div>
        <div class="massager-availability">Available: ${massager.availability}</div>
        <div class="massager-price">Price: ${massager.hourlyRate || 'N/A'} ETB/hr</div>
      </div>
      <div class="card-actions">
        <button class="btn btn-outline view-profile-btn" data-id="${massager._id}">View Profile</button>
        <button class="btn btn-primary book-btn" data-id="${massager._id}">Book Now</button>
      </div>
    `;
    massagersContainer.appendChild(card);
  });
  
  // Add event listeners to the buttons
  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const massagerId = this.getAttribute('data-id');
      openBookingModal(massagerId);
    });
  });
}

// Render pagination controls
function renderPagination(pagination) {
  const totalPages = Math.ceil(pagination.total / itemsPerPage);
  paginationElement.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      loadMassagers();
      window.scrollTo(0, 0);
    });
    paginationElement.appendChild(prevBtn);
  }
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    if (i === currentPage) {
      pageBtn.classList.add('active');
    }
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      loadMassagers();
      window.scrollTo(0, 0);
    });
    paginationElement.appendChild(pageBtn);
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadMassagers();
      window.scrollTo(0, 0);
    });
    paginationElement.appendChild(nextBtn);
  }
}

// Open booking modal
async function openBookingModal(massagerId) {
  try {
    showLoader(bookingModal);
    
    const response = await apiService.getMassager(massagerId);
    
    if (response.success) {
      selectedMassager = response.data;
      
      const bookingDetails = document.getElementById('booking-details');
      bookingDetails.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
          <div style="font-size: 3rem; margin-right: 15px;">${selectedMassager.gender === 'male' ? '💆‍♂️' : '💆‍♀️'}</div>
          <div>
            <h3>${selectedMassager.name}</h3>
            <p>Specialty: ${selectedMassager.services.join(', ')}</p>
            <p>Price: ${selectedMassager.hourlyRate || 'N/A'} ETB/hr</p>
          </div>
        </div>
      `;
      
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('booking-date').setAttribute('min', today);
      
      bookingModal.style.display = 'flex';
    } else {
      showError('Failed to load massager details');
    }
  } catch (error) {
    console.error('Error loading massager:', error);
    showError('Failed to load massager details. Please try again.');
  }
}

// Check authentication status
async function checkAuthStatus() {
  const token = localStorage.getItem('dimple_token');
  const userData = localStorage.getItem('dimple_user');
  
  if (token && userData) {
    try {
      // Verify token is still valid by fetching profile
      const response = await apiService.getProfile();
      
      if (response.success) {
        loggedInUser = response.data;
        updateAuthUI();
      } else {
        // Token is invalid, clear storage
        clearAuthData();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthData();
    }
  }
}

// Update UI based on authentication status
function updateAuthUI() {
  if (loggedInUser) {
    loginBtn.textContent = 'Profile';
    registerBtn.style.display = 'none';
    
    loginBtn.removeEventListener('click', () => loginModal.style.display = 'flex');
    loginBtn.addEventListener('click', () => {
      // Show profile instead of login
      document.getElementById('profile-info').innerHTML = `
        <div class="form-group">
          <label>Name</label>
          <div>${loggedInUser.name}</div>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <div>${loggedInUser.phone}</div>
        </div>
        <div class="form-group">
          <label>Role</label>
          <div>${loggedInUser.role}</div>
        </div>
        ${loggedInUser.role === 'massager' ? `
        <div class="form-group">
          <label>Services</label>
          <div>${loggedInUser.services.join(', ') || 'Not specified'}</div>
        </div>
        <div class="form-group">
          <label>Location</label>
          <div>${loggedInUser.location || 'Not specified'}</div>
        </div>
        ` : ''}
      `;
      profileModal.style.display = 'flex';
    });
  } else {
    loginBtn.textContent = 'Login';
    registerBtn.style.display = 'block';
    
    loginBtn.removeEventListener('click', () => profileModal.style.display = 'flex');
    loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const phone = document.getElementById('login-phone').value;
  const password = document.getElementById('login-password').value;
  
  // Simple validation
  if (!phone || !password) {
    showError('Please enter both phone number and password');
    return;
  }
  
  try {
    const response = await apiService.login({ phone, password });
    
    if (response.success) {
      // Save token and user data
      localStorage.setItem('dimple_token', response.token);
      localStorage.setItem('dimple_user', JSON.stringify(response.user));
      
      loggedInUser = response.user;
      loginModal.style.display = 'none';
      updateAuthUI();
      
      showSuccess('Login successful!');
    } else {
      showError(response.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please try again.');
  }
}

// Handle registration
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const role = userRole;
  
  // Validation
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  // Prepare user data
  const userData = { name, phone, password, role };
  
  // Add massager-specific fields if applicable
  if (role === 'massager') {
    userData.services = document.getElementById('register-services').value.split(',').map(s => s.trim());
    userData.gender = document.getElementById('register-gender').value;
    userData.location = document.getElementById('register-location').value;
    userData.availability = document.getElementById('register-availability').value;
  }
  
  try {
    const response = await apiService.register(userData);
    
    if (response.success) {
      // Save token and user data
      localStorage.setItem('dimple_token', response.token);
      localStorage.setItem('dimple_user', JSON.stringify(response.user));
      
      loggedInUser = response.user;
      registerModal.style.display = 'none';
      updateAuthUI();
      
      showSuccess('Registration successful! You are now logged in.');
    } else {
      showError(response.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showError(error.message || 'Registration failed. Please try again.');
  }
}

// Handle proceed to payment
async function handleProceedToPayment() {
  if (!loggedInUser) {
    showError('Please login to book a massage');
    loginModal.style.display = 'flex';
    return;
  }
  
  const date = document.getElementById('booking-date').value;
  const time = document.getElementById('booking-time').value;
  const duration = 1; // Default to 1 hour, could be made configurable
  
  if (!date || !time) {
    showError('Please select both date and time');
    return;
  }
  
  try {
    // Create booking object
    const bookingData = {
      massager: selectedMassager._id,
      date: new Date(date).toISOString(),
      startTime: time,
      duration,
      location: selectedMassager.location || 'Client location'
    };
    
    const response = await apiService.createBooking(bookingData);
    
    if (response.success) {
      currentBooking = response.data;
      
      // Show payment modal
      const paymentDetails = document.getElementById('payment-details');
      paymentDetails.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <h3>Booking Summary</h3>
          <p>Massager: ${selectedMassager.name}</p>
          <p>Date: ${new Date(date).toLocaleDateString()}</p>
          <p>Time: ${time}</p>
          <p>Duration: ${duration} hour${duration !== 1 ? 's' : ''}</p>
          <p><strong>Total: ${currentBooking.totalAmount} ETB</strong></p>
        </div>
      `;
      
      bookingModal.style.display = 'none';
      paymentModal.style.display = 'flex';
    } else {
      showError(response.message || 'Failed to create booking');
    }
  } catch (error) {
    console.error('Booking creation error:', error);
    showError(error.message || 'Failed to create booking. Please try again.');
  }
}

// Handle payment
async function handlePayment() {
  const telebirrPhone = document.getElementById('telebirr-phone').value;
  
  if (!telebirrPhone) {
    showError('Please enter your Telebirr phone number');
    return;
  }
  
  try {
    // Initialize payment
    const paymentData = {
      bookingId: currentBooking._id,
      phoneNumber: telebirrPhone
    };
    
    const response = await apiService.initiatePayment(paymentData);
    
    if (response.success) {
      // In a real implementation, you would redirect to the payment URL
      // or show a payment iframe. For this example, we'll simulate success.
      
      // Simulate successful payment after a delay
      setTimeout(() => {
        paymentModal.style.display = 'none';
        
        // Show rating modal
        const ratingDetails = document.getElementById('rating-details');
        ratingDetails.innerHTML = `
          <div style="margin-bottom: 1rem;">
            <h3>Thank you for your booking!</h3>
            <p>Your booking with ${selectedMassager.name} has been confirmed.</p>
            <p>We hope you enjoy your massage experience.</p>
          </div>
        `;
        
        ratingModal.style.display = 'flex';
      }, 2000);
    } else {
      showError(response.message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showError(error.message || 'Payment failed. Please try again.');
  }
}

// Handle rating submission
async function handleRating() {
  const rating = document.querySelector('input[name="rating"]:checked');
  const reviewText = document.getElementById('review-text').value;
  
  if (!rating) {
    showError('Please select a rating');
    return;
  }
  
  try {
    const ratingData = {
      booking: currentBooking._id,
      rating: parseInt(rating.value),
      review: reviewText
    };
    
    const response = await apiService.createRating(ratingData);
    
    if (response.success) {
      ratingModal.style.display = 'none';
      showSuccess('Thank you for your feedback!');
    } else {
      showError(response.message || 'Failed to submit rating');
    }
  } catch (error) {
    console.error('Rating submission error:', error);
    showError(error.message || 'Failed to submit rating. Please try again.');
  }
}

// Handle logout
function handleLogout() {
  clearAuthData();
  profileModal.style.display = 'none';
  updateAuthUI();
  showSuccess('You have been logged out');
}

// Clear authentication data
function clearAuthData() {
  localStorage.removeItem('dimple_token');
  localStorage.removeItem('dimple_user');
  loggedInUser = null;
}

// Utility functions
function showLoader(element) {
  element.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
}

function showError(message) {
  // Create or show error notification
  const notification = document.getElementById('notification') || createNotificationElement();
  notification.className = 'notification error';
  notification.innerHTML = `<p>${message}</p>`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  // Create or show success notification
  const notification = document.getElementById('notification') || createNotificationElement();
  notification.className = 'notification success';
  notification.innerHTML = `<p>${message}</p>`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

function createNotificationElement() {
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    z-index: 10000;
    display: none;
    max-width: 300px;
  `;
  document.body.appendChild(notification);
  return notification;
}

// Add CSS for loader and notifications
const ad