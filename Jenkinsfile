pipeline {
    agent {
        label 'windows-runner'
    }
    environment {
        NODE_SKIP_PLATFORM_CHECK = '1'
        // Esto añade temporalmente Node.js al PATH del agente para que Vite encuentre 'node' sin problemas
        PATH = "C:\\Program Files\\nodejs;${env.PATH}"
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