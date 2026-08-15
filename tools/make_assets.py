#!/usr/bin/env python3
"""Generate the pixel-art assets for the invitation.

Everything the page shows is drawn here and committed as real GIF/PNG files,
so the page never depends on an external image host staying up.

    python3 tools/make_assets.py
"""

import math
import os

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FOOD = os.path.join(ASSETS, "food")

# Palette. Key colour (index 0) doubles as transparency.
PAL = {
    "T": (255, 0, 255),
    "K": (11, 11, 20),
    "D": (32, 35, 52),
    "G": (138, 144, 168),
    "L": (198, 203, 222),
    "W": (255, 255, 255),
    "R": (230, 36, 41),
    "r": (150, 20, 28),
    "B": (43, 93, 242),
    "b": (22, 46, 130),
    "Y": (255, 210, 63),
    "O": (255, 140, 26),
    "P": (255, 92, 138),
    "C": (255, 233, 196),
    "N": (138, 90, 43),
    "n": (92, 58, 26),
    "S": (60, 200, 120),
    "A": (120, 226, 255),
    "M": (168, 92, 224),
}
CHARS = list(PAL.keys())
INDEX = {PAL[c]: i for i, c in enumerate(CHARS)}


def rgba(char):
    return PAL[char] + (255,)


def flat_palette():
    flat = []
    for c in CHARS:
        flat.extend(PAL[c])
    flat.extend([0, 0, 0] * (256 - len(CHARS)))
    return flat


def to_paletted(img):
    """Exact RGBA -> P conversion. All drawing uses palette colours only."""
    img = img.convert("RGBA")
    out = Image.new("P", img.size, 0)
    out.putpalette(flat_palette())
    src, dst = img.load(), out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            dst[x, y] = 0 if a < 128 else INDEX.get((r, g, b), 1)
    return out


def save_gif(frames, name, duration=120, scale=1):
    paletted = []
    for fr in frames:
        p = to_paletted(fr)
        if scale != 1:
            p = p.resize((p.width * scale, p.height * scale), Image.NEAREST)
        paletted.append(p)
    path = os.path.join(ASSETS, name)
    paletted[0].save(
        path,
        save_all=True,
        append_images=paletted[1:],
        duration=duration,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )
    print(f"  {name}  {paletted[0].width}x{paletted[0].height}  {len(frames)} frames")


def save_png(img, path, scale=1):
    img = img.convert("RGBA")
    img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(path)
    print(f"  {os.path.relpath(path, ROOT)}  {img.width}x{img.height}")


def grid(rows):
    """Build an image from rows of palette characters ('.' = transparent)."""
    h, w = len(rows), len(rows[0])
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                px[x, y] = rgba(ch)
    return img


def blit(dst, src, ox, oy):
    dst.alpha_composite(src, (int(ox), int(oy)))


# --------------------------------------------------------------------------
# Spider-Man mask
# --------------------------------------------------------------------------

EYE = [(-4.6, -1.9), (1.9, -3.0), (3.0, 0.5), (-1.4, 2.8), (-4.6, 1.6)]


def draw_eye(d, cx, cy, squint=1.0, flip=False, droop=0.0):
    """droop > 0 pulls the outer corner down, which is what reads as 'sad'."""
    pts = []
    for x, y in EYE:
        y = y * squint - droop * (x / 4.0)
        if flip:
            x = -x
        pts.append((cx + x, cy + y))
    d.polygon(pts, fill=rgba("W"), outline=rgba("K"))


def mask_frame(squint=1.0, sad=False, tear=None):
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.ellipse([5, 3, 26, 28], fill=rgba("R"), outline=rgba("r"))

    # Radial web, clipped to the head silhouette.
    head = Image.new("L", (32, 32), 0)
    ImageDraw.Draw(head).ellipse([5, 3, 26, 28], fill=255)
    web = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    wd = ImageDraw.Draw(web)
    cx, cy = 15.5, 4.0
    for deg in range(-72, 73, 24):
        a = math.radians(deg + 90)
        wd.line([cx, cy, cx + math.cos(a) * 40, cy + math.sin(a) * 40], fill=rgba("r"))
    for rad in (8, 14, 20, 26):
        wd.arc([cx - rad, cy - rad, cx + rad, cy + rad], 8, 172, fill=rgba("r"))
    img.paste(web, (0, 0), ImageChops.multiply(web.getchannel("A"), head))

    droop = 1.1 if sad else 0.0
    draw_eye(d, 11, 15, squint, flip=False, droop=droop)
    draw_eye(d, 20, 15, squint, flip=True, droop=droop)

    if tear is not None:
        d.point([(22, tear), (22, tear + 1)], fill=rgba("A"))
    return img


def make_mask():
    bob = [0, 0, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0]
    squints = [1.0] * 12
    squints[7], squints[8] = 0.45, 0.12
    frames = []
    for i in range(12):
        base = Image.new("RGBA", (32, 34), (0, 0, 0, 0))
        blit(base, mask_frame(squints[i]), 0, 2 + bob[i])
        frames.append(base)
    save_gif(frames, "mask.gif", duration=160)


