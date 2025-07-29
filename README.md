# GuideAlong Tours Map

This project is a simple web app that displays [GuideAlong][guidealong] tours on a Google Map. 

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

## License
This project is for demonstration purposes and is not affiliated with GuideAlong.


<!-- Links -->
[guidealong]: https://guidealong.com
[guidealong-tours]: https://guidealong.com/tour-list