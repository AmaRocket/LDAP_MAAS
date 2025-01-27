import ldap3
import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv('.getenv')

app = Flask(__name__)

# LDAP Server Configuration
LDAP_SERVER = os.getenv('LDAP_SERVER')
BASE_DN = os.getenv('BASE_DN')
BIND_DN = os.getenv('LDAP_BIND_DN')
BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD')

if not all([LDAP_SERVER, BASE_DN, BIND_DN, BIND_PASSWORD]):
    raise ValueError("One or more required LDAP environment variables are missing.")


@app.route('/', methods=['GET'])
def search_user():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    # Connect to LDAP server
    try:
        server = ldap3.Server(LDAP_SERVER, get_info=ldap3.ALL)
        conn = ldap3.Connection(server, BIND_DN, BIND_PASSWORD, auto_bind=ldap3.AUTO_BIND_TLS_BEFORE_BIND)

        search_filter = f'(|(uid={query}*)(mail={query}*))'
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
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
