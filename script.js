document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const newsGrid = document.getElementById('news-grid');
    const loaderContainer = document.getElementById('loader-container');
    const errorMessageContainer = document.getElementById('error-message');
    const dateDisplay = document.getElementById('current-date');
    const modal = document.getElementById('article-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const authBtn = document.getElementById('auth-btn');
    const userEmailDisplay = document.getElementById('user-email');
    const sourceFiltersContainer = document.getElementById('source-filters');
    const backToTopBtn = document.getElementById('back-to-top');

    // --- THE GUARDIAN API SETUP ---
    // ACTION REQUIRED: Get your free API key from https://open-platform.theguardian.com/
    // It's a simple sign-up process.
    const GUARDIAN_API_KEY = '07d9a685-f5d1-4fa8-8ddb-b9789cc0e564'; 
    const GUARDIAN_API_ENDPOINT = 'https://content.guardianapis.com/search';
    
    // Define the news categories (sections/tags in The Guardian API)
    const SOURCES = [
        { id: 'world/india', name: 'India News', type: 'tag' },
        { id: 'world', name: 'World News', type: 'section' },
        { id: 'technology', name: 'Technology', type: 'section' },
        { id: 'business', name: 'Business', type: 'section' }
    ];
    let activeSource = SOURCES[0].id; // Set default active source

    // --- SUPABASE SETUP ---
    const SUPABASE_URL = 'https://osqbfowamtvupyadvmfb.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcWJmb3dhbXR2dXB5YWR2bWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzAyNjgsImV4cCI6MjA3MzQ0NjI2OH0.WRdTYwkKmzPHrMUJ7gwpfy57pqWJKZRJ1S3_nt4JTNk';

    let supabase;
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.warn("Supabase client library not found.");
        }
    } catch (error) {
        console.warn("Supabase client could not be initialized.", error);
    }
    
    // --- AUTHENTICATION ---
    const handleSignIn = async () => {
        if (!supabase) return displayError('Authentication service is not configured.');
        try {
            await supabase.auth.signInWithOAuth({ provider: 'google' });
        } catch (error) {
            displayError(`Google Sign-In failed: ${error.message}`);
        }
    };

    const handleSignOut = async () => {
        if (!supabase) return displayError('Authentication service is not configured.');
        try {
            await supabase.auth.signOut();
        } catch (error) {
            displayError(`Sign-out failed: ${error.message}`);
        }
    };

    const updateUserUI = (user) => {
        if (user) {
            userEmailDisplay.textContent = user.email;
            userEmailDisplay.classList.remove('hidden');
            authBtn.textContent = 'Sign Out';
            authBtn.removeEventListener('click', handleSignIn);
            authBtn.addEventListener('click', handleSignOut);
        } else {
            userEmailDisplay.classList.add('hidden');
            userEmailDisplay.textContent = '';
            authBtn.textContent = 'Sign In with Google';
            authBtn.removeEventListener('click', handleSignOut);
            authBtn.addEventListener('click', handleSignIn);
        }
    };

    if (supabase) {
        supabase.auth.onAuthStateChange((_event, session) => {
            updateUserUI(session?.user ?? null);
        });
    } else {
        authBtn.disabled = true;
        authBtn.textContent = 'Auth Disabled';
        authBtn.classList.add('cursor-not-allowed', 'opacity-50');
    }

    // Display current date
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = today.toLocaleDateString('en-IN', options);

    // --- NEWS FETCHING & DISPLAY (Using The Guardian API) ---
    const fetchNews = async (source) => {
        if (GUARDIAN_API_KEY === 'YOUR_GUARDIAN_API_KEY') {
            throw new Error('The Guardian API key is not configured. Please add it to script.js.');
        }

        let queryParam = source.type === 'tag' ? 'tag' : 'section';
        const url = `${GUARDIAN_API_ENDPOINT}?${queryParam}=${source.id}&api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,trailText,byline&page-size=20&order-by=newest`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.response?.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.response.results;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };
    
    const displayNews = (articles) => {
        newsGrid.innerHTML = '';
        if (!articles || articles.length === 0) {
            newsGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">No articles found. Please check back later.</p>`;
            return;
        }

        articles.forEach((article, index) => {
            if (!article.webTitle || !article.fields?.thumbnail) return;
            const articleCard = document.createElement('div');
            articleCard.className = 'news-card bg-white rounded-lg overflow-hidden shadow-md flex flex-col';
            articleCard.innerHTML = `
                <img src="${article.fields.thumbnail}" alt="News Image" class="news-image w-full h-40 object-cover" onerror="this.src='https://placehold.co/600x400/gray/white?text=Image+Not+Found';">
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="text-lg font-bold mb-2 leading-tight flex-grow">${article.webTitle}</h3>
                    <p class="text-sm text-gray-600 mb-3">${article.fields.trailText || ''}</p>
                    <div class="mt-auto pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span class="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded-full">${article.sectionName}</span>
                        <button data-index="${index}" class="read-more-btn text-sm font-semibold text-blue-600 hover:underline">
                            Read More &rarr;
                        </button>
                    </div>
                </div>`;
            newsGrid.appendChild(articleCard);
        });

        document.querySelectorAll('.read-more-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const articleIndex = e.target.getAttribute('data-index');
                openArticleModal(articles[articleIndex]);
            });
        });
    };
    
    const openArticleModal = (article) => {
        modalContent.innerHTML = `
            <button id="close-modal-btn-inner" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
            <img src="${article.fields.thumbnail}" alt="News Image" class="w-full h-64 object-cover rounded-t-lg mb-4" onerror="this.style.display='none'">
            <h2 class="text-3xl font-bold mb-3">${article.webTitle}</h2>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                <span>By <strong>${article.fields.byline || article.sectionName}</strong></span>
                <span>${new Date(article.webPublicationDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <p class="text-gray-700 leading-relaxed mb-4">${article.fields.trailText || 'Full content not available in this preview.'}</p>
            <a href="${article.webUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 font-semibold hover:underline">Read Full Story on The Guardian &rarr;</a>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    // --- UI & EVENT LISTENERS ---
    const renderSourceButtons = () => {
        sourceFiltersContainer.innerHTML = '';
        SOURCES.forEach(source => {
            const button = document.createElement('button');
            button.dataset.sourceId = source.id;
            button.textContent = source.name;
            const baseClasses = 'font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out';
            if (source.id === activeSource) {
                button.className = `${baseClasses} bg-blue-600 text-white transform -translate-y-0.5 shadow-lg`;
            } else {
                button.className = `${baseClasses} bg-white text-gray-800 hover:bg-gray-200`;
            }
            
            button.addEventListener('click', () => {
                activeSource = source.id;
                const selectedSource = SOURCES.find(s => s.id === activeSource);
                loadNews(selectedSource);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                renderSourceButtons();
            });
            sourceFiltersContainer.appendChild(button);
        });
    };

    const displayError = (message) => {
        errorMessageContainer.textContent = `Error: ${message}`;
        errorMessageContainer.classList.remove('hidden');
        newsGrid.classList.add('hidden');
    };

    const closeArticleModal = () => {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    };
    
    closeModalBtn.addEventListener('click', closeArticleModal);
    // Use event delegation for the dynamically added inner close button
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.id === 'close-modal-btn-inner') {
            closeArticleModal();
        }
    });

    // Back to Top Button Logic
    const handleScroll = () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('hidden');
            backToTopBtn.style.transform = 'translateY(0)';
            backToTopBtn.style.opacity = '1';
        } else {
            backToTopBtn.style.transform = 'translateY(100px)';
            backToTopBtn.style.opacity = '0';
            // Use a timeout to hide the button after the transition
            setTimeout(() => {
                if (window.scrollY <= 300) backToTopBtn.classList.add('hidden');
            }, 300);
        }
    };

    window.addEventListener('scroll', handleScroll);
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    // --- Main Execution Flow ---
    const loadNews = async (source) => {
        loaderContainer.classList.remove('hidden');
        newsGrid.classList.add('hidden');
        errorMessageContainer.classList.add('hidden');
        
        try {
            const articles = await fetchNews(source);
            displayNews(articles);
        } catch (error) {
            displayError(error.message);
        } finally {
            loaderContainer.classList.add('hidden');
            if (errorMessageContainer.classList.contains('hidden')) {
                newsGrid.classList.remove('hidden');
            }
        }
    };
    
    // Initial Load
    renderSourceButtons();
    const initialSource = SOURCES.find(s => s.id === activeSource);
    loadNews(initialSource);
});
