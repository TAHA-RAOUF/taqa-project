#!/bin/bash

echo "🚀 Starting TAMS Full Stack Application"
echo "======================================="

# Start backend server in background
echo "📡 Starting backend server..."
cd tams
python run.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server in background
echo "🎨 Starting frontend server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ Both servers started!"
echo "📡 Backend API: http://localhost:5000"
echo "🎨 Frontend: http://localhost:5173"
echo "🌐 API Browser: http://localhost:5000/api-browser/"
echo ""
echo "To stop both servers, run: kill $BACKEND_PID $FRONTEND_PID"
echo "Or press Ctrl+C"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
