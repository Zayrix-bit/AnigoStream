@echo off
echo =========================================
echo       AnigoStream Local Environment      
echo =========================================

:: Auto-Install Requirements (Quiet mode, fast if already installed)
echo Checking and installing dependencies (if any)...
pip install -q -r requirements_anigo.txt

:: Start the Python Backend API in a new window
echo Starting Anigo Backend API (Port 5002)...
start "Anigo Backend" cmd /c "python anigo_bypass_scraper.py"

:: Start the Frontend HTTP Server in the background
echo Starting Anigo Frontend Server (Port 8000)...
cd anigo_web
start "Anigo Frontend" cmd /c "python -m http.server 8000"

:: Wait a second for servers to boot
timeout /t 2 /nobreak >nul

:: Open the browser to the frontend
echo Opening Browser...
start http://localhost:8000

echo Both servers are running! Close the command windows to stop them.
pause
