## Purpose

Provides a fast, keyboard-first way to search tours: pressing Cmd/Ctrl+K opens a search overlay, typing filters the tour list, and selecting a result focuses it on the map.

## ADDED Requirements

### Requirement: Keyboard shortcut opens palette

Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) SHALL open the search palette and focus its input. Pressing `Esc` SHALL close it.

#### Scenario: Open with keyboard
- **WHEN** the user presses Cmd+K or Ctrl+K
- **THEN** the search palette opens and its input is focused

#### Scenario: Close with Escape
- **WHEN** the palette is open and the user presses Esc
- **THEN** the palette closes and focus returns to the page

### Requirement: Palette filters tours by search text

As the user types, the palette SHALL list tours whose title or description matches, ranked by relevance, capped at a reasonable number of results. An empty query SHALL show the full tour list (or a clear prompt).

#### Scenario: Filtering results
- **WHEN** the user types text in the palette input
- **THEN** the list shows matching tours (title or description match), with non-matching tours excluded

#### Scenario: Empty query
- **WHEN** the palette input is empty
- **THEN** the list shows a prompt or all tours rather than an error

#### Scenario: No matches
- **WHEN** no tour matches the query
- **THEN** the palette shows a "no results" state

### Requirement: Selecting a result focuses it on the map

Selecting a result SHALL pan/zoom the map to the tour's location, open its popup, and close the palette.

#### Scenario: Select with keyboard
- **WHEN** the user presses Enter while a result is highlighted
- **THEN** the map pans/zooms to that tour, its popup opens, and the palette closes

#### Scenario: Select with mouse
- **WHEN** the user clicks a result
- **THEN** the map pans/zooms to that tour, its popup opens, and the palette closes

### Requirement: Keyboard navigation within results

Arrow keys SHALL move the highlighted result up/down within the visible list.

#### Scenario: Arrow key navigation
- **WHEN** the palette is open and results are visible
- **THEN** ArrowUp/ArrowDown move the highlight through the results

### Requirement: Discoverable affordance

A visible control (button and/or hint text) SHALL indicate the palette exists and its shortcut.

#### Scenario: Visible hint
- **WHEN** the page is rendered
- **THEN** a visible search affordance or hint (e.g. a search button labeled with "⌘K") is shown that opens the palette
