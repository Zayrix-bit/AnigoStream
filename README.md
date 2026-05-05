
# 🎬 AnigoStream - Premium Anime Engine & Scraper

A high-performance, **reverse-engineered** anime scraping engine, REST API, and Premium Frontend for **Anigo.to**. This project features advanced decryption logic to bypass Cloudflare security, resolve direct M3U8 streaming links and iframe, and includes an intelligent auto-fallback frontend player.

<img width="536" height="211" alt="Screenshot 2026-05-03 165241" src="https://github.com/user-attachments/assets/5a35c33e-d8bf-4e0f-b91b-868fe49076cf" />


---


https://github.com/user-attachments/assets/fa111952-7337-4b35-bf75-1cc5a7aec039




---

## ✨ Key Features

- **🚀 Cloudflare Bypass:** Built with `curl_cffi` to seamlessly emulate browser signatures and bypass strict 403 Forbidden/Cloudflare blocks.
- **⚡ Smart Server Fallback:** The premium UI automatically tests server links (Megacloud / Vidstream) and instantly skips dead links (404s).
- **🌐 Dual-Language UI:** Seamless toggle between **SUB** and **DUB** via intelligent UI buttons that automatically disable if a track is unavailable.
- **🛡️ Direct M3U8 Resolution:** Reverse-engineered decryption logic (`Kai` and `Mega` algorithms) to extract raw video sources from external providers.
- **📱 Premium Glassmorphism UI:** Complete frontend included with a dynamic Hero Banner, interactive Server Selector, and cinematic video player.
- **🧠 Advanced Caching:** Persistent JSON-based cache (`cache_anigo_bypass.json`) with configurable TTL for ultra-fast 0ms response times.
- **🔎 Fuzzy Search Support:** Frontend search now supports typo-tolerant matching and approximate title discovery.
- **🧱 Request Guardrails:** Built-in per-IP rate limiting and stricter request controls to reduce free-tier hosting overuse.
- **🪙 Token Memoization:** Encode/decode token responses are cached to avoid repeated upstream encryption/decryption calls.

---

## 🛠️ Technology Stack

- **Backend Framework:** Python 3.x, Flask (REST API)
- **Scraping Engine:** BeautifulSoup4, `curl_cffi` (Impersonation Engine)
- **Security Logic:** Custom Decryption Layer (AES-based reverse engineering)
- **Frontend Stack:** HTML5, CSS3 (Vanilla Glassmorphism), Vanilla JavaScript, Native Iframe Embeds

---

---

## 🚀 Quick Start

### 1-Click Startup (Recommended)
Double-click **`run_anigo.bat`**. This will automatically handle dependency checks, start the API (Port 5002), start the Web Server (Port 8000), and open your browser.

### Manual Terminal Startup
If you prefer running via terminal, open two separate windows:

**Window 1: Backend API**
```bash
python anigo_bypass_scraper.py
```

**Window 2: Frontend UI**
```bash
cd anigo_web
python -m http.server 8000
```
*Access the app at `http://localhost:8000`*

---

To install dependencies manually:
```bash
pip install -r requirements_anigo.txt
```

---

## ⚙️ Runtime Controls (Important for Free Tier Hosts)

`anigo_bypass_scraper.py` now includes safer defaults for limited hosting plans (Render/free VPS-style limits):

- `PREFETCH_ENABLED = False` (avoids background burst requests)
- `RATE_LIMIT_MAX_REQUESTS = 60` per `60s` per IP
- Increased endpoint cache TTL for episodes/servers/source
- Token-level cache for enc/dec API calls

### Optional Debug Mode
By default backend starts without Flask debug reloader.
Set env var to enable debug:

```bash
ANIGO_DEBUG=true
python anigo_bypass_scraper.py
```

---

## 🚀 API Endpoints (Port 5002)

### 🏠 API Root
> **GET** `/`  
> Health check and version metadata.
```http
http://localhost:5002/
```

### 📺 Home Dashboard
> **GET** `/api/home`  
> Returns latest updates and trending anime straight from the Anigo homepage.
```http
http://localhost:5002/api/home
```

### 🔍 Global Search
> **GET** `/api/search?keyword={query}`  
> Search for any anime with detailed stats.
```http
http://localhost:5002/api/search?keyword=jujutsu
```

### 📜 Episode List
> **GET** `/api/episodes/{ani_id}`  
> Full list of episodes with secure tokens.
```http
http://localhost:5002/api/episodes/12345
```

### 🖥️ Server List
> **GET** `/api/servers/{ep_token}`  
> Lists available stream links (Server 1, Server 2) and language support flags.
```http
http://localhost:5002/api/servers/xyzToken123
```

### ⚡ Direct Resolver
> **GET** `/api/source/{link_id}`  
> **The Core Resolver:** Decrypts and returns direct M3U8 links & skip-times from providers like Megacloud and Vidstream.
```http
http://localhost:5002/api/source/abcLinkId789
```

---

## 🎨 UI Architecture (`anigo_web`)

The project includes a standalone modular frontend:
- **`app.js`**: Core state management, routing (Search -> Watch), real-time search, fuzzy fallback, and intelligent Server Fallback logic (`playServer()`).
- **`style.css`**: Advanced UI styling featuring compact anime cards, animated buttons, custom scrollbars, premium layout spacing, and responsive watch/search views.
- **`index.html`**: Clean semantic HTML structure using modular `<section>` views.

---

*Engineered with precision to ensure stable, ad-free streaming.*
