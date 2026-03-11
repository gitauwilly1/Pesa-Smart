(function() {
    'use strict';

    // CONFIGURATION & CONSTANTS

    const FOOTER_CONFIG = {
        COMPANY_NAME: 'PesaSmart',
        COPYRIGHT_YEAR: new Date().getFullYear(),
        FOUNDED_YEAR: 2024,
        SOCIAL_LINKS: {
            twitter: 'https://twitter.com/pesasmart',
            facebook: 'https://facebook.com/pesasmart',
            instagram: 'https://instagram.com/pesasmart',
            linkedin: 'https://linkedin.com/company/pesasmart',
            youtube: 'https://youtube.com/pesasmart',
            whatsapp: 'https://wa.me/254795511314'
        },
        CONTACT_INFO: {
            phone: '+254 795 511 314',
            email: 'help@pesasmart.co.ke',
            address: 'Nairobi, Kenya',
            hours: 'Mon-Fri: 8:00 AM - 6:00 PM EAT'
        },
        APP_STORES: {
            ios: 'https://apps.apple.com/app/pesasmart',
            android: 'https://play.google.com/store/apps/details?id=com.pesasmart'
        },
        TRUST_BADGES: [
            { name: 'CBK Regulated', icon: 'fa-university' },
            { name: 'SSL Secure', icon: 'fa-lock' },
            { name: '256-bit Encryption', icon: 'fa-shield-alt' },
            { name: 'Data Protection', icon: 'fa-database' }
        ]
    };

    // FOOTER HTML TEMPLATE

    const FOOTER_HTML = `
        <footer class="bg-gray-900 text-white pt-16 pb-8" role="contentinfo" aria-label="Site footer">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <!-- Main Footer Content -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
                    
                    <!-- Company Info Column -->
                    <div class="space-y-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
                                <span class="text-white font-bold text-xl">PS</span>
                            </div>
                            <span class="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                                PesaSmart
                            </span>
                        </div>
                        
                        <p class="text-gray-400 text-sm leading-relaxed">
                            Your path to financial confidence. Learn, practice, and grow your money with Kenya's most trusted financial education platform.
                        </p>
                        
                        <!-- Trust Badges -->
                        <div class="flex flex-wrap gap-3 pt-2">
                            ${FOOTER_CONFIG.TRUST_BADGES.map(badge => `
                                <div class="flex items-center text-xs text-gray-400 bg-gray-800 px-3 py-2 rounded-full" title="${badge.name}">
                                    <i class="fas ${badge.icon} text-green-500 mr-1"></i>
                                    <span class="hidden sm:inline">${badge.name}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Social Media Links -->
                        <div class="flex space-x-3 pt-2">
                            <a href="${FOOTER_CONFIG.SOCIAL_LINKS.twitter}" 
                               class="social-link w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                               target="_blank"
                               rel="noopener noreferrer"
                               aria-label="Follow us on Twitter">
                                <i class="fab fa-twitter text-gray-400 hover:text-white transition-colors"></i>
                            </a>
                            <a href="${FOOTER_CONFIG.SOCIAL_LINKS.facebook}" 
                               class="social-link w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                               target="_blank"
                               rel="noopener noreferrer"
                               aria-label="Follow us on Facebook">
                                <i class="fab fa-facebook-f text-gray-400 hover:text-white transition-colors"></i>
                            </a>
                            <a href="${FOOTER_CONFIG.SOCIAL_LINKS.instagram}" 
                               class="social-link w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                               target="_blank"
                               rel="noopener noreferrer"
                               aria-label="Follow us on Instagram">
                                <i class="fab fa-instagram text-gray-400 hover:text-white transition-colors"></i>
                            </a>
                            <a href="${FOOTER_CONFIG.SOCIAL_LINKS.linkedin}" 
                               class="social-link w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                               target="_blank"
                               rel="noopener noreferrer"
                               aria-label="Follow us on LinkedIn">
                                <i class="fab fa-linkedin-in text-gray-400 hover:text-white transition-colors"></i>
                            </a>
                            <a href="${FOOTER_CONFIG.SOCIAL_LINKS.youtube}" 
                               class="social-link w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                               target="_blank"
                               rel="noopener noreferrer"
                               aria-label="Subscribe to our YouTube channel">
                                <i class="fab fa-youtube text-gray-400 hover:text-white transition-colors"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Quick Links Column -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-white relative inline-block">
                            Quick Links
                            <span class="absolute bottom-0 left-0 w-12 h-0.5 bg-green-500"></span>
                        </h3>
                        <ul class="space-y-3">
                            <li>
                                <a href="index.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Go to Home page">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Home</span>
                                </a>
                            </li>
                            <li>
                                <a href="learn.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Go to Learn page">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Learn</span>
                                </a>
                            </li>
                            <li>
                                <a href="practice.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Go to Practice page">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Practice</span>
                                </a>
                            </li>
                            <li>
                                <a href="act.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Go to Act page">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Act</span>
                                </a>
                            </li>
                            <li>
                                <a href="profile.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Go to Profile page">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Profile</span>
                                </a>
                            </li>
                            <li>
                                <a href="about.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Learn about us">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>About Us</span>
                                </a>
                            </li>
                            <li>
                                <a href="blog.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Read our blog">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>Blog</span>
                                </a>
                            </li>
                            <li>
                                <a href="faq.html" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="View frequently asked questions">
                                    <i class="fas fa-chevron-right text-xs text-green-500 mr-2 transition-transform group-hover:translate-x-1"></i>
                                    <span>FAQ</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Legal & Support Column -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-white relative inline-block">
                            Legal & Support
                            <span class="absolute bottom-0 left-0 w-12 h-0.5 bg-green-500"></span>
                        </h3>
                        <ul class="space-y-3">
                            <li>
                                <a href="#" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   data-modal="terms">
                                    <i class="fas fa-file-contract text-xs text-green-500 mr-2"></i>
                                    <span>Terms & Conditions</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   data-modal="privacy">
                                    <i class="fas fa-lock text-xs text-green-500 mr-2"></i>
                                    <span>Privacy Policy</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   data-modal="cookies">
                                    <i class="fas fa-cookie-bite text-xs text-green-500 mr-2"></i>
                                    <span>Cookie Policy</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   data-modal="disclosure">
                                    <i class="fas fa-exclamation-triangle text-xs text-green-500 mr-2"></i>
                                    <span>Risk Disclosure</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" 
                                   class="footer-link text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   data-modal="complaints">
                                    <i class="fas fa-comment-dots text-xs text-green-500 mr-2"></i>
                                    <span>Complaints Procedure</span>
                                </a>
                            </li>
                            <li class="pt-2">
                                <button class="cookie-settings text-gray-400 hover:text-green-400 transition-all duration-300 inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2">
                                    <i class="fas fa-sliders-h text-xs text-green-500 mr-2"></i>
                                    <span>Cookie Settings</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <!-- Contact & Newsletter Column -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-white relative inline-block">
                            Get In Touch
                            <span class="absolute bottom-0 left-0 w-12 h-0.5 bg-green-500"></span>
                        </h3>
                        
                        <!-- Contact Information -->
                        <ul class="space-y-3 text-gray-400">
                            <li class="flex items-start group hover:text-green-400 transition-colors">
                                <i class="fas fa-phone-alt text-green-500 mt-1 mr-3 w-4"></i>
                                <div>
                                    <a href="tel:${FOOTER_CONFIG.CONTACT_INFO.phone.replace(/\s/g, '')}" 
                                       class="hover:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2 inline-block"
                                       aria-label="Call us at ${FOOTER_CONFIG.CONTACT_INFO.phone}">
                                        ${FOOTER_CONFIG.CONTACT_INFO.phone}
                                    </a>
                                    <p class="text-xs text-gray-500 mt-1">${FOOTER_CONFIG.CONTACT_INFO.hours}</p>
                                </div>
                            </li>
                            <li class="flex items-center group hover:text-green-400 transition-colors">
                                <i class="fas fa-envelope text-green-500 mr-3 w-4"></i>
                                <a href="mailto:${FOOTER_CONFIG.CONTACT_INFO.email}" 
                                   class="hover:text-green-400 transition-colors break-all focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 -ml-2"
                                   aria-label="Email us at ${FOOTER_CONFIG.CONTACT_INFO.email}">
                                    ${FOOTER_CONFIG.CONTACT_INFO.email}
                                </a>
                            </li>
                            <li class="flex items-center group hover:text-green-400 transition-colors">
                                <i class="fas fa-map-marker-alt text-green-500 mr-3 w-4"></i>
                                <span>${FOOTER_CONFIG.CONTACT_INFO.address}</span>
                            </li>
                        </ul>

                        <!-- Newsletter Signup -->
                        <div class="pt-4">
                            <h4 class="text-white font-medium mb-3">Subscribe to our newsletter</h4>
                            <form id="newsletter-form" class="space-y-3" novalidate>
                                <div class="flex flex-col sm:flex-row gap-2">
                                    <div class="flex-1 relative">
                                        <input type="email" 
                                               id="newsletter-email" 
                                               class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 min-h-[44px]"
                                               placeholder="Enter your email"
                                               aria-label="Email for newsletter"
                                               required>
                                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <i class="fas fa-envelope text-gray-500"></i>
                                        </div>
                                    </div>
                                    <button type="submit" 
                                            class="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[44px] whitespace-nowrap"
                                            aria-label="Subscribe to newsletter">
                                        Subscribe
                                    </button>
                                </div>
                                <div id="newsletter-message" class="text-sm hidden" role="alert"></div>
                                <p class="text-xs text-gray-500">
                                    By subscribing, you agree to our 
                                    <a href="#" class="text-green-500 hover:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-1" data-modal="terms">Terms</a> 
                                    and 
                                    <a href="#" class="text-green-500 hover:text-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-1" data-modal="privacy">Privacy Policy</a>.
                                </p>
                            </form>
                        </div>

                        <!-- App Store Badges -->
                        <div class="pt-4">
                            <h4 class="text-white font-medium mb-3">Download our app</h4>
                            <div class="flex flex-wrap gap-3">
                                <a href="${FOOTER_CONFIG.APP_STORES.ios}" 
                                   class="app-store-badge bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   aria-label="Download on App Store">
                                    <i class="fab fa-apple text-2xl text-white"></i>
                                    <div class="text-left">
                                        <div class="text-xs text-gray-400">Download on</div>
                                        <div class="text-sm font-semibold text-white">App Store</div>
                                    </div>
                                </a>
                                <a href="${FOOTER_CONFIG.APP_STORES.android}" 
                                   class="app-store-badge bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   aria-label="Get it on Google Play">
                                    <i class="fab fa-google-play text-2xl text-white"></i>
                                    <div class="text-left">
                                        <div class="text-xs text-gray-400">Get it on</div>
                                        <div class="text-sm font-semibold text-white">Google Play</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Divider -->
                <div class="border-t border-gray-800 my-8"></div>

                <!-- Bottom Footer -->
                <div class="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
                    <!-- Copyright -->
                    <div class="text-sm text-gray-500 text-center lg:text-left">
                        <p>© ${FOOTER_CONFIG.FOUNDED_YEAR} - ${FOOTER_CONFIG.COPYRIGHT_YEAR} ${FOOTER_CONFIG.COMPANY_NAME}. All rights reserved.</p>
                        <p class="text-xs text-gray-600 mt-1">
                            PesaSmart is regulated by the Central Bank of Kenya. 
                            Investments involve risks. Past performance is not indicative of future results.
                        </p>
                    </div>

                    <!-- Language & Currency Selector -->
                    <div class="flex items-center space-x-4">
                        <!-- Language Selector -->
                        <div class="relative" id="language-selector">
                            <button class="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-3 py-2 min-h-[44px]"
                                    aria-label="Select language"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    id="language-button">
                                <i class="fas fa-globe text-green-500"></i>
                                <span id="current-language">English</span>
                                <i class="fas fa-chevron-down text-xs ml-1 transition-transform duration-300" id="language-chevron"></i>
                            </button>
                            <div class="absolute bottom-full mb-2 right-0 w-40 bg-gray-800 rounded-lg shadow-xl hidden z-50" 
                                 id="language-dropdown"
                                 role="menu"
                                 aria-labelledby="language-button">
                                <div class="py-1">
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-lang="en"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-lang-check="en"></i>
                                        English
                                    </button>
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-lang="sw"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-lang-check="sw"></i>
                                        Kiswahili
                                    </button>
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-lang="fr"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-lang-check="fr"></i>
                                        Français
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Currency Selector -->
                        <div class="relative" id="currency-selector">
                            <button class="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-3 py-2 min-h-[44px]"
                                    aria-label="Select currency"
                                    aria-haspopup="true"
                                    aria-expanded="false"
                                    id="currency-button">
                                <i class="fas fa-money-bill-wave text-green-500"></i>
                                <span id="current-currency">KES</span>
                                <i class="fas fa-chevron-down text-xs ml-1 transition-transform duration-300" id="currency-chevron"></i>
                            </button>
                            <div class="absolute bottom-full mb-2 right-0 w-40 bg-gray-800 rounded-lg shadow-xl hidden z-50" 
                                 id="currency-dropdown"
                                 role="menu"
                                 aria-labelledby="currency-button">
                                <div class="py-1">
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-currency="KES"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-currency-check="KES"></i>
                                        KES - Kenyan Shilling
                                    </button>
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-currency="USD"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-currency-check="USD"></i>
                                        USD - US Dollar
                                    </button>
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-currency="EUR"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-currency-check="EUR"></i>
                                        EUR - Euro
                                    </button>
                                    <button class="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:bg-gray-700 focus:text-white"
                                            data-currency="GBP"
                                            role="menuitem">
                                        <i class="fas fa-check mr-2 text-green-500 opacity-0" data-currency-check="GBP"></i>
                                        GBP - British Pound
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Payment Methods -->
                <div class="mt-8 flex flex-wrap justify-center items-center gap-4">
                    <span class="text-xs text-gray-500">Accepted Payment Methods:</span>
                    <i class="fab fa-cc-visa text-2xl text-gray-600 hover:text-white transition-colors" title="Visa"></i>
                    <i class="fab fa-cc-mastercard text-2xl text-gray-600 hover:text-white transition-colors" title="Mastercard"></i>
                    <i class="fab fa-cc-amex text-2xl text-gray-600 hover:text-white transition-colors" title="American Express"></i>
                    <i class="fab fa-cc-paypal text-2xl text-gray-600 hover:text-white transition-colors" title="PayPal"></i>
                    <span class="text-xl font-bold text-gray-600 hover:text-white transition-colors cursor-default" title="M-Pesa">M-PESA</span>
                    <span class="text-xl font-bold text-gray-600 hover:text-white transition-colors cursor-default" title="Airtel Money">AIRTEL</span>
                </div>
            </div>
        </footer>

        <!-- Back to Top Button -->
        <button id="back-to-top" 
                class="fixed bottom-6 right-6 w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg opacity-0 invisible transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 z-50"
                aria-label="Back to top"
                title="Back to top">
            <i class="fas fa-arrow-up"></i>
        </button>

        <!-- Live Chat Button -->
        <button id="live-chat" 
                class="fixed bottom-6 left-6 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 z-50 flex items-center space-x-2 min-h-[44px]"
                aria-label="Open live chat">
            <i class="fas fa-comment-dots"></i>
            <span class="hidden sm:inline">Live Chat</span>
        </button>

        <!-- Cookie Consent Banner -->
        <div id="cookie-consent" 
             class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 transform translate-y-0 transition-transform duration-500 z-40 hidden"
             role="dialog"
             aria-label="Cookie consent">
            <div class="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-sm text-gray-400 flex-1">
                    <i class="fas fa-cookie-bite text-green-500 mr-2"></i>
                    We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
                    <a href="#" class="text-green-500 hover:text-green-400 ml-2 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 py-1 inline-block" data-modal="cookies">
                        Learn more
                    </a>
                </div>
                <div class="flex gap-3">
                    <button id="cookie-accept" 
                            class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[44px]">
                        Accept
                    </button>
                    <button id="cookie-decline" 
                            class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[44px]">
                        Decline
                    </button>
                </div>
            </div>
        </div>
    `;

    // FOOTER FUNCTIONALITY

    const Footer = {
        // update the init() method
init() {
    // Remove existing footer if present
    this.removeExistingFooter();
    
    this.injectFooter();
    this.setupBackToTop();
    this.setupNewsletter();
    this.setupLanguageSelector();
    this.setupCurrencySelector();
    this.setupCookieConsent();
    this.setupLegalModals();
    this.setupLiveChat();
    this.setupSmoothScroll();
    this.setupAccessibility();
    this.updateCopyrightYear();
    this.checkCookieConsent();
    this.loadUserPreferences();
},

// Add this new method
removeExistingFooter() {
    // Find and remove any existing footer elements
    const existingFooters = document.querySelectorAll('footer');
    existingFooters.forEach(footer => {
        // Check if it's the old footer (has bg-gray-800 class)
        if (footer.classList.contains('bg-gray-800')) {
            footer.remove();
            console.log('Removed existing footer');
        }
    });
    
    // Also remove any stray footer containers
    const footerContainers = document.querySelectorAll('.bg-gray-800.text-white.mt-16');
    footerContainers.forEach(container => container.remove());
},

        // Inject footer HTML if not present
        injectFooter() {
            if (!document.querySelector('footer[role="contentinfo"]')) {
                document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
            }
        },

        // Back to Top functionality
        setupBackToTop() {
            const backToTop = document.getElementById('back-to-top');
            if (!backToTop) return;

            const toggleVisibility = () => {
                if (window.scrollY > 300) {
                    backToTop.classList.remove('opacity-0', 'invisible');
                    backToTop.classList.add('opacity-100', 'visible');
                } else {
                    backToTop.classList.remove('opacity-100', 'visible');
                    backToTop.classList.add('opacity-0', 'invisible');
                }
            };

            window.addEventListener('scroll', this.debounce(toggleVisibility, 100));
            toggleVisibility();

            backToTop.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });

            // Keyboard support
            backToTop.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });
        },

        // Newsletter functionality
        setupNewsletter() {
            const form = document.getElementById('newsletter-form');
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('newsletter-email');
                const message = document.getElementById('newsletter-message');
                const submitBtn = form.querySelector('button[type="submit"]');

                // Validate email
                if (!this.validateEmail(email.value)) {
                    this.showNewsletterMessage(message, 'Please enter a valid email address', 'error');
                    email.focus();
                    return;
                }

                // Show loading state
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Subscribing...';

                // Simulate API call
                setTimeout(() => {
                    // Save to localStorage
                    const subscribers = JSON.parse(localStorage.getItem('pesasmart_newsletter') || '[]');
                    if (!subscribers.includes(email.value)) {
                        subscribers.push(email.value);
                        localStorage.setItem('pesasmart_newsletter', JSON.stringify(subscribers));
                        this.showNewsletterMessage(message, 'Successfully subscribed! Check your email for confirmation.', 'success');
                        email.value = '';
                    } else {
                        this.showNewsletterMessage(message, 'This email is already subscribed.', 'info');
                    }

                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }, 1500);
            });
        },

        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        showNewsletterMessage(element, text, type) {
            element.textContent = text;
            element.className = `text-sm mt-2 ${type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-500' : 'text-blue-500'}`;
            element.classList.remove('hidden');

            setTimeout(() => {
                element.classList.add('hidden');
            }, 5000);
        },

        // Language selector functionality
        setupLanguageSelector() {
            const button = document.getElementById('language-button');
            const dropdown = document.getElementById('language-dropdown');
            const chevron = document.getElementById('language-chevron');
            const currentLang = document.getElementById('current-language');
            const langButtons = dropdown?.querySelectorAll('[data-lang]');

            if (!button || !dropdown || !chevron || !currentLang || !langButtons) return;

            // Toggle dropdown
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                dropdown.classList.toggle('hidden');
                chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
                button.setAttribute('aria-expanded', !isHidden);
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    chevron.style.transform = 'rotate(0)';
                    button.setAttribute('aria-expanded', 'false');
                }
            });

            // Handle language selection
            langButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const lang = btn.dataset.lang;
                    const langName = btn.textContent.trim().replace(/✓/, '').trim();

                    // Update UI
                    currentLang.textContent = langName;
                    
                    // Update checkmarks
                    langButtons.forEach(b => {
                        const check = b.querySelector('[data-lang-check]');
                        if (check) {
                            check.style.opacity = b.dataset.lang === lang ? '1' : '0';
                        }
                    });

                    // Save preference
                    localStorage.setItem('pesasmart_language', lang);
                    
                    // Close dropdown
                    dropdown.classList.add('hidden');
                    chevron.style.transform = 'rotate(0)';
                    button.setAttribute('aria-expanded', 'false');

                    // Show notification
                    this.showToast(`Language changed to ${langName}`, 'info');

                    // In a real app, you would reload translations here
                    console.log(`Language changed to: ${lang}`);
                });

                // Keyboard navigation
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
            });
        },

        // Currency selector functionality
        setupCurrencySelector() {
            const button = document.getElementById('currency-button');
            const dropdown = document.getElementById('currency-dropdown');
            const chevron = document.getElementById('currency-chevron');
            const currentCurrency = document.getElementById('current-currency');
            const currencyButtons = dropdown?.querySelectorAll('[data-currency]');

            if (!button || !dropdown || !chevron || !currentCurrency || !currencyButtons) return;

            // Toggle dropdown
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                dropdown.classList.toggle('hidden');
                chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
                button.setAttribute('aria-expanded', !isHidden);
            });

            // Close dropdown on outside click
            document.addEventListener('click', (e) => {
                if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    chevron.style.transform = 'rotate(0)';
                    button.setAttribute('aria-expanded', 'false');
                }
            });

            // Handle currency selection
            currencyButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const currency = btn.dataset.currency;

                    // Update UI
                    currentCurrency.textContent = currency;
                    
                    // Update checkmarks
                    currencyButtons.forEach(b => {
                        const check = b.querySelector('[data-currency-check]');
                        if (check) {
                            check.style.opacity = b.dataset.currency === currency ? '1' : '0';
                        }
                    });

                    // Save preference
                    localStorage.setItem('pesasmart_currency', currency);
                    
                    // Close dropdown
                    dropdown.classList.add('hidden');
                    chevron.style.transform = 'rotate(0)';
                    button.setAttribute('aria-expanded', 'false');

                    // Show notification
                    this.showToast(`Currency changed to ${currency}`, 'info');

                    // In a real app, you would update prices here
                    console.log(`Currency changed to: ${currency}`);
                });

                // Keyboard navigation
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
            });
        },

        // Cookie consent functionality
        setupCookieConsent() {
            const banner = document.getElementById('cookie-consent');
            const acceptBtn = document.getElementById('cookie-accept');
            const declineBtn = document.getElementById('cookie-decline');
            const settingsBtn = document.querySelector('.cookie-settings');

            if (!banner || !acceptBtn || !declineBtn) return;

            acceptBtn.addEventListener('click', () => {
                localStorage.setItem('pesasmart_cookies_accepted', 'true');
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    banner.classList.add('hidden');
                }, 500);
                this.showToast('Cookies accepted. Thank you!', 'success');
            });

            declineBtn.addEventListener('click', () => {
                localStorage.setItem('pesasmart_cookies_accepted', 'false');
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    banner.classList.add('hidden');
                }, 500);
                this.showToast('You can change your cookie preferences anytime.', 'info');
            });

            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    this.showCookieSettings();
                });
            }
        },

        checkCookieConsent() {
            const banner = document.getElementById('cookie-consent');
            if (!banner) return;

            const accepted = localStorage.getItem('pesasmart_cookies_accepted');
            if (accepted === null) {
                banner.classList.remove('hidden');
                setTimeout(() => {
                    banner.style.transform = 'translateY(0)';
                }, 100);
            }
        },

        showCookieSettings() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'cookie-settings-title');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="cookie-settings-title" class="text-xl font-bold text-gray-800">Cookie Settings</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">Customize your cookie preferences. We use cookies to enhance your browsing experience and analyze our traffic.</p>
                    
                    <div class="space-y-4">
                        <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-800">Essential Cookies</h4>
                                <p class="text-sm text-gray-600">Required for the website to function properly. Cannot be disabled.</p>
                            </div>
                            <div class="relative inline-block w-12 h-6 bg-green-500 rounded-full cursor-not-allowed opacity-50">
                                <div class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                        
                        <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-800">Analytics Cookies</h4>
                                <p class="text-sm text-gray-600">Help us understand how visitors interact with our website.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="analytics-cookies" class="sr-only peer" ${localStorage.getItem('pesasmart_analytics_cookies') !== 'false' ? 'checked' : ''}>
                                <div class="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        
                        <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-800">Marketing Cookies</h4>
                                <p class="text-sm text-gray-600">Used to deliver personalized advertisements.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="marketing-cookies" class="sr-only peer" ${localStorage.getItem('pesasmart_marketing_cookies') === 'true' ? 'checked' : ''}>
                                <div class="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        
                        <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-800">Functional Cookies</h4>
                                <p class="text-sm text-gray-600">Enable enhanced functionality and personalization.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="functional-cookies" class="sr-only peer" ${localStorage.getItem('pesasmart_functional_cookies') === 'true' ? 'checked' : ''}>
                                <div class="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Cancel
                        </button>
                        <button class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" id="save-cookie-settings">
                            Save Preferences
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('save-cookie-settings').addEventListener('click', () => {
                const analytics = document.getElementById('analytics-cookies').checked;
                const marketing = document.getElementById('marketing-cookies').checked;
                const functional = document.getElementById('functional-cookies').checked;

                localStorage.setItem('pesasmart_analytics_cookies', analytics);
                localStorage.setItem('pesasmart_marketing_cookies', marketing);
                localStorage.setItem('pesasmart_functional_cookies', functional);

                modal.remove();
                this.showToast('Cookie preferences saved!', 'success');
            });
        },

        // Legal modals (Terms, Privacy, etc.)
        setupLegalModals() {
            const modalTriggers = document.querySelectorAll('[data-modal]');
            
            modalTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalType = trigger.dataset.modal;
                    this.showLegalModal(modalType);
                });
            });
        },

        showLegalModal(type) {
            const content = {
                terms: {
                    title: 'Terms & Conditions',
                    content: `
                        <h4 class="font-bold mb-3">1. Acceptance of Terms</h4>
                        <p class="text-gray-600 mb-4">By accessing and using PesaSmart, you accept and agree to be bound by the terms and provisions of this agreement.</p>
                        
                        <h4 class="font-bold mb-3">2. Services</h4>
                        <p class="text-gray-600 mb-4">PesaSmart provides financial education, investment simulation, and real investment services. All services are subject to availability and regulatory approval.</p>
                        
                        <h4 class="font-bold mb-3">3. User Accounts</h4>
                        <p class="text-gray-600 mb-4">You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
                        
                        <h4 class="font-bold mb-3">4. Investment Risks</h4>
                        <p class="text-gray-600 mb-4">All investments carry risk. The value of investments may go down as well as up. Past performance is not indicative of future results.</p>
                        
                        <h4 class="font-bold mb-3">5. Fees</h4>
                        <p class="text-gray-600 mb-4">PesaSmart charges fees for certain services as described on our platform. All fees are disclosed upfront.</p>
                    `
                },
                privacy: {
                    title: 'Privacy Policy',
                    content: `
                        <h4 class="font-bold mb-3">1. Information We Collect</h4>
                        <p class="text-gray-600 mb-4">We collect personal information you provide directly to us, such as your name, email, phone number, and financial information.</p>
                        
                        <h4 class="font-bold mb-3">2. How We Use Your Information</h4>
                        <p class="text-gray-600 mb-4">We use your information to provide our services, communicate with you, improve our platform, and comply with legal obligations.</p>
                        
                        <h4 class="font-bold mb-3">3. Data Security</h4>
                        <p class="text-gray-600 mb-4">We implement appropriate technical and organizational measures to protect your personal data against unauthorized access.</p>
                        
                        <h4 class="font-bold mb-3">4. Your Rights</h4>
                        <p class="text-gray-600 mb-4">You have the right to access, correct, or delete your personal data. Contact us to exercise these rights.</p>
                    `
                },
                cookies: {
                    title: 'Cookie Policy',
                    content: `
                        <h4 class="font-bold mb-3">What Are Cookies</h4>
                        <p class="text-gray-600 mb-4">Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience.</p>
                        
                        <h4 class="font-bold mb-3">How We Use Cookies</h4>
                        <p class="text-gray-600 mb-4">We use cookies for authentication, security, preferences, analytics, and marketing purposes.</p>
                        
                        <h4 class="font-bold mb-3">Managing Cookies</h4>
                        <p class="text-gray-600 mb-4">You can control cookies through your browser settings. Disabling cookies may affect site functionality.</p>
                    `
                },
                disclosure: {
                    title: 'Risk Disclosure',
                    content: `
                        <h4 class="font-bold mb-3">Investment Risks</h4>
                        <p class="text-gray-600 mb-4">All investments involve risk, including the possible loss of principal. Past performance does not guarantee future results.</p>
                        
                        <h4 class="font-bold mb-3">Market Risks</h4>
                        <p class="text-gray-600 mb-4">Market conditions can change rapidly. Investment values may fluctuate based on economic, political, and market factors.</p>
                        
                        <h4 class="font-bold mb-3">Liquidity Risks</h4>
                        <p class="text-gray-600 mb-4">Some investments may be difficult to sell at desired times or prices.</p>
                    `
                },
                complaints: {
                    title: 'Complaints Procedure',
                    content: `
                        <h4 class="font-bold mb-3">How to Make a Complaint</h4>
                        <p class="text-gray-600 mb-4">If you have a complaint, please contact our customer support team at complaints@pesasmart.co.ke or call +254 795 511 314.</p>
                        
                        <h4 class="font-bold mb-3">Complaint Process</h4>
                        <p class="text-gray-600 mb-4">We will acknowledge your complaint within 24 hours and provide a full response within 15 business days.</p>
                        
                        <h4 class="font-bold mb-3">Escalation</h4>
                        <p class="text-gray-600 mb-4">If you're unsatisfied with our response, you can escalate to the Central Bank of Kenya or the Capital Markets Authority.</p>
                    `
                }
            };

            const modalData = content[type];
            if (!modalData) return;

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', `modal-${type}-title`);
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
                        <h3 id="modal-${type}-title" class="text-xl font-bold text-gray-800">${modalData.title}</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div class="prose max-w-none">
                        ${modalData.content}
                    </div>
                    
                    <div class="flex justify-end mt-6">
                        <button class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]" onclick="this.closest('.fixed').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        },

        // Live chat functionality
        setupLiveChat() {
            const chatBtn = document.getElementById('live-chat');
            if (!chatBtn) return;

            chatBtn.addEventListener('click', () => {
                this.showLiveChatModal();
            });
        },

        showLiveChatModal() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'chat-title');
            modal.innerHTML = `
                <div class="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 id="chat-title" class="text-xl font-bold text-gray-800">Live Chat Support</h3>
                        <button class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-2" onclick="this.closest('.fixed').remove()">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <p class="text-gray-600 mb-4">How can we help you today? Our support team typically responds within 5 minutes.</p>
                    
                    <div class="bg-gray-50 rounded-lg p-4 mb-4 h-64 overflow-y-auto" id="chat-messages">
                        <div class="flex items-start mb-4">
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <i class="fas fa-headset text-green-600 text-sm"></i>
                            </div>
                            <div class="bg-green-50 rounded-lg p-3 max-w-[80%]">
                                <p class="text-sm text-gray-800">Hello! Welcome to PesaSmart support. How can I assist you today?</p>
                                <span class="text-xs text-gray-500 mt-1 block">Just now</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <input type="text" 
                               id="chat-input"
                               class="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
                               placeholder="Type your message..."
                               aria-label="Chat message">
                        <button class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px] whitespace-nowrap" id="send-chat">
                            <i class="fas fa-paper-plane"></i>
                            <span class="hidden sm:inline ml-2">Send</span>
                        </button>
                    </div>
                    
                    <p class="text-xs text-gray-500 mt-3 text-center">
                        By using chat, you agree to our 
                        <a href="#" class="text-green-500 hover:text-green-600" data-modal="terms">Terms</a>
                    </p>
                </div>
            `;

            document.body.appendChild(modal);

            const chatInput = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-chat');
            const messagesContainer = document.getElementById('chat-messages');

            const addMessage = (message, isUser = false) => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `flex items-start mb-4 ${isUser ? 'justify-end' : ''}`;
                
                if (!isUser) {
                    messageDiv.innerHTML = `
                        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <i class="fas fa-headset text-green-600 text-sm"></i>
                        </div>
                    `;
                }

                const bubble = document.createElement('div');
                bubble.className = `${isUser ? 'bg-blue-500 text-white' : 'bg-green-50 text-gray-800'} rounded-lg p-3 max-w-[80%]`;
                bubble.innerHTML = `
                    <p class="text-sm">${message}</p>
                    <span class="text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'} mt-1 block">Just now</span>
                `;

                if (isUser) {
                    messageDiv.appendChild(bubble);
                } else {
                    const avatarDiv = messageDiv.querySelector('div');
                    if (avatarDiv) {
                        messageDiv.insertBefore(bubble, avatarDiv.nextSibling);
                    } else {
                        messageDiv.appendChild(bubble);
                    }
                }

                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            };

            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (!message) return;

                addMessage(message, true);
                chatInput.value = '';

                // Simulate response
                setTimeout(() => {
                    const responses = [
                        "Thank you for your message. One of our agents will assist you shortly.",
                        "I'd be happy to help with that. Could you provide more details?",
                        "Let me check that for you. Please hold for a moment.",
                        "I understand your concern. Here's what we can do..."
                    ];
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    addMessage(randomResponse);
                }, 1000);
            };

            sendBtn.addEventListener('click', sendMessage);

            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
        },

        // Smooth scroll for anchor links
        setupSmoothScroll() {
            document.querySelectorAll('a[href^="#"]:not([data-modal])').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = anchor.getAttribute('href');
                    if (targetId === '#') return;

                    const target = document.querySelector(targetId);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        },

        // Accessibility improvements
        setupAccessibility() {
            // Add skip to main content link
            if (!document.querySelector('.skip-to-content')) {
                const skipLink = document.createElement('a');
                skipLink.href = '#main-content';
                skipLink.className = 'skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-green-600 focus:text-white focus:px-4 focus:py-3 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white';
                skipLink.textContent = 'Skip to main content';
                document.body.insertAdjacentElement('afterbegin', skipLink);
            }

            // Add ARIA labels to interactive elements
            document.querySelectorAll('button, a').forEach(el => {
                if (!el.getAttribute('aria-label') && !el.textContent.trim()) {
                    console.warn('Interactive element missing accessible label:', el);
                }
            });
        },

        // Update copyright year
        updateCopyrightYear() {
            const copyrightElement = document.querySelector('footer p:first-child');
            if (copyrightElement) {
                const year = new Date().getFullYear();
                copyrightElement.innerHTML = copyrightElement.innerHTML.replace(
                    /\d{4}/g,
                    year
                );
            }
        },

        // Load user preferences from localStorage
        loadUserPreferences() {
            // Language preference
            const savedLang = localStorage.getItem('pesasmart_language');
            if (savedLang) {
                const langButtons = document.querySelectorAll('[data-lang]');
                const currentLang = document.getElementById('current-language');
                
                langButtons.forEach(btn => {
                    const check = btn.querySelector('[data-lang-check]');
                    if (btn.dataset.lang === savedLang) {
                        if (currentLang) {
                            currentLang.textContent = btn.textContent.trim().replace(/✓/, '').trim();
                        }
                        if (check) check.style.opacity = '1';
                    } else {
                        if (check) check.style.opacity = '0';
                    }
                });
            }

            // Currency preference
            const savedCurrency = localStorage.getItem('pesasmart_currency');
            if (savedCurrency) {
                const currencyButtons = document.querySelectorAll('[data-currency]');
                const currentCurrency = document.getElementById('current-currency');
                
                currencyButtons.forEach(btn => {
                    const check = btn.querySelector('[data-currency-check]');
                    if (btn.dataset.currency === savedCurrency) {
                        if (currentCurrency) {
                            currentCurrency.textContent = savedCurrency;
                        }
                        if (check) check.style.opacity = '1';
                    } else {
                        if (check) check.style.opacity = '0';
                    }
                });
            }
        },

        // Toast notification
        showToast(message, type = 'info') {
            const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500'
            };

            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            const toast = document.createElement('div');
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.className = `fixed top-4 right-4 left-4 md:left-auto md:w-96 px-6 py-4 rounded-lg shadow-2xl z-50 transform transition-all duration-300 translate-x-0 ${colors[type]} text-white`;
            toast.innerHTML = `
                <div class="flex items-start">
                    <i class="fas ${icons[type]} text-xl mr-3 mt-0.5"></i>
                    <div class="flex-1">
                        <p class="font-medium">${message}</p>
                    </div>
                    <button class="ml-4 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1" onclick="this.closest('[role=alert]').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },

        // Debounce utility
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // ADD CSS ANIMATIONS

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        @keyframes slideOut {
            from { transform: translateX(0); }
            to { transform: translateX(100%); }
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
        }
        .animate-slide-in {
            animation: slideIn 0.3s ease-out;
        }
        .animate-slide-out {
            animation: slideOut 0.3s ease-out;
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
        .social-link {
            transition: all 0.3s ease;
        }
        .social-link:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px -5px rgba(0, 184, 148, 0.3);
        }
        .footer-link {
            position: relative;
            overflow: hidden;
        }
        .footer-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background-color: #00B894;
            transition: width 0.3s ease;
        }
        .footer-link:hover::after {
            width: 100%;
        }
        .footer-link:focus-visible {
            outline: 2px solid #00B894;
            outline-offset: 2px;
            border-radius: 0.5rem;
        }
        .skip-to-content:focus {
            clip: auto;
            width: auto;
            height: auto;
            overflow: visible;
        }
        @media (max-width: 640px) {
            .social-link {
                width: 44px !important;
                height: 44px !important;
            }
            .footer-link {
                min-height: 44px;
                display: inline-flex;
                align-items: center;
            }
            #back-to-top, #live-chat {
                width: 44px !important;
                height: 44px !important;
                bottom: 1rem;
            }
            #live-chat span {
                display: none;
            }
            .app-store-badge {
                width: 100%;
                justify-content: center;
            }
        }
        @media (max-width: 768px) {
            .grid {
                gap: 2rem;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            *, ::before, ::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);

    // INITIALIZE FOOTER

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Footer.init());
    } else {
        Footer.init();
    }

    // Export for use in other scripts
    window.PesaSmartFooter = Footer;

})();