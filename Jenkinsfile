pipeline {
    agent { label 'windows' }
    
    parameters {
        booleanParam(name: 'EJECUTAR_AUTOMATICO', defaultValue: false, description: 'Marcar para ejecución automática. Desmarcar para requerir aprobación manual.')
    }
    
    triggers {
        // Disparador automático nocturno todos los días a las 02:00 AM
        cron('0 2 * * *')
    }
    
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
                bat '"C:\\Program Files\\nodejs\\npm.cmd" install'
            }
        }
        
        stage('3. Compilación') {
            steps {
                echo 'Compilando Frontend...'
                bat '"C:\\Program Files\\nodejs\\npm.cmd" run build'
            }
        }

        stage('4. Control y Despliegue') {
            steps {
                script {
                    if (currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause') || params.EJECUTAR_AUTOMATICO == true) {
                        echo 'Ejecutando despliegue automático nocturno...'
                    } else {
                        input message: '¿Desea aprobar el despliegue del Frontend al entorno de destino?', ok: 'Aprobar'
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '¡El pipeline del Frontend finalizó exitosamente!'
        }
        failure {
            echo 'El pipeline del Frontend falló. Revisa los registros.'
        }
    }
}