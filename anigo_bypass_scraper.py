import json as _json
import json
import time
import os
import re
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS
from curl_cffi import requests

# --- Cache Management ---
class CacheManager:
    def __init__(self, cache_file="cache_anigo_bypass.json"):
        self.cache_file = os.path.abspath(cache_file)
        self.cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_cache(self):
        try:
            with open(self.cache_file, "w") as f:
                json.dump(self.cache, f, indent=4)
        except Exception as e:
            print(f"Cache Save Error: {e}")

    def get(self, key):
        entry = self.cache.get(key)
        if entry:
            if time.time() < entry["expiry"]:
                return entry["data"]
            else:
                del self.cache[key]
                self._save_cache()
        return None

    def set(self, key, data, ttl_hours=2):
        expiry = time.time() + (ttl_hours * 3600)
        self.cache[key] = {"data": data, "expiry": expiry}
        self._save_cache()

cache_mgr = CacheManager()

app = Flask(__name__)
CORS(app)

# --- Configuration & Constants ---
ANIGO_URL = "https://anigo.to/"
ANIGO_HOME_URL = "https://anigo.to/home"

ENCDEC_URL = "https://enc-dec.app/api/enc-kai"
ENCDEC_DEC_KAI = "https://enc-dec.app/api/dec-kai"
ENCDEC_DEC_MEGA = "https://enc-dec.app/api/dec-mega"

BROWSER = "chrome110"
cf_session = requests.Session(impersonate=BROWSER)

# Warm up the session to get Cloudflare clearance
try:
    cf_session.get(ANIGO_HOME_URL, timeout=15)
except:
    pass

@app.after_request
def _finalize_io_v4(r):
    if r.is_json:
        try:
            d = r.get_json()
            if isinstance(d, dict):
                _new = {"Author": "Zayrix-bit", "Bypass": "Active"}
                _new.update(d)
                r.set_data(_json.dumps(_new, indent=4, ensure_ascii=False))
        except Exception:
            pass
    return r

AJAX_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://anigo.to/"
}

# --- Utility Functions ---
def encode_token(text):
    try:
        r = requests.get(ENCDEC_URL, params={"text": text}, timeout=15)
        if r.status_code == 200:
            return r.json().get("result")
    except:
        pass
    return None

def decode_token(text, mega=False):
    url = ENCDEC_DEC_MEGA if mega else ENCDEC_DEC_KAI
    try:
        r = requests.get(url, params={"text": text}, timeout=15)
        if r.status_code == 200:
            return r.json().get("result")
    except:
        pass
    return None

# --- Core Scraping Logic ---

def search_anime(keyword):
    try:
        response = cf_session.get(
            f"{ANIGO_URL.rstrip('/')}/browser", 
            params={"keyword": keyword}, 
            timeout=45
        )
        soup = BeautifulSoup(response.text, "html.parser")
        results = []
        
        for item in soup.select(".unit"):
            poster_a = item.select_one("a.poster")
            if not poster_a: continue
            
            href = poster_a.get("href", "")
            slug = href.replace("/watch/", "") if href.startswith("/watch/") else href
            
            poster_img = poster_a.select_one("img")
            poster = poster_img.get("src", "") if poster_img else ""
            
            title_tag = item.select_one("h6.title")
            title = ""
            if title_tag:
                x_data = title_tag.get("x-data", "")
                m = re.search(r'JTitle\(`([^`]+)`\)', x_data)
                if m:
                    title = m.group(1)
                else:
                    title = title_tag.text.strip()
            
            ani_id = ""
            ctrl_div = item.select_one(".ctrl button, button.ttipBtn")
            if ctrl_div:
                x_data = ctrl_div.get("x-data", "")
                m = re.search(r"Tooltip\('([^']+)'\)", x_data)
                if m:
                    ani_id = m.group(1)

            if title:
                results.append({
                    "title": title,
                    "slug": slug,
                    "ani_id": ani_id,
                    "url": f"{ANIGO_URL.rstrip('/')}{href}",
                    "poster": poster,
                })
        return results
    except Exception as e:
        return {"error": str(e)}

