///var/www/html/custom-ui.js

(function() {
    // Track initialization state
    let isInitialized = false;

    // Initialize debug div once
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.top = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.background = '#f0f0f0';
    debugDiv.style.padding = '10px';
    debugDiv.style.border = '1px solid #ccc';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.fontSize = '12px';
    document.body.appendChild(debugDiv);

    function updateStatus(message) {
        console.log(message);
        debugDiv.innerHTML += `<div>${new Date().toISOString().split('T')[1]} - ${message}</div>`;
    }

    // Function to check if we're on the right page
    function isAddUserPage() {
        return window.location.pathname.includes('/MAAS/r/settings/users/add');
    }

    // Watch for DOM changes that might indicate page navigation
    const observer = new MutationObserver((mutations) => {
        if (!isInitialized && isAddUserPage()) {
            updateStatus("DOM changed, checking if we need to initialize...");
            initScript();
        }
    });

    // Start observing with appropriate options
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Watch for URL changes
    let lastUrl = location.href;
    setInterval(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            updateStatus("URL changed, reinitializing...");
            isInitialized = false;
            initScript();
        }
    }, 100);

    function initScript() {
        if (!isAddUserPage()) {
            updateStatus("Not on Add User page");
            return;
        }

        if (isInitialized) {
            updateStatus("Already initialized");
            return;
        }

        updateStatus("On Add User page, starting initialization");

        function initializeLDAPSearch() {
            updateStatus("Checking for form fields...");
            
            // Remove any existing suggestions
            const existingSuggestions = document.querySelector('.ldap-suggestions');
            if (existingSuggestions) {
                existingSuggestions.remove();
            }

            const fields = {
                username: document.querySelector('input[name="username"]'),
                fullName: document.querySelector('input[name="fullName"]'),
                email: document.querySelector('input[name="email"]')
            };

            if (!fields.username || !fields.email || !fields.fullName) {
                updateStatus("Not all fields found yet, will retry...");
                return false;
            }

            updateStatus("All form fields found!");

            try {
                // Create suggestions div
                const suggestionsDiv = document.createElement('div');
                suggestionsDiv.className = 'ldap-suggestions';
                suggestionsDiv.style.cssText = `
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ccc;
                    border-top: none;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                `;

                // Add suggestions div after username field
                const usernameContainer = fields.username.closest('.p-form__control');
                usernameContainer.style.position = 'relative';
                usernameContainer.appendChild(suggestionsDiv);

                let searchTimeout = null;
                fields.username.addEventListener('input', function(e) {
                    updateStatus("Username input changed");
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
                    }

                    const query = (e.target.value || '').trim();
                    
                    if (query.length < 2) {
                        suggestionsDiv.style.display = 'none';
                        return;
                    }

                    searchTimeout = setTimeout(function() {
                        updateStatus(`Making API call for: ${query}`);
                        
                        const xhr = new XMLHttpRequest();
                        xhr.open('GET', `/ldap-search/?query=${encodeURIComponent(query)}`, true);
                        xhr.setRequestHeader('Accept', 'application/json');
                        
                        xhr.onload = function() {
                            updateStatus(`API response status: ${xhr.status}`);
                            if (xhr.status === 200) {
                                try {
                                    const users = JSON.parse(xhr.responseText);
                                    updateStatus(`Received ${users.length} users`);
                                    
                                    if (!Array.isArray(users) || users.length === 0) {
                                        suggestionsDiv.innerHTML = '<div class="suggestion-item" style="padding: 8px 12px;">No users found</div>';
                                        suggestionsDiv.style.display = 'block';
                                        return;
                                    }

                                    suggestionsDiv.innerHTML = users.map(user => `
                                        <div class="suggestion-item" 
                                             data-username="${user.username || ''}"
                                             data-display-name="${user.display_name || user.cn || ''}"
                                             data-email="${user.email || ''}"
                                             style="
                                                padding: 8px 12px;
                                                cursor: pointer;
                                                border-bottom: 1px solid #eee;
                                             ">
                                            ${user.username} - ${user.display_name || user.cn || 'No Name'} (${user.email || 'No Email'})
                                        </div>
                                    `).join('');
                                    
                                    suggestionsDiv.style.display = 'block';

                                    // Add hover effect to suggestions
                                    const items = suggestionsDiv.getElementsByClassName('suggestion-item');
                                    Array.from(items).forEach(item => {
                                        item.addEventListener('mouseover', function() {
                                            this.style.backgroundColor = '#f0f0f0';
                                        });
                                        item.addEventListener('mouseout', function() {
                                            this.style.backgroundColor = '';
                                        });
                                        item.addEventListener('click', function() {
                                            const username = this.dataset.username;
                                            const displayName = this.dataset.displayName;
                                            const email = this.dataset.email;
                                            
                                            updateStatus(`Selected: ${username}`);
                                            fields.username.value = username;
                                            fields.fullName.value = displayName;
                                            fields.email.value = email || `${username}@unibas.ch`;
                                            
                                            suggestionsDiv.style.display = 'none';
                                        });
                                    });

                                } catch (err) {
                                    updateStatus(`Error parsing response: ${err.message}`);
                                    suggestionsDiv.innerHTML = '<div class="suggestion-item" style="padding: 8px 12px;">Error processing results</div>';
                                    suggestionsDiv.style.display = 'block';
                                }
                            } else {
                                updateStatus(`Error: ${xhr.status}`);
                                suggestionsDiv.innerHTML = '<div class="suggestion-item" style="padding: 8px 12px;">Error fetching users</div>';
                                suggestionsDiv.style.display = 'block';
                            }
                        };

                        xhr.onerror = function() {
                            updateStatus("Network error occurred");
                            suggestionsDiv.innerHTML = '<div class="suggestion-item" style="padding: 8px 12px;">Network error</div>';
                            suggestionsDiv.style.display = 'block';
                        };

                        xhr.send();
                    }, 300);
                });

                // Close suggestions when clicking outside
                document.addEventListener('click', function(e) {
                    if (!fields.username.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                        suggestionsDiv.style.display = 'none';
                    }
                });

                // Mark as initialized when successful
                isInitialized = true;
                updateStatus("Setup complete");
                return true;

            } catch (err) {
                updateStatus(`Error during setup: ${err.message}`);
                isInitialized = false;
                return false;
            }
        }

        // Modified retry logic
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(function() {
            attempts++;
            updateStatus(`Attempt ${attempts} to find form fields...`);
            
            if (initializeLDAPSearch() || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (attempts >= maxAttempts) {
                    updateStatus("Gave up waiting for form fields after 10 seconds");
                    isInitialized = false;
                }
            }
        }, 500);
    }

    // Initial call
    initScript();
})();

