#!/bin/bash

# Start the StoryScape application (frontend and backend)
echo "Starting StoryScape..."

# Ensure we are in the root directory
cd "$(dirname "$0")"

# Use the existing npm script to run both concurrently
npm run dev
