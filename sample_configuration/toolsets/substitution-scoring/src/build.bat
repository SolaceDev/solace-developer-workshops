@echo off
setlocal
if "%SAM_TOOL_BUILD_OUT%"=="" (set OUT_DIR=dist) else (set OUT_DIR=%SAM_TOOL_BUILD_OUT%)
if "%SAM_TOOL_NAME%"=="" (set NAME=substitution-scoring) else (set NAME=%SAM_TOOL_NAME%)
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"
set CGO_ENABLED=0
go build -o "%OUT_DIR%\%NAME%.exe" .
if errorlevel 1 exit /b 1
copy /Y manifest.yaml "%OUT_DIR%\manifest.yaml"
