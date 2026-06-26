@echo off
setlocal EnableDelayedExpansion
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend\backend"
set "SPRING_PROFILES_ACTIVE=local"
set "JWT_SECRET=verdida-local-jwt-secret"

pushd "%BACKEND_DIR%"
set "CLASSPATH=target\classes"
for %%f in ("target\boot-libs\*.jar") do set "CLASSPATH=!CLASSPATH!;%%~ff"
java -cp "%CLASSPATH%" sports.apparel.backend.BackendApplication
popd
