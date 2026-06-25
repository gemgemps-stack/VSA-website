@echo off

setlocal EnableDelayedExpansion

rem Always resolve paths from this script, not the current terminal directory.
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend\backend"

rem Local defaults so the app runs without manual environment setup.
if not defined SPRING_PROFILES_ACTIVE set "SPRING_PROFILES_ACTIVE=local"
if not defined JWT_SECRET set "JWT_SECRET=verdida-local-jwt-secret"

rem Clear port 8080 if it is already in use.
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080"') do taskkill /F /PID %%a 2>nul

pushd "%BACKEND_DIR%" || exit /b 1
if not exist "target\classes" (
    echo Compiled classes were not found in target\classes.
    echo Build the backend once from the IDE before using this launcher.
    popd
    exit /b 1
)

if not exist "target\boot-libs" (
    mkdir "target\boot-libs"
)

if not exist "target\boot-libs\.ready" (
    if exist "target\BOOT-INF" rmdir /s /q "target\BOOT-INF"
    pushd "target"
    jar xf "backend-0.0.1-SNAPSHOT.jar" BOOT-INF\lib\
    popd
    if exist "target\BOOT-INF\lib" (
        move /y "target\BOOT-INF\lib\*.jar" "target\boot-libs\" >nul
        rmdir /s /q "target\BOOT-INF"
    )
    type nul > "target\boot-libs\.ready"
)

set "CLASSPATH=target\classes"
for %%f in ("target\boot-libs\*.jar") do set "CLASSPATH=!CLASSPATH!;%%~ff"

java -cp "%CLASSPATH%" sports.apparel.backend.BackendApplication
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
