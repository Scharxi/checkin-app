#!/bin/bash

# Checkin App Docker Deployment Script

echo "🚀 Starting Checkin App Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t checkin-app .

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
    echo "📊 To view logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "🛑 To stop: docker-compose -f docker-compose.prod.yml down"
else
    echo "❌ Deployment failed!"
    exit 1
fi 