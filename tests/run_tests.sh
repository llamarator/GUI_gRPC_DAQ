#!/bin/bash

# Script to execute Robot Framework tests in a container

# Configure colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Optional: Exit immediately if a command exits with a non-zero status.
# set -e

echo -e "${YELLOW}Starting automated tests with Robot Framework...${NC}"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Verify that we are in the correct directory structure
if [ ! -f "../podman-compose.yml" ] && [ ! -f "../../podman-compose.yml" ]; then
    echo -e "${RED}Erro: podman-compose.yml not found in parent or grandparent directory.${NC}"
    echo -e "${YELLOW}This script should be run from the 'tests' directory or a subdirectory within 'tests'.${NC}"
    exit 1
fi

# Determine the project root directory
ROOT_DIR=""
if [ -f "../podman-compose.yml" ]; then
    ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
elif [ -f "../../podman-compose.yml" ]; then
    ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

if [ -z "${ROOT_DIR}" ]; then
    echo -e "${RED}Error: Could not determine project root directory.${NC}"
    exit 1
fi

echo -e "${BLUE}Project root directory: ${ROOT_DIR}${NC}"
echo -e "${BLUE}Script directory: ${SCRIPT_DIR}${NC}"

# First, verify that the dependent containers are running
echo -e "${YELLOW}Verifying that all dependent containers are running...${NC}"
# Assuming check_containers.sh is in the same directory as this script
if [ -f "${SCRIPT_DIR}/check_containers.sh" ]; then # CHANGED from check_services.sh
    sh "${SCRIPT_DIR}/check_containers.sh" # CHANGED from check_services.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Dependent containers are not running correctly. Please check the logs.${NC}"
        echo -e "${YELLOW}Do you want to continue anyway? (y/n)${NC}"
        read -r response
        if ! [[ "$response" =~ ^([yY])$ ]]; then
            echo -e "${RED}Aborting tests.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}Error: check_containers.sh not found in ${SCRIPT_DIR}${NC}" # CHANGED
    echo -e "${YELLOW}Skipping container check. Do you want to continue anyway? (y/n)${NC}"
    read -r response
    if ! [[ "$response" =~ ^([yY])$ ]]; then
        echo -e "${RED}Aborting tests.${NC}"
        exit 1
    fi
fi

# Ensure the host results directory exists (this will be mapped into the container)
# This refers to ROOT_DIR/tests/results because of the volume mapping definition later.
mkdir -p "${ROOT_DIR}/tests/results"

# Path for the test-specific compose file (will be created in ROOT_DIR)
PODMAN_COMPOSE_TESTS_YML="${ROOT_DIR}/podman-compose-tests.yml"

# Build and run the test container
echo -e "${YELLOW}Building and running the test container...${NC}"

# Create podman-compose-tests.yml if it doesn't exist in ROOT_DIR
# Paths in this file (context, volumes) are relative to ROOT_DIR
if [ ! -f "${PODMAN_COMPOSE_TESTS_YML}" ]; then
    echo -e "${YELLOW}Creating ${PODMAN_COMPOSE_TESTS_YML}...${NC}"
    cat > "${PODMAN_COMPOSE_TESTS_YML}" << EOL
version: '3.9'
services:
  robot-tests:
    build:
      context: ./tests # Relative to ROOT_DIR, so project_root/tests (Dockerfile location)
    container_name: robot-tests
    volumes:
      - ./tests:/app/tests # Host: project_root/tests, Container: /app/tests
      - ./tests/results:/app/tests/results # Host: project_root/tests/results, Container: /app/tests/results
    networks:
      gateway_network: # Make sure this network is defined in your main podman-compose.yml
        ipv4_address: 172.90.0.50
    depends_on: # These services must be defined in the main podman-compose.yml
      - nginx-router
      - gateway
      - control-frontend
      - control-backend
      - control-grpc
      - sql
EOL
fi

# Create a temporary compose file in ROOT_DIR
TEMP_COMPOSE_FILE="${ROOT_DIR}/temp-compose.yml" # CHANGED location to ROOT_DIR
echo -e "${YELLOW}Creating temporary compose file: ${TEMP_COMPOSE_FILE}${NC}"
(
    cat "${ROOT_DIR}/podman-compose.yml"
    echo "" # Blank line for separation
    cat "${PODMAN_COMPOSE_TESTS_YML}" # This file is already in ROOT_DIR
) > "${TEMP_COMPOSE_FILE}"

# Go to the root directory to correctly resolve paths in compose files
cd "${ROOT_DIR}"

# Run only the test container (and its dependencies if not already up)
echo -e "${YELLOW}Starting the test container...${NC}"
# Use temp-compose.yml directly as it's now in CWD (ROOT_DIR)
podman-compose -f temp-compose.yml up -d --build robot-tests # CHANGED -f path

# Wait for the test container to be available
echo -e "${YELLOW}Waiting for the test container to be available...${NC}"
sleep 10

# Verify if the container is running
if ! podman container exists robot-tests || [ "$(podman inspect -f '{{.State.Running}}' robot-tests 2>/dev/null)" != "true" ]; then
    echo -e "${RED}Error: The test container 'robot-tests' is not running.${NC}"
    echo -e "${BLUE}Logs for robot-tests:${NC}"
    podman logs robot-tests
    echo -e "${YELLOW}Cleaning up temporary files and test container...${NC}"
    podman-compose -f temp-compose.yml down robot-tests # CHANGED -f path
    rm -f "${TEMP_COMPOSE_FILE}" # Path is already ROOT_DIR/temp-compose.yml
    cd "${SCRIPT_DIR}"
    exit 1
fi


# Execute tests
echo -e "${YELLOW}Executing tests...${NC}"
podman exec robot-tests robot --outputdir /app/tests/results /app/tests/suites
TEST_RESULT=$?

# Verify the result
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
else
    echo -e "${RED}Some tests failed. Please review the results.${NC}"
fi

# Copy results
echo -e "${YELLOW}Copying test results...${NC}"
# Results are already in ROOT_DIR/tests/results due to volume mount.
# This copies them to SCRIPT_DIR/test_results
mkdir -p "${SCRIPT_DIR}/test_results"
podman cp robot-tests:/app/tests/results/. "${SCRIPT_DIR}/test_results/"

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
podman-compose -f temp-compose.yml down # CHANGED -f path
rm -f "${TEMP_COMPOSE_FILE}" # Path is already ROOT_DIR/temp-compose.yml
# Optionally, remove the generated podman-compose-tests.yml if it's meant to be transient
# rm -f "${PODMAN_COMPOSE_TESTS_YML}"

cd "${SCRIPT_DIR}"

echo -e "${GREEN}Test process completed. Results are available in '${ROOT_DIR}/tests/results' (direct map) and '${SCRIPT_DIR}/test_results' (copied).${NC}"
exit $TEST_RESULT