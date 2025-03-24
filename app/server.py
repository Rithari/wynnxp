import time
import logging
import requests
from flask import Flask, jsonify, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS

from app.config.settings import (
    DEBUG, HOST, PORT, WYNNCRAFT_API_URL,
    REQUEST_TIMEOUT, RATE_LIMIT
)
from app.utils.cache import load_cache, save_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[RATE_LIMIT],
    storage_uri="memory://"
)

def process_item_data(items):
    """Process and validate item data."""
    processed_items = {}
    for item in items:
        name = item.get('name')
        if not name:
            continue

        # Ensure required fields exist
        item['tier'] = item.get('tier') or item.get('rarity', 'NORMAL')
        item['requirements'] = item.get('requirements', {})
        item['identifications'] = item.get('identifications', {})
        item['dropRestriction'] = item.get('dropRestriction', 'normal')
        
        processed_items[name] = item
    
    return processed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/items')
@limiter.limit(RATE_LIMIT)
def get_items():
    try:
        # Try to get items from cache first
        cached_items = load_cache()
        if cached_items:
            return jsonify({"success": True, "items": cached_items})
        
        # If no cache, fetch from Wynncraft API
        items_data = {}
        page = 1
        
        while True:
            try:
                response = requests.post(
                    f"{WYNNCRAFT_API_URL}?page={page}",
                    json={"identifications": ["xpBonus"]},
                    timeout=REQUEST_TIMEOUT
                )
                
                if not response.ok:
                    logger.error(f"Wynncraft API error: {response.status_code}")
                    return jsonify({
                        "success": False,
                        "error": "Failed to fetch data from Wynncraft API"
                    }), 503
                    
                data = response.json()
                if not data.get("results"):
                    break
                    
                processed_items = process_item_data(data["results"])
                items_data.update(processed_items)
                
                if not data["controller"].get("next"):
                    break
                    
                page += 1
                time.sleep(0.1)  # Rate limiting
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": "Failed to communicate with Wynncraft API"
                }), 503
        
        # Save to cache before returning
        save_cache(items_data)
        
        return jsonify({
            "success": True,
            "items": items_data
        })
        
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG) 