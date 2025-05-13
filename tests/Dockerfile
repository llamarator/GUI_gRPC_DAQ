# Use a Python base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app/tests

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    iputils-ping \
    net-tools \
    procps \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Copy the requirements file
COPY requirements.txt .

# Install Python dependencies, including Robot Framework.
RUN pip install --no-cache-dir -r requirements.txt

# Get the user's UID and GID from the HOST at build time
ARG HOST_UID=1000
ARG HOST_GID=1000

# Create a user with the same UID and GID
RUN groupadd --gid $HOST_GID appuser && \
    useradd --uid $HOST_UID --gid $HOST_GID --create-home appuser

# Change ownership of /app/tests to the new user
RUN chown -R appuser:appuser /app/tests

# Switch to the non-root user
USER appuser

# Define entrypoint.
ENTRYPOINT ["/bin/bash", "-c", "echo 'Robot Framework tests not configured.  Please specify a test script or command in ENTRYPOINT.' && sleep infinity"]