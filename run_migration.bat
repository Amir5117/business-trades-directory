@echo off
REM ============================================================================
REM  run_migration.bat  -  TheBusinessTrades one-click Phase 2 pipeline (Windows)
REM
REM  Step 0 verifies your tools BEFORE doing anything. Prerequisites:
REM    * Python 3.10+    * Node.js 18+ / npm    * MySQL running (XAMPP/WAMP)
REM  Place the archive at:  ..\legacy-wp-data\archive\idealonlinebusiness.wpress
REM  Then just double-click this file. It runs every step in order and STOPS on
REM  the first problem. It only READS ..\legacy-wp-data and writes inside this project.
REM ============================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "ARCHIVE=..\legacy-wp-data\archive\idealonlinebusiness.wpress"
set "EXTRACT=..\legacy-wp-data\wpress-extract"
set "DBNAME=tbt_legacy"

echo.
echo ============================================================
echo    TheBusinessTrades  -  Phase 2 Migration Pipeline
echo ============================================================

echo.
echo [0/9] Checking prerequisites (Python, Node, npm, MySQL) ...
set "MISSING="
where python >nul 2>nul || set "MISSING=!MISSING! python"
where node   >nul 2>nul || set "MISSING=!MISSING! node"
where npm    >nul 2>nul || set "MISSING=!MISSING! npm"

REM MySQL client: look on PATH first, then the default XAMPP install location.
set "MYSQL=mysql"
set "MYSQL_OK="
where mysql >nul 2>nul && set "MYSQL_OK=1"
if not defined MYSQL_OK if exist "C:\xampp\mysql\bin\mysql.exe" (set "MYSQL=C:\xampp\mysql\bin\mysql.exe" & set "MYSQL_OK=1")
if not defined MYSQL_OK set "MISSING=!MISSING! mysql"

if defined MISSING goto :missing
echo        OK - python, node and npm found.
echo        OK - MySQL client: %MYSQL%

echo.
echo [1/9] Creating Python virtual environment (.venv) ...
if exist ".venv\Scripts\activate.bat" echo        .venv already exists - reusing it.
if not exist ".venv\Scripts\activate.bat" python -m venv .venv || goto :error

echo.
echo [2/9] Activating the virtual environment ...
call ".venv\Scripts\activate.bat" || goto :error

echo.
echo [3/9] Installing Python dependencies (scripts\requirements.txt) ...
python -m pip install --upgrade pip >nul
pip install -r scripts\requirements.txt || goto :error

echo.
echo [4/9] Preparing .env.local (defaults: MySQL user root / no password) ...
if exist ".env.local" echo        .env.local already exists - leaving it untouched.
if not exist ".env.local" copy /Y ".env.example" ".env.local" >nul || goto :error

echo.
echo [5/9] Unpacking the .wpress archive (read-only source) ...
python scripts\unwpress.py "%ARCHIVE%" "%EXTRACT%" || goto :error

echo.
echo [6/9] Creating database "%DBNAME%" and importing database.sql ...
"%MYSQL%" --default-character-set=utf8mb4 -u root -e "CREATE DATABASE IF NOT EXISTS %DBNAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" || goto :error
"%MYSQL%" --default-character-set=utf8mb4 -u root %DBNAME% < "%EXTRACT%\database.sql" || goto :error

echo.
echo [7/9] Transforming WordPress -^> MDX  (--audit --copy-media) ...
python scripts\migrate.py --source mysql --audit --copy-media || goto :error
echo        Review scripts\_reports\audit-collisions.csv before you deploy.

echo.
echo [8/9] Installing Node dependencies (npm install) ...
call npm install || goto :error

echo.
echo [9/9] Booting the Next.js dev server  -^>  http://localhost:3000   (press Ctrl+C to stop)
call npm run dev
goto :done

:missing
echo.
echo ************************************************************
echo    CANNOT START - missing prerequisite(s):!MISSING!
echo ------------------------------------------------------------
echo    Install / start the item(s) below, then run this file again:
echo.
echo !MISSING! | find /i "python" >nul && echo      * Python 3.10+   https://www.python.org/downloads/   (tick "Add python.exe to PATH")
echo !MISSING! | find /i "node"   >nul && echo      * Node.js 18+    https://nodejs.org/   (this also installs npm)
echo !MISSING! | find /i "npm"    >nul && echo      * npm            ships with Node.js - reinstall Node.js if it is missing
echo !MISSING! | find /i "mysql"  >nul && echo      * MySQL          start it in the XAMPP/WAMP control panel, or install MariaDB/MySQL
echo ------------------------------------------------------------
echo    (MySQL was looked for on PATH and at C:\xampp\mysql\bin\mysql.exe)
echo ************************************************************
endlocal
exit /b 1

:error
echo.
echo ************************************************************
echo    PIPELINE STOPPED - the step above failed (see messages).
echo    Nothing in ..\legacy-wp-data was modified.
echo ************************************************************
endlocal
exit /b 1

:done
endlocal
