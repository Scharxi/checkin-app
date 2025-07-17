#!/bin/bash

# Checkin App Docker Deployment Script

echo "🚀 Starting Checkin App Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for force rebuild flag
FORCE_REBUILD=false
if [[ "$1" == "--force" ]]; then
    FORCE_REBUILD=true
    echo "🔄 Force rebuild mode enabled..."
fi

# Build the Docker image
if [ "$FORCE_REBUILD" = true ]; then
    echo "📦 Building Docker image (no cache)..."
    docker build --no-cache -t checkin-app .
else
    echo "📦 Building Docker image..."
    docker build -t checkin-app .
fi

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker image built successfully!"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start the application
echo "🚀 Starting the application..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Frontend available at: http://localhost:3000"
    echo "🔌 Backend available at: http://localhost:3001"
    echo "🗄️  Database available at: localhost:5432"
    echo ""
    
    # Wait a moment for services to be fully ready
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Ask if user wants to seed the database
    read -p "🌱 Do you want to seed the database? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./seed-database.sh
    fi
    
    echo ""
    echo "📊 To view logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "🛑 To stop: docker-compose -f docker-compose.prod.yml down"
    echo "🌱 To seed database manually: ./seed-database.sh"
else
    echo "❌ Deployment failed!"
    exit 1
fi 