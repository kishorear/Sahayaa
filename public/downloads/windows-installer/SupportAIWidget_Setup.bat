@echo off
echo ====================================================
echo      SupportAI Chat Widget Installation Wizard
echo ====================================================
echo.
echo Welcome to the SupportAI Chat Widget Installation Wizard.
echo This will install the SupportAI Chat Widget on your computer.
echo.
echo This installer is compatible with Windows 10 and Windows 11.
echo.
echo Press any key to continue...
pause > nul

echo.
echo Creating installation directory...
if not exist "%PROGRAMFILES%\SupportAI" mkdir "%PROGRAMFILES%\SupportAI"
if not exist "%PROGRAMFILES%\SupportAI\ChatWidget" mkdir "%PROGRAMFILES%\SupportAI\ChatWidget"

echo.
echo Copying files...
:: In the real version, this would copy all necessary files
echo var supportAiConfig = {> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   tenantId: 1,>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   apiKey: "YOUR_API_KEY",>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   primaryColor: "#6366F1",>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   position: "right",>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   autoOpen: false,>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo   branding: true,>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"
echo };>> "%PROGRAMFILES%\SupportAI\ChatWidget\widget.js"

echo.
echo Creating shortcuts...
echo @echo off> "%PROGRAMFILES%\SupportAI\ChatWidget\SupportAIWidget.bat"
echo start "" "https://supportai.com/widget-manager">> "%PROGRAMFILES%\SupportAI\ChatWidget\SupportAIWidget.bat"

echo.
echo Creating desktop shortcut...
echo Set oWS = WScript.CreateObject("WScript.Shell")> CreateShortcut.vbs
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\SupportAI Widget.lnk">> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile)>> CreateShortcut.vbs
echo oLink.TargetPath = "%PROGRAMFILES%\SupportAI\ChatWidget\SupportAIWidget.bat">> CreateShortcut.vbs
echo oLink.Description = "SupportAI Chat Widget">> CreateShortcut.vbs
echo oLink.Save>> CreateShortcut.vbs
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo Adding to Start Menu...
if not exist "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SupportAI" mkdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SupportAI"
echo Set oWS = WScript.CreateObject("WScript.Shell")> CreateStartMenuShortcut.vbs
echo sLinkFile = "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SupportAI\SupportAI Widget.lnk">> CreateStartMenuShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile)>> CreateStartMenuShortcut.vbs
echo oLink.TargetPath = "%PROGRAMFILES%\SupportAI\ChatWidget\SupportAIWidget.bat">> CreateStartMenuShortcut.vbs
echo oLink.Description = "SupportAI Chat Widget">> CreateStartMenuShortcut.vbs
echo oLink.Save>> CreateStartMenuShortcut.vbs
cscript //nologo CreateStartMenuShortcut.vbs
del CreateStartMenuShortcut.vbs

echo.
echo Creating uninstaller...
echo @echo off> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo echo Uninstalling SupportAI Chat Widget...>> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo del "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SupportAI\SupportAI Widget.lnk">> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo rmdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\SupportAI">> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo del "%USERPROFILE%\Desktop\SupportAI Widget.lnk">> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo rmdir /s /q "%PROGRAMFILES%\SupportAI\ChatWidget">> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo rmdir "%PROGRAMFILES%\SupportAI">> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo echo Uninstallation complete.>> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"
echo pause>> "%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat"

echo.
echo Adding uninstaller to Control Panel...
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SupportAIWidget" /v "DisplayName" /t REG_SZ /d "SupportAI Chat Widget" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SupportAIWidget" /v "UninstallString" /t REG_SZ /d "\"%PROGRAMFILES%\SupportAI\ChatWidget\uninstall.bat\"" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SupportAIWidget" /v "Publisher" /t REG_SZ /d "SupportAI, Inc." /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SupportAIWidget" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\SupportAIWidget" /v "DisplayIcon" /t REG_SZ /d "%PROGRAMFILES%\SupportAI\ChatWidget\icon.ico" /f

echo.
echo ====================================================
echo      Installation Complete!
echo ====================================================
echo.
echo SupportAI Chat Widget has been successfully installed.
echo.
echo You can find the application in your Start Menu and on your Desktop.
echo.
echo Press any key to exit the installer...
pause > nul
