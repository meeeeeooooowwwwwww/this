// Business Directory - Main Application JS

// Load categories and featured businesses on page load
document.addEventListener('DOMContentLoaded', async function() {
  // Load categories
  await loadCategories();
  
  // Load featured businesses
  await loadFeaturedBusinesses();
});

// Function to load categories
async function loadCategories() {
  const categoriesContainer = document.querySelector('.categories-grid');
  if (!categoriesContainer) return;
  
  try {
    const categories = await loadData('categories');
    
    if (categories.length === 0) {
      categoriesContainer.innerHTML = '<p>No categories found</p>';
      return;
    }
    
    let html = '';
    categories.forEach(category => {
      html += `
        <div class="category-card">
          <div class="category-image">
            <img src="${category.image}" alt="${category.title}">
          </div>
          <div class="category-content">
            <h3>${category.title}</h3>
            <p>${category.description}</p>
            <p><strong>${category.count}</strong> businesses</p>
            <a href="${category.url}" class="link">View All →</a>
          </div>
        </div>
      `;
    });
    
    categoriesContainer.innerHTML = html;
  } catch (error) {
    console.error('Error loading categories:', error);
    categoriesContainer.innerHTML = '<p>Error loading categories. Please try again later.</p>';
  }
}

// Function to load featured businesses
async function loadFeaturedBusinesses() {
  const businessesContainer = document.querySelector('.featured-grid');
  if (!businessesContainer) return;
  
  try {
    const businesses = await loadData('businesses');
    
    if (businesses.length === 0) {
      businessesContainer.innerHTML = '<p>No featured businesses found</p>';
      return;
    }
    
    let html = '';
    businesses.forEach(business => {
      html += `
        <div class="business-card">
          <div class="business-image">
            <img src="${business.image}" alt="${business.title}">
          </div>
          <div class="business-content">
            <div class="rating">
              ${getRatingStars(business.rating)}
            </div>
            <h3>${business.title}</h3>
            <span class="category">${business.category}</span>
            <p>${business.description}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${business.location}</p>
            <p><i class="fas fa-phone"></i> ${business.phone}</p>
            <a href="${business.url}" class="link">View Details →</a>
          </div>
        </div>
      `;
    });
    
    businessesContainer.innerHTML = html;
  } catch (error) {
    console.error('Error loading businesses:', error);
    businessesContainer.innerHTML = '<p>Error loading featured businesses. Please try again later.</p>';
  }
}

// Helper function to generate star ratings
function getRatingStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star"></i>';
  }
  
  // Add half star if needed
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt"></i>';
  }
  
  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star"></i>';
  }
  
  return starsHtml + ` <span>(${rating})</span>`;
} 