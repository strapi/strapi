pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'your-dockerhub-username/strapi-app'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Node.js') {
            steps {
                nodejs(nodeJSInstallationName: 'Node 20.x') {
                    sh 'node --version'
                    sh 'yarn install --frozen-lockfile'
                }
            }
        }
        
        stage('Build') {
            steps {
                sh 'yarn build'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'yarn test:unit'
            }
            post {
                always {
                    junit 'test-results/unit/*.xml'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
                        docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo 'Build and test completed successfully!'
        }
        failure {
            echo 'Build or test failed!'
        }
    }
}
