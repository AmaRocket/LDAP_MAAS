# MAAS LDAP Integration

This integration adds LDAP user search functionality to the MAAS (Metal as a Service) user creation form. It allows administrators to quickly find and add users from LDAP directory.

## Features

- Real-time LDAP user search as you type in the username field
- Auto-completion of user details from LDAP:
  - Username
  - Full Name (from displayName or cn)
  - Email address
- Rate-limited API to prevent LDAP server overload
- Cross-browser support (Chrome, Firefox, Safari)

## Components

### 1. Frontend (`custom-ui.js`)
- Adds autocomplete functionality to the username field
- Shows suggestions as you type
- Auto-fills user details from LDAP data
- Handles SPA (Single Page Application) navigation

### 2. Backend (`main.py`)
- Flask application serving LDAP search API
- Secure LDAP connection handling
- Rate limiting to protect LDAP server
- Error handling and logging

## Installation

1. Deploy Flask Backend:

## Install required Python packages

```bash
pip install flask flask-limiter ldap3
```

## Set environment variables
```bash
export LDAP_SERVER="ldaps://ldap.server.url"
export BIND_DN="cn=cn,ou=internal,dc=dc,dc=ch"
export BIND_PASSWORD="your_password"
export BASE_DN="ou=authen,dc=unibas,dc=ch"
```

##**Start Flask application**

```bash
python main.py
```

2. Configure Nginx:

```bash
    server {
        # existing conf...

        # Inject custom JS into the MAAS page dynamically
            sub_filter '</head>' '<script src="https://maas.url/static/custom-ui.js"></script></head>';
            sub_filter_once off;
        }

        location /static/custom-ui.js {
            alias /var/www/html/custom-ui.js;
            add_header Content-Type application/javascript;
            expires -1;
            add_header Cache-Control 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
        }
        location /ldap-search/ {
            proxy_pass http://localhost:5000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 180s;
            proxy_read_timeout 180s;
            proxy_send_timeout 180s;
            proxy_buffering off;
        }
    ...
```

3. Deploy Frontend:

## **Copy custom-ui.js to nginx directory**

```bash
sudo cp custom-ui.js /var/www/html/
sudo chown www-data:www-data /var/www/html/custom-ui.js
sudo chmod 644 /var/www/html/custom-ui.js
```

5.Restart Nginx:

```bash
sudo systemctl restart nginx
``` 

## License

MIT License

Copyright (c) 2025 University of Basel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