def make_sad():
    frames = []
    for i in range(8):
        base = Image.new("RGBA", (32, 34), (0, 0, 0, 0))
        tear = 19 + i if i >= 2 else None
        if tear is not None and tear > 28:
            tear = None
        blit(base, mask_frame(0.8, sad=True, tear=tear), 0, 2 + (1 if i % 4 > 1 else 0))
        frames.append(base)
    save_gif(frames, "sad.gif", duration=170)


# --------------------------------------------------------------------------
# Swinging Spider-Man
# --------------------------------------------------------------------------

CHIBI = [
    "..RRRR..",
    ".RWRRWR.",
    "..RRRR..",
    "R.BBBB.R",
    "RBBBBBBR",
    ".BBBBBB.",
    "..BBBB..",
    "..B..B..",
    "..R..R..",
]


def make_swing():
    body = grid(CHIBI)
    frames = []
    steps = 12
    for i in range(steps):
        img = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        ang = math.radians(38 * math.sin(2 * math.pi * i / steps))
        ax, ay = 20.0, 1.0
        length = 22
        hx = ax + math.sin(ang) * length
        hy = ay + math.cos(ang) * length
        d.line([ax, ay, hx, hy], fill=rgba("W"))
        blit(img, body, round(hx) - 4, round(hy) - 2)
        frames.append(img)
    save_gif(frames, "swing.gif", duration=110)


# --------------------------------------------------------------------------
# Popcorn / hearts / spider / clapperboard
# --------------------------------------------------------------------------

BUCKET = [
    ".WWRRWWRRWWR.",
    ".WWRRWWRRWWR.",
    ".RWWRRWWRRWW.",
    ".RWWRRWWRRWW.",
    "..WRRWWRRWWR.",
    "..WRRWWRRWW..",
    "..RWWRRWWRW..",
    "...WRRWWRR...",
    "...WRRWWRR...",
]


