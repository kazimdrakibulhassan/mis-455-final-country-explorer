const searchForm = document.getElementById('search-form');
const countryInput = document.getElementById('country-input');
const countryResults = document.getElementById('country-results');
const alphabetButtons = document.getElementById('alphabet-buttons');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const searchResultsHeader = document.getElementById('search-results-header');
const searchSection = document.querySelector('.search-section');
const modalOverlay = document.getElementById('countryModal');
const modalClose = document.getElementById('modalClose');
const modalFlag = document.getElementById('modalFlag');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const resultsCount = document.querySelector('.results-count');

let allCountries = [], displayedCountries = [];
const COUNTRIES_PER_PAGE = 9;
let currentPage = 1, totalPages = 1;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let activeLetterFilter = '', isLoading = false;
let lastScrollPosition = 0;

document.addEventListener('DOMContentLoaded', initialize);
window.addEventListener('scroll', handleScroll);
searchForm.addEventListener('submit', e => { e.preventDefault(); handleSearch(); });
countryInput.addEventListener('input', debounce(handleSearch, 300));
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal(); });

async function initialize() {
    try {
        showLoading(true);
        isLoading = true;
        allCountries = await fetchAllCountries();
        allCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        displayedCountries = [...allCountries];
        createAlphabetButtons();
        totalPages = Math.ceil(allCountries.length / COUNTRIES_PER_PAGE);
        updateResultsCount(allCountries.length);
        displayCountriesPage(allCountries, countryResults, currentPage);
        createPagination(totalPages, currentPage, paginateResults);
        showLoading(false);
        isLoading = false;
        document.body.classList.add('page-loaded');
    } catch (error) {
        showError("Failed to initialize. Please refresh the page.");
        console.error(error);
        showLoading(false);
        isLoading = false;
    }
}

function createAlphabetButtons() {
  const allButton = document.createElement('button');
  allButton.className = 'letter-btn active';
  allButton.textContent = 'All';
  allButton.setAttribute('data-letter', '');
  allButton.addEventListener('click', () => {
      filterByLetter('');
      updateActiveButton(allButton);
  });
  alphabetButtons.appendChild(allButton);

  ALPHABET.forEach(letter => {
      const button = document.createElement('button');
      button.className = 'letter-btn';
      button.textContent = letter;
      button.setAttribute('data-letter', letter);
      button.addEventListener('click', () => {
          filterByLetter(letter);
          updateActiveButton(button);
      });
      alphabetButtons.appendChild(button);
  });
}

