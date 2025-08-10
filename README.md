# GuideAlong Tours Explorer

This project is a simple web app that displays [GuideAlong][guidealong] tours on a Google Map.

![GuideAlong Tours][screenshot]

By default it uses geocoded tour information from `./src/data/tours.json` to plot tour markers on an interactive map.

There is also the ability to fetch the most recent tour information from [guidealong.com/tour-list][guidealong-tours] and geocode the locations.

If you'd like to show completed trips, these can be added into `./src/data/completed.json` and will be plotted with a green GuideAlong logo.

## Features
- Display all GuideAlong tours on a single view
- Geocodes tour locations using Google Maps
- Marker popups show tour title, description, and link
- Search/filter tours by name, country, state, type or status

## Setup
- Prereqs: Node.js and pnpm (this repo uses `pnpm@10.x`).
- Clone or download this repository.
- Add your Google Maps API key to `./src/config/.env`:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
   Notes:
   - The same `.env` file is used by the browser (to load the Maps JS API) and by the server-side data fetch script (to run Geocoding).
   - Use a browser key (HTTP referrer restrictions) for the UI. For server-side geocoding, use a server key (IP allow-list). You can temporarily reuse the same key while testing.

## Running locally
Start the static site server and open the app in your browser:

```
pnpm start
```

## Requirements
- Node.js
- Internet connection (for Google Maps and data refresh)

## Updating tours data and geocoding (server-side)
You can refresh `src/data/tours.json` by scraping the tour list and optionally geocoding each tour using the Google Maps SDK.

1) Install dependencies and ensure your key is in `./src/config/.env`:
```
pnpm i
```

2) Run the fetch script:
```
pnpm fetch:tours
```

Behavior:
- If `GOOGLE_MAPS_API_KEY` is set in `./src/config/.env`, the script will geocode missing tours and fill `geocode` fields.
- If not set, the script still scrapes/upserts tours but skips geocoding.

Output: `./src/data/tours.json` (sorted by title)

Tip: Don’t commit your real API keys. Keep `.env` files out of version control.

## Scripts
- `pnpm start` — Serve the UI from `./src` on port 3000.
- `pnpm fetch:tours` — Scrape and update `src/data/tours.json` (and geocode when API key is present).
- `pnpm lint` — Check and auto-fix formatting/linting via Biome.

## Data files
- `src/data/tours.json` — The main dataset consumed by the UI. Example (abridged):
   ```json
   [
      {
         "title": "Banff National Park Driving Tour",
         "url": "https://guidealong.com/tour/banff-driving-tour/",
         "details": {
            "description": "Explore scenic drives and viewpoints...",
            "thumbnail": "",
            "audioPoints": "130+",
            "duration": "5-7 hours",
            "tourType": "Driving",
            "start": "Banff Townsite",
            "location": "Alberta, Canada"
         },
         "geocode": { "lat": 51.178, "lng": -115.570, "country": "Canada", "state": "AB" }
      }
   ]
   ```

- `src/data/completed.json` — Optional list of completed tours shown with a green icon. Example:
   ```json
   [
      { "title": "Banff National Park Driving Tour", "completedDate": "2024-08-20" },
      { "title": "Zion & Bryce Canyon Driving Tour" }
   ]
   ```

Titles should match those in `tours.json` for completion to be detected.

## Using the UI
- Filters: Country, State, Tour type, Tour status, and Search (title/description).
- Sections: Filters and Tours are collapsible; the Tours header shows the count and completed tally.
- Clicking a tour in the list pans/zooms the map and opens its info window.

## Troubleshooting
- Blank map or “API key not found”: Verify `./src/config/.env` exists and the key is valid. Refresh the page after changes.
- No tours displayed: Ensure `./src/data/tours.json` exists or run `pnpm fetch:tours` to generate it.
- Geocoding skipped: The server-side script didn’t find a key; add it to `./src/config/.env` and re-run.

## License
This project is for demonstration purposes and is not affiliated with GuideAlong.


<!-- Links -->
[screenshot]: ./assets/image.png
[guidealong]: https://guidealong.com
[guidealong-tours]: https://guidealong.com/tour-list