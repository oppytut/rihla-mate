#!/usr/bin/env bash
set -euo pipefail

# =============================================
# Rihla Mate — One-Command Install Script
# =============================================
# Usage:
#   curl -fsSL https://releases.rihla-mate.com/install.sh | bash
# or:
#   chmod +x install.sh && ./install.sh
# =============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   Rihla Mate — Installer                    ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || {
  echo -e "${RED}Error: Docker is not installed.${NC}"
  echo "Please install Docker first: https://docs.docker.com/engine/install/"
  exit 1
}

command -v docker compose >/dev/null 2>&1 || {
  echo -e "${RED}Error: Docker Compose is not installed.${NC}"
  echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
  exit 1
}

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${YELLOW}Please edit .env and set your DB_PASSWORD and other values.${NC}"
  echo -e "${YELLOW}Then run this script again.${NC}"
  exit 0
fi

# Check if DB_PASSWORD is set
if grep -q "change_me_to_a_secure_password" .env; then
  echo -e "${RED}Error: Please set DB_PASSWORD in .env before proceeding.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose detected${NC}"

# Pull images
echo -e "${BLUE}Pulling Docker images...${NC}"
docker compose pull

# Start services
echo -e "${BLUE}Starting Rihla Mate...${NC}"
docker compose up -d

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check if app is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo ""
  echo -e "${GREEN}=============================================${NC}"
  echo -e "${GREEN}   Rihla Mate is running! 🚀                 ${NC}"
  echo -e "${GREEN}=============================================${NC}"
  echo ""
  echo -e "  Open your browser: ${BLUE}http://localhost:3000${NC}"
  echo ""
  echo -e "  Next steps:"
  echo -e "  1. Open the installer wizard to set up your site"
  echo -e "  2. Enter your license key or start a 14-day trial"
  echo -e "  3. Customize your landing page"
  echo ""
  echo -e "  Useful commands:"
  echo -e "  • View logs:     ${BLUE}docker compose logs -f app${NC}"
  echo -e "  • Stop:          ${BLUE}docker compose down${NC}"
  echo -e "  • Restart:       ${BLUE}docker compose restart${NC}"
  echo ""
else
  echo -e "${RED}Something went wrong. Check logs: docker compose logs app${NC}"
  exit 1
fi
