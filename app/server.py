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
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5501", "https://leolucadatri.io"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[RATE_LIMIT],
    storage_uri="memory://"
)

def process_item_data(items):
    """Process and validate item data."""
    logger.info(f"Processing items: {type(items)}")
    if isinstance(items, dict):
        # If items is a dict, we need to process its values
        items = items.values()
    
    processed_items = {}
    try:
        for item in items:
            if isinstance(item, str):
                # Skip non-item strings
                continue
                
            if not isinstance(item, dict):
                logger.error(f"Invalid item type: {type(item)}")
                continue
                
            name = item.get('internalName')
            if not name:
                continue

            # Check if item has xpBonus identification
            identifications = item.get('identifications', {})
            if not identifications.get('xpBonus'):
                continue

            # Ensure required fields exist
            item['tier'] = item.get('tier') or item.get('rarity', 'NORMAL')
            item['requirements'] = item.get('requirements', {})
            item['identifications'] = identifications
            item['dropRestriction'] = item.get('dropRestriction', 'normal')
            
            processed_items[name] = item
    except Exception as e:
        logger.error(f"Error processing items: {e}")
        return {}
    
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
                logger.info(f"Fetching page {page} from Wynncraft API")
                response = requests.post(
                    f"{WYNNCRAFT_API_URL}?page={page}",
                    json={"identifications": ["xpBonus"]},
                    timeout=REQUEST_TIMEOUT
                )
                
                if not response.ok:
                    logger.error(f"Wynncraft API error: {response.status_code}")
                    logger.error(f"Response content: {response.text[:500]}")
                    return jsonify({
                        "success": False,
                        "error": "Failed to fetch data from Wynncraft API"
                    }), 503
                
                logger.info(f"Response status: {response.status_code}")
                data = response.json()
                logger.info(f"Response data type: {type(data)}")
                logger.info(f"Response data keys: {list(data.keys())}")
                
                # Log a sample of the results
                if data.get("results"):
                    sample = data["results"][0] if isinstance(data["results"], list) else next(iter(data["results"].values()))
                    logger.info(f"Sample result: {sample}")
                
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
            except Exception as e:
                logger.error(f"Unexpected error while fetching data: {str(e)}")
                logger.exception("Full traceback:")
                return jsonify({
                    "success": False,
                    "error": "Error processing API response"
                }), 500
        
        # Save to cache before returning
        save_cache(items_data)
        
        return jsonify({
            "success": True,
            "items": items_data
        })
        
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.exception("Full traceback:")  # This will log the full stack trace
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=DEBUG) 
