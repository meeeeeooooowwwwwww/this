/**
 * Search functionality for the business directory website (Lazy Loading)
 */

// Configuration
const API_CONFIG = {
  baseUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:8787' 
    : 'https://business-directory.generalflynn17.workers.dev',
  endpoints: {
    search: '/api/search',
    data: '/api/data'
  }
};

// State management
let currentSearchState = {
  query: '',
  page: 1,
  limit: 12,
  totalPages: 1,
  isLoading: false,
  type: null // Add type if needed for specific pages
};

// DOM Elements
let searchInput, searchButton, resultsGrid, loadingIndicator;

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
  searchInput = document.getElementById('searchInput');
  searchButton = document.getElementById('searchButton');
  resultsGrid = document.getElementById('resultsGrid');
  
  // Create loading indicator if it doesn't exist
  loadingIndicator = document.getElementById('loadingIndicator');
  if (!loadingIndicator && resultsGrid) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.style.display = 'none'; 
    loadingIndicator.style.textAlign = 'center';
    loadingIndicator.style.padding = 'var(--space-md) 0';
    loadingIndicator.textContent = 'Loading more...';
    resultsGrid.parentNode.insertBefore(loadingIndicator, resultsGrid.nextSibling);
  }

  // Event listeners
  if (searchButton) {
    searchButton.addEventListener('click', () => handleSearch(true)); // Pass true to indicate new search
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch(true); // Pass true to indicate new search
      }
    });
  }

  // Initial load if needed (e.g., recent items on homepage)
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      fetchInitialContent(); // Fetch some initial content for homepage
  }

  // --- Lazy Loading Logic ---
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    // Debounce scroll event
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (currentSearchState.isLoading || currentSearchState.page >= currentSearchState.totalPages) {
        return; // Don't load if already loading or no more pages
      }

      // Check if user is near the bottom
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      const threshold = 300; // Pixels from bottom to trigger load

      if (scrollHeight - scrollTop - clientHeight < threshold) {
          console.log('Near bottom, loading next page...');
          currentSearchState.page++;
          handleSearch(false); // Pass false to indicate loading more
      }
    }, 100); // Debounce time: 100ms
  });
  
  // Add menu toggle functionality (from previous version)
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-navigation');
  if (menuToggle && mainNav) {
      menuToggle.addEventListener('click', () => {
          mainNav.classList.toggle('active');
      });
  }
  // Add active class logic (from previous version)
  document.addEventListener('DOMContentLoaded', () => {
      const currentPath = window.location.pathname.split('/').pop();
      const navLinks = document.querySelectorAll('.main-navigation a, .footer-nav a');
      navLinks.forEach(link => {
          const linkPath = link.getAttribute('href').split('/').pop();
          // Handle index.html or root path for Home link
          if ((currentPath === '' || currentPath === 'index.html') && (linkPath === '' || linkPath === 'index.html' || linkPath === '/')) {
              link.classList.add('active');
          }
           else if (currentPath === linkPath && currentPath !== '') {
              link.classList.add('active');
          }
      });
  });

});

// Function to fetch initial content (e.g., recent videos for homepage)
async function fetchInitialContent() {
    if (!resultsGrid || currentSearchState.isLoading) return;
    
    currentSearchState.isLoading = true;
    resultsGrid.innerHTML = '<div class="note">Loading recent content...</div>';
    if(loadingIndicator) loadingIndicator.style.display = 'none';

    try {
        const defaultParams = new URLSearchParams({
            type: 'videos', // Request videos specifically
            page: '1',
            // limit: currentSearchState.limit // Use a fixed limit for homepage recent content
            limit: '6' // Fetch 6 items
        });
        // Use /api/data endpoint
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.data}?${defaultParams.toString()}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        currentSearchState.totalPages = data.pagination.totalPages || 1;
        currentSearchState.page = 1;
        
        // Initial render
        resultsGrid.innerHTML = ''; // Clear loading message
        displayResults(data.results);

    } catch (error) {
        console.error('Failed to fetch initial content:', error);
        if(resultsGrid) resultsGrid.innerHTML = '<div class="error-message">Could not load recent content.</div>';
    } finally {
        currentSearchState.isLoading = false;
    }
}


