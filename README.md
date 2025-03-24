# Wynncraft XP Items Tracker

A web application that tracks and displays items with XP bonuses in Wynncraft, helping players optimize their leveling experience.

## Features

- Displays all items with XP bonuses from Wynncraft
- Organizes items by category (helmet, weapon, etc.)
- Shows detailed item information including requirements and stats
- Implements server-side caching to reduce API calls
- Provides a clean and intuitive user interface

## Project Structure

```
wynncraft-script/
├── app/
│   ├── static/          # Static files (CSS, JS, images)
│   ├── templates/       # HTML templates
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration files
│   └── server.py       # Main application file
├── tests/              # Test files
├── cache/              # Cache directory
├── requirements.txt    # Project dependencies
└── README.md          # Project documentation
```

## Setup

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv wynnenv
   source wynnenv/bin/activate  # On Windows: wynnenv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   python3 app/server.py
   ```

4. Access the application at `http://localhost:8000`

## Cache System

The application implements a server-side caching system to minimize API calls to the Wynncraft server:

- Cache duration: 24 hours
- Cache location: `cache/items_cache.json`
- Automatic cache invalidation
- Fallback to API when cache is invalid or expired

## API Rate Limits

- Default rate limit: 30 requests per minute
- Wynncraft API calls are throttled to respect their rate limits

## Contributing

Feel free to submit issues and enhancement requests!
