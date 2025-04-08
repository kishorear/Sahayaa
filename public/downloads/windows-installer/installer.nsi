; SupportAI Widget Windows Installer Script
; NSIS (Nullsoft Scriptable Install System) script

; Define constants
!define PRODUCT_NAME "SupportAI Widget"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "SupportAI"
!define PRODUCT_WEB_SITE "https://supportai.com"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\SupportAIWidget.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; Include required files
!include "MUI2.nsh"
!include "LogicLib.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "welcome.bmp"

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; License page
!insertmacro MUI_PAGE_LICENSE "license.txt"
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Components page
!insertmacro MUI_PAGE_COMPONENTS
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\SupportAIWidget.exe"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Language files
!insertmacro MUI_LANGUAGE "English"

; Reserve files
!insertmacro MUI_RESERVEFILE_INSTALLOPTIONS

; Installer attributes
Name "${PRODUCT_NAME}"
OutFile "SupportAIWidget_Setup.exe"
InstallDir "$PROGRAMFILES\SupportAI Widget"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

; Install main application
Section "SupportAI Widget" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite try
  File "SupportAIWidget.exe"
  File "widget.js"
  File "supportai.dll"
  File "config.json"
  
  ; Create program folder and shortcuts
  CreateDirectory "$SMPROGRAMS\SupportAI Widget"
  CreateShortCut "$SMPROGRAMS\SupportAI Widget\SupportAI Widget.lnk" "$INSTDIR\SupportAIWidget.exe"
  CreateShortCut "$DESKTOP\SupportAI Widget.lnk" "$INSTDIR\SupportAIWidget.exe"
  
  ; Register application
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\SupportAIWidget.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\SupportAIWidget.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Install browser integration
Section "Browser Integration" SEC02
  SetOutPath "$INSTDIR\browser"
  File /r "browser\*.*"
  
  ; Add registry keys for browser detection
  WriteRegStr HKLM "Software\SupportAI\Widget" "BrowserIntegration" "1"
SectionEnd

; Install documentation
Section "Documentation" SEC03
  SetOutPath "$INSTDIR\docs"
  File /r "docs\*.*"
  
  CreateShortCut "$SMPROGRAMS\SupportAI Widget\Documentation.lnk" "$INSTDIR\docs\index.html"
SectionEnd

; Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC01} "Core SupportAI Widget application."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC02} "Integration with web browsers to embed the widget on websites."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC03} "Documentation and help files."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Uninstaller section
Section Uninstall
  ; Remove application files
  Delete "$INSTDIR\SupportAIWidget.exe"
  Delete "$INSTDIR\widget.js"
  Delete "$INSTDIR\supportai.dll"
  Delete "$INSTDIR\config.json"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\SupportAI Widget\SupportAI Widget.lnk"
  Delete "$DESKTOP\SupportAI Widget.lnk"
  Delete "$SMPROGRAMS\SupportAI Widget\Documentation.lnk"
  
  ; Remove directories
  RMDir /r "$SMPROGRAMS\SupportAI Widget"
  RMDir /r "$INSTDIR\browser"
  RMDir /r "$INSTDIR\docs"
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  DeleteRegKey HKLM "Software\SupportAI\Widget"
  
  SetAutoClose true
SectionEnd

; Initialization function
Function .onInit
  ; Check if already installed
  ReadRegStr $R0 ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString"
  ${If} $R0 != ""
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "${PRODUCT_NAME} is already installed. $\n$\nClick 'OK' to remove the previous version or 'Cancel' to cancel this installation." \
      IDOK uninst
    Abort
    
  uninst:
    ; Run the uninstaller
    ClearErrors
    ExecWait '$R0 _?=$INSTDIR'
  ${EndIf}
FunctionEnd
