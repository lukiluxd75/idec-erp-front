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
                // Se usa la ruta absoluta de npm para evitar errores en el agente de Windows
                bat '"C:\\Program Files\\nodejs\\npm.cmd" install'
            }
        }
        stage('Compilar Frontend') {
            steps {
                // Compila el proyecto usando npm
                bat '"C:\\Program Files\\nodejs\\npm.cmd" run build'
            }
        }
        stage('Desplegar a IIS') {
            steps {
                echo 'Copiando archivos compilados del frontend a IIS...'
                // Copia el contenido de la carpeta de compilación (ej. dist o build) hacia IIS
                // Nota: Si tu framework genera la salida en 'build' en lugar de 'dist', cambia 'dist' por 'build'
                bat 'xcopy /E /Y /I "%WORKSPACE%\\dist\\*" "C:\\inetpub\\wwwroot\\siscatJenkins\\"'
            }
        }
    }
    post {
        success {
            echo '¡El pipeline del Frontend se ejecutó y desplegó con éxito en IIS!'
        }
        failure {
            echo 'El pipeline del Frontend ha fallado. Revisa los registros.'
        }
    }
}