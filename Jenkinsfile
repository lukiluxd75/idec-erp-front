pipeline {
    agent {
        label 'windows-runner'
    }
    parameters {
        booleanParam(name: 'EJECUTAR_AUTOMATICO', defaultValue: true, description: 'Ejecución fluida automática')
    }
    triggers {
        cron('0 3 * * *')
    }
    stages {
        stage('Preparación') {
            steps {
                cleanWs()
                checkout scm
            }
        }
        stage('Instalar Node Modules') {
            steps {
                bat 'npm install'
            }
        }
        stage('Compilar Frontend') {
            steps {
                // Ajusta este comando según el script de compilación de tu package.json (ej: npm run build)
                bat 'npm run build'
            }
        }
        stage('Desplegar a IIS') {
            steps {
                echo 'Copiando archivos compilados del frontend a IIS...'
                // Nota: Si tu compilación genera una carpeta de salida como 'dist' o 'build', 
                // apunta el xcopy a esa subcarpeta. Aquí se asume que se copian desde la raíz o dist:
                bat 'xcopy /E /Y /I "%WORKSPACE%\\dist\\*" "C:\\inetpub\\wwwroot\\siscatJenkins\\"'
            }
        }
    }
    post {
        success {
            echo '¡El pipeline del Frontend se ejecutó y desplegó con éxito en IIS!'
        }
        failure {
            echo 'El pipeline del Frontend ha fallado.'
        }
    }
}