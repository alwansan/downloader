/**
 * Cinemana - Movies and TV Shows Application
 * Main Application Script
 * 
 * This script initializes the application and handles navigation
 */

(function() {
    'use strict';

    // Application state
    const state = {
        currentSection: 'home',
        searchQuery: '',
        selectedMovie: null,
        favorites: JSON.parse(localStorage.getItem('cinemana_favorites') || '[]')
    };

    // Initialize the application
    function init() {
        console.log('🎬 Cinemana application initialized');
        setupEventListeners();
        loadContent();
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', handleNavigation);
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        
        if (searchInput) searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        if (searchButton) searchButton.addEventListener('click', performSearch);

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-tab');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleFilter);
        });
    }

    // Handle navigation
    function handleNavigation(e) {
        const navId = this.id;
        
        switch(navId) {
            case 'home-nav':
                showSection('home');
                break;
            case 'search-nav':
                showSection('search');
                break;
            case 'categories-nav':
                showSection('categories');
                break;
            case 'favorites-nav':
                showSection('favorites');
                break;
        }
    }

    // Show specific section
    function showSection(sectionName) {
        const sections = document.querySelectorAll('.section-panel');
        sections.forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(sectionName + '-section');
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        state.currentSection = sectionName;
        updateNavActiveState();
    }

    // Update active navigation state
    function updateNavActiveState() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeNav = document.getElementById(state.currentSection + '-nav');
        if (activeNav) activeNav.classList.add('active');
    }

    // Load initial content
    function loadContent() {
        console.log('Loading content...');
        // Content loading logic here
    }

    // Perform search
    function performSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            state.searchQuery = searchInput.value.trim();
            if (state.searchQuery) {
                console.log('Searching for:', state.searchQuery);
                // Search logic here
            }
        }
    }

    // Handle filter
    function handleFilter(e) {
        const filterType = e.target.getAttribute('data-filter');
        console.log('Filtering by:', filterType);
        // Filter logic here
    }

    // Global function for back button
    window.handleGlobalBackButtonClick = function() {
        showSection('home');
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
