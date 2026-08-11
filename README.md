# GuideAlong Tours Explorer
[![Netlify Status](https://api.netlify.com/api/v1/badges/b9368d23-cad4-45f5-a018-e1af6a6269ed/deploy-status)](https://app.netlify.com/projects/guidealong-tours/deploys)

A simple web app that displays [GuideAlong][guidealong] tours on an interactive map powered by [MapLibre GL JS][maplibre] with free OpenStreetMap vector tiles. Deployed via [Netlify][netlify].

![GuideAlong Tours][screenshot]

## Features

- Display all GuideAlong tours on a single view
- Marker popups show tour title, description, and link
- Search/filter tours by name, country, state, tour type, or status
- Group the tour list by Status or Category (Driving, Walking, National Park, Bundle)
- Sort by title, completion date, or distance from your location
- Locate-me control to find tours near you
- Completed trips shown with a green GuideAlong logo

## Getting started

### Prerequisites

- Node.js and pnpm (this repo uses `pnpm@10.x`)

### Running locally

Start a static file server and open the app in your browser:

```
pnpm start
```

The UI runs entirely in the browser — MapLibre GL JS and free OpenStreetMap tiles need **no API key**.

## Data files

- `src/data/tours.json` — The main dataset consumed by the UI. Each tour has a normalized `category` (`Driving`, `Walking`, `National Park`, `Bundle`) plus raw scraped details. Example (abridged):

   ```json
   [
      {
         "title": "Banff National Park Driving Tour",
         "url": "https://guidealong.com/tour/banff-driving-tour/",
         "category": "Driving",
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

- `src/data/completed.json` — Optional list of completed tours, shown with a green icon and counted in the Status group. Example:

   ```json
   [
      { "title": "Banff National Park Driving Tour", "completedDate": "2024-08-20" },
      { "title": "Zion & Bryce Canyon Driving Tour" }
   ]
   ```

   Titles should match those in `tours.json` for completion to be detected. `completedDate` may be `null` (completed, date unknown); null dates sort after dated tours.

## Refreshing tour data (server-side)

You can refresh `src/data/tours.json` by scraping the tour list and optionally geocoding each tour using the Google Maps Geocoding SDK (server-side only). This also re-derives each tour's `category`.

1) Install dependencies and ensure your key is in `.env` (copy `.env.template`):

```
pnpm i
cp .env.template .env
```

2) Run the fetch script:

```
pnpm fetch:tours
```

Behavior:
- If `GOOGLE_MAPS_API_KEY` is set in `.env`, the script geocodes missing tours and fills the `geocode` fields.
- If not set, the script still scrapes/upserts tours but skips geocoding.

Output: `./src/data/tours.json` (sorted by title)

Tip: Don't commit your real API keys. Keep `.env` files out of version control.

## Deploying to Netlify

The site is deployed with [Netlify][netlify]:

- **Production** deploys automatically from the `main` branch.
- **Preview branches** — every pull request gets its own preview deploy, so changes can be reviewed live before merging.
- **Base directory / publish directory**: `./src` (the site is static — no build step).
- **No secrets are required** — the map needs no API key.

## Using the UI

- Search: press `Cmd+K`/`Ctrl+K` (or the search button) for a keyboard-driven tour search palette, or use the inline search field.
- Filters: Country, State, Tour type (by category), Tour status, and Search (title/description).
- Group & Sort: group the list by Status or Category, and sort by Title, Completed date, or Distance.
- Locate-me: use the map's locate control to capture your position, then sort by Distance to see tours nearest you (with computed distances shown).
- Sections (Filters, Group & Sort, Tours) are collapsible and start collapsed on load; the Tours header shows the count and completed tally.
- Clicking a tour in the list pans/zooms the map and opens its info window.

## Scripts

- `pnpm start` — Serve the UI from `./src` on port 3000.
- `pnpm fetch:tours` — Scrape and update `src/data/tours.json` (and geocode when an API key is present).
- `pnpm lint` — Check and auto-fix formatting/linting via Biome.

## Troubleshooting

- No tours displayed: Ensure `src/data/tours.json` exists or run `pnpm fetch:tours` to generate it.
- Geocoding skipped: The server-side script didn't find a key; add it to `.env` and re-run.
- Distance sort unavailable: The browser declined the location prompt; allow access or use the map's locate control to try again.

## License

This project is for demonstration purposes and is not affiliated with GuideAlong.

<!-- Links -->
[screenshot]: ./assets/image.png
[guidealong]: https://guidealong.com
[guidealong-tours]: https://guidealong.com/tour-list
[maplibre]: https://maplibre.org
[netlify]: https://netlify.com
