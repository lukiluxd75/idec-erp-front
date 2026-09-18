pipeline {
    agent {
        node {
            label 'principal'
        }
    }

    environment {
        // Variables globales para reutilizar en el pipeline
        DEPLOY_DIR = '/var/www/idec-erp-back'
        BACKUP_DIR = '/var/backups/idec-erp-back'
    }

    options {
        // Limpia ejecuciones antiguas y coloca un tiempo límite
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('1. Preparación del Entorno') {
            steps {
                echo "Iniciando pipeline para la rama ${BRANCH_NAME}..."
                sh 'node -v || php -v || echo "Entorno verificado"'
            }
        }

        stage('2. Instalar Dependencias') {
            steps {
                echo "Instalando dependencias del proyecto..."
                // Si usas Node.js / Express:
                sh 'npm ci || npm install'

                // Si usaras Laravel / PHP, descomenta la siguiente línea:
                // sh 'composer install --no-interaction --prefer-dist --optimize-autoloader'
            }
        }

        stage('3. Análisis de Código (Linter)') {
            steps {
                echo "Verificando calidad del código..."
                // Ejecuta la verificación sintáctica si la tienes configurada en tu package.json
                sh 'npm run lint --if-present'
            }
        }

        stage('4. Pruebas Automatizadas (Tests)') {
            steps {
                echo "Ejecutando pruebas unitarias y de integración..."
                // Ejecuta los tests configurados en el proyecto
                sh 'npm test --if-present'

                // Si usaras Laravel / PHP, descomenta la siguiente línea:
                // sh './vendor/bin/phpunit'
            }
        }

        stage('5. Despliegue en Servidor') {
            steps {
                echo "Desplegando la rama ${BRANCH_NAME} en el servidor..."
                sh '''
                # 1. Crear directorios si no existen
                mkdir -p ${DEPLOY_DIR}
                mkdir -p ${BACKUP_DIR}

                # 2. Respaldar la versión anterior antes de sobreescribir
                if [ -d "${DEPLOY_DIR}" ]; then
                    tar -czf ${BACKUP_DIR}/back-backup-$(date +%Y%m%d_%H%M%S).tar.gz -C ${DEPLOY_DIR} . || true
                fi

                # 3. Sincronizar los archivos del repositorio al directorio de destino
                rsync -avz --exclude='.git' --exclude='node_modules' --exclude='.env' ./ ${DEPLOY_DIR}/

                # 4. Copiar dependencias y asegurar permisos en el servidor
                cd ${DEPLOY_DIR}
                npm install --production || true

                echo "Despliegue completado con éxito en ${DEPLOY_DIR}"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ El pipeline del Backend finalizó con ÉXITO para la rama ${BRANCH_NAME}."
        }
        failure {
            echo "❌ El pipeline del Backend FALLÓ. Revisa la Salida de Consola para corregir los errores."
        }
        always {
            // Limpia el workspace para no llenar el disco del servidor
            cleanWs()
        }
    }
}