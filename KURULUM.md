# 🍽️ Webyaz Restaurant Otomasyon Sistemi

## Kurulum Talimatları

### 1. Gereksinimler

Bilgisayarınıza **Node.js** kurulu olmalıdır.

📥 İndirin: https://nodejs.org (LTS sürümünü seçin)

Kurulum sırasında tüm seçenekleri varsayılan bırakın, **"Next"** diyerek ilerleyin.

---

### 2. Kurulum

1. ZIP dosyasını bilgisayarınızda istediğiniz bir klasöre çıkartın
2. Klasörü açın, adres çubuğuna `cmd` yazıp Enter'a basın
3. Açılan siyah ekrana şu komutu yazın:

```
npm install
```

⏳ Bu işlem 1-2 dakika sürebilir, internet gereklidir.

---

### 3. Çalıştırma

Aynı siyah ekrana şu komutu yazın:

```
node server.js
```

Ekranda şu yazıyı gördüğünüzde sistem hazırdır:

```
🌐 http://localhost:3000
```

---

### 4. Tarayıcıdan Açma

Tarayıcınızı açın (Chrome önerilir) ve adres çubuğuna yazın:

```
http://localhost:3000
```

---

### 5. Lisans Aktivasyonu

- İlk açılışta **Lisans Anahtarı** girmeniz istenecektir
- Satın alma sonrası email ile gelen **WR-XXXX-XXXX-XXXX** formatındaki anahtarı girin
- Lisans doğrulandıktan sonra kurulum sihirbazı açılacaktır

---

### 6. İlk Kurulum

Kurulum sihirbazında:
1. **Restoran adı, telefon, adres** bilgilerinizi girin
2. İsterseniz **logo** yükleyin
3. **Tema rengi** seçin
4. "Kurulumu Tamamla" butonuna basın

---

### 7. Varsayılan Kullanıcılar

| Kullanıcı | Şifre      | Rol          |
|-----------|------------|--------------|
| admin     | admin123   | Yönetici     |
| kasa      | kasa123    | Kasacı       |
| mutfak    | mutfak123  | Mutfak       |
| garson    | garson123  | Garson       |
| paket     | paket123   | Paket Servis |

> ⚠️ **Önemli:** İlk girişten sonra şifreleri mutlaka değiştirin!

---

### 8. Ekranlar

| Adres              | Açıklama                    |
|--------------------|-----------------------------|
| /admin             | Yönetim Paneli              |
| /cashier           | Kasa Ekranı                 |
| /kitchen           | Mutfak Ekranı               |
| /order/1           | Sipariş Alma (Masa No: 1)  |
| /delivery          | Paket Takip Paneli          |

---

### 9. Bilgisayar Açıldığında Otomatik Başlatma (Opsiyonel)

1. `Win + R` tuşlarına basın
2. `shell:startup` yazıp Enter'a basın
3. Açılan klasöre bir **Kısayol** oluşturun:
   - Sağ tık → Yeni → Kısayol
   - Konum: `cmd /k cd /d "C:\webyaz-restaurant" && node server.js`
   - İsim: Webyaz Restaurant

---

### 10. Ağdaki Diğer Cihazlardan Erişim

Aynı Wi-Fi/ağdaki tablet, telefon veya bilgisayarlardan erişmek için:

1. `Win + R` → `cmd` → `ipconfig` yazın
2. **IPv4 Adresi**'ni bulun (örn: `192.168.1.50`)
3. Diğer cihazdan tarayıcıya yazın: `http://192.168.1.50:3000`

---

### Destek

📧 Email: info@webyaz.com.tr
🌐 Web: https://webyaz.com.tr

---

*Webyaz Restaurant Otomasyon Sistemi — webyaz.com.tr*
