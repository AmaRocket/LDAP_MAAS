pipeline {
    agent any

    environment {
        DOCKER_IMAGE = credentials('ldap_docker-hub-image')
        DOCKER_PASS = credentials('docker-hub-password')
        DOCKER_USER = 'amarocket'
    }

    stages {
        stage('Echo Environment Variables') {
            steps {
                echo "DOCKER_IMAGE: ${DOCKER_IMAGE}"
                echo "DOCKER_PASS: ${DOCKER_PASS}"
            }
        }

        stage('Check Docker Version') {
            steps {
                sh 'docker --version'
            }
        }

        stage('Login to Docker Hub') {
            steps {
                script {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                }
            }
        }

        stage('Pull Docker Image') {
            steps {
                sh "docker pull ${DOCKER_IMAGE}"
            }
        }

        stage('List Docker Images') {
            steps {
                sh 'docker images'
            }
        }

        stage('Check Docker Info') {
            steps {
                sh 'docker info'
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