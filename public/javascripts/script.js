// TaskBuddy - Modern Task Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeAnimations();
    initializeFormValidation();
    initializeInteractiveFeatures();
    initializeNotifications();
});

// Animation System
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.card-hover, .animate-slide-up').forEach(el => {
        observer.observe(el);
    });

    // Smooth hover effects for buttons
    document.querySelectorAll('button, .btn-hover').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Form Validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    showFieldError(field, 'This field is required');
                } else {
                    clearFieldError(field);
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showNotification('Please fill in all required fields', 'error');
            }
        });
        
        // Real-time validation
        form.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            
            field.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }
    
    clearFieldError(field);
    return true;
}

function showFieldError(field, message) {
    field.classList.add('error', 'border-red-500');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-red-500 text-sm mt-1';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.classList.remove('error', 'border-red-500');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Interactive Features
function initializeInteractiveFeatures() {
    // Task card interactions
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on action buttons
            if (e.target.closest('a, button')) {
                return;
            }
            
            // Add click effect
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
    
    // Search functionality (if search input exists)
    const searchInput = document.querySelector('#search-tasks');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const taskCards = document.querySelectorAll('.task-card');
            
            taskCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                if (title.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + N to focus on new task form
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            const titleInput = document.querySelector('input[name="title"]');
            if (titleInput) {
                titleInput.focus();
            }
        }
        
        // Escape to go back
        if (e.key === 'Escape') {
            const backButton = document.querySelector('a[href="/"]');
            if (backButton) {
                backButton.click();
            }
        }
    });
}

// Notification System
function initializeNotifications() {
    // Create notification container
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(notificationContainer);
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification p-4 rounded-lg shadow-lg transform translate-x-full transition-all duration-300 max-w-sm`;
    
    // Set notification styles based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-yellow-500 text-white';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Utility Functions
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

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Loading States
function showLoading(element) {
    element.disabled = true;
    element.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
}

function hideLoading(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
}

// Confirmation Dialogs
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Local Storage for user preferences
const TaskBuddyStorage = {
    set: function(key, value) {
        try {
            localStorage.setItem(`taskbuddy_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    },
    
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`taskbuddy_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Could not read from localStorage:', e);
            return defaultValue;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(`taskbuddy_${key}`);
        } catch (e) {
            console.warn('Could not remove from localStorage:', e);
        }
    }
};

// Export for global use
window.TaskBuddy = {
    showNotification,
    confirmAction,
    storage: TaskBuddyStorage,
    formatDate
};

