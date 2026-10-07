@echo off
REM Windows build script. See build.sh for the Mac/Linux equivalent.
REM Cross-compiles to SAM_TOOL_TARGET_OS / SAM_TOOL_TARGET_ARCH. The arch
REM is a property of the deployment, not this toolset, so it is never
REM defaulted: sam config apply discovers it from the target platform and
REM exports it. For a manual build, set both env vars first.
setlocal
if "%SAM_TOOL_BUILD_OUT%"=="" set SAM_TOOL_BUILD_OUT=dist
if "%SAM_TOOL_NAME%"=="" set SAM_TOOL_NAME=travel-planner
if "%SAM_TOOL_TARGET_OS%"=="" ( echo SAM_TOOL_TARGET_OS must be set by sam config apply, or exported for a manual build ^(e.g. linux^) 1>&2 & exit /b 1 )
if "%SAM_TOOL_TARGET_ARCH%"=="" ( echo SAM_TOOL_TARGET_ARCH must be set by sam config apply, or exported for a manual build ^(e.g. amd64^) 1>&2 & exit /b 1 )

if not exist "%SAM_TOOL_BUILD_OUT%" mkdir "%SAM_TOOL_BUILD_OUT%"
set CGO_ENABLED=0
set GOOS=%SAM_TOOL_TARGET_OS%
set GOARCH=%SAM_TOOL_TARGET_ARCH%

REM Output name has no .exe suffix because the STR runtime is linux by
REM default; an override targeting GOOS=windows can rename the dropped
REM binary as needed.
go build -o "%SAM_TOOL_BUILD_OUT%\%SAM_TOOL_NAME%" .
if errorlevel 1 exit /b %errorlevel%

copy /Y manifest.yaml "%SAM_TOOL_BUILD_OUT%\manifest.yaml" >nul
