#!/bin/bash

set -e

echo "========================================"
echo "Iniciando deploy do CRM..."
echo "========================================"

PROJECT_DIR="/var/www/crm"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$PROJECT_DIR/venv"
SERVICE_NAME="crm-gunicorn.service"

echo ""
echo "[1/6] Entrando na pasta do projeto..."
cd "$PROJECT_DIR"

echo ""
echo "[2/6] Ativando ambiente virtual..."
source "$VENV_DIR/bin/activate"

echo ""
echo "[3/6] Atualizando código com git pull..."
git pull

echo ""
echo "[4/6] Gerando build do frontend..."
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "[5/6] Voltando para a raiz do projeto..."
cd "$PROJECT_DIR"

echo ""
echo "[6/6] Reiniciando serviço do Gunicorn..."
sudo systemctl restart "$SERVICE_NAME"

echo ""
echo "Status do serviço:"
sudo systemctl status "$SERVICE_NAME" --no-pager

echo ""
echo "========================================"
echo "Deploy finalizado com sucesso!"
echo "========================================"