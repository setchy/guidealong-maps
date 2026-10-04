# GuideAlong Tours Explorer
[![Netlify Status][netlify-badge]][netlify-deploys] [![Quality Gate Status][quality-badge]][quality] [![Renovate enabled][renovate-badge]][renovate] [![Data refresh][data-refresh-badge]][data-refresh-actions] [![License][license-badge]][license]

> 🗺️ Explore GuideAlong tours on an interactive map.

![GuideAlong Tours][social]

A simple web app that displays [GuideAlong][guidealong] tours on an interactive map — completely free, with no API keys required.

---

## ✨ Features

- 🗺️ **Every tour, one map** — the complete GuideAlong catalog plotted on an interactive map
- 📍 **Info-rich popups** — titles, descriptions, duration, audio points, and direct links right on the marker
- 🔍 **Instant search** — filter by name, country, state, tour type, or status; jump to any tour with `⌘K`/`Ctrl+K`
- 🗂️ **View it your way** — group tours by Status or Category (Driving, Walking, National Park, Bundle)
- 🔃 **Sort on the fly** — by title, completion date, or distance from your location
- 📡 **Locate-me** — one tap finds the tours nearest you, with live distances
- ✅ **Progress tracking** — completed trips get a green GuideAlong pin and their completion date
- 📱 **Mobile friendly** — collapsible panels and a peek-and-expand bottom sheet for on-the-go exploring

## 🛠️ Built with

- 🗺️ [MapLibre GL JS][maplibre] — interactive vector maps
- 🌍 [OpenFreeMap][openfreemap] — free, no-API-key vector tiles
- ⚡ [Vite](https://vitejs.dev) — dev server and static file serving
- 📦 [pnpm](https://pnpm.io) — fast, disk-efficient package manager
- 🧹 [Biome](https://biomejs.dev) — linting and formatting
- ☁️ [Netlify][netlify] — hosting and preview deploys
- 📍 [Google Maps Geocoding SDK](https://developers.google.com/maps/documentation/geocoding) — optional server-side geocoding

## 🚀 Getting started

### 📋 Prerequisites

- 📦 Node.js and pnpm

### 🖥️ Running locally

Start a static file server and open the app in your browser:

```
pnpm start
```

The UI runs entirely in the browser — with **no API keys required**.

## 🧭 Using the UI

![GuideAlong Tours][screenshot]

- 🔍 Search: press `Cmd+K`/`Ctrl+K` (or the search button) for a keyboard-driven tour search palette, or use the inline search field.
- 🎛️ Filters: Country, State, Tour type (by category), Tour status, and Search (title/description).
- 🗂️ Group & Sort: group the list by Status or Category, and sort by Title, Completed date, or Distance.
- 📡 Locate-me: use the map's locate control to capture your position, then sort by Distance to see tours nearest you (with computed distances shown).
- 📑 Sections (Filters, Group & Sort, Tours) are collapsible and start collapsed on load; the Tours header shows the count and completed tally.
- 🖱️ Clicking a tour in the list pans/zooms the map and opens its info window.

## 📜 Scripts

- ⚡ `pnpm start` — Serve the UI from `./src` on port 3000.
- 🔄 `pnpm fetch:tours` — Scrape and update `src/data/tours.json` (and geocode when an API key is present).
- 🧪 `pnpm test` — Run the Node test suite.
- 🔍 `pnpm lint` — Check and auto-fix formatting/linting via Biome.

## 🤝 Contributing

Contributions are welcome! 🎉

- Open an [issue][github-issues] for bugs or feature requests.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development details — data files, refreshing tour data, deploying to Netlify, and troubleshooting.

## 📜 License

⚖️ Licensed under the [ISC License](LICENSE).

🚗 Tour content is sourced from [GuideAlong][guidealong] and remains their property.

ℹ️ This project is for demonstration purposes and is not affiliated with GuideAlong.

<!-- Links -->
[screenshot]: ./assets/image.png
[social]: ./assets/social.png
[guidealong]: https://guidealong.com
[maplibre]: https://maplibre.org
[openfreemap]: https://openfreemap.org
[netlify]: https://netlify.com
[netlify-badge]: https://api.netlify.com/api/v1/badges/b9368d23-cad4-45f5-a018-e1af6a6269ed/deploy-status
[netlify-deploys]: https://app.netlify.com/projects/guidealong-tours/deploys
[quality-badge]: https://img.shields.io/sonar/quality_gate/setchy_guidealong-maps?server=https%3A%2F%2Fsonarcloud.io&logo=sonarqubecloud
[quality]: https://sonarcloud.io/project/overview?id=setchy_guidealong-maps
[renovate-badge]: https://img.shields.io/badge/renovate-enabled-brightgreen.svg?logo=renovate&logoColor=white
[renovate]: https://github.com/setchy/guidealong-maps/issues/1
[data-refresh-badge]: https://img.shields.io/github/actions/workflow/status/setchy/guidealong-maps/refresh-tours.yml?label=Data%20refresh&logo=github
[data-refresh-actions]: https://github.com/setchy/guidealong-maps/actions/workflows/refresh-tours.yml
[license-badge]: https://img.shields.io/github/license/setchy/guidealong-maps?logo=github
[license]: LICENSE
[github-issues]: https://github.com/setchy/guidealong-maps/issues