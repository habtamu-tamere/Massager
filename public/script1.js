
        // Sample data for massagers
        const massagers = [];
        const services = ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Thai Massage', 'Shiatsu', 'Reflexology'];
        const locations = ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Adama'];
        
        for (let i = 1; i <= 30; i++) {
            const serviceCount = Math.floor(Math.random() * 3) + 1;
            const selectedServices = [];
            for (let j = 0; j < serviceCount; j++) {
                const randomService = services[Math.floor(Math.random() * services.length)];
                if (!selectedServices.includes(randomService)) {
                    selectedServices.push(randomService);
                }
            }
            
            massagers.push({
                id: i,
                name: `Massager ${i}`,
                specialty: selectedServices.join(', '),
                rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
                price: Math.floor(Math.random() * 1000) + 500, // Random price between 500 and 1500
                image: `💆‍${i % 2 ? '♂' : '♀'}️`, // Alternate between male and female emoji
                gender: i % 2 ? 'Male' : 'Female',
                location: locations[Math.floor(Math.random() * locations.length)],
                availability: 'Mon-Sat 9:00 AM - 8:00 PM'
            });
        }

        // Current state
        let currentPage = 1;
        const itemsPerPage = 10;
        let loggedInUser = null;
        let selectedMassager = null;
        let currentBooking = null;
        let userRole = 'client';

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

        // Initialize the app
        function init() {
            renderMassagers();
            renderPagination();
            setupEventListeners();
            checkAuthStatus();
            generateManifest();
        }

        // Render massagers for current page
        function renderMassagers() {
            massagersContainer.innerHTML = '';
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, massagers.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const massager = massagers[i];
                const card = document.createElement('div');
                card.className = 'massager-card';
                card.innerHTML = `
                    <div class="massager-image">${massager.image}</div>
                    <div class="massager-info">
                        <h3 class="massager-name">${massager.name}</h3>
                        <div class="massager-specialty">Specialty: ${massager.specialty}</div>
                        <div class="massager-rating">Rating: ${massager.rating} ⭐ (${Math.floor(Math.random() * 100) + 10} reviews)</div>
                        <div class="massager-location">Location: ${massager.location}</div>
                        <div class="massager-availability">Available: ${massager.availability}</div>
                        <div class="massager-price">Price: ${massager.price} ETB/hr</div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-outline view-profile-btn" data-id="${massager.id}">View Profile</button>
                        <button class="btn btn-primary book-btn" data-id="${massager.id}">Book Now</button>
                    </div>
                `;
                massagersContainer.appendChild(card);
            }
            
            // Add event listeners to the buttons
            document.querySelectorAll('.book-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const massagerId = parseInt(this.getAttribute('data-id'));
                    openBookingModal(massagerId);
                });
            });
        }

        // Render pagination controls
        function renderPagination() {
            const totalPages = Math.ceil(massagers.length / itemsPerPage);
            paginationElement.innerHTML = '';
            
            if (totalPages <= 1) return;
            
            // Previous button
            if (currentPage > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = 'Previous';
                prevBtn.addEventListener('click', () => {
                    currentPage--;
                    renderMassagers();
                    renderPagination();
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
                    renderMassagers();
                    renderPagination();
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
                    renderMassagers();
                    renderPagination();
                    window.scrollTo(0, 0);
                });
                paginationElement.appendChild(nextBtn);
            }
        }

        // Open booking modal
        function openBookingModal(massagerId) {
            selectedMassager = massagers.find(m => m.id === massagerId);
            if (!selectedMassager) return;
            
            const bookingDetails = document.getElementById('booking-details');
            bookingDetails.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <div style="font-size: 3rem; margin-right: 15px;">${selectedMassager.image}</div>
                    <div>
                        <h3>${selectedMassager.name}</h3>
                        <p>Specialty: ${selectedMassager.specialty}</p>
                        <p>Price: ${selectedMassager.price} ETB/hr</p>
                    </div>
                </div>
            `;
            
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('booking-date').setAttribute('min', today);
            
            bookingModal.style.display = 'flex';
        }

        // Setup event listeners
        function setupEventListeners() {
            // Auth buttons
            loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
            registerBtn.addEventListener('click', () => registerModal.style.display = 'flex');
            bookNowBtn.addEventListener('click', () => {
                if (loggedInUser) {
                    // If logged in, scroll to massagers section
                    document.getElementById('massagers').scrollIntoView({ behavior: 'smooth' });
                } else {
                    // If not logged in, open login modal
                    loginModal.style.display = 'flex';
                }
            });
            
            // Role selection
            document.querySelectorAll('.role-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    userRole = this.getAttribute('data-role');
                    
                    // Show/hide massager-specific fields
                    const massagerFields = document.getElementById('massager-fields');
                    massagerFields.style.display = userRole === 'massager' ? 'block' : 'none';
                });
            });
            
            // Close modals
            document.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', () => {
                    loginModal.style.display = 'none';
                    registerModal.style.display = 'none';
                    bookingModal.style.display = 'none';
                    paymentModal.style.display = 'none';
                    ratingModal.style.display = 'none';
                    profileModal.style.display = 'none';
                });
            });
            
            // Switch between login and register modals
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.style.display = 'none';
                registerModal.style.display = 'flex';
            });
            
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.style.display = 'none';
                loginModal.style.display = 'flex';
            });
            
            // Form submissions
            document.getElementById('login-form').addEventListener('submit', handleLogin);
            document.getElementById('register-form').addEventListener('submit', handleRegister);
            
            // Payment and sharing
            proceedToPaymentBtn.addEventListener('click', handleProceedToPayment);
            confirmPaymentBtn.addEventListener('click', handlePayment);
            submitRatingBtn.addEventListener('click', handleRating);
            
            document.querySelectorAll('.share-button').forEach(btn => {
                btn.addEventListener('click', function() {
                    const platform = this.getAttribute('data-platform');
                    shareBooking(platform);
                });
            });
            
            // Logout
            logoutBtn.addEventListener('click', handleLogout);
            
            // PWA installation
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', () => {
                    e.prompt();
                    installBtn.style.display = 'none';
                });
            });
        }

        // Check authentication status
        function checkAuthStatus() {
            const userData = localStorage.getItem('dimple_user');
            if (userData) {
                loggedInUser = JSON.parse(userData);
                updateAuthUI();
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
                            <div>${loggedInUser.services || 'Not specified'}</div>
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
        function handleLogin(e) {
            e.preventDefault();
            const phone = document.getElementById('login-phone').value;
            const password = document.getElementById('login-password').value;
            
            // Simple validation
            if (!phone || !password) {
                alert('Please enter both phone number and password');
                return;
            }
            
            // Check if user exists in localStorage
            const users = JSON.parse(localStorage.getItem('dimple_users') || '[]');
            const user = users.find(u => u.phone === phone && u.password === password);
            
            if (user) {
                loggedInUser = user;
                localStorage.setItem('dimple_user', JSON.stringify(user));
                loginModal.style.display = 'none';
                updateAuthUI();
                alert('Login successful!');
            } else {
                alert('Invalid credentials. Please try again.');
            }
        }

        // Handle registration
        function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const phone = document.getElementById('register-phone').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // Validation
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            // Check if user already exists
            const users = JSON.parse(localStorage.getItem('dimple_users') || '[]');
            if (users.some(u => u.phone === phone)) {
                alert('User with this phone number already exists');
                return;
            }
            
            // Create new user
            const newUser = { 
                name, 
                phone, 
                password, 
                role: userRole 
            };
            
            // Add massager-specific fields if applicable
            if (userRole === 'massager') {
                newUser.services = document.getElementById('register-services').value;
                newUser.gender = document.getElementById('register-gender').value;
                newUser.location = document.getElementById('register-location').value;
                newUser.availability = document.getElementById('register-availability').value;
            }
            
            users.push(newUser);
            localStorage.setItem('dimple_users', JSON.stringify(users));
            localStorage.setItem('dimple_user', JSON.stringify(newUser));
            
            loggedInUser = newUser;
            registerModal.style.display = 'none';
            updateAuthUI();
            alert('Registration successful! You are now logged in.');
        }

        // Handle proceed to payment
        function handleProceedToPayment() {
            if (!loggedInUser) {
                alert('Please login to book a massage');
                loginModal.style.display = 'flex';
                return;
            }
            
            const date = document.getElementById('booking-date').value;
            const time = document.getElementById('booking-time').value;
            
            if (!date || !time) {
                alert('Please select both date and time');
                return;
            }
            
            // Create booking object
            currentBooking = {
                massager: selectedMassager,
                date,
                time,
                user: loggedInUser,
                total: selectedMassager.price,
                status: 'pending'
            };
            
            // Show payment modal
            const paymentDetails = document.getElementById('payment-details');
            paymentDetails.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h3>Booking Summary</h3>
                    <p>Massager: ${selectedMassager.name}</p>
                    <p>Date: ${date}</p>
                    <p>Time: ${time}</p>
                    <p><strong>Total: ${selectedMassager.price} ETB</strong></p>
                </div>
            `;
            
            bookingModal.style.display = 'none';
            paymentModal.style.display = 'flex';
        }

        // Handle payment
        function handlePayment() {
            const telebirrPhone = document.getElementById('telebirr-phone').value;
            
            if (!telebirrPhone) {
                alert('Please enter your Telebirr phone number');
                return;
            }
            
            // Simulate Telebirr payment process
            alert(`Processing Telebirr payment from ${telebirrPhone} for ${currentBooking.total} ETB...`);
            
            // In a real app, this would integrate with Telebirr API
            setTimeout(() => {
                // Update booking status
                currentBooking.status = 'confirmed';
                currentBooking.paymentMethod = 'Telebirr';
                currentBooking.paymentPhone = telebirrPhone;
                
                // Save booking
                const bookings = JSON.parse(localStorage.getItem('dimple_bookings') || '[]');
                bookings.push(currentBooking);
                localStorage.setItem('dimple_bookings', JSON.stringify(bookings));
                
                paymentModal.style.display 