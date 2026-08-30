# Troll Room Bot

    Discord sunucularında kullanıcıların menüden rol alıp bırakmasını sağlayan rol menüsü botu.

    ## Kurulum

    ### Linux, Codespaces veya macOS

    ```bash
    bash ./install.sh
    ```

    ### Windows

    ```text
    install.bat
    ```

    Kurulumdan sonra oluşan .env dosyasını açıp bot tokenını ekleyin:

    ```env
    DISCORD_TOKEN=bot_tokeniniz
    ```

    Tokenı GitHub'a yüklemeyin.

    ## Başlatma

    ### Linux, Codespaces veya macOS

    ```bash
    bash ./start.sh
    ```

    ### Windows

    ```text
    start.bat
    ```

    Alternatif olarak doğrudan çalıştırabilirsiniz:

    ```bash
    npm start
    ```

    ## Discord ayarları

    Developer Portal içindeki **Bot** sayfasında şu ayarları açın:

    - **Server Members Intent**
    - **Message Content Intent**

    **Presence Intent** gerekli değildir.

    Botun rolü, vereceği rollerin üstünde olmalıdır. Botta en az şu izinler bulunmalıdır:

    - Rolleri Yönet
    - Kanalları Görüntüle
    - Mesaj Gönder
    - Mesaj Geçmişini Oku

    Test için botun rolüne **Yönetici** de verebilirsiniz; fakat rol sıralaması kuralı yine geçerlidir.

    ## Komutlar

    ```text
    !help
    !rolmenu-ayarla #rol-menusu
    !rol-ekle @Rol 🎉 Rol açıklaması
    !rol-sil @Rol
    !rolmenu-yenile
    !admin-rol-ekle @Yetkili
    !admin-rol-kaldir @Yetkili
    ```

    Rol menüsü oluşturulduktan sonra yetkili kişiler menüdeki **Yönetici: menüye rol ekle** alanından doğrudan bir Discord rolü seçebilir.

    ## Veri kaydı

    Sunucu ayarları data/role-menu.json dosyasında tutulur. Geçici dosya sistemi kullanan hosting servislerinde yeniden başlatma sonrası bu dosya silinebilir.
    