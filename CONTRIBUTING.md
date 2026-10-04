# Contributing to GuideAlong Tours Explorer

Thanks for your interest in contributing! 🎉

This guide covers the developer and maintainer side of the project — project layout, data files, refreshing tour data, deploying to Netlify, and troubleshooting. For running the app and using it, see the [README](README.md).

## 🛠️ Development setup

Requires Node.js and pnpm (see `.nvmrc` for the pinned Node version).

```shell
pnpm install
pnpm start
```

`pnpm start` serves the static UI from `./src` on port 3000.

## 📦 Project structure

- `src/` — the static frontend (`index.html`, `main.js`, `styles.css`, `data/`, `icons/`)
- `lib/` — server-side scripts for scraping and enriching tour data
- `test/` — Node test suite for the data pipeline

## 📦 Data files

### `src/data/tours.json`

The main dataset consumed by the UI. Each tour has a normalized `category` (`Driving`, `Walking`, `National Park`, `Bundle`) plus raw scraped details. Example (abridged):

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

### `src/data/completed.json`

Optional list of completed tours, shown with a green icon and counted in the Status group. Example:

```json
[
   { "title": "Banff National Park Driving Tour", "completedDate": "2024-08-20" },
   { "title": "Zion & Bryce Canyon Driving Tour" }
]
```

Titles should match those in `tours.json` for completion to be detected. `completedDate` may be `null` (completed, date unknown); null dates sort after dated tours.

### `src/data/meta.json`

Holds the `lastSynced` timestamp shown in the app's footer (e.g. "Last synced Aug 31, 2026").

## 🔄 Refreshing tour data (server-side)

You can refresh `src/data/tours.json` by scraping the tour list and optionally geocoding each tour using the Google Maps Geocoding SDK (server-side only). This also re-derives each tour's `category`.

1) Install dependencies and ensure your key is in `.env` (copy `.env.template`):

```shell
pnpm i
cp .env.template .env
```

2) Run the fetch script:

```shell
pnpm fetch:tours
```

Behavior:

- If `GOOGLE_MAPS_API_KEY` is set in `.env`, the script geocodes missing tours and fills the `geocode` fields.
- If not set, the script still scrapes/upserts tours but skips geocoding.

Output: `./src/data/tours.json` (sorted by title)

> **Tip:** Don't commit your real API keys. Keep `.env` files out of version control.

## ☁️ Deploying to Netlify

The site is deployed with [Netlify][netlify]:

- **Production** deploys automatically from the `main` branch.
- **Preview branches** — every pull request gets its own preview deploy, so changes can be reviewed live before merging.
- **Base directory / publish directory**: `./src` (the site is static — no build step).
- **No secrets are required** — the map needs no API key.

## 🧪 Tests & linting

- `pnpm test` — run the Node test suite (`test/`).
- `pnpm lint` — check and auto-fix formatting/linting via Biome.

## 🛠️ Troubleshooting

- 🚫 No tours displayed: Ensure `src/data/tours.json` exists or run `pnpm fetch:tours` to generate it.
- 🗺️ Geocoding skipped: The server-side script didn't find a key; add it to `.env` and re-run.
- 📡 Distance sort unavailable: The browser declined the location prompt; allow access or use the map's locate control to try again.

## 🙏 Getting help

- Open an [issue][github-issues] for bugs or feature requests.
- See [README.md](README.md) for usage and the feature overview.

<!-- Links -->
[netlify]: https://netlify.com
[github-issues]: https://github.com/setchy/guidealong-maps/issues