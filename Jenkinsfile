pipeline {
    agent {
        label 'windows-runner'
    }
    environment {
        // Esto le dice a Node.js que ignore la restricción de versión de Windows Server 2012
        NODE_SKIP_PLATFORM_CHECK = '1'
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
                bat '"C:\\Program Files\\nodejs\\npm.cmd" install'
            }
        }
        stage('Compilar Frontend') {
            steps {
                bat '"C:\\Program Files\\nodejs\\npm.cmd" run build'
            }
        }
        stage('Desplegar a IIS') {
            steps {
                echo 'Copiando archivos compilados del frontend a IIS...'
                // Si tu compilación usa 'build' en lugar de 'dist', cambia 'dist' por 'build'
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