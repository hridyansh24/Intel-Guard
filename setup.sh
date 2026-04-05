#!/bin/bash
set -e

echo "=== AI Guard Setup ==="

# Backend dependencies
echo ""
echo "[1/3] Installing Python dependencies..."
pip install -r requirements.txt

# Frontend dependencies
echo ""
echo "[2/3] Installing frontend dependencies..."
cd frontend
npm install
cd ..

# .env file
echo ""
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "[3/3] Created .env from .env.example — fill in your API key!"
  else
    echo "[3/3] No .env.example found. Create a .env file with your API key."
  fi
else
  echo "[3/3] .env already exists, skipping."
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To run:"
echo "  Terminal 1:  uvicorn backend.main:app --reload"
echo "  Terminal 2:  cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:5173"
