// Thoughts App - Main Application Logic

(function() {
    'use strict';

    // DOM Elements
    const thoughtForm = document.getElementById('thoughtForm');
    const thoughtInput = document.getElementById('thoughtInput');
    const tagSelect = document.getElementById('tagSelect');
    const searchInput = document.getElementById('searchInput');
    const thoughtsList = document.getElementById('thoughtsList');
    const emptyState = document.getElementById('emptyState');
    const thoughtCount = document.getElementById('thoughtCount');
    const themeToggle = document.getElementById('themeToggle');
    const tabs = document.querySelectorAll('.tab');

    // State
    let thoughts = [];
    let currentFilter = 'today';
    let searchQuery = '';

    // Local Storage Keys
    const STORAGE_KEY = 'thoughts_app_data';
    const THEME_KEY = 'thoughts_app_theme';

    // Initialize the app
    function init() {
        loadThoughts();
        loadTheme();
        setupEventListeners();
        renderThoughts();
    }

    // Load thoughts from localStorage
    function loadThoughts() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                thoughts = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading thoughts:', e);
            thoughts = [];
        }
    }

    // Save thoughts to localStorage
    function saveThoughts() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts));
        } catch (e) {
            console.error('Error saving thoughts:', e);
        }
    }

    // Load theme preference
    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
    }

    // Toggle theme
    function toggleTheme() {
        const isDark = document.documentElement.hasAttribute('data-theme');
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'dark');
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Form submission
        thoughtForm.addEventListener('submit', handleAddThought);

        // Search input
        searchInput.addEventListener('input', debounce(handleSearch, 300));

        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);

        // Tab clicks
        tabs.forEach(tab => {
            tab.addEventListener('click', () => handleTabClick(tab));
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(THEME_KEY)) {
                    if (e.matches) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus input with Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                thoughtInput.focus();
            }
        });
    }

    // Handle adding a new thought
    function handleAddThought(e) {
        e.preventDefault();

        const text = thoughtInput.value.trim();
        if (!text) return;

        const thought = {
            id: generateId(),
            text: text,
            tag: tagSelect.value,
            createdAt: new Date().toISOString(),
            done: false,
            archived: false
        };

        thoughts.unshift(thought);
        saveThoughts();

        // Clear input and refocus
        thoughtInput.value = '';
        thoughtInput.focus();

        // Switch to today filter if not already
        if (currentFilter === 'archived') {
            setActiveTab('today');
        }

        renderThoughts();
    }

    // Handle search
    function handleSearch(e) {
        searchQuery = e.target.value.toLowerCase().trim();
        renderThoughts();
    }

    // Handle tab click
    function handleTabClick(tab) {
        const filter = tab.dataset.filter;
        setActiveTab(filter);
    }

    // Set active tab
    function setActiveTab(filter) {
        currentFilter = filter;
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.filter === filter);
        });
        renderThoughts();
    }

    // Toggle thought done status
    function toggleDone(id) {
        const thought = thoughts.find(t => t.id === id);
        if (thought) {
            thought.done = !thought.done;
            saveThoughts();
            renderThoughts();
        }
    }

    // Toggle thought archived status
    function toggleArchived(id) {
        const thought = thoughts.find(t => t.id === id);
        if (thought) {
            thought.archived = !thought.archived;
            saveThoughts();
            renderThoughts();
        }
    }

    // Delete thought
    function deleteThought(id) {
        thoughts = thoughts.filter(t => t.id !== id);
        saveThoughts();
        renderThoughts();
    }

    // Filter thoughts based on current filter and search
    function getFilteredThoughts() {
        let filtered = [...thoughts];

        // Apply search filter first
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.text.toLowerCase().includes(searchQuery) ||
                t.tag.toLowerCase().includes(searchQuery)
            );
        }

        // Apply tab filter
        switch (currentFilter) {
            case 'today':
                filtered = filtered.filter(t => isToday(t.createdAt) && !t.archived);
                break;
            case 'week':
                filtered = filtered.filter(t => isThisWeek(t.createdAt) && !t.archived);
                break;
            case 'all':
                filtered = filtered.filter(t => !t.archived);
                break;
            case 'work':
                filtered = filtered.filter(t => t.tag === 'work' && !t.archived);
                break;
            case 'personal':
                filtered = filtered.filter(t => t.tag === 'personal' && !t.archived);
                break;
            case 'ideas':
                filtered = filtered.filter(t => t.tag === 'ideas' && !t.archived);
                break;
            case 'todo':
                filtered = filtered.filter(t => t.tag === 'todo' && !t.archived);
                break;
            case 'archived':
                filtered = filtered.filter(t => t.archived);
                break;
        }

        return filtered;
    }

    // Render thoughts to DOM
    function renderThoughts() {
        const filtered = getFilteredThoughts();

        // Clear list
        thoughtsList.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.textContent = getEmptyStateMessage();
        } else {
            emptyState.classList.add('hidden');

            // Group by date for weekly view
            if (currentFilter === 'week') {
                renderWeeklyView(filtered);
            } else {
                filtered.forEach(thought => {
                    thoughtsList.appendChild(createThoughtElement(thought));
                });
            }
        }

        // Update count
        const activeCount = thoughts.filter(t => !t.archived).length;
        thoughtCount.textContent = activeCount;
    }

    // Render weekly view with date separators
    function renderWeeklyView(filtered) {
        const grouped = groupByDate(filtered);
        const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

        dates.forEach(date => {
            // Add date separator
            const separator = document.createElement('div');
            separator.className = 'date-separator';
            separator.textContent = formatDateHeader(date);
            thoughtsList.appendChild(separator);

            // Add thoughts for this date
            grouped[date].forEach(thought => {
                thoughtsList.appendChild(createThoughtElement(thought));
            });
        });
    }

    // Group thoughts by date
    function groupByDate(thoughts) {
        return thoughts.reduce((groups, thought) => {
            const date = new Date(thought.createdAt).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(thought);
            return groups;
        }, {});
    }

    // Create thought element
    function createThoughtElement(thought) {
        const li = document.createElement('li');
        li.className = 'thought-item';
        if (thought.done) li.classList.add('done');
        if (thought.archived) li.classList.add('archived');

        const tagLabel = getTagLabel(thought.tag);

        li.innerHTML = `
            <div class="thought-header">
                <span class="thought-tag ${thought.tag}">${tagLabel}</span>
                <span class="thought-time">${formatTime(thought.createdAt)}</span>
            </div>
            <p class="thought-text">${escapeHtml(thought.text)}</p>
            <div class="thought-actions">
                <button class="action-btn done-btn ${thought.done ? 'done-active' : ''}" data-action="done">
                    ${thought.done ? 'Undo' : 'Done'}
                </button>
                <button class="action-btn archive-btn" data-action="archive">
                    ${thought.archived ? 'Unarchive' : 'Archive'}
                </button>
                <button class="action-btn delete-btn" data-action="delete">Delete</button>
            </div>
        `;

        // Add event listeners to action buttons
        const doneBtn = li.querySelector('[data-action="done"]');
        const archiveBtn = li.querySelector('[data-action="archive"]');
        const deleteBtn = li.querySelector('[data-action="delete"]');

        doneBtn.addEventListener('click', () => toggleDone(thought.id));
        archiveBtn.addEventListener('click', () => toggleArchived(thought.id));
        deleteBtn.addEventListener('click', () => {
            if (confirm('Delete this thought?')) {
                deleteThought(thought.id);
            }
        });

        return li;
    }

    // Helper functions
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function isToday(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    function isThisWeek(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return date >= weekStart;
    }

    function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (isToday(dateString)) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' }) + ' ' +
                   date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    function formatDateHeader(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        }
    }

    function getTagLabel(tag) {
        const labels = {
            work: 'Work',
            personal: 'Personal',
            ideas: 'Ideas',
            todo: 'To-Do'
        };
        return labels[tag] || tag;
    }

    function getEmptyStateMessage() {
        const messages = {
            today: 'No thoughts today. What\'s on your mind?',
            week: 'No thoughts this week yet.',
            all: 'No thoughts yet. Add one above!',
            work: 'No work thoughts. Add one!',
            personal: 'No personal thoughts yet.',
            ideas: 'No ideas captured yet. Got any?',
            todo: 'No to-dos. Nice work!',
            archived: 'No archived thoughts.'
        };

        if (searchQuery) {
            return `No thoughts matching "${searchQuery}"`;
        }

        return messages[currentFilter] || 'No thoughts found.';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