def make_popcorn():
    kernels = [(2, 6), (5, 4), (8, 5), (11, 7), (6, 8)]
    frames = []
    for i in range(8):
        img = Image.new("RGBA", (16, 20), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for k, (kx, base) in enumerate(kernels):
            lift = abs(math.sin(math.pi * ((i + k * 1.6) / 8)))
            y = base - lift * 4
            d.rectangle([kx, y, kx + 1, y + 1], fill=rgba("C"))
            d.point([(kx, y)], fill=rgba("W"))
        blit(img, grid(BUCKET), 1, 11)
        frames.append(img)
    save_gif(frames, "popcorn.gif", duration=130)


HEART = [
    ".PP.PP.",
    "PPPPPPP",
    "PPPPPPP",
    ".PPPPP.",
    "..PPP..",
    "...P...",
]


def make_heart():
    base = grid(HEART)
    frames = []
    for scale, pad in ((1.0, 0), (1.0, 0), (0.82, 1), (1.0, 0)):
        img = Image.new("RGBA", (9, 8), (0, 0, 0, 0))
        w = max(1, round(base.width * scale))
        h = max(1, round(base.height * scale))
        blit(img, base.resize((w, h), Image.NEAREST), (9 - w) // 2, pad + (8 - h) // 2)
        frames.append(img)
    save_gif(frames, "heart.gif", duration=190)


# Light-toned so the spider stays visible against the dark page.
SPIDER_A = [
    "G.G...G.G",
    ".G.G.G.G.",
    "..LLLLL..",
    ".LLWWWLL.",
    "..LLLLL..",
    ".G.G.G.G.",
    "G.G...G.G",
]
SPIDER_B = [
    ".G.G.G.G.",
    "G.GG.GG.G",
    "..LLLLL..",
    ".LLWWWLL.",
    "..LLLLL..",
    "G.GG.GG.G",
    ".G.G.G.G.",
]


def make_spider():
    save_gif([grid(SPIDER_A), grid(SPIDER_B)], "spider.gif", duration=220)


def make_clapper():
    frames = []
    for i in range(8):
        img = Image.new("RGBA", (20, 16), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle([1, 6, 18, 14], fill=rgba("D"), outline=rgba("K"))
        for x in range(2, 18, 4):
            d.rectangle([x, 8, x + 1, 9], fill=rgba("G"))
        open_up = 3 if i % 4 < 2 else 0
        d.rectangle([1, 2 - open_up, 18, 5 - open_up], fill=rgba("K"))
        for x in range(2, 18, 4):
            d.rectangle([x, 2 - open_up, x + 1, 5 - open_up], fill=rgba("W"))
        frames.append(img)
    save_gif(frames, "clapper.gif", duration=240)


def make_ticket():
    frames = []
    for i in range(6):
        img = Image.new("RGBA", (24, 14), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle([1, 2, 22, 11], fill=rgba("Y"), outline=rgba("n"))
        d.line([15, 2, 15, 11], fill=rgba("n"))
        for y in range(4, 10, 2):
            d.line([4, y, 12, y], fill=rgba("n"))
        if i % 3 == 0:
            d.point([(18, 6), (19, 5), (19, 7), (20, 6)], fill=rgba("W"))
        frames.append(img)
    save_gif(frames, "ticket.gif", duration=200)


# --------------------------------------------------------------------------
# Food icons (static PNGs)
# --------------------------------------------------------------------------

FOODS = {
    "pizza": [
        "....YYYY....",
        "..YYCCCCYY..",
        ".YCCRCCRCCY.",
        ".YCCCCCCCCY.",
        "..YCRCCCRCY.",
        "..YCCCCCCY..",
        "...YCCRCCY..",
        "....YCCCY...",
        ".....YCY....",
        "......Y.....",
    ],
    "burger": [
        "...NNNNNN...",
        "..NNCNNCNN..",
        ".NNNNNNNNNN.",
        ".SSSSSSSSSS.",
        ".OOOOOOOOOO.",
        ".nnnnnnnnnn.",
        ".YYYYYYYYYY.",
        ".NNNNNNNNNN.",
        "..NNNNNNNN..",
        "............",
    ],
    "sushi": [
        "............",
        "...WWWWWW...",
        "..WWWWWWWW..",
        "..KWWWWWWK..",
        "..KWRRRRWK..",
        "..KWRRRRWK..",
        "..KWWWWWWK..",
        "..WWWWWWWW..",
        "...WWWWWW...",
        "............",
    ],
    "ramen": [
        "....YYYY....",
        "...C....C...",
        "..CCCCCCCC..",
        ".CCYYCCYYCC.",
        ".WWWWWWWWWW.",
        ".RWWWWWWWWR.",
        ".WWWWWWWWWW.",
        "..WWWWWWWW..",
        "...WWWWWW...",
        "............",
    ],
    "tacos": [
        "............",
        "...YYYYYY...",
        "..YYYYYYYY..",
        ".YSSGGSSGGY.",
        ".YRRRRRRRRY.",
        ".YYRRRRRRYY.",
        ".YYYYYYYYYY.",
        "..YYYYYYYY..",
        "............",
        "............",
    ],
    "icecream": [
        "....PPPP....",
        "...PPPPPP...",
        "..PPPPPPPP..",
        "..CCCCCCCC..",
        "...NNNNNN...",
        "...NnNNnN...",
        "....NNNN....",
        "....NnnN....",
        ".....NN.....",
        "............",
    ],
    "nachos": [
        "............",
        "..Y......Y..",
        ".YYY....YYY.",
        "YYYYY..YYYYY",
        "..YYYYYYYY..",
        ".YYYYYYYYYY.",
        "YYYYSSYYYYYY",
        ".YYYYYYYYYY.",
        "..YYYYYYYY..",
        "............",
    ],
    "boba": [
        "...AAAAAA...",
        "...A....A...",
        "..CCCCCCCC..",
        "..CCCCCCCC..",
        "..CCCCCCCC..",
        "..CKCCKCCC..",
        "..CCKCCKCC..",
        "...CKCCKC...",
        "...CCCCCC...",
        "............",
    ],
}


def make_food():
    for name, rows in FOODS.items():
        save_png(grid(rows), os.path.join(FOOD, f"{name}.png"))


# --------------------------------------------------------------------------
# favicon + social preview
# --------------------------------------------------------------------------


def make_favicon():
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    blit(img, mask_frame(1.0), 0, 0)
    save_png(img, os.path.join(ASSETS, "favicon.png"), scale=2)


def make_og():
    """1200x630 social card, drawn at 1/10 scale then nearest-neighbour up."""
    w, h = 120, 63
    img = Image.new("RGBA", (w, h), PAL["K"] + (255,))
    d = ImageDraw.Draw(img)
    for y in range(0, h, 2):
        d.line([0, y, w, y], fill=PAL["D"] + (255,))
    for i in range(0, w, 6):
        d.line([i, 0, i + 12, h], fill=(20, 22, 36, 255))
    d.rectangle([3, 3, w - 4, h - 4], outline=PAL["R"] + (255,))
    mask = mask_frame(1.0).resize((44, 44), Image.NEAREST)
    blit(img, mask, 8, 10)
    d.rectangle([60, 18, 110, 26], fill=PAL["R"] + (255,))
    d.rectangle([60, 30, 100, 36], fill=PAL["W"] + (255,))
    d.rectangle([60, 40, 92, 45], fill=PAL["Y"] + (255,))
    save_png(img, os.path.join(ASSETS, "og.png"), scale=10)


def main():
    os.makedirs(FOOD, exist_ok=True)
    print("building assets...")
    make_mask()
    make_sad()
    make_swing()
    make_popcorn()
    make_heart()
    make_spider()
    make_clapper()
    make_ticket()
    make_food()
    make_favicon()
    make_og()
    print("done.")


if __name__ == "__main__":
    main()
