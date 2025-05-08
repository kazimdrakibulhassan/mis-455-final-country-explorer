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