def home_anime():
    try:
        response = cf_session.get(
            f"{ANIGO_URL.rstrip('/')}/home", 
            timeout=45
        )
        soup = BeautifulSoup(response.text, "html.parser")
        results = []
        seen = set()
        
        for item in soup.select(".unit"):
            if "noti.url" in str(item): continue
            
            poster_a = item.select_one("a.poster")
            if not poster_a: continue
            
            href = poster_a.get("href", "")
            slug = href.replace("/watch/", "") if href.startswith("/watch/") else href
            
            poster_img = poster_a.select_one("img")
            poster = poster_img.get("src", "") if poster_img else ""
            
            title_tag = item.select_one("h6.title")
            title = ""
            if title_tag:
                x_data = title_tag.get("x-data", "")
                m = re.search(r'JTitle\(`([^`]+)`\)', x_data)
                if m:
                    title = m.group(1)
                else:
                    title = title_tag.text.strip()
            
            ani_id = ""
            ctrl_div = item.select_one(".ctrl button, button.ttipBtn")
            if ctrl_div:
                x_data = ctrl_div.get("x-data", "")
                m = re.search(r"Tooltip\('([^']+)'\)", x_data)
                if m:
                    ani_id = m.group(1)

            if title and ani_id and ani_id not in seen:
                seen.add(ani_id)
                results.append({
                    "title": title,
                    "slug": slug,
                    "ani_id": ani_id,
                    "url": f"{ANIGO_URL.rstrip('/')}{href}",
                    "poster": poster,
                })
        return results
    except Exception as e:
        return {"error": str(e)}

def get_episodes(ani_id):
    encoded_id = encode_token(ani_id)
    if not encoded_id:
        return {"error": "Failed to encrypt ani_id"}
    try:
        r = cf_session.get(
            f"{ANIGO_URL.rstrip('/')}/api/v1/titles/{ani_id}/episodes",
            params={"_": encoded_id},
            headers=AJAX_HEADERS,
            timeout=15
        )
        return r.json()
    except Exception as e:
        return {"error": str(e)}

def get_servers(ep_token):
    encoded_token = encode_token(ep_token)
    if not encoded_token:
        return {"error": "Failed to encrypt ep_token"}
    try:
        r = cf_session.get(
            f"{ANIGO_URL.rstrip('/')}/api/v1/eptokens/{ep_token}",
            params={"_": encoded_token},
            headers=AJAX_HEADERS,
            timeout=15
        )
        return r.json()
    except Exception as e:
        return {"error": str(e)}

def get_source(link_id):
    encoded_id = encode_token(link_id)
    if not encoded_id:
        return {"error": "Failed to encrypt link id"}
    try:
        r = cf_session.get(
            f"{ANIGO_URL.rstrip('/')}/api/v1/links/{link_id}",
            params={"_": encoded_id},
            headers=AJAX_HEADERS,
            timeout=15
        )
        data = r.json()
        if data.get("status") == "ok":
            encrypted_result = data.get("result")
            decoded_link = decode_token(encrypted_result)
            if not decoded_link:
                return {"error": "Failed to decode link result"}
            
            # decoded_link usually contains something like {'url': '...', 'skip': {...}}
            if isinstance(decoded_link, dict) and "url" in decoded_link:
                url = decoded_link["url"]
                # Resolve Kai/Mega
                vid_id = url.rstrip("/").split("/")[-1].split("?")[0]
                embed_base = url.rsplit("/e/", 1)[0] if "/e/" in url else url.rsplit("/", 1)[0]
                resolve_url = f"{embed_base}/media/{vid_id}"
                
                media_headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": url
                }
                
                # Establish session cookies for Cloudflare
                try:
                    cf_session.get(url, headers={"User-Agent": media_headers["User-Agent"]}, timeout=15)
                except:
                    pass
                
                source_req = cf_session.get(resolve_url, headers=media_headers, timeout=15)
                source_data = source_req.json()
                
                encrypted_media = source_data.get("result", "")
                if encrypted_media:
                    mega = "megacloud.tv" in url or "megaup.nl" in url or "megaup.live" in url
                    dec_sources = decode_token(encrypted_media, mega=mega)
                    if isinstance(dec_sources, dict):
                        source_data["sources"] = dec_sources.get("sources", [])
                        source_data["tracks"] = dec_sources.get("tracks", [])
                        source_data["download"] = dec_sources.get("download", "")
                    else:
                        source_data["sources"] = dec_sources
                
                return {
                    "success": True,
                    "link_id": link_id,
                    "provider": url,
                    "stream_data": source_data,
                    "skip_data": decoded_link.get("skip")
                }
            else:
                return {"error": "Invalid decrypted format", "decoded": decoded_link}
        return data
    except Exception as e:
        return {"error": str(e)}

