@echo off
    setlocal

    if not exist node_modules (
    echo Bagimliliklar bulunamadi, once install.bat calistiriliyor...
    call install.bat
    if errorlevel 1 exit /b 1
    )

    npm start
    pause
    