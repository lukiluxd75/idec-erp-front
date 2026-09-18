pipeline {
    agent any

    environment {
        // Aumenta el límite de memoria asignado a Node.js
        NODE_OPTIONS = '--max-old-space-size=8192'
    }

    stages {
        stage('1. Preparación del Entorno') {
            steps {
                echo 'Limpiando espacio de trabajo anterior...'
                cleanWs()
            }
        }

        stage('2. Instalar Dependencias') {
            steps {
                echo 'Instalando dependencias de Node.js...'
                sh 'npm ci --prefer-offline || npm install'
            }
        }

        stage('3. Pruebas Automatizadas') {
            steps {
                echo 'Ejecutando pruebas unitarias del Frontend...'
                sh 'npm run test -- --reporter=junit --outputFile=test-report.xml || true'
            }
        }

        stage('4. Compilación (Build)') {
            steps {
                echo 'Compilando aplicación Vite / React para producción...'
                // Asigna la memoria explícitamente en el comando de build
                sh 'NODE_OPTIONS="--max-old-space-size=8192" npm run build'
            }
        }

        stage('5. Despliegue en Servidor') {
            steps {
                echo 'Sincronizando archivos compilados con el servidor web...'
                sh 'rsync -avz --delete dist/ /var/www/html/idec-erp-front/'
            }
        }
    }

    post {
        always {
            echo 'Publicando resultados de las pruebas...'
            junit allowEmptyResults: true, testResults: '**/test-report.xml'
            
            echo 'Limpiando espacio de trabajo temporal...'
            cleanWs()
        }
        success {
            echo '¡El despliegue del Frontend se completó con éxito!'
        }
        failure {
            echo 'El pipeline del Frontend ha fallado.'
        }
    }
}