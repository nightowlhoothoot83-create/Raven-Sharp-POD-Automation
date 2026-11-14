"""Deterministic original geometric botanical artwork; no inference or provider calls."""
from pathlib import Path
import sys, json, hashlib
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'backend'))
from readiness import inspect_artwork
out = Path(__file__).resolve().parents[1]/'products'/'quiet-garden'
out.mkdir(parents=True, exist_ok=True)
for name, bg, ink, sun in [('sage', '#f7f3e9', '#34594d', '#cc875c'), ('midnight', '#172e35', '#d3d9bd', '#e5b271')]:
    im = Image.new('RGB', (2400, 3000), bg); draw = ImageDraw.Draw(im)
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="8in" height="10in" viewBox="0 0 2400 3000"><rect width="2400" height="3000" fill="{bg}"/>']
    def ellipse(box, fill):
        draw.ellipse(box, fill=fill)
        x0,y0,x1,y1=box; svg.append(f'<ellipse cx="{(x0+x1)/2}" cy="{(y0+y1)/2}" rx="{(x1-x0)/2}" ry="{(y1-y0)/2}" fill="{fill}"/>')
    def line(points, color, width):
        draw.line(points, fill=color, width=width)
        svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="{width}"/>')
    ellipse((820,430,1580,1190), sun)
    # Original arrangement: three stems, paired alternating geometric leaves.
    for cx, top, bend in [(720,1200,-90),(1200,950,0),(1680,1200,90)]:
        line([(cx,2410),(cx+bend,top)], ink, 18)
        for j in range(5):
            cy=top+150+j*195; x=cx+bend*(2410-cy)/(2410-top)
            side = 1 if j%2 else -1
            ellipse((x+side*115-125,cy-65,x+side*115+125,cy+65), ink)
            line([(x,cy+65),(x+side*115,cy)], ink, 12)
    line([(460,2475),(1940,2475)], ink, 16)
    svg.append('</svg>')
    stem=out/f'quiet-garden-{name}'
    stem.with_suffix('.svg').write_text('\n'.join(svg))
    im.save(stem.with_suffix('.png'), dpi=(300,300))
    preview=im.copy(); preview.thumbnail((640,800)); preview.save(out/f'{stem.name}-flat-preview.jpg',quality=90)
    report=inspect_artwork(stem.with_suffix('.png'),8,10)
    manifest={'title':f'Quiet Garden {name.title()} geometric botanical art print',
        'description':'Original geometric botanical composition. Intended artwork size 8 x 10 inches. Physical paper, finish, provider, shipping, price and mockup must be confirmed before publication.',
        'keyword_status':'candidate only; demand and conversion not verified',
        'print_spec':{'width_inches':8,'height_inches':10,'dpi':300},
        'inspection':report,'preview_type':'flat artwork preview; not a provider mockup',
        'status':'offline_artwork_only','provider_draft_id':None,'price':None,
        'rights':'Original deterministic shapes authored for this project; no third-party art or fonts.',
        'launch_blockers':['visual_review','provider_connection','catalog_size_match','authentic_mockup','destination_quote','verified_checkout_and_tracking']}
    (out/f'{stem.name}.json').write_text(json.dumps(manifest,indent=2))
print('Generated two original 2400x3000 PNGs, editable SVGs, flat previews and inspection manifests.')
