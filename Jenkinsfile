pipeline {
    agent any

    environment {
        // Asignación de memoria y desactivación de hilos excesivos en Node/Vite para evitar el error 254
        NODE_OPTIONS = '--max-old-space-size=4096'
        UV_THREADPOOL_SIZE = '2'
    }

    stages {
        stage('1. Limpieza') {
            steps {
                cleanWs()
            }
        }

        stage('2. Instalar Dependencias') {
            steps {
                echo 'Instalando dependencias de Node.js...'
                sh 'npm ci --prefer-offline || npm install'
            }
        }

        stage('3. Compilación (Build)') {
            steps {
                echo 'Compilando Frontend con consumo controlado de RAM...'
                sh 'NODE_OPTIONS="--max-old-space-size=4096" npm run build'
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