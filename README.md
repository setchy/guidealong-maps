# GuideAlong Tours Map

This project is a web app that displays GuideAlong tours on a Google Map. 

It fetches live tour data from [guidealong.com/tour-list](https://guidealong.com/tour-list/), geocodes the locations, and plots them as interactive markers. Each marker popup shows the tour's description and image.

## Features
- Fetches live tour data (with CORS proxy)
- Fallback to static sample tours if live data fails
- Geocodes tour locations using Google Maps
- Uses AdvancedMarkerElement for modern marker rendering
- Marker popups show tour title, description, image, and link
- Search/filter tours by name or description
- Loading and error UI

## Setup
1. Clone or download this repository.
2. Add your Google Maps API key to a `.env` file as:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
   (Note: .env loading is not yet implemented for browser use. For now, add your key directly in the script tag in `index.html`.)

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
