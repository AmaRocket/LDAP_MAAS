pipeline {
    agent any

    stages {
        stage('List Environment Variables') {
            steps {
                script {
                    sh 'printenv'
                }
            }
        }
    }
}