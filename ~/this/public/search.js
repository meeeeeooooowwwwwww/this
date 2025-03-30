// Search functionality using Cloudflare Worker API
async function search() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const query = searchInput.value.trim();

    if (!query) {
        if (searchResults) {
            searchResults.innerHTML = '<p>Please enter a search term</p>';
        }
        return;
    }

    try {
        // Call our Cloudflare Worker API for search
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Search failed: ' + response.statusText);
        }

        const results = await response.json();
        
        if (!searchResults) {
            // If no search results container exists, just log results
            console.log('Search results:', results);
            return;
        }

        if (results.length === 0) {
            searchResults.innerHTML = '<p>No results found</p>';
            return;
        }

        // Display results
        let resultsHTML = `
            <h3>Search Results</h3>
            <div class="results-list">
        `;

        results.forEach(result => {
            resultsHTML += `
                <div class="result-item">
                    <h4>${result.title}</h4>
                    <p>${result.description}</p>
                    ${result.url ? `<a href="${result.url}" class="read-more">View Details →</a>` : ''}
                </div>
            `;
        });

        resultsHTML += '</div>';
        searchResults.innerHTML = resultsHTML;
    } catch (error) {
        if (searchResults) {
            searchResults.innerHTML = '<p>Error performing search. Please try again later.</p>';
        }
        console.error('Search error:', error);
    }
}

// Load data from Cloudflare Worker API
async function loadData(type) {
    try {
        const response = await fetch(`/api/data/${type}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${type}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${type}:`, error);
        return [];
    }
}

// Function to add page wrapper
document.addEventListener('DOMContentLoaded', function() {
    // Force scroll to top on page load
    window.scrollTo(0, 0);
    
    // Add class to disable animations initially
    document.body.classList.add('disable-animations');
    
    // Remove the class after a short delay to allow animations after initial load
    setTimeout(function() {
        document.body.classList.remove('disable-animations');
    }, 100);
    
    // Only proceed if page-wrapper doesn't already exist
    if (!document.querySelector('.page-wrapper')) {
        // Get all direct children of the body
        const bodyChildren = Array.from(document.body.children);
        
        // Create the wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper';
        
        // Move all scripts to a temporary array
        const scripts = bodyChildren.filter(child => 
            child.tagName === 'SCRIPT' || 
            child.tagName === 'NOSCRIPT'
        );
        
        // Move all non-script elements to the wrapper
        bodyChildren.forEach(child => {
            if (child.tagName !== 'SCRIPT' && child.tagName !== 'NOSCRIPT') {
                wrapper.appendChild(child);
            }
        });
        
        // Add the wrapper to the body before the scripts
        if (scripts.length > 0) {
            document.body.insertBefore(wrapper, scripts[0]);
        } else {
            document.body.appendChild(wrapper);
        }
    }
    
    // Add search event listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                search();
            }
        });
        
        const searchButton = searchInput.parentElement.querySelector('button');
        if (searchButton) {
            searchButton.addEventListener('click', search);
        }
    }
    
    // Add menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            document.querySelector('.nav-menu').classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
}); 