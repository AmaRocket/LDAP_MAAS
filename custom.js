///var/www/html/custom-ui.js

(function() {
    document.addEventListener("DOMContentLoaded", function() {
        console.log("Script loaded, checking path...");
        
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

        // Check if we are on the 'Add User' page
        if (!window.location.pathname.includes('/MAAS/r/settings/users/add')) {
            updateStatus("Not on Add User page");
            return;
        }
        updateStatus("On Add User page");

        function initializeLDAPSearch() {
            updateStatus("Checking for form fields...");
            
            // Find all relevant form fields using the correct selectors
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

            // Create search input
            let searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Start typing username to search LDAP...';
            searchInput.className = 'p-form-validation__input'; // Using MAAS styling
            searchInput.style.marginBottom = '10px';
            searchInput.style.width = '100%';

            // Create dropdown
            let dropdown = document.createElement('select');
            dropdown.innerHTML = '<option value="">Type to search users...</option>';
            dropdown.className = 'p-form-validation__input'; // Using MAAS styling
            dropdown.style.marginBottom = '10px';
            dropdown.style.width = '100%';

            // Create a container that matches MAAS styling
            const searchContainer = document.createElement('div');
            searchContainer.className = 'p-form__group p-form-validation';
            const searchLabel = document.createElement('label');
            searchLabel.className = 'p-form__label';
            searchLabel.textContent = 'LDAP Search';
            const controlDiv = document.createElement('div');
            controlDiv.className = 'p-form__control u-clearfix';
            
            // Assemble the container
            controlDiv.appendChild(searchInput);
            controlDiv.appendChild(dropdown);
            searchContainer.appendChild(searchLabel);
            searchContainer.appendChild(controlDiv);

            // Insert at the top of the form
            const form = fields.username.closest('form');
            form.insertBefore(searchContainer, form.firstChild);
            
            updateStatus("UI elements created");

            // Handle search
            let timeout = null;
            searchInput.addEventListener('input', function() {
                updateStatus("Search input changed");
                clearTimeout(timeout);
                const query = this.value.trim();
                
                dropdown.innerHTML = '<option value="">Loading...</option>';

                timeout = setTimeout(() => {
                    if (query.length < 2) {
                        dropdown.innerHTML = '<option value="">Type at least 2 characters...</option>';
                        return;
                    }

                    updateStatus(`Making API call for: ${query}`);
                    fetch(`/ldap-search/?query=${encodeURIComponent(query)}`)
                        .then(response => {
                            updateStatus(`API response status: ${response.status}`);
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(users => {
                            updateStatus(`Received ${users.length} users`);
                            if (!Array.isArray(users) || users.length === 0) {
                                dropdown.innerHTML = '<option value="">No users found</option>';
                                return;
                            }

                            dropdown.innerHTML = '<option value="">Select User</option>';
                            users.forEach(user => {
                                let option = document.createElement('option');
                                option.value = user.username || '';
                                option.textContent = `${user.username} (${user.uid_number || 'No UID'})`;
                                dropdown.appendChild(option);
                            });
                        })
                        .catch(err => {
                            updateStatus(`ERROR: ${err.message}`);
                            dropdown.innerHTML = '<option value="">Error fetching users</option>';
                        });
                }, 300);
            });

            // Update all fields when selection changes
            dropdown.addEventListener('change', function() {
                const selectedValue = this.value;
                updateStatus(`Selected: ${selectedValue}`);
                
                // Auto-fill all fields
                fields.username.value = selectedValue;
                fields.email.value = `${selectedValue}@unibas.ch`; // Add domain
                // We could get full name from LDAP if available
            });

            updateStatus("Setup complete");
            return true;
        }

        // Try to initialize every 500ms until successful
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds maximum
        const checkInterval = setInterval(() => {
            attempts++;
            updateStatus(`Attempt ${attempts} to find form fields...`);
            
            if (initializeLDAPSearch() || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                if (attempts >= maxAttempts) {
                    updateStatus("Gave up waiting for form fields after 10 seconds");
                }
            }
        }, 500);
    });
})();