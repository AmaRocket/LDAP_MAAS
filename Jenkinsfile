pipeline {
    agent any

    stages {
        stage('Echo Environment Variables') {
            steps {
                echo "Hello world!"
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