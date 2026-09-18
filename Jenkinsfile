pipeline {
    agent any

    environment {
        NODE_OPTIONS = '--max-old-space-size=8192'
    }

    stages {
        stage('1. Limpieza') {
            steps {
                cleanWs()
            }
        }

        stage('2. Instalar Dependencias') {
            steps {
                echo 'Instalando dependencias...'
                sh 'npm ci --prefer-offline || npm install'
            }
        }

        stage('3. Compilación (Build)') {
            steps {
                echo 'Compilando Frontend...'
                sh 'npm run build'
            }
        }

        stage('4. Despliegue') {
            steps {
                echo 'Sincronizando archivos al servidor...'
                sh 'rsync -avz --delete dist/ /var/www/html/idec-erp-front/'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo '¡Despliegue del Frontend exitoso!'
        }
        failure {
            echo 'Error en el despliegue.'
        }
    }
}