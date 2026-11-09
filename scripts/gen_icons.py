# -*- coding: utf-8 -*-
"""生成芯匣应用图标：Android mipmap 全套 + PWA 图标"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = r"C:\Windows\Fonts\msyhbd.ttc"
GLYPH = "匣"
TOP = (59, 130, 246)    # #3B82F6
BOTTOM = (29, 64, 175)  # #1D4ED8
WHITE = (255, 255, 255, 255)

def gradient(size):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def art(size, glyph_ratio, rounded=False, circle=False):
    """生成 size x size 图标：渐变底 + 白色字形"""
    img = gradient(size).convert("RGBA")
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.18), fill=255)
        img.putalpha(mask)
    if circle:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        img.putalpha(mask)
    font = ImageFont.truetype(FONT_PATH, int(size * glyph_ratio))
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), GLYPH, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), GLYPH, font=font, fill=WHITE)
    return img

def glyph_only(size, glyph_ratio):
    """透明底白字形（自适应图标前景层）"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    font = ImageFont.truetype(FONT_PATH, int(size * glyph_ratio))
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), GLYPH, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), GLYPH, font=font, fill=WHITE)
    return img

# ---- PWA 图标 ----
pwa_dir = os.path.join(ROOT, "public", "icons")
os.makedirs(pwa_dir, exist_ok=True)
art(192, 0.62).save(os.path.join(pwa_dir, "icon-192.png"))
art(512, 0.62).save(os.path.join(pwa_dir, "icon-512.png"))
art(512, 0.48).save(os.path.join(pwa_dir, "icon-512-maskable.png"))  # maskable 安全区

# ---- Android mipmap ----
mipmap = os.path.join(ROOT, "android", "app", "src", "main", "res", "mipmap")
dpi_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for dpi, s in dpi_sizes.items():
    d = os.path.join(ROOT, os.path.join("android", "app", "src", "main", "res", "mipmap-" + dpi))
    os.makedirs(d, exist_ok=True)
    art(s, 0.62, rounded=True).save(os.path.join(d, "ic_launcher.png"))
    art(s, 0.62, circle=True).save(os.path.join(d, "ic_launcher_round.png"))
    fg = s * 108 // 48  # 前景层画布按 108dp 基准
    glyph_only(fg, 0.50).save(os.path.join(d, "ic_launcher_foreground.png"))

# ---- 自适应图标 XML：背景纯色 + 前景 png ----
v26 = os.path.join(mipmap + "-anydpi-v26")
os.makedirs(v26, exist_ok=True)
adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(v26, name), "w", encoding="utf-8") as f:
        f.write(adaptive)

# 背景色改为品牌深蓝
values = os.path.join(ROOT, "android", "app", "src", "main", "res", "values")
with open(os.path.join(values, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1D4ED8</color>\n</resources>\n')

print("icons generated")

