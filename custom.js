///var/www/html/custom-ui.js

(function() {
    // Initial setup
    initOnLoad();

    // Watch for URL changes (SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            updateStatus("URL changed, reinitializing...");
            initOnLoad();
        }
    }).observe(document, { subtree: true, childList: true });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        updateStatus("Navigation detected, reinitializing...");
        initOnLoad();
    });

    function initOnLoad() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initScript);
        } else {
            initScript();
        }
    }

    // Create persistent debug div
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

    function initScript() {
        // Clear any existing LDAP search elements
        const existingSearch = document.querySelector('.ldap-search-container');
        if (existingSearch) {
            existingSearch.remove();
        }

        if (!window.location.pathname.includes('/MAAS/r/settings/users/add')) {
            updateStatus("Not on Add User page");
            return;
        }
        updateStatus("On Add User page");

        function initializeLDAPSearch() {
            updateStatus("Checking for form fields...");
            
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
                // Create search container with MAAS styling
                const searchContainer = document.createElement('div');
                searchContainer.className = 'p-form__group p-form-validation ldap-search-container';
                searchContainer.innerHTML = `
                    <label class="p-form__label">LDAP Search</label>
                    <div class="p-form__control u-clearfix" style="position: relative;">
                        <input type="text" 
                               class="p-form-validation__input" 
                               placeholder="Start typing username to search LDAP..."
                               style="margin-bottom: 10px; width: 100%;">
                        <div class="ldap-suggestions" style="
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
                        "></div>
                    </div>
                `;

                // Get references to the new elements
                const searchInput = searchContainer.querySelector('input');
                const suggestionsDiv = searchContainer.querySelector('.ldap-suggestions');

                // Insert at the top of the form
                const form = fields.username.closest('form');
                if (form) {
                    form.insertBefore(searchContainer, form.firstChild);
                } else {
                    throw new Error("Form not found");
                }

                updateStatus("UI elements created");

                // Cross-browser compatible event handling
                let searchTimeout = null;
                searchInput.addEventListener('input', function(e) {
                    updateStatus("Search input changed");
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
                        
                        // Cross-browser compatible fetch
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
                                            
                                            // Fill in all fields with LDAP data
                                            fields.username.value = username;
                                            fields.fullName.value = displayName;
                                            fields.email.value = email || `${username}@unibas.ch`; // Fallback to constructed email if not provided
                                            
                                            searchInput.value = username;
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
                    if (!searchContainer.contains(e.target)) {
                        suggestionsDiv.style.display = 'none';
                    }
                });

                updateStatus("Setup complete");
                return true;

            } catch (err) {
                updateStatus(`Error during setup: ${err.message}`);
                return false;
            }
        }

        // Modified retry logic with cleanup
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(function() {
            attempts++;
            updateStatus(`Attempt ${attempts} to find form fields...`);
            
            if (initializeLDAPSearch() || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (attempts >= maxAttempts) {
                    updateStatus("Gave up waiting for form fields after 10 seconds");
                }
            }
        }, 500);
    }
})();

