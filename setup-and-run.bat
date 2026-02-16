@echo off
cd /d "%~dp0"
echo ============================================
echo  Chat MVP - Setup and Run
echo ============================================
echo.
echo IMPORTANT: If npm install fails with EPERM/Access denied,
echo   close Cursor and all terminals, then double-click this file again.
echo.
echo Cleaning old install...
if exist node_modules rmdir /s /q node_modules 2>nul
if exist package-lock.json del package-lock.json 2>nul
echo.
echo Installing dependencies (this may take a few minutes)...
call npm install
if errorlevel 1 (
  echo.
  echo Install failed. Close Cursor and any IDE using this folder, then run this script again.
  pause
  exit /b 1
)
echo.
echo Generating Prisma client...
call npm run postinstall
echo.
echo Pushing database schema to PostgreSQL...
call npm run db:push
if errorlevel 1 (
  echo Make sure PostgreSQL is running and chatdb exists.
  pause
  exit /b 1
)
echo.
echo Starting the app...
echo Open http://localhost:4000 in your browser.
echo.
call npm run dev
