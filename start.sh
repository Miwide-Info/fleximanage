#!/bin/bash

echo "=== FlexiManage Docker Setup ==="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Error: Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        echo "Error: Docker Compose is not available."
        exit 1
    fi
}

# Function to create logs directory
create_logs_dir() {
    mkdir -p backend/logs
    echo "Created logs directory"
}

# Function to wait for MongoDB replica set
wait_for_mongo() {
    echo "Waiting for MongoDB replica set to be ready..."
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec flexi-mongo-primary mongo --eval "db.runCommand({isMaster: 1}).ismaster" --quiet > /dev/null 2>&1; then
            echo "MongoDB replica set is ready!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - MongoDB not ready yet, waiting..."
        sleep 5
        ((attempt++))
    done
    
    echo "Error: MongoDB replica set failed to become ready within 5 minutes"
    return 1
}

# Function to wait for backend
wait_for_backend() {
    echo "Waiting for FlexiManage backend to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            echo "FlexiManage backend is ready!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - Backend not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    echo "Warning: Backend health check failed, but it might still be starting up"
    return 0
}

# Function to show service URLs
show_services() {
    echo ""
    echo "=== FlexiManage Services ==="
    echo "Backend HTTP:      http://localhost:3000"
    echo "Backend HTTPS:     https://localhost:3443"
    echo "SMTP4Dev Web UI:   http://localhost:8025"
    echo "MongoDB Primary:   mongodb://localhost:27017"
    echo "Redis:             redis://localhost:6380"
    echo ""
    echo "=== Default Admin User Creation ==="
    echo "To create your first admin user, run:"
    echo "docker exec flexi-backend node create-admin.js"
    echo ""
    echo "=== Register a User ==="
    echo "Use the following curl command to register:"
    echo 'curl -X POST -k "https://localhost:3443/api/users/register" \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d "{\"accountName\":\"testaccount\",\"userFirstName\":\"Test\",\"userLastName\":\"User\",\"email\":\"test@example.com\",\"password\":\"testpassword\",\"userJobTitle\":\"Admin\",\"userPhoneNumber\":\"\",\"country\":\"US\",\"companySize\":\"0-10\",\"serviceType\":\"Provider\",\"numberSites\":\"10\",\"companyType\":\"\",\"companyDesc\":\"\",\"captcha\":\"\"}"'
    echo ""
    echo "Check SMTP4Dev at http://localhost:8025 for the verification email."
    echo ""
}

# Main execution
main() {
    echo "Checking prerequisites..."
    check_docker
    check_docker_compose
    create_logs_dir
    
    echo ""
    echo "Starting FlexiManage services..."
    
    # Use docker compose if available, fallback to docker-compose
    if docker compose version > /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Start services
    $COMPOSE_CMD up -d
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to start services"
        exit 1
    fi
    
    echo ""
    echo "Services started successfully!"
    
    # Wait for services to be ready
    wait_for_mongo
    wait_for_backend
    
    show_services
    
    echo "=== Logs ==="
    echo "To follow logs: $COMPOSE_CMD logs -f"
    echo "To stop:       $COMPOSE_CMD down"
    echo "To restart:    $COMPOSE_CMD restart"
}

main "$@"