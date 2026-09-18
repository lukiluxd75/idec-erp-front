pipeline {
    agent any

    environment {
        NODE_OPTIONS = '--max-old-space-size=4096'
        UV_THREADPOOL_SIZE = '2'
    }

    stages {
        stage('1. Instalar Dependencias') {
            steps {
                echo 'Instalando dependencias de Node.js...'
                sh 'if [ -f package-lock.json ]; then npm ci --prefer-offline; else npm install; fi'
            }
        }

        stage('2. Compilación (Build)') {
            steps {
                echo 'Compilando Frontend con consumo controlado de RAM...'
                sh 'NODE_OPTIONS="--max-old-space-size=4096" npm run build'
            }
        }

        stage('3. Despliegue') {
            steps {
                echo 'Sincronizando archivos al servidor...'
                // Crea la carpeta destino si no existe y luego copia los archivos
                sh 'mkdir -p /var/www/html/idec-erp-front'
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