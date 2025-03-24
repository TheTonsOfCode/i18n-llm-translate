#!/bin/bash

set -e

echo "Removing existing 'dist' directory..."
rm -rf dist
mkdir dist
echo "'dist' directory prepared."

echo "Compiling TypeScript files..."
tsc -p tsconfig.json
tsc-alias
if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed." >&2
    exit 1
fi
echo "TypeScript compilation successful."

echo "Copying basic files to the 'dist' directory..."
cp package.json README.md CHANGELOG.md dist

echo "Build process completed successfully."