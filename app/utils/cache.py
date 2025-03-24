import json
import time
import logging
from typing import Optional, Dict, Any
from app.config.settings import CACHE_FILE, CACHE_TTL

logger = logging.getLogger(__name__)

def load_cache() -> Optional[Dict[str, Any]]:
    """Load items from cache if valid."""
    try:
        with open(CACHE_FILE, 'r') as f:
            cache_data = json.load(f)
            if time.time() - cache_data['timestamp'] < CACHE_TTL:
                logger.info("Cache hit: Loading items from cache")
                return cache_data['items']
            else:
                logger.info("Cache expired")
    except FileNotFoundError:
        logger.info("No cache file found")
    except json.JSONDecodeError:
        logger.error("Invalid cache file format")
    except Exception as e:
        logger.error(f"Error loading cache: {str(e)}")
    return None

def save_cache(items: Dict[str, Any]) -> None:
    """Save items to cache with current timestamp."""
    try:
        cache_data = {
            'timestamp': time.time(),
            'items': items
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache_data, f)
        logger.info("Successfully saved items to cache")
    except Exception as e:
        logger.error(f"Error saving cache: {str(e)}")

def clear_cache() -> None:
    """Clear the cache file."""
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump({'timestamp': 0, 'items': {}}, f)
        logger.info("Cache cleared successfully")
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}") 