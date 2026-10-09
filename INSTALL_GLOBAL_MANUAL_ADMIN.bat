@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Hanover repo - Global Swim Top10 Manual Admin Installer
echo ============================================================
echo.

set "MANAGER_ROOT=%~dp0..\..\.."
for %%I in ("%MANAGER_ROOT%") do set "MANAGER_ROOT=%%~fI"

if not exist "%MANAGER_ROOT%\manage_top10.py" (
  echo ERROR: Could not find Swim_Top10_Manager.
  echo Expected:
  echo   %MANAGER_ROOT%\manage_top10.py
  echo.
  echo This installer assumes this Hanover repo is located at:
  echo   Swim_Top10_Manager\clubs\HNVR\website
  pause
  exit /b 1
)

set "B64=%~dp0manager_hotfix\SwimTop10_Global_Manual_Legacy_Admin_Hotfix.zip.b64"
set "ZIP=%TEMP%\SwimTop10_Global_Manual_Legacy_Admin_Hotfix.zip"

if not exist "%B64%" (
  echo ERROR: Hotfix payload missing:
  echo   %B64%
  pause
  exit /b 1
)

echo [1/4] Reconstructing hotfix ZIP...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$b64=[IO.File]::ReadAllText('%B64%'); [IO.File]::WriteAllBytes('%ZIP%', [Convert]::FromBase64String($b64))"
if errorlevel 1 (
  echo ERROR reconstructing hotfix ZIP.
  pause
  exit /b 1
)

echo [2/4] Extracting to:
echo   %MANAGER_ROOT%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%MANAGER_ROOT%' -Force"
if errorlevel 1 (
  echo ERROR extracting hotfix ZIP.
  pause
  exit /b 1
)

echo [3/4] Moving manual admin away from Phoenix Picks port 8765...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$files=@('%MANAGER_ROOT%\_HOTFIX_PAYLOAD\manual_admin.py','%MANAGER_ROOT%\manual_admin.py'); foreach($p in $files){ if(Test-Path $p){ $s=[IO.File]::ReadAllText($p); $s=$s.Replace('PORT = 8765','PORT = 8877'); [IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false)) } }"
if errorlevel 1 (
  echo ERROR updating manual admin port.
  pause
  exit /b 1
)

echo [4/4] Applying global hotfix...
call "%MANAGER_ROOT%\APPLY_MANUAL_RECORDS_HOTFIX.bat"

rem APPLY copies the payload over manual_admin.py, so verify the final file too.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='%MANAGER_ROOT%\manual_admin.py'; if(Test-Path $p){ $s=[IO.File]::ReadAllText($p); $s=$s.Replace('PORT = 8765','PORT = 8877'); [IO.File]::WriteAllText($p,$s,[Text.UTF8Encoding]::new($false)) }"

del /q "%ZIP%" >nul 2>&1

echo.
echo Finished.
echo Manual Records Admin now uses:
echo   http://127.0.0.1:8877/
echo.
pause
