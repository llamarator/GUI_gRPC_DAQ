#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

clear
echo -e "${CYAN}🚦 Stopping all containers...${NC}"
podman container stop --all

echo -e "${YELLOW}🧹 Removing all containers...${NC}"
podman container rm --all

echo -e "${YELLOW}🧹 Removing all networks...${NC}"
podman network rm -f gateway_gateway_network

echo -e "${GREEN}⏳ Waiting before build...${NC}"
sleep 2

echo -e "${CYAN}⚙️ Preparing environment for build...${NC}"

# Progress bar (without usleep, using sleep in seconds)
progress_bar() {
    local duration=${1:-4}
    local steps=20
    local delay=$(echo "scale=2; $duration / $steps" | bc)
    local chars=("⣷" "⣯" "⣟" "⡿" "⢿" "⣻" "⣽" "⣾")

    echo -ne "${YELLOW}⏬ Starting podman-compose build:${NC} "
    for ((i = 1; i <= steps; i++)); do
        local percent=$((i * 100 / steps))
        local filled=$((i * 20 / steps))
        local spinner=${chars[i % ${#chars[@]}]}
        printf "\r${YELLOW}⏬ Starting podman-compose build:${NC} [%-20s] %3d%% %s" "$(printf "%0.s█" $(seq 1 $filled))" "$percent" "$spinner"
        sleep "$delay"
    done
    echo -e "\n${GREEN}✅ Ready. Running podman-compose...${NC}"
}

progress_bar 4

# Run podman-compose
podman-compose up -d --build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🚀 Containers are up and running!${NC}"
else
    echo -e "${RED}❌ Something went wrong while starting the containers.${NC}"
fi

