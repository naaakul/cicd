pipeline {
    agent none

    parameters {
        booleanParam(name: 'BUILD_BACKEND', defaultValue: true, description: 'Build, scan, push & deploy the backend image')
        booleanParam(name: 'BUILD_FRONTEND', defaultValue: true, description: 'Build, scan, push & deploy the frontend image')
    }

    environment {
        DOCKERHUB_USER = "naaakul"
        BACKEND_IMAGE = "${DOCKERHUB_USER}/node-api"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/react-ui"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            agent { label 'docker-node' }
            steps {
                checkout scm
            }
        }

        stage('Build Images') {
            agent { label 'docker-node' }
            steps {
                script {
                    if (params.BUILD_BACKEND) {
                        sh '''
                            docker build -t $BACKEND_IMAGE:$IMAGE_TAG ./backend
                        '''
                    }
                    if (params.BUILD_FRONTEND) {
                        sh '''
                            docker build -t $FRONTEND_IMAGE:$IMAGE_TAG ./frontend
                        '''
                    }
                }
            }
        }

        stage('Scan Images') {
            agent { label 'docker-node' }
            steps {
                script {
                    if (params.BUILD_BACKEND) {
                        sh '''
                            trivy image --exit-code 0 --severity HIGH,CRITICAL $BACKEND_IMAGE:$IMAGE_TAG
                        '''
                    }
                    if (params.BUILD_FRONTEND) {
                        sh '''
                            trivy image --exit-code 0 --severity HIGH,CRITICAL $FRONTEND_IMAGE:$IMAGE_TAG
                        '''
                    }
                }
            }
        }

        stage('Push Images') {
            agent { label 'docker-node' }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    '''
                    script {
                        if (params.BUILD_BACKEND) {
                            sh 'docker push $BACKEND_IMAGE:$IMAGE_TAG'
                        }
                        if (params.BUILD_FRONTEND) {
                            sh 'docker push $FRONTEND_IMAGE:$IMAGE_TAG'
                        }
                    }
                }
            }
        }

        stage('Deploy to Minikube') {
            agent { label 'minikube-target' }
            steps {
                script {
                    if (params.BUILD_BACKEND) {
                        sh '''
                            docker pull $BACKEND_IMAGE:$IMAGE_TAG
                            minikube image load $BACKEND_IMAGE:$IMAGE_TAG
                        '''
                    }
                    if (params.BUILD_FRONTEND) {
                        sh '''
                            docker pull $FRONTEND_IMAGE:$IMAGE_TAG
                            minikube image load $FRONTEND_IMAGE:$IMAGE_TAG
                        '''
                    }
                }

                sh '''
                    kubectl apply -f k8s/mongo-pvc.yaml
                    kubectl apply -f k8s/mongo-deployment.yaml
                    kubectl apply -f k8s/mongo-service.yaml

                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/backend-service.yaml

                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/frontend-service.yaml
                '''

                script {
                    if (params.BUILD_BACKEND) {
                        sh '''
                            kubectl set image deployment/node-api node-api=$BACKEND_IMAGE:$IMAGE_TAG
                            kubectl rollout status deployment/node-api --timeout=180s
                        '''
                    }
                    if (params.BUILD_FRONTEND) {
                        sh '''
                            kubectl set image deployment/react-ui react-ui=$FRONTEND_IMAGE:$IMAGE_TAG
                            kubectl rollout status deployment/react-ui --timeout=180s
                        '''
                    }
                }
            }
        }
    }

    post {
        failure {
            node('minikube-target') {
                script {
                    echo "Deployment failed. Starting rollback..."
                    if (params.BUILD_BACKEND) {
                        sh '''
                            kubectl rollout undo deployment/node-api || true
                            kubectl rollout status deployment/node-api --timeout=180s || true
                        '''
                    }
                    if (params.BUILD_FRONTEND) {
                        sh '''
                            kubectl rollout undo deployment/react-ui || true
                            kubectl rollout status deployment/react-ui --timeout=180s || true
                        '''
                    }
                }
            }
        }

        success {
            echo "Deployment completed successfully."
        }
    }
}