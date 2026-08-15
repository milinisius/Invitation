# 🕷️ A Very Official Spider-Man Invitation

A pixel-retro invitation to go and watch the new Spider-Man movie, in which the
"No" button is — regrettably, unavoidably — broken.

Ask → celebrate → pick a day, a time and a place → decide what to eat → get a ticket.

## How it goes

1. **Boot** — a fake CRT boot screen. `PRESS START`.
2. **The question** — *WILL YOU WATCH THE NEW SPIDER-MAN MOVIE WITH ME?*
   `YES` and `NO` sit side by side, and then things go wrong for `NO`:
   - it runs away from the cursor (and teleports when tapped on mobile),
   - it shrinks while `YES` grows,
   - its label degrades: `NO` → `no?` → `are you sure?` → … → `ok fine — YES`,
   - Spidey visibly starts crying,
   - and eventually it gives up and becomes a second `DEFINITELY YES`.

   Every route out of this screen is a yes. That's the whole idea.
3. **Calendar** — pick a day (past dates are disabled), then a time, then a place.
   Every step takes a preset or something typed in.
4. **Snacks** — pick as many as you like, plus a free-text craving.
5. **The ticket** — a stub with the whole plan on it, a `.ics` file for the
   calendar, and a share button.

## Sending it

Just send the link. A couple of optional query parameters:

| Parameter | Purpose | Example |
|---|---|---|
| `to` | Name shown on the transmission and the ticket | `?to=Sam` |
| `done` | Skip straight to a filled-in ticket | see below |

`SEND IT TO ME` builds a link that encodes the choices, so when they send it
back, opening it shows the exact plan they picked:

```
?to=Sam&d=2026-09-12&t=19:30&p=IMAX&f=POPCORN%7CRAMEN&done=1
```

Choices are also kept in `localStorage`, so a refresh mid-flow doesn't lose them.

## The pixel art

Every sprite is generated, not borrowed — no external image host to go down or
rate-limit the page:

```bash
pip install Pillow
python3 tools/make_assets.py
```

That writes `assets/*.gif` (animated: blinking mask, crying mask, web-swing,
popping popcorn, beating heart, crawling spider, clapperboard, ticket),
`assets/food/*.png`, plus the favicon and the social-card image.

Sprites are written at their **native pixel size** and only ever scaled **up**
by whole numbers in CSS. Downscaling pixel art turns it to mush, so each width
in `styles.css` is an exact multiple of its source — worth knowing before
changing any sprite size.

## Running it

Any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

No build step, no dependencies, no tracking. The font
([Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), SIL Open
Font License 1.1) is self-hosted in `assets/font/`, so the page makes no
third-party requests at all.

## Layout

```
index.html              markup for all six screens
styles.css              pixel panels, CRT scanlines, sprite sizing
app.js                  the dodging button, calendar, wizard, ticket, .ics
tools/make_assets.py    draws every sprite
assets/                 generated art + the font
```

## Accessibility

- Honours `prefers-reduced-motion` (no confetti, no float, no CRT flicker).
- Everything is a real `<button>`; the joke still works from the keyboard,
  where `NO` escalates on click instead of fleeing on hover.
- The `<noscript>` fallback still asks the question.
