pipeline {
    agent { label 'principal' }

    stages {
        stage('1. Preparación del Entorno') {
            steps {
                echo 'Limpiando entorno de trabajo...'
                cleanWs()
                checkout scm
            }
        }

        stage('2. Instalar Dependencias') {
            steps {
                echo 'Instalando dependencias del Frontend...'
                sh 'npm install'
            }
        }

        stage('3. Compilación') {
            steps {
                echo 'Compilando Frontend...'
                sh 'npm run build'
            }
        }
    }
}