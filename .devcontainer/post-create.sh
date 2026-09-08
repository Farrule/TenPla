#!/bin/bash
set -e

echo "=== Setting up Backend (Python) ==="
if [ -d "backend" ]; then
    cd backend
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    .venv/bin/pip install --upgrade pip
    if [ -f "requirements.txt" ]; then
        .venv/bin/pip install -r requirements.txt
    fi
    cd ..
fi

echo "=== Setting up Frontend (Node.js) ==="
if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ]; then
        npm install
    fi
    cd ..
fi

echo "=== Environment setup complete! ==="