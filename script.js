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