// Handle search execution
async function handleSearch(isNewSearch = false) {
  if (!resultsGrid) return; // Exit if grid doesn't exist
  
  const query = searchInput ? searchInput.value.trim() : ''; // Handle potential null searchInput

  if (isNewSearch) {
    currentSearchState.query = query;
    currentSearchState.page = 1;
    currentSearchState.totalPages = 1; // Reset total pages
    resultsGrid.innerHTML = ''; // Clear previous results for new search
  } else if (currentSearchState.isLoading || currentSearchState.page > currentSearchState.totalPages) {
    return; // Don't trigger if already loading or past the last page
  }

  currentSearchState.isLoading = true;
  if(loadingIndicator) loadingIndicator.style.display = 'block'; // Show loading indicator

  try {
    const searchParams = new URLSearchParams({
      q: currentSearchState.query,
      page: currentSearchState.page,
      limit: currentSearchState.limit
    });
    
    // Add type filtering based on page if needed
    const path = window.location.pathname;
    if (path.includes('articles.html')) {
        searchParams.append('type', 'article');
    } else if (path.includes('videos.html')) {
        searchParams.append('type', 'video');
    } else if (path.includes('businesses.html')) {
        searchParams.append('type', 'business'); // Assuming a 'business' type exists
    }
    // No type added for index.html (searches all)
    
    const searchUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.search}?${searchParams.toString()}`;
    console.log(`Fetching: ${searchUrl}`);
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received data:', data);

    // Update total pages based on response
    currentSearchState.totalPages = data.pagination.totalPages || 1;

    if (data.results.length === 0 && currentSearchState.page === 1) {
      resultsGrid.innerHTML = `<div class="no-results">No results found for "${currentSearchState.query}"</div>`;
    } else {
      displayResults(data.results); // Append results
    }

  } catch (error) {
    console.error('Search error:', error);
    // Display error without clearing existing results if loading more
    if (currentSearchState.page === 1) {
        resultsGrid.innerHTML = `
          <div class="error-message">
            <p>Sorry, an error occurred while searching.</p>
            <p class="error-details">${error.message}</p>
          </div>
        `;
    } else {
        // Optionally display a less intrusive error for load more failures
        console.error('Failed to load more results.');
    }
  } finally {
    currentSearchState.isLoading = false;
    if(loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading indicator
  }
}

// Render/Append search results
function displayResults(results) {
  if (!resultsGrid) return;

  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    let innerHTML = '';

    // Determine content based on type (Add more types as needed)
    const title = result.title || 'Untitled';
    const description = result.description || '';
    const link = result.link || result.url || '#'; // Use link or url
    
    // Determine thumbnail, applying specific placeholder for articles if needed
    let finalThumbnail = result.thumbnail || result.image_url || 'https://via.placeholder.com/320x180.png?text=No+Image'; // Default
    if (result.type === 'article' && finalThumbnail === 'https://via.placeholder.com/320x180.png?text=No+Image') {
        finalThumbnail = '/images/logos/warroom-logo.png'; // Use article placeholder
    } else if (result.type === 'product' && finalThumbnail === 'https://via.placeholder.com/320x180.png?text=No+Image') {
        finalThumbnail = '/images/logos/us-flag.png'; // Use product placeholder
    } else if (result.type === 'business' && finalThumbnail === 'https://via.placeholder.com/320x180.png?text=No+Image') {
        finalThumbnail = '/images/logos/nz-flag.png'; // Use business placeholder
    }
    
    innerHTML = `
        <a href="${link}" target="_blank" rel="noopener noreferrer">
            <img src="${finalThumbnail}" alt="" loading="lazy">
            <div class="result-card-content">
                <h3>${title}</h3>
                ${description ? `<p>${description}</p>` : ''}
                <div class="result-card-meta">
                   Type: ${result.type || 'Unknown'}
                   ${result.date ? ` | Date: ${new Date(result.date).toLocaleDateString()}` : ''}
                   ${result.uploader ? ` | Uploader: ${result.uploader}` : ''}
                   ${result.author ? ` | Author: ${result.author}` : ''}
                </div>
            </div>
        </a>
    `;
    
    resultCard.innerHTML = innerHTML;
    resultsGrid.appendChild(resultCard);
  });
}

// Remove the old renderPagination function - it's no longer needed

// Ensure handleSearch is globally accessible if called by inline onclick (though we removed those)
// window.handleSearch = handleSearch; 