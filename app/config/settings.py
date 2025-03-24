import os

# Flask settings
DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
HOST = os.getenv('FLASK_HOST', '127.0.0.1')
PORT = int(os.getenv('FLASK_PORT', '8000'))

# Cache settings
CACHE_DIR = os.getenv('CACHE_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'cache'))
CACHE_FILE = os.path.join(CACHE_DIR, 'items_cache.json')
CACHE_TTL = int(os.getenv('CACHE_TTL', str(24 * 60 * 60)))  # 24 hours in seconds

# API settings
WYNNCRAFT_API_URL = os.getenv('WYNNCRAFT_API_URL', "https://api.wynncraft.com/v3/item/search")
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '10'))
RATE_LIMIT = os.getenv('RATE_LIMIT', "30 per minute")

# CORS settings
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'https://leolucadatri.io').split(',')

# Create cache directory if it doesn't exist
os.makedirs(CACHE_DIR, exist_ok=True) 