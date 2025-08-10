# GuideAlong Tours Map

This project is a simple web app that displays [GuideAlong][guidealong] tours on a Google Map. 

![GuideAlong Tours][screenshot]

By default it uses geocoded tour information from `./src/data/tours.json` to plot tour markets on an interactive map.

There is also the ability to fetch the most recent tour information from [guidealong.com/tour-list][guidealong-tours] and geocode the locations.

If you'd like to show completed trips, these can be added into `./src/data/completed.json` and will be plotted with a green GuideAlong logo. 

## Features
- Display all GuideAlong tours on a single view
- Geocodes tour locations using Google Maps
- Fetches live tour data (with CORS proxy)
- Marker popups show tour title, description, and link
- Search/filter tours by name, country, state, type or status

## Setup
1. Clone or download this repository.
2. Add your Google Maps API key to a `./src/config/.env` file as:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

## Running Locally
To serve the app locally, use:

```
pnpm start
```

This will start a local web server and open the app in your browser.

## Requirements
- Node.js
- Internet connection (for live tour data and Google Maps)

## Updating tours data and geocoding (server-side)

You can refresh `src/data/tours.json` by scraping the tour list and optionally geocoding each tour using the Google Maps SDK:

1. Install dependencies
2. (Optional) Create `.env` at the repo root by copying `.env.example` and set `GOOGLE_MAPS_API_KEY` to a server-side key with the Geocoding API enabled. Avoid HTTP referrer restrictions; prefer IP allow-list.
3. Run the fetch script

```
pnpm i
cp .env.example .env  # then edit .env to add your key
pnpm fetch:tours
```

If no API key is configured, the script still updates tours by scraping but will skip geocoding.

## License
This project is for demonstration purposes and is not affiliated with GuideAlong.


<!-- Links -->
[screenshot]: ./src/assets/image.png
[guidealong]: https://guidealong.com
[guidealong-tours]: https://guidealong.com/tour-list