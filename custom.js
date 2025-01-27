///var/www/html/custom-ui.js

document.addEventListener("DOMContentLoaded", function() {
    // Check if we are on the 'Add User' page
    if (window.location.pathname.includes('/MAAS/r/settings/users/add')) {
        let emailField = document.querySelector('input[name="email"]');

        if (emailField) {
            // Add a dropdown for LDAP user selection
            let dropdown = document.createElement('select');
            dropdown.innerHTML = '<option>Loading users...</option>';
            dropdown.style.marginBottom = '10px';
            emailField.parentElement.insertBefore(dropdown, emailField);

            // Fetch LDAP users from the Flask API
            fetch('http://localhost:5000/?query=')
                .then(response => response.json())
                .then(users => {
                    dropdown.innerHTML = '<option>Select User</option>';
                    users.forEach(user => {
                        let option = document.createElement('option');
                        option.value = user.email;
                        option.textContent = `${user.full_name} (${user.username})`;
                        dropdown.appendChild(option);
                    });

                    dropdown.addEventListener('change', function() {
                        emailField.value = dropdown.value;
                    });
                })
                .catch(err => {
                    dropdown.innerHTML = '<option>Error fetching users</option>';
                    console.error('LDAP Error:', err);
                });
        }
    }
});