pipeline {
    agent any

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/AmaRocket/LDAP_MAAS.git',
                    credentialsId: '527a7dbf-22e1-4eed-963a-ddb1dcaf8526'
            }
        }

        stage('Pull Latest Changes') {
            steps {
                script {
                    sh 'git pull origin main'
                }
            }
        }

        stage('List Environment Variables') {
            steps {
                script {
                    sh 'printenv'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline ran successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}