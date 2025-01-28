///var/www/html/custom-ui.js

document.addEventListener("DOMContentLoaded", function() {
    // Check if we are on the 'Add User' page
    if (window.location.pathname.includes('/MAAS/r/settings/users/add')) {
        let emailField = document.querySelector('input[name="email"]');

        if (emailField) {
            // Add a dropdown for LDAP user selection
            let dropdown = document.createElement('select');
            dropdown.innerHTML = '<option value="">Loading users...</option>';
            dropdown.className = 'ldap-user-dropdown';  // Add class for styling
            dropdown.style.marginBottom = '10px';
            dropdown.style.width = '100%';  // Match width with email field
            emailField.parentElement.insertBefore(dropdown, emailField);

            // Show loading state and handle errors better
            const API_URL = 'http://localhost:5000';
            
            fetch(`${API_URL}/?query=`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(users => {
                    if (!Array.isArray(users) || users.length === 0) {
                        dropdown.innerHTML = '<option value="">No users found</option>';
                        return;
                    }

                    dropdown.innerHTML = '<option value="">Select User</option>';
                    users.forEach(user => {
                        let option = document.createElement('option');
                        option.value = user.email || '';
                        option.textContent = user.full_name && user.username ? 
                            `${user.full_name} (${user.username})` : 
                            user.username || 'Unknown User';
                        dropdown.appendChild(option);
                    });

                    dropdown.addEventListener('change', function() {
                        emailField.value = dropdown.value;
                    });
                })
                .catch(err => {
                    console.error('LDAP Error:', err);
                    dropdown.innerHTML = '<option value="">Error fetching users. Please try again.</option>';
                    // Optionally add a retry button or mechanism
                });
        }
    }
});