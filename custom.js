///var/www/html/custom-ui.js

(function() {
    // Wait for page to be fully loaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initScript);
    } else {
        initScript();
    }

    function initScript() {
        // Debug div to show status
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

        // Cross-browser path check
        const currentPath = window.location.pathname || '';
        if (!currentPath.includes('/MAAS/r/settings/users/add')) {
            updateStatus("Not on Add User page");
            return;
        }
        updateStatus("On Add User page");

        function initializeLDAPSearch() {
            updateStatus("Checking for form fields...");
            
            // More robust field finding
            const fields = {
                username: document.querySelector('input[name="username"]'),
                fullName: document.querySelector('input[name="fullName"]'),
                email: document.querySelector('input[name="email"]')
            };

            // Verify all fields exist
            if (!fields.username || !fields.email || !fields.fullName) {
                updateStatus("Not all fields found yet, will retry...");
                return false;
            }

            updateStatus("All form fields found!");

            try {
                // Create search container with MAAS styling
                const searchContainer = document.createElement('div');
                searchContainer.className = 'p-form__group p-form-validation';
                searchContainer.innerHTML = `
                    <label class="p-form__label">LDAP Search</label>
                    <div class="p-form__control u-clearfix">
                        <input type="text" 
                               class="p-form-validation__input" 
                               placeholder="Start typing username to search LDAP..."
                               style="margin-bottom: 10px; width: 100%;">
                        <select class="p-form-validation__input" 
                                style="margin-bottom: 10px; width: 100%;">
                            <option value="">Type to search users...</option>
                        </select>
                    </div>
                `;

                // Get references to the new elements
                const searchInput = searchContainer.querySelector('input');
                const dropdown = searchContainer.querySelector('select');

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
                    dropdown.innerHTML = '<option value="">Loading...</option>';

                    searchTimeout = setTimeout(function() {
                        if (query.length < 2) {
                            dropdown.innerHTML = '<option value="">Type at least 2 characters...</option>';
                            return;
                        }

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
                                        dropdown.innerHTML = '<option value="">No users found</option>';
                                        return;
                                    }

                                    dropdown.innerHTML = '<option value="">Select User</option>';
                                    users.forEach(function(user) {
                                        const option = document.createElement('option');
                                        option.value = user.username || '';
                                        option.textContent = `${user.username} (${user.uid_number || 'No UID'})`;
                                        dropdown.appendChild(option);
                                    });
                                } catch (err) {
                                    updateStatus(`Error parsing response: ${err.message}`);
                                    dropdown.innerHTML = '<option value="">Error processing results</option>';
                                }
                            } else {
                                updateStatus(`Error: ${xhr.status}`);
                                dropdown.innerHTML = '<option value="">Error fetching users</option>';
                            }
                        };

                        xhr.onerror = function() {
                            updateStatus("Network error occurred");
                            dropdown.innerHTML = '<option value="">Network error</option>';
                        };

                        xhr.send();
                    }, 300);
                });

                // Update fields when selection changes
                dropdown.addEventListener('change', function(e) {
                    const selectedValue = e.target.value;
                    updateStatus(`Selected: ${selectedValue}`);
                    
                    if (selectedValue) {
                        fields.username.value = selectedValue;
                        fields.email.value = `${selectedValue}@unibas.ch`;
                    }
                });

                updateStatus("Setup complete");
                return true;

            } catch (err) {
                updateStatus(`Error during setup: ${err.message}`);
                return false;
            }
        }

        // Retry logic
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

