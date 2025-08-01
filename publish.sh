#!/bin/bash

# Save current directory
ORIGINAL_DIR=$(pwd)

# Function to ensure we always return to original directory
cleanup() {
    cd "$ORIGINAL_DIR"
}

# Set trap to run cleanup on script exit (success or failure)
trap cleanup EXIT

echo "Publishing package from dist directory..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Error: dist directory not found. Please run build first."
    exit 1
fi

# Change to dist directory
cd dist

# Run npm publish
npm publish

# Exit code will be preserved and cleanup will run automatically