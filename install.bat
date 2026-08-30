@echo off
    setlocal

    echo Node.js kontrol ediliyor...
    where node >nul 2>nul
    if errorlevel 1 (
    echo Node.js bulunamadi. Node.js 18 veya daha yeni bir surum kurun.
    pause
    exit /b 1
    )

    where npm >nul 2>nul
    if errorlevel 1 (
    echo npm bulunamadi. Node.js kurulumu ile birlikte npm de kurulmalidir.
    pause
    exit /b 1
    )

    echo Bagimliliklar kuruluyor...
    npm install

    if not exist .env (
    copy /Y .env.example .env >nul
    echo .env dosyasi olusturuldu. Icına DISCORD_TOKEN degerini ekleyin.
    ) else (
    echo .env dosyasi zaten mevcut, korunuyor.
    )

    echo Kurulum tamamlandi. Baslatmak icin start.bat dosyasini calistirin.
    pause
    