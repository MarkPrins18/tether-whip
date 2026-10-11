"""Generates app icon, adaptive icon, splash image and Play Store graphics."""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ROOT = os.path.join(os.path.dirname(__file__), '..')
A = lambda *p: os.path.join(ROOT, *p)
NAVY = (11, 15, 46); AMBER = (255, 184, 31); MINT = (88, 242, 201); ICE = (234, 242, 255); ROSE = (255, 77, 126)

def art(size, scale=1.0, bg=True):
    S = 2  # supersample
    N = size * S
    img = Image.new('RGBA', (N, N), NAVY + (255,) if bg else (0, 0, 0, 0))
    if bg:
        glow = Image.new('RGBA', (N, N), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
        gd.ellipse([N * 0.05, N * 0.0, N * 0.95, N * 0.9], fill=(46, 58, 140, 150))
        img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(N * 0.12)))
    c = N / 2
    u = N * scale / 1024.0  # unit: 1 = a pixel of the 1024 design
    ox, oy = c - 512 * u, c - 512 * u
    P = lambda x, y: (ox + x * u, oy + y * u)
    layer = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    ax, ay = P(330, 330); ang = math.radians(45); R = 470 * u
    bx, by = ax + R * math.cos(ang), ay + R * math.sin(ang)
    # fading orbit trail behind the ball
    for i in range(44):
        a0 = math.radians(45 - 66 + i * 1.5); a1 = a0 + math.radians(1.7)
        al = int(10 + 190 * (i / 43) ** 1.6)
        d.line([(ax + R * math.cos(a0), ay + R * math.sin(a0)), (ax + R * math.cos(a1), ay + R * math.sin(a1))], fill=AMBER + (al,), width=int(16 * u))
    # orbs ahead on the orbit
    for deg in (68, 88, 108):
        r = math.radians(deg); ox_, oy_ = ax + R * math.cos(r), ay + R * math.sin(r)
        d.ellipse([ox_ - 30 * u, oy_ - 30 * u, ox_ + 30 * u, oy_ + 30 * u], fill=MINT + (255,))
    # rope
    d.line([(ax, ay), (bx, by)], fill=AMBER + (255,), width=int(24 * u))
    # anchor
    d.ellipse([ax - 76 * u, ay - 76 * u, ax + 76 * u, ay + 76 * u], outline=AMBER + (150,), width=int(12 * u))
    d.ellipse([ax - 44 * u, ay - 44 * u, ax + 44 * u, ay + 44 * u], fill=AMBER + (255,))
    # ball with halo
    halo = Image.new('RGBA', (N, N), (0, 0, 0, 0)); hd = ImageDraw.Draw(halo)
    hd.ellipse([bx - 120 * u, by - 120 * u, bx + 120 * u, by + 120 * u], fill=AMBER + (120,))
    layer = Image.alpha_composite(halo.filter(ImageFilter.GaussianBlur(26 * u)), layer)
    d = ImageDraw.Draw(layer)
    d.ellipse([bx - 74 * u, by - 74 * u, bx + 74 * u, by + 74 * u], fill=ICE + (255,))
    d.ellipse([bx - 74 * u, by - 74 * u, bx + 74 * u, by + 74 * u], outline=(154, 165, 230, 255), width=int(8 * u))
    img = Image.alpha_composite(img, layer)
    return img.resize((size, size), Image.LANCZOS)

os.makedirs(A('assets'), exist_ok=True); os.makedirs(A('store'), exist_ok=True)
icon = art(1024, 1.0, True).convert('RGB'); icon.save(A('assets', 'icon.png'))
art(1024, 0.62, False).save(A('assets', 'adaptive-icon.png'))   # content stays inside the 66% safe zone
art(1024, 0.9, False).save(A('assets', 'splash-icon.png'))
icon.resize((512, 512), Image.LANCZOS).save(A('store', 'play-icon-512.png'))

# Feature graphic 1024x500
W, H = 1024, 500
fg = Image.new('RGB', (W, H), NAVY)
g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
gd.ellipse([-100, -200, 700, 500], fill=(46, 58, 140, 140))
fg = Image.alpha_composite(fg.convert('RGBA'), g.filter(ImageFilter.GaussianBlur(70)))
a = art(520, 1.0, False); fg.alpha_composite(a, (W - 440, -20))
d = ImageDraw.Draw(fg)
def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
d.text((60, 120), 'TETHER', font=font(112), fill=ICE)
d.text((60, 235), 'WHIP', font=font(112), fill=AMBER)
d.text((64, 385), 'Swing. Release. Outrun the void.', font=font(28), fill=(154, 165, 230))
fg.convert('RGB').save(A('store', 'feature-graphic-1024x500.png'))
print('icons ok')
