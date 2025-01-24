from flask import Flask, request, jsonify
import ldap3

app = Flask(__name__)

# LDAP Server Configuration
LDAP_SERVER = 'ldap://unibasel.ads.unibas.ch'
BASE_DN = 'DC=unibasel,DC=ads,DC=unibas,DC=ch'
BIND_DN = 'd-dmi-admgmt@unibasel.ads.unibas.ch'
BIND_PASSWORD = 'Dq8a2se4768e'


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
        # search_filter = f'(&(uid={query}*)(!(uid=*adm))(!(uid=*sa))(!(uid=*test)))'  # Exclude adm, sa, test accounts
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
