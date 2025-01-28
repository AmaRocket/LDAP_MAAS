import ldap3
import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import re
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import ssl

load_dotenv('.getenv')

app = Flask(__name__)

# Add rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per day", "10 per minute"]
)

# LDAP Server Configuration
LDAP_SERVER = os.getenv('LDAP_SERVER')
BASE_DN = os.getenv('BASE_DN')
BIND_DN = os.getenv('LDAP_BIND_DN')
BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD')

if not all([LDAP_SERVER, BASE_DN, BIND_DN, BIND_PASSWORD]):
    raise ValueError("One or more required LDAP environment variables are missing.")

def sanitize_ldap_input(query):
    """Sanitize input to prevent LDAP injection"""
    # Remove special characters and limit length
    return re.sub(r'[()\\/*&|<>~=]', '', query)[:100]

@app.route('/', methods=['GET'])
@limiter.limit("10 per minute")  # Rate limiting per endpoint
def search_user():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    # Sanitize input
    safe_query = sanitize_ldap_input(query)

    # Connect to LDAP server
    try:
        tls = ldap3.Tls(validate=ssl.CERT_REQUIRED)
        server = ldap3.Server(
            LDAP_SERVER,
            use_ssl=True,
            tls=tls,
            get_info=ldap3.ALL
        )
        conn = ldap3.Connection(
            server,
            BIND_DN,
            BIND_PASSWORD,
            auto_bind=ldap3.AUTO_BIND_TLS_BEFORE_BIND
        )

        search_filter = f'(|(uid={safe_query}*)(mail={safe_query}*))'
        conn.search(BASE_DN, search_filter, attributes=['uid', 'cn', 'mail'])

        users = []
        for entry in conn.entries:
            users.append({
                'username': entry.uid.value,
                'full_name': entry.cn.value,
                'email': entry.mail.value
            })

        return jsonify(users)

    except Exception as e:
        # Log the actual error for debugging but don't send it to the client
        app.logger.error(f"LDAP search error: {str(e)}")
        return jsonify({'error': 'An internal error occurred'}), 500

    finally:
        if 'conn' in locals() and conn.bound:
            conn.unbind()

if __name__ == '__main__':
    # Only enable debug mode in development
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode)
