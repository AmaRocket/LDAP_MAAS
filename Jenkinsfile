pipeline {
    agent any

    environment {
        DOCKER_PASS = credentials('docker-hub-password')
        DOCKER_IMAGE = credentials('ldap_docker-hub-image')
        DOCKER_SERVICE = "ldap_maas_service"
        DOCKER_USER = credentials('docker-hub-username')
        LOG_FILE = "/var/log/docker_auto_update.log"

        LDAP_BIND_PASSWORD = credentials('ldap_bind_password')
        BASE_DN = credentials('base_dn')
        LDAP_BIND_DN = credentials('ldap_bind_dn')
        LDAP_SERVER = credentials('ldap_server')

        REGION_CONTROLLER_IP = credentials('region-controller-ip')
        RACK_CONTROLLER_IP = credentials('rack-controller-ip')
        MAAS_USER = credentials('maas_user')
    }

    stages {
        stage('Clone Repository') {
            steps {
                dir('/var/lib/jenkins/workspace/LDAP_MAAS/') {
                    script {
                        if (fileExists('.git')) {
                            sh 'git stash || true'
                            sh 'git pull origin main'
                        } else {
                            git branch: 'main', url: 'https://github.com/AmaRocket/LDAP_MAAS.git'
                        }
                    }
                }
            }
        }

        stage('Install Dependencies and Run Tests') {
            steps {
                dir('/var/lib/jenkins/workspace/LDAP_MAAS/') {
                    sh '''
                    sudo apt update
                    sudo apt install -y python3-pip python3-venv
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                    cd tests/
                    sudo chmod +x tests.py
                    python3 tests.py
                    '''
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                dir('/var/lib/jenkins/workspace/LDAP_MAAS/') {
                    script {
                        sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker build --no-cache -t $DOCKER_IMAGE:latest .
                        docker push $DOCKER_IMAGE:latest
                        echo $DOCKER_IMAGE was deployed.
                        '''
                    }
                }
            }
        }

        stage('Copy custom-ui.js') {
            steps {
                dir('/var/lib/jenkins/workspace/LDAP_MAAS/') {
                    script {
                        sh '''
                        scp custom-ui.js $MAAS_USER@$REGION_CONTROLLER_IP:/home/$MAAS_USER
                        echo JS file was copied.
                        '''
                    }
                }
            }
        }

        stage('Verify Docker Swarm Status') {
            steps {
                script {
                    sh 'docker info | grep Swarm'
                }
            }
        }

        stage('Remove Docker Swarm Service') {
            steps {
                script {
                    sh '''
                        echo "Updating Docker Swarm service..." | tee -a $LOG_FILE
                        docker service rm $DOCKER_SERVICE || true
                        sleep 5
                        echo "Waiting for the port to be free..."
                        while netstat -tuln | grep -q ":5000 "; do
                            echo "Port 5000 still in use, waiting..."
                            sleep 2
                        done
                        echo "Port 5000 is now free, continuing..." | tee -a $LOG_FILE
                        '''
                }
            }
        }

       stage('Clean RACK_CONTROLLER images and containers via SSH') {
           steps {
               script {
                   sshagent(['rack_server_ssh_credentials']) {
                       sh """
                       ssh -o StrictHostKeyChecking=no \$MAAS_USER@\${RACK_CONTROLLER_IP} '
                           set -e # Stop if anything goes wrong
                           echo Connection Successful!
                           docker container prune -f
                           docker image prune -af
                           echo Images and containers were cleaned!
                           '
                       """
                   }
               }
           }
       }

        stage('Clean REGION_CONTROLLER via SSH') {
            steps {
                script {
                    sshagent(['region_server_ssh_credentials']) {
                        sh '''
                        ssh -o StrictHostKeyChecking=no $MAAS_USER@$REGION_CONTROLLER_IP '
                            docker container prune -f
                            docker image prune -af
                            echo "REGION_CONTROLLER cleaned!"

                            sudo mv /home/localadmin/custom-ui.js /var/www/html/
                            sudo chown www-data:www-data /var/www/html/custom-ui.js
                            sudo chmod 755 /var/www/html/custom-ui.js

                        '
                        '''
                    }
                }
            }
        }

        stage('Start Docker Swarm Service') {
            steps {
                script {
                    sh '''
                        docker service create \
                            --name $DOCKER_SERVICE \
                            --constraint 'node.labels.role == worker' \
                            --network host \
                            --mount type=bind,source=/var/www/html/custom-ui.js,target=/var/www/html/custom-ui.js \
                            -e LDAP_BIND_PASSWORD=$LDAP_BIND_PASSWORD \
                            -e BASE_DN=$BASE_DN \
                            -e LDAP_BIND_DN=$LDAP_BIND_DN \
                            -e LDAP_SERVER=$LDAP_SERVER \
                            --restart-condition on-failure \
                            --replicas 2 \
                            $DOCKER_IMAGE:latest
                        echo "Docker Swarm service recreated successfully." | tee -a $LOG_FILE
                        '''
                }
            }
        }

        stage('Clean Docker Images') {
            steps {
                script {
                    sh 'docker image prune -af'
                    echo "All unused Docker images were deleted."
                }
            }
        }

        stage('Restart NGINX on REGION_CONTROLLER via SSH') {
            steps {
                script {
                    sshagent(['region_server_ssh_credentials']) {
                        sh '''
                        ssh -o StrictHostKeyChecking=no $MAAS_USER@$REGION_CONTROLLER_IP '
                            sudo systemctl reload nginx.service
                            echo "Nginx reloaded on REGION_CONTROLLER!"
                        '
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment and Swarm update completed successfully!'
        }
        failure {
            echo 'Deployment failed. Check logs for details.'
        }
    }
}