# 🍽️ Webyaz Restaurant Otomasyon Sistemi

## Kurulum Rehberi

Profesyonel restoran sipariş yönetim sistemi. Gerçek zamanlı sipariş akışı, mutfak ekranı, kasa yönetimi ve paket servis desteği.

---

## 📋 Gereksinimler

| Gereksinim | Minimum Versiyon | İndirme Linki |
|------------|-----------------|---------------|
| **Node.js** | v16 veya üstü | [nodejs.org](https://nodejs.org/) |
| **npm** | v8 veya üstü | Node.js ile birlikte gelir |

> **Not:** Python veya C++ derleme araçları gerekmez. Tüm bağımlılıklar saf JavaScript'tir.

---

## 🚀 Kurulum Adımları

### 1. Node.js Kurulumu

Node.js'in bilgisayarınızda kurulu olup olmadığını kontrol edin:

```bash
node --version
npm --version
```

Eğer kurulu değilse [nodejs.org](https://nodejs.org/) adresinden LTS sürümünü indirip kurun.

### 2. Proje Dosyalarını Hazırlayın

Proje dosyalarını bilgisayarınıza kopyalayın veya zip dosyasını açın.

```bash
cd webyaz-restaurant
```

### 3. Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut aşağıdaki paketleri otomatik olarak yükler:
- **express** — Web sunucusu
- **socket.io** — Gerçek zamanlı iletişim
- **sql.js** — SQLite veritabanı (dosya tabanlı)
- **multer** — Görsel yükleme

### 4. Sunucuyu Başlatın

```bash
npm start
```

veya

```bash
node server.js
```

Başarılı bir şekilde başladığında şu çıktıyı göreceksiniz:

```
╔══════════════════════════════════════════════════════╗
║     🍽️  Webyaz Restaurant Otomasyon Sistemi          ║
╠══════════════════════════════════════════════════════╣
║  🌐 Sunucu:      http://localhost:3000               ║
║  👨‍💼 Admin:       http://localhost:3000/admin         ║
║  📱 Sipariş:     http://localhost:3000/order/1       ║
║  📦 Paket Servis: http://localhost:3000/delivery     ║
║  👨‍🍳 Mutfak:      http://localhost:3000/kitchen       ║
║  💰 Kasa:        http://localhost:3000/cashier       ║
╚══════════════════════════════════════════════════════╝
```

---

## 🖥️ Ekranlar ve Kullanım

### 1. 👨‍💼 Yönetim Paneli — `/admin`

Ana yönetim ekranıdır. Buradan tüm sistemi kontrol edersiniz.

**Özellikler:**
- **Gösterge Paneli** — Günlük ciro, sipariş sayısı, aktif sipariş ve dolu masa istatistikleri
- **Kategoriler** — Menü kategorilerini ekleyin, düzenleyin (ikon, sıralama)
- **Ürünler** — Ürün ekle/düzenle (fiyat, açıklama, kategori, hazırlık süresi, görsel)
- **Masalar** — Masa ekle/düzenle (isim, kapasite, kat/bölge)
- **Siparişler** — Tüm siparişleri listeleyin, durumlarını güncelleyin

### 2. 📱 Sipariş Ekranı — `/order/:masaId`

Müşterilerin sipariş verdiği ekrandır. Her masa için farklı URL kullanılır.

**Kullanım:**
1. Tarayıcıda `http://localhost:3000/order/1` adresini açın (1 = masa numarası)
2. Menüden ürünleri seçip sepete ekleyin
3. Sepet ikonuna tıklayın
4. "Sipariş Ver" butonuna basın
5. Ad Soyad ve Telefon bilgilerini girin
6. "Siparişi Onayla" butonuna basın

**QR Kod İpucu:** Her masaya QR kod yerleştirin. QR kod, `http://SUNUCU_IP:3000/order/MASA_ID` adresine yönlendirsin.

### 3. 📦 Paket Servis — `/delivery`

Paket servis ve gel-al siparişleri için özel ekrandır.

**Özellikler:**
- **Adrese Teslim** — Müşteri adresi zorunlu, kurye ile teslimat
- **Gel-Al** — Müşteri gelip alır, adres gerekmez
- Üstteki butonlarla "🚀 Adrese Teslim" veya "🥡 Gel-Al" seçilir
- Sipariş otomatik olarak mutfak ve kasa ekranına düşer

### 4. 👨‍🍳 Mutfak Ekranı — `/kitchen`

Mutfak personeli için sipariş takip ekranıdır.

**Sipariş Durumları:**
1. 🟡 **Beklemede** → "Hazırlamaya Başla" butonuna basın
2. 🔵 **Hazırlanıyor** → Yemek hazır olduğunda "Hazır" butonuna basın
3. 🟢 **Hazır** → Servis yapıldığında "Teslim Edildi" butonuna basın

**Paket Siparişler:**
- 📦 **PAKET SERVİS** ve 🥡 **GEL-AL** etiketleriyle vurgulanır
- Teslimat adresi sipariş kartında görünür
- Turuncu parıltı efekti ile ayırt edilir

**Özellikler:**
- Geçen süre takibi (15 dk sonra sarı, 30 dk sonra kırmızı uyarı)
- Sesli bildirim (yeni sipariş geldiğinde)
- Gerçek zamanlı güncelleme

### 5. 💰 Kasa Ekranı — `/cashier`

Hesap yönetimi ve ödeme alma ekranıdır.

**Masalar:**
- 🟢 Yeşil kenarlık = Boş masa
- 🔴 Kırmızı kenarlık = Dolu masa
- 🟠 Turuncu kenarlık = Paket servis

**Ödeme:**
1. Masaya veya paket siparişe tıklayın
2. Sağ panelde sipariş detayını görün
3. "Nakit" veya "Kredi Kartı" ile ödeme alın
4. "Yazdır" ile adisyon çıktısı alın

---

## 🌐 Ağ Üzerinde Erişim

Aynı ağdaki diğer cihazlardan (tablet, telefon) erişmek için:

### Windows'ta IP Adresinizi Bulun:

```bash
ipconfig
```

"IPv4 Address" satırını not alın (Örn: `192.168.1.100`)

### Diğer Cihazlardan Erişim:

Tarayıcıda `http://192.168.1.100:3000/order/1` yazın.

### Güvenlik Duvarı Ayarı:

Windows güvenlik duvarında 3000 portunu açmanız gerekebilir:

```bash
netsh advfirewall firewall add rule name="Webyaz Restaurant" dir=in action=allow protocol=TCP localport=3000
```

---

## 📱 QR Kod Kurulumu

Her masa için QR kod oluşturun:

1. [qr-code-generator.com](https://www.qr-code-generator.com/) gibi bir siteye gidin
2. URL olarak `http://SUNUCU_IP:3000/order/MASA_ID` girin
3. QR kodu yazdırıp masaya yerleştirin

**Örnek URL'ler:**
- Masa 1: `http://192.168.1.100:3000/order/1`
- Masa 2: `http://192.168.1.100:3000/order/2`
- Paket: `http://192.168.1.100:3000/delivery`

---

## ⚙️ Yapılandırma

### Port Değiştirme

Varsayılan port 3000'dir. Değiştirmek için:

```bash
PORT=8080 node server.js
```

### Veritabanı Sıfırlama

Tüm verileri silip sıfırdan başlamak için:

```bash
del database\restaurant.db
node server.js
```

Sunucu yeniden başladığında örnek veriler otomatik olarak yüklenir.

### Arka Planda Çalıştırma (PM2)

Sunucunun sürekli çalışması için PM2 kullanın:

```bash
npm install -g pm2
pm2 start server.js --name "webyaz-restaurant"
pm2 startup   # Bilgisayar açılışında otomatik başlatma
pm2 save      # Ayarları kaydet
```

**PM2 Komutları:**
- `pm2 status` — Durumu görüntüle
- `pm2 restart webyaz-restaurant` — Yeniden başlat
- `pm2 logs webyaz-restaurant` — Logları izle
- `pm2 stop webyaz-restaurant` — Durdur

---

## 📁 Dosya Yapısı

```
webyaz-restaurant/
├── server.js                 # Ana sunucu
├── package.json              # Proje tanımı
├── database/
│   ├── init.js               # Veritabanı başlatma
│   └── restaurant.db         # Veritabanı dosyası (otomatik oluşur)
├── routes/
│   ├── api.js                # REST API
│   └── upload.js             # Görsel yükleme
├── public/
│   ├── admin.html            # Yönetim paneli
│   ├── order.html            # Sipariş ekranı
│   ├── delivery.html         # Paket servis
│   ├── kitchen.html          # Mutfak ekranı
│   ├── cashier.html          # Kasa ekranı
│   ├── css/                  # Stil dosyaları
│   └── js/                   # JavaScript dosyaları
└── uploads/                  # Ürün görselleri
```

---

## 🔧 Sorun Giderme

### "node" komutu bulunamıyor
→ Node.js kurulu değil. [nodejs.org](https://nodejs.org/) adresinden indirin.

### Port 3000 kullanılıyor hatası
→ Başka bir uygulama 3000 portunu kullanıyor. `PORT=3001 node server.js` ile farklı port deneyin.

### Sipariş mutfağa düşmüyor
→ Tarayıcı konsolunu kontrol edin. Socket.IO bağlantısı kesilmiş olabilir. Sayfayı yenileyin.

### Diğer cihazlardan erişilemiyor
→ Güvenlik duvarı 3000 portunu engelliyor olabilir. Yukarıdaki güvenlik duvarı komutunu çalıştırın.

### Veritabanı bozuldu
→ `database/restaurant.db` dosyasını silip sunucuyu yeniden başlatın.

---

## 📞 Destek

Sorun veya önerileriniz için: **Webyaz Yazılım**

---

*Webyaz Restaurant Otomasyon Sistemi v1.0 — © 2026 Webyaz*