function updateActiveButton(clickedButton) {
  const buttons = alphabetButtons.querySelectorAll('.letter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  clickedButton.classList.add('active');
}

function filterByLetter(letter) {
  showLoading(true);
  activeLetterFilter = letter;
  currentPage = 1;
  countryInput.value = '';
  
  if (!letter) {
      displayedCountries = [...allCountries];
      updateResultsCount(allCountries.length);
      searchResultsHeader.querySelector('.section-title i').className = 'fas fa-globe';
      totalPages = Math.ceil(allCountries.length / COUNTRIES_PER_PAGE);
      displayCountriesPage(allCountries, countryResults, currentPage);
      createPagination(totalPages, currentPage, paginateResults);
      showLoading(false);
      return;
  }

  const filteredCountries = allCountries.filter(country => 
      country.name.common.toLowerCase().startsWith(letter.toLowerCase())
  );
  
  displayedCountries = filteredCountries;
  updateResultsCount(filteredCountries.length);
  searchResultsHeader.querySelector('.section-title i').className = 'fas fa-filter';
  
  if (filteredCountries.length === 0) {
      showError(`No countries found starting with "${letter}"`);
      countryResults.innerHTML = '';
      hidePagination();
  } else {
      hideError();
      totalPages = Math.ceil(filteredCountries.length / COUNTRIES_PER_PAGE);
      displayCountriesPage(filteredCountries, countryResults, currentPage);
      createPagination(totalPages, currentPage, paginateResults);
  }
  showLoading(false);
}

function handleSearch() {
  if (isLoading) return;
  const searchTerm = countryInput.value.trim();
  
  if (activeLetterFilter && searchTerm) {
      activeLetterFilter = '';
      alphabetButtons.querySelector('[data-letter=""]').classList.add('active');
  }
  
  if (!searchTerm && !activeLetterFilter) {
      displayedCountries = [...allCountries];
      updateResultsCount(allCountries.length);
      currentPage = 1;
      totalPages = Math.ceil(allCountries.length / COUNTRIES_PER_PAGE);
      displayCountriesPage(allCountries, countryResults, currentPage);
      createPagination(totalPages, currentPage, paginateResults);
      return;
  }
  
  if (activeLetterFilter && !searchTerm) return;
  
  try {
      showLoading(true);
      isLoading = true;
      hideError();
      countryResults.classList.add('loading-results');
      
      const results = allCountries.filter(country => 
          country.name.common.toLowerCase().startsWith(searchTerm.toLowerCase())
      );
      
      if (results.length === 0) throw new Error(`No countries found starting with "${searchTerm}"`);
      
      displayedCountries = results;
      currentPage = 1;
      totalPages = Math.ceil(results.length / COUNTRIES_PER_PAGE);
      updateResultsCount(results.length);
      searchResultsHeader.querySelector('.section-title i').className = 'fas fa-search';
      displayCountriesPage(results, countryResults, currentPage);
      totalPages > 1 ? createPagination(totalPages, currentPage, paginateResults) : hidePagination();
      
      countryResults.classList.remove('loading-results');
      showLoading(false);
      isLoading = false;
  } catch (error) {
      showError(error.message);
      console.error(error);
      showLoading(false);
      isLoading = false;
  }
}

async function fetchAllCountries() {
  const response = await fetch('https://restcountries.com/v3.1/all');
  if (!response.ok) throw new Error('Failed to fetch country data');
  return await response.json();
}

function displayCountriesPage(countries, container, page) {
  const startIndex = (page - 1) * COUNTRIES_PER_PAGE;
  const endIndex = Math.min(startIndex + COUNTRIES_PER_PAGE, countries.length);
  displayCountries(countries.slice(startIndex, endIndex), container);
}

function displayCountries(countries, container) {
  container.innerHTML = '';
  if (countries.length === 0) {
      container.innerHTML = `
          <div class="no-results">
              <i class="fas fa-globe fa-3x"></i>
              <p>No countries found matching your search.</p>
              <button class="reset-search-btn"><i class="fas fa-redo"></i> Reset Search</button>
          </div>`;
      container.querySelector('.reset-search-btn').addEventListener('click', () => {
          countryInput.value = '';
          activeLetterFilter = '';
          alphabetButtons.querySelector('[data-letter=""]').classList.add('active');
          displayCountriesPage(allCountries, countryResults, currentPage);
      });
      return;
  }

  countries.forEach((country, index) => {
      const card = document.createElement('div');
      card.className = 'country-card';
      card.style.animationDelay = `${index * 0.05}s`;
      
      const name = country.name.common;
      const flag = country.flags?.png || '';
      const capital = country.capital?.[0] || 'Unknown';
      const region = country.region || 'Unknown';
      const languages = country.languages ? Object.values(country.languages).join(', ') : 'Unknown';
      const currencies = country.currencies ? 
          Object.values(country.currencies).map(c => `${c.name} (${c.symbol || ''})`).join(', ') : 'Unknown';
      const area = country.area ? `${country.area.toLocaleString()} km²` : 'Unknown';
      
      card.innerHTML = `
          <div class="flag-container">
              <img src="${flag}" alt="${name} flag" loading="lazy">
          </div>
          <div class="country-info">
              <div class="country-header">
                  <h3 class="country-name">${name}</h3>
                  <span class="country-code-text">${country.cca2 || country.cca3 || ''}</span>
              </div>
              <div class="info-grid">
                  <div class="info-item"><i class="fas fa-map-marker-alt"></i><span><span class="info-label">Capital:</span> ${capital}</span></div>
                  <div class="info-item"><i class="fas fa-globe-americas"></i><span><span class="info-label">Region:</span> ${region}</span></div>
                  <div class="info-item"><i class="fas fa-comments"></i><span><span class="info-label">Languages:</span> ${languages}</span></div>
                  <div class="info-item"><i class="fas fa-money-bill-wave"></i><span><span class="info-label">Currency:</span> ${currencies}</span></div>
                  <div class="info-item"><i class="fas fa-ruler-combined"></i><span><span class="info-label">Area:</span> ${area}</span></div>
              </div>
              <a class="more-details-link"><i class="fas fa-info-circle"></i> More Details</a>
          </div>`;

      card.querySelector('.more-details-link').addEventListener('click', () => openCountryModal(country));
      container.appendChild(card);
  });
}

function createPagination(totalPages, currentPage, callback) {
  const container = document.getElementById('pagination') || document.createElement('div');
  container.id = 'pagination';
  container.className = 'pagination';
  container.innerHTML = '';

  if (totalPages <= 1) {
      container.classList.add('hidden');
      return;
  }

  const pages = totalPages <= 7 ? 
      Array.from({length: totalPages}, (_, i) => i + 1) :
      getComplexPagination(currentPage, totalPages);

  container.innerHTML = `
      <div class="pagination-info">Page ${currentPage} of ${totalPages}</div>
      <div class="page-buttons-container">
          ${currentPage > 1 ? `<button class="pagination-button pagination-prev"><i class="fas fa-chevron-left"></i> Prev</button>` : ''}
          ${pages.map(page => page === '...' ? 
              '<span class="pagination-ellipsis">...</span>' : 
              `<button class="pagination-button${currentPage === page ? ' active' : ''}">${page}</button>`
          ).join('')}
          ${currentPage < totalPages ? `<button class="pagination-button pagination-next">Next <i class="fas fa-chevron-right"></i></button>` : ''}
      </div>`;

  container.querySelectorAll('.pagination-button').forEach(button => {
      button.addEventListener('click', () => {
          if (button.classList.contains('pagination-prev')) callback(currentPage - 1);
          else if (button.classList.contains('pagination-next')) callback(currentPage + 1);
          else callback(parseInt(button.textContent));
      });
  });

  document.getElementById('results-section').appendChild(container);
}

function getComplexPagination(current, total) {
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total];
  return [1, '...', current-1, current, current+1, '...', total];
}

function paginateResults(page) {
  if (isLoading) return;
  showLoading(true);
  isLoading = true;
  countryResults.classList.add('loading-results');
  
  setTimeout(() => {
      currentPage = page;
      displayCountriesPage(displayedCountries, countryResults, currentPage);
      createPagination(totalPages, currentPage, paginateResults);
      searchResultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      countryResults.classList.remove('loading-results');
      showLoading(false);
      isLoading = false;
  }, 300);
}