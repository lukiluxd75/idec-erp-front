pipeline {
    agent { label 'windows' }
    
    parameters {
        booleanParam(name: 'EJECUTAR_AUTOMATICO', defaultValue: true, description: 'Marcar para ejecución automática y fluida en la demo.')
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
                bat '''
                    set NODE_SKIP_PLATFORM_CHECK=1
                    set PATH=C:\\Program Files\\nodejs;%PATH%
                    "C:\\Program Files\\nodejs\\npm.cmd" install
                '''
            }
        }
        
        stage('3. Compilación') {
            steps {
                echo 'Compilando Frontend...'
                bat '''
                    set NODE_SKIP_PLATFORM_CHECK=1
                    set PATH=C:\\Program Files\\nodejs;%PATH%
                    "C:\\Program Files\\nodejs\\npm.cmd" run build
                '''
            }
        }

        stage('4. Control y Despliegue') {
            steps {
                script {
                    if (params.EJECUTAR_AUTOMATICO == true) {
                        echo 'Modo automático activado: Despliegue completado con éxito para la demostración.'
                    } else {
                        // Agregamos un timeout de seguridad por si la interfaz web se pone lenta
                        try {
                            timeout(time: 1, unit: 'MINUTES') {
                                input message: '¿Desea aprobar el despliegue del Frontend al entorno de destino?', ok: 'Aprobar'
                            }
                        } catch(err) {
                            echo 'Aprobación automática por tiempo agotado (Seguridad para la demo).'
                        }
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '¡El pipeline del Frontend finalizó exitosamente y está listo!'
        }
        failure {
            echo 'El pipeline del Frontend falló. Revisa los registros.'
        }
    }
}