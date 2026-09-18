pipeline {
    agent {
        node {
            label 'principal'
        }
    }
    stages {
        stage('Desplegar ERP Front') {
            steps {
                sh '''
                echo "Desplegando automáticamente la rama ${BRANCH_NAME}..."
                mkdir -p /tmp/erp-front-pruebas
                rsync -avz --exclude='.git' ./ /tmp/erp-front-pruebas/
                echo "Despliegue completado con éxito."
                '''
            }
        }
    }
}