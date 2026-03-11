@echo off
REM Windows batch script equivalent of configureEnv.sh

REM Start timer
set START_TIME=%time%
echo ============================================
echo Starting environment configuration...
echo ============================================

REM Update github submodules recursively
git submodule update --init --recursive

REM Note: Python installation on Windows is different from apt-get
REM Users should install Python 3.12 from https://www.python.org/downloads/
REM or use winget: winget install Python.Python.3.12
echo.
echo Note: Python 3.12 should be installed separately on Windows
echo You can install it using: winget install Python.Python.3.12
echo Or download from: https://www.python.org/downloads/
echo.

REM #### Commenting out for temp workshop ####

REM REM Install STM
REM echo Installing STM
REM REM Note: STM installation on Windows would require a different approach
REM REM Original uses apt-get for Linux package management
REM echo STM installation not available for Windows batch script
REM echo Please install STM manually if needed

REM REM Install Java 17
REM REM Windows users can use: winget install Microsoft.OpenJDK.17
REM REM Or download from: https://learn.microsoft.com/en-us/java/openjdk/download
REM echo Installing Java 17...
REM winget install Microsoft.OpenJDK.17
REM setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17.0.x-hotspot"
REM setx PATH "%JAVA_HOME%\bin;%PATH%"

REM REM Install Maven
REM REM Windows users can use: winget install Apache.Maven
REM echo Installing Maven...
REM winget install Apache.Maven

REM REM Install latest Go version
REM echo Installing latest Go version...
REM REM Windows users can use: winget install GoLang.Go
REM REM Or download from: https://go.dev/dl/
REM winget install GoLang.Go
REM REM Set environment variables
REM setx GOPATH "%USERPROFILE%\go"
REM setx PATH "%PATH%;C:\Program Files\Go\bin;%GOPATH%\bin"
REM echo Go installation complete
REM go version

REM REM Install Node.js LTS
REM echo Installing Node.js LTS...
REM REM Windows users can use: winget install OpenJS.NodeJS.LTS
REM REM Or download from: https://nodejs.org/
REM winget install OpenJS.NodeJS.LTS
REM echo Node.js LTS installation complete
REM node --version
REM npm --version

REM #### Commenting out for temp workshop ####

REM Get public IP address using PowerShell
echo Getting container IP address...
for /f "delims=" %%i in ('powershell -Command "(Invoke-WebRequest -Uri 'https://ifconfig.me' -UseBasicParsing).Content"') do set IP_ADDR=%%i
echo Container IP address: %IP_ADDR%

REM Call AWS Lambda endpoint (using curl if available, otherwise PowerShell)
where curl >nul 2>nul
if %errorlevel% equ 0 (
    curl -s "https://u1odlsl6d9.execute-api.us-east-2.amazonaws.com/default/CodespacesOnboarding?IP_ADDR=%IP_ADDR%&GITHUB_USER=%GITHUB_USER%"
) else (
    powershell -Command "Invoke-WebRequest -Uri 'https://u1odlsl6d9.execute-api.us-east-2.amazonaws.com/default/CodespacesOnboarding?IP_ADDR=%IP_ADDR%&GITHUB_USER=%GITHUB_USER%' -UseBasicParsing | Out-Null"
)
echo.

REM Run registration script (commented out in original)
REM call faa-workshop\sam\util\register.bat

REM Run broker setup script
echo Setting up Solace broker...
REM Note: setup_broker.sh is a bash script - would need a .bat equivalent
REM For now, check if bash is available (Git Bash, WSL, etc.)
where bash >nul 2>nul
if %errorlevel% equ 0 (
    bash setup_broker.sh
) else (
    echo Warning: bash not found. Please run setup_broker.sh manually using Git Bash or WSL
    echo Or create a Windows equivalent setup_broker.bat script
)

REM Calculate execution time
set END_TIME=%time%

REM Parse start time
for /f "tokens=1-4 delims=:.," %%a in ("%START_TIME%") do (
    set /a START_H=%%a
    set /a START_M=%%b
    set /a START_S=%%c
    set /a START_MS=%%d
)

REM Parse end time
for /f "tokens=1-4 delims=:.," %%a in ("%END_TIME%") do (
    set /a END_H=%%a
    set /a END_M=%%b
    set /a END_S=%%c
    set /a END_MS=%%d
)

REM Calculate duration in seconds
set /a START_TOTAL_SEC=(%START_H%*3600)+(%START_M%*60)+%START_S%
set /a END_TOTAL_SEC=(%END_H%*3600)+(%END_M%*60)+%END_S%
set /a DURATION=%END_TOTAL_SEC%-%START_TOTAL_SEC%

REM Handle negative duration (midnight crossing)
if %DURATION% lss 0 set /a DURATION+=86400

REM Calculate minutes and seconds
set /a MINUTES=%DURATION%/60
set /a SECONDS=%DURATION%%%60

echo ============================================
echo Environment configuration complete!
echo Total execution time: %DURATION% seconds (%MINUTES%m %SECONDS%s)
echo ============================================
