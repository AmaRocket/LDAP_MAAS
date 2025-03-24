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
    return re.sub(r'[()\\/*&|<>~=]', '', query)[:100]

@app.route('/ldap-search', methods=['GET'])
@limiter.limit("10 per minute")
def search_user():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    # Sanitize input
    safe_query = sanitize_ldap_input(query)

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
            auto_bind=True  # Simplified from AUTO_BIND_TLS_BEFORE_BIND
        )


        search_filter = f'(unibasChAuthNList={safe_query}*)'
        conn.search(
            BASE_DN, 
            search_filter, 
            attributes=['uid', 'uidNumber', 'displayName', 'cn', 'mail']
        )

        users = []
        for entry in conn.entries:
            # fields 
            user_data = {
                'username': entry.uid.value if hasattr(entry, 'uid') else None,
                'uid_number': entry.uidNumber.value if hasattr(entry, 'uidNumber') else None,
                'display_name': entry.displayName.value if hasattr(entry, 'displayName') else None,
                'cn': entry.cn.value if hasattr(entry, 'cn') else None,
                'email': entry.mail.value if hasattr(entry, 'mail') else None
            }
            users.append({k: v for k, v in user_data.items() if v is not None})

        return jsonify(users)

    except Exception as e:
        app.logger.error(f"LDAP search error: {str(e)}")
        return jsonify({'error': 'An internal error occurred'}), 500

    finally:
        if 'conn' in locals() and conn.bound:
            conn.unbind()

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode)