# --- API Endpoints ---

@app.route("/", methods=["GET"])
def index():
    return jsonify({"success": True, "api": "Anigo Bypass API", "status": "Ready"})

@app.route("/api/search", methods=["GET"])
def api_search():
    kw = request.args.get("keyword", "").strip()
    if not kw: return jsonify({"error": "Keyword is required"}), 400
    cache_key = f"search_{kw}"
    cached = cache_mgr.get(cache_key)
    if cached: return jsonify({"success": True, "count": len(cached), "results": cached, "cached": True})

    res = search_anime(kw)
    if isinstance(res, dict) and "error" in res:
        return jsonify(res), 500
    
    cache_mgr.set(cache_key, res)
    return jsonify({"success": True, "count": len(res), "results": res})

@app.route("/api/episodes/<ani_id>", methods=["GET"])
def api_episodes(ani_id):
    cache_key = f"episodes_{ani_id}"
    cached = cache_mgr.get(cache_key)
    if cached: return jsonify({"success": True, "cached": True, "data": cached})
    
    res = get_episodes(ani_id)
    if isinstance(res, dict) and "error" in res:
        return jsonify(res), 500
    
    cache_mgr.set(cache_key, res)
    return jsonify({"success": True, "data": res})

@app.route("/api/servers/<ep_token>", methods=["GET"])
def api_servers(ep_token):
    cache_key = f"servers_{ep_token}"
    cached = cache_mgr.get(cache_key)
    if cached: return jsonify({"success": True, "cached": True, "data": cached})
    
    res = get_servers(ep_token)
    if isinstance(res, dict) and "error" in res:
        return jsonify(res), 500
    
    cache_mgr.set(cache_key, res)
    return jsonify({"success": True, "data": res})

@app.route("/api/source/<link_id>", methods=["GET"])
def api_source(link_id):
    cache_key = f"source_{link_id}"
    cached = cache_mgr.get(cache_key)
    if cached: return jsonify(cached)
    
    res = get_source(link_id)
    if isinstance(res, dict) and "error" in res:
        return jsonify(res), 500
    
    cache_mgr.set(cache_key, res)
    return jsonify(res)

@app.route("/api/home", methods=["GET"])
def api_home():
    cache_key = "home_latest"
    cached = cache_mgr.get(cache_key)
    if cached: return jsonify({"success": True, "cached": True, "data": cached})
    
    res = home_anime()
    if isinstance(res, dict) and "error" in res:
        return jsonify(res), 500
        
    cache_mgr.set(cache_key, res, ttl_hours=1)
    return jsonify({"success": True, "data": res})

if __name__ == "__main__":
    print("Starting Anigo Bypass API on Port 5002...")
    app.run(host="0.0.0.0", port=5002, debug=True)
