"""
Raven Sharp Studio — FastAPI backend.
AI-powered creator tools for POD sellers. Subscription-gated.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient as AsyncIOMotorClient
import os, io, base64, uuid, json, logging, httpx, stripe
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from PIL import Image, ImageFilter, ImageEnhance

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- Config -----------------------------------------------------------------
MONGO_URL        = os.environ['MONGO_URL']
DB_NAME          = os.environ['DB_NAME']
ANTHROPIC_API_KEY= os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_API_KEY   = os.environ.get('GEMINI_API_KEY', '')
STRIPE_API_KEY   = os.environ.get('STRIPE_API_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
IMGBB_API_KEY    = os.environ.get('IMGBB_API_KEY', '')
OWNER_EMAIL      = os.environ.get('OWNER_EMAIL', 'ascensiondigitalagency@outlook.com')

stripe.api_key = STRIPE_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Raven Sharp Studio API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
log = logging.getLogger("ravensharp")

# --- Tier config ------------------------------------------------------------
TIER_LIMITS = {
    "free":    {"pod_analyses": 5,    "image_generations": 2,    "image_optimisations": 10,   "content_generations": 3},
    "creator": {"pod_analyses": 50,   "image_generations": 30,   "image_optimisations": 200,  "content_generations": 50},
    "growth":  {"pod_analyses": 150,  "image_generations": 100,  "image_optimisations": 500,  "content_generations": 150},
    "pro":     {"pod_analyses": 500,  "image_generations": 300,  "image_optimisations": 2000, "content_generations": 500},
    "agency":  {"pod_analyses": 2000, "image_generations": 1000, "image_optimisations": 9999, "content_generations": 2000},
}

# Real Stripe price IDs
TIER_PRICES = {
    "free":    {"amount": 0.0,   "name": "Free",    "monthly": None,                              "annual": None},
    "creator": {"amount": 39.0,  "name": "Creator", "monthly": "price_1TcNq82NTuOJBly9M6kV8PwJ", "annual": "price_1TcNq82NTuOJBly98Z01R5Tc"},
    "growth":  {"amount": 69.0,  "name": "Growth",  "monthly": "price_1TcNq92NTuOJBly9GzAZIPtU", "annual": "price_1TcNqA2NTuOJBly9JCgCSd69"},
    "pro":     {"amount": 119.0, "name": "Pro",     "monthly": "price_1TcNqB2NTuOJBly9W1WoA1Kc", "annual": "price_1TcNqB2NTuOJBly9YgsJxgoZ"},
    "agency":  {"amount": 189.0, "name": "Agency",  "monthly": "price_1TcNqC2NTuOJBly9N76UNDLq", "annual": "price_1TcNqD2NTuOJBly92U08Js3K"},
}

# --- Platform configs -------------------------------------------------------
PLATFORMS = {
    "etsy": {
        "name": "Etsy",
        "api": True,
        "fields": ["title", "description", "tags", "price", "sku", "quantity"],
        "title_limit": 140,
        "tag_limit": 13,
        "tag_char_limit": 20,
        "notes": "13 tags max, 140 char title, tags comma separated"
    },
    "printify": {
        "name": "Printify",
        "api": True,
        "fields": ["title", "description", "tags", "blueprint_id", "print_provider_id", "variants"],
        "title_limit": 140,
        "notes": "Requires Blueprint ID and Print Provider ID"
    },
    "printful": {
        "name": "Printful",
        "api": True,
        "fields": ["name", "description", "tags", "variants", "files"],
        "title_limit": 255,
        "notes": "Direct API, sync products to stores"
    },
    "gelato": {
        "name": "Gelato",
        "api": True,
        "fields": ["title", "description", "tags", "productUid", "imagePlaceholders"],
        "title_limit": 255,
        "notes": "Requires Product UID and image placeholders"
    },
    "redbubble": {
        "name": "Redbubble",
        "api": False,
        "csv": True,
        "fields": ["title", "description", "tags", "product_type", "price_modifier"],
        "title_limit": 60,
        "tag_limit": 15,
        "notes": "CSV only — max 15 tags comma separated, max 60 char title"
    },
    "teepublic": {
        "name": "TeePublic",
        "api": False,
        "csv": True,
        "fields": ["title", "description", "tags"],
        "title_limit": 100,
        "tag_limit": 50,
        "notes": "CSV bulk upload, unlimited tags"
    },
    "merch_by_amazon": {
        "name": "Merch by Amazon",
        "api": False,
        "csv": True,
        "fields": ["brand_name", "item_name", "bullet_point_1", "bullet_point_2", "description", "generic_keywords", "department"],
        "title_limit": 60,
        "notes": "5 bullet points, strict field naming, no special chars"
    },
    "shopify": {
        "name": "Shopify",
        "api": True,
        "fields": ["title", "body_html", "tags", "vendor", "product_type", "variants"],
        "title_limit": 255,
        "notes": "Requires store URL and access token"
    },
    "zazzle": {
        "name": "Zazzle",
        "api": False,
        "csv": True,
        "fields": ["product_name", "description", "tags", "product_type", "image_url"],
        "title_limit": 160,
        "tag_limit": 10,
        "notes": "CSV upload, images must be hosted URLs"
    },
}

# --- Pydantic models --------------------------------------------------------
class AnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/png"
    image_name: str = "artwork"
    primary_market: str = "global"
    price_tier: str = "mid"
    shop_name: str = ""
    platform: str = "etsy"

class GenerateImageRequest(BaseModel):
    prompt: str
    style: Optional[str] = None

class OptimiseRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/png"
    width: int = 4500
    height: int = 4500
    sharpen: float = 3.0
    saturation: float = 5.0
    output_format: str = "png"

class ContentRequest(BaseModel):
    content_type: str
    topic: str
    tone: Optional[str] = "engaging"
    keywords: Optional[List[str]] = None
    length: Optional[str] = "medium"

class CheckoutRequest(BaseModel):
    tier: str
    billing: str = "monthly"
    origin_url: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GelatoKeyRequest(BaseModel):
    api_key: str

# --- Auth helpers -----------------------------------------------------------
import bcrypt as bcrypt_mod
import jwt as pyjwt

JWT_SECRET = os.environ.get('JWT_SECRET', 'changeme')
JWT_ALGO   = 'HS256'

def make_token(user_id: str, email: str) -> str:
    payload = {"user_id": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def require_user(request: Request) -> dict:
    token = request.cookies.get("token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"user_id": data["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def month_key():
    now = datetime.now(timezone.utc)
    return f"{now.year}-{now.month:02d}"

async def check_and_increment_usage(user_id: str, tier: str, metric: str) -> dict:
    if tier == "owner":
        return {"ok": True, "limit": 999999, "used": 0}
    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"]).get(metric, 0)
    mk = month_key()
    doc = await db.usage.find_one({"user_id": user_id, "month": mk}) or {}
    used = doc.get(metric, 0)
    if used >= limit:
        return {"ok": False, "limit": limit, "used": used}
    await db.usage.update_one(
        {"user_id": user_id, "month": mk},
        {"$inc": {metric: 1}},
        upsert=True
    )
    return {"ok": True, "limit": limit, "used": used + 1}

# --- Anthropic helper -------------------------------------------------------
async def call_claude(system: str, prompt: str, image_b64: str = None, mime: str = "image/png") -> str:
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    content = []
    if image_b64:
        content.append({"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}})
    content.append({"type": "text", "text": prompt})

    body = {
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 2048,
        "system": system,
        "messages": [{"role": "user", "content": content}],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
        r.raise_for_status()
        return r.json()["content"][0]["text"]

# --- Gemini helper (image gen) ---------------------------------------------
async def call_gemini_image(prompt: str) -> str:
    """Returns base64 image string via Gemini image generation."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key={GEMINI_API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, json=body)
        r.raise_for_status()
        data = r.json()
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            return part["inlineData"]["data"]
    raise HTTPException(status_code=502, detail="Gemini returned no image")

# --- POD Prompt -------------------------------------------------------------
POD_PROMPT_TEMPLATE = """You are an expert POD (print-on-demand) product strategist. Analyse this artwork image carefully and return ONLY valid JSON — no markdown, no explanation, no code fences.

═══ ARTWORK ANALYSIS RULES ═══
First identify the artwork type, then apply the matching product rules STRICTLY:

TYPE A — Highly detailed / intricate / fine art / photography / spiritual / mystical:
✓ MUST include: Art Print Poster, Stretched Canvas, Tapestry
✓ SHOULD include: Framed Poster, Hardcover Journal, Throw Pillow, Blanket, Puzzle, Phone Case
✗ AVOID: Pet Bowl, Apron, Kids T-Shirt

TYPE B — Bold graphic / high contrast / text-heavy / meme / political / dystopian:
✓ MUST include: Unisex T-Shirt, Art Print Poster
✓ SHOULD include: Hoodie, Tote Bag, Sticker Sheet, Die-Cut Sticker, Mug, Phone Case
✗ AVOID: Tapestry, Canvas

TYPE C — Bright / colourful / character-based / children's / fun:
✓ MUST include: Unisex T-Shirt, Kids T-Shirt, Sticker Sheet
✓ SHOULD include: Tote Bag, Mug, Die-Cut Sticker, Greeting Cards, Phone Case
✗ AVOID: Tapestry, Metal Print

TYPE D — Dark / moody / gothic / occult / psychedelic:
✓ MUST include: Tapestry, Art Print Poster, Hoodie
✓ SHOULD include: Stretched Canvas, Hardcover Journal, Playing Cards, Puzzle, Blanket, Phone Case
✗ AVOID: Kids T-Shirt, Greeting Cards, Desk Calendar

TYPE E — Fine art photography / landscape / nature / abstract:
✓ MUST include: Stretched Canvas, Art Print Poster, Metal Print, Acrylic Print
✓ SHOULD include: Framed Poster, Throw Pillow, Phone Case
✗ AVOID: Stickers, Kids T-Shirt, Apron

PRICING — realistic base costs, target 55%+ margin:
T-shirts: base $12, retail $28-34 | Hoodies: base $22, retail $55-65
Posters: base $8, retail $22-32 | Canvas: base $28, retail $65-95
Tapestry: base $25, retail $55-75 | Mugs: base $8, retail $22-26
Stickers: base $3, retail $6-9 | Journals: base $12, retail $28-38
Tote bags: base $10, retail $24-30 | Blankets: base $28, retail $65-80
Puzzles: base $18, retail $38-48 | Playing Cards: base $12, retail $28-36
Pillows: base $18, retail $42-55 | Phone cases: base $10, retail $22-28
Metal/Acrylic prints: base $35, retail $75-110

Price tier adjustment: "{price_tier}" (budget = lower end, mid = middle, premium = upper end).

PLATFORM-SPECIFIC OUTPUT RULES for {platform}:
{platform_rules}

Return this EXACT JSON structure:
{{
  "artworkDescription": "specific: style, subject, colours, mood, detail level",
  "artworkType": "A|B|C|D|E",
  "marketPotential": "hot|strong|good",
  "marketPotentialReason": "one specific sentence why THIS artwork will sell",
  "recommendedProducts": [
    {{
      "product": "exact product name",
      "category": "apparel|homeware|accessories|wall_art|stationery|specialty",
      "whySuited": "specific reason for THIS artwork",
      "popularityScore": "high|medium|niche",
      "baseCostUSD": 12.00,
      "suggestedRetailUSD": 32.00,
      "profitMarginPct": 63,
      "variants": "e.g. S-3XL, 8 colours",
      "shippingNote": "shipping estimate"
    }}
  ],
  "platformExport": {{
    "title": "SEO title within platform limit",
    "description": "3 sentences: what it is, who it's for, why they love it",
    "tags": ["tag1","tag2","tag3"],
    "platform_fields": {{}}
  }},
  "seoTitle": "SEO title under 140 chars",
  "seoDescription": "3 sentences emotional and specific",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13"]
}}

STRICT:
- 6-8 products ONLY from correct type rules
- profitMarginPct = ((retail - base) / retail) * 100 rounded to whole
- Platform: {platform} — Shop: {shop}
- Market: {market}
- Return ONLY the JSON, nothing else."""

PLATFORM_RULES = {
    "etsy":            "Title max 140 chars. Provide exactly 13 tags, each max 20 chars, in tags array. Include quantity: 999 and sku in platform_fields.",
    "printify":        "Include blueprint_id suggestion and print_provider_id in platform_fields. Tags as array.",
    "printful":        "Include sync_variants array with size/color options in platform_fields.",
    "gelato":          "Include productUid suggestion in platform_fields. Tags as array.",
    "redbubble":       "Title max 60 chars. Provide max 15 tags comma-separated as single string in platform_fields.tags_string. Include product_type: 'all'.",
    "teepublic":       "Title max 100 chars. Provide up to 50 tags as array. Include product_type in platform_fields.",
    "merch_by_amazon": "Title max 60 chars. No special characters. Provide brand_name, bullet_point_1, bullet_point_2, bullet_point_3 in platform_fields. Department: 'mens' or 'womens' or 'kids'.",
    "shopify":         "Title max 255 chars. Tags as comma-separated string. Include vendor and product_type in platform_fields.",
    "zazzle":          "Title max 160 chars. Max 10 tags. Include product_type in platform_fields. Images require hosted URLs.",
}

def extract_json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        t = "\n".join(lines[1:-1]) if lines[-1].startswith("```") else "\n".join(lines[1:])
    start = t.find("{")
    end = t.rfind("}")
    if start >= 0 and end > start:
        t = t[start:end + 1]
    return json.loads(t)

# --- Auth endpoints ---------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt_mod.hashpw(body.password.encode(), bcrypt_mod.gensalt()).decode()
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    tier = "owner" if body.email == OWNER_EMAIL else "free"
    user = {
        "user_id": user_id, "email": body.email, "name": body.name,
        "password_hash": hashed, "tier": tier,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = make_token(user_id, body.email)
    response.set_cookie("token", token, httponly=True, max_age=86400*30, samesite="lax")
    return {"user_id": user_id, "email": body.email, "name": body.name, "tier": tier, "token": token}

@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not bcrypt_mod.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(user["user_id"], body.email)
    response.set_cookie("token", token, httponly=True, max_age=86400*30, samesite="lax")
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "tier": user.get("tier","free"), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("token")
    return {"ok": True}

@api.get("/auth/me")
async def me(request: Request):
    user = await require_user(request)
    return {k: v for k, v in user.items() if k != "password_hash"}

# --- Account ----------------------------------------------------------------
@api.post("/account/gelato-key")
async def save_gelato_key(body: GelatoKeyRequest, request: Request):
    user = await require_user(request)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"gelato_api_key": body.api_key}})
    return {"ok": True}

@api.get("/account/usage")
async def get_usage(request: Request):
    user = await require_user(request)
    doc = await db.usage.find_one({"user_id": user["user_id"], "month": month_key()}) or {}
    tier = user.get("tier", "free")
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    return {"usage": {k: doc.get(k, 0) for k in limits}, "limits": limits, "tier": tier}

@api.get("/platforms")
async def get_platforms():
    return {"platforms": PLATFORMS}

# --- POD: Analyze -----------------------------------------------------------
@api.post("/pod/analyze")
async def pod_analyze(body: AnalyzeRequest, request: Request):
    user = await require_user(request)
    check = await check_and_increment_usage(user["user_id"], user.get("tier","free"), "pod_analyses")
    if not check["ok"]:
        raise HTTPException(status_code=402, detail=f"Monthly POD analysis limit ({check['limit']}) reached.")

    platform_rules = PLATFORM_RULES.get(body.platform, PLATFORM_RULES["etsy"])
    prompt = POD_PROMPT_TEMPLATE.format(
        price_tier=body.price_tier,
        platform=body.platform,
        platform_rules=platform_rules,
        shop=body.shop_name or "Independent shop",
        market=body.primary_market,
    )

    try:
        response_text = await call_claude(
            system="You are an expert POD product strategist. Always return valid JSON only.",
            prompt=prompt,
            image_b64=body.image_base64,
            mime=body.mime_type,
        )
    except Exception as e:
        log.exception("Claude vision call failed")
        await db.usage.update_one({"user_id": user["user_id"], "month": month_key()}, {"$inc": {"pod_analyses": -1}})
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {e}")

    try:
        data = extract_json(response_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {e}")

    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    await db.projects.insert_one({
        "project_id": project_id,
        "user_id": user["user_id"],
        "image_name": body.image_name,
        "platform": body.platform,
        "analysis": data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"project_id": project_id, "analysis": data, "usage": check}

# --- POD: Generate image via Gemini ----------------------------------------
@api.post("/pod/generate-image")
async def generate_image(body: GenerateImageRequest, request: Request):
    user = await require_user(request)
    check = await check_and_increment_usage(user["user_id"], user.get("tier","free"), "image_generations")
    if not check["ok"]:
        raise HTTPException(status_code=402, detail=f"Monthly image generation limit ({check['limit']}) reached.")

    full_prompt = body.prompt
    if body.style:
        full_prompt = f"{body.prompt}. Style: {body.style}. High quality print-ready artwork, suitable for POD products."

    try:
        img_b64 = await call_gemini_image(full_prompt)
    except Exception as e:
        await db.usage.update_one({"user_id": user["user_id"], "month": month_key()}, {"$inc": {"image_generations": -1}})
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e}")

    return {"image_base64": img_b64, "mime_type": "image/png", "usage": check}

# --- Optimise image ---------------------------------------------------------
@api.post("/optimise")
async def optimise_image(body: OptimiseRequest, request: Request):
    user = await require_user(request)
    check = await check_and_increment_usage(user["user_id"], user.get("tier","free"), "image_optimisations")
    if not check["ok"]:
        raise HTTPException(status_code=402, detail="Monthly optimisation limit reached.")

    raw = base64.b64decode(body.image_base64)
    img = Image.open(io.BytesIO(raw)).convert("RGBA" if body.output_format == "png" else "RGB")
    img = img.resize((body.width, body.height), Image.LANCZOS)

    # DPI injection
    dpi = (300, 300)

    if body.sharpen > 0:
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=int(body.sharpen * 50), threshold=3))
    if body.saturation != 1.0:
        if img.mode == "RGBA":
            r, g, b, a = img.split()
            rgb = Image.merge("RGB", (r, g, b))
            rgb = ImageEnhance.Color(rgb).enhance(body.saturation)
            r, g, b = rgb.split()
            img = Image.merge("RGBA", (r, g, b, a))
        else:
            img = ImageEnhance.Color(img).enhance(body.saturation)

    buf = io.BytesIO()
    if body.output_format == "jpeg":
        img.convert("RGB").save(buf, format="JPEG", quality=95, dpi=dpi)
        mime = "image/jpeg"
    else:
        img.save(buf, format="PNG", dpi=dpi)
        mime = "image/png"

    return {
        "image_base64": base64.b64encode(buf.getvalue()).decode(),
        "mime_type": mime,
        "width": body.width,
        "height": body.height,
        "usage": check,
    }

# --- Content generation -----------------------------------------------------
CONTENT_TEMPLATES = {
    "product_description": "Write a compelling product description for a POD item featuring '{topic}'. Tone: {tone}. Length: {length}. Include these keywords naturally: {keywords}.",
    "blog_post": "Write a blog post about '{topic}'. Tone: {tone}. Length: {length}. Keywords to include: {keywords}.",
    "seo_copy": "Write SEO-optimised copy for '{topic}'. Tone: {tone}. Length: {length}. Target keywords: {keywords}.",
    "social_caption": "Write a social media caption for '{topic}'. Tone: {tone}. Length: {length}. Include relevant hashtags.",
}

@api.post("/content/generate")
async def content_generate(body: ContentRequest, request: Request):
    user = await require_user(request)
    check = await check_and_increment_usage(user["user_id"], user.get("tier","free"), "content_generations")
    if not check["ok"]:
        raise HTTPException(status_code=402, detail="Monthly content generation limit reached.")

    template = CONTENT_TEMPLATES.get(body.content_type, CONTENT_TEMPLATES["product_description"])
    prompt = template.format(
        topic=body.topic,
        tone=body.tone or "engaging",
        length=body.length or "medium",
        keywords=", ".join(body.keywords or []) if body.keywords else "naturally relevant keywords",
    )

    try:
        text = await call_claude(
            system="You are an expert copywriter specialising in e-commerce and content marketing.",
            prompt=prompt,
        )
    except Exception as e:
        await db.usage.update_one({"user_id": user["user_id"], "month": month_key()}, {"$inc": {"content_generations": -1}})
        raise HTTPException(status_code=502, detail=f"Content generation failed: {e}")

    return {"content": text, "usage": check}

# --- Projects ---------------------------------------------------------------
@api.get("/projects")
async def list_projects(request: Request):
    user = await require_user(request)
    cursor = db.projects.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    return {"projects": [p async for p in cursor]}

@api.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    user = await require_user(request)
    p = await db.projects.find_one({"project_id": project_id, "user_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

# --- CSV Export -------------------------------------------------------------
@api.post("/export/csv")
async def export_csv(request: Request):
    body = await request.json()
    platform = body.get("platform", "etsy")
    project_id = body.get("project_id")
    user = await require_user(request)

    p = await db.projects.find_one({"project_id": project_id, "user_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    analysis = p.get("analysis", {})
    export = analysis.get("platformExport", {})
    title = export.get("title", analysis.get("seoTitle", ""))
    description = export.get("description", analysis.get("seoDescription", ""))
    tags = export.get("tags", analysis.get("keywords", []))
    platform_fields = export.get("platform_fields", {})

    import csv, io as _io
    buf = _io.StringIO()

    if platform == "etsy":
        w = csv.writer(buf)
        w.writerow(["TITLE","DESCRIPTION","TAGS","PRICE","QUANTITY","SKU"])
        w.writerow([title[:140], description, ",".join(tags[:13]), "25.00", "999", f"RS-{project_id[:8]}"])

    elif platform == "redbubble":
        w = csv.writer(buf)
        w.writerow(["title","description","tags","product_type","price_modifier"])
        w.writerow([title[:60], description, ",".join(tags[:15]), "all", "0"])

    elif platform == "teepublic":
        w = csv.writer(buf)
        w.writerow(["title","description","tags"])
        w.writerow([title[:100], description, ",".join(tags[:50])])

    elif platform == "merch_by_amazon":
        w = csv.writer(buf)
        w.writerow(["brand_name","item_name","bullet_point_1","bullet_point_2","bullet_point_3","description","generic_keywords","department","color_name"])
        desc_parts = description.split(". ")
        w.writerow([
            "Ascension Digital",
            title[:60].replace('"','').replace("'",""),
            desc_parts[0] if len(desc_parts) > 0 else description[:200],
            desc_parts[1] if len(desc_parts) > 1 else "Premium quality print. Printed to order.",
            "Makes a perfect gift for art lovers.",
            description[:2000],
            " ".join(tags[:7]),
            "mens",
            "Various",
        ])

    elif platform == "zazzle":
        w = csv.writer(buf)
        w.writerow(["product_name","description","tags","product_type","image_url"])
        w.writerow([title[:160], description, ",".join(tags[:10]), "poster", ""])

    else:
        # Generic / master CSV
        w = csv.writer(buf)
        w.writerow(["title","description","tags","platform","project_id"])
        w.writerow([title, description, ",".join(tags), platform, project_id])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=raven-sharp-{platform}-{project_id[:8]}.csv"}
    )

# --- Stripe subscriptions ---------------------------------------------------
@api.post("/billing/checkout")
async def billing_checkout(body: CheckoutRequest, request: Request):
    user = await require_user(request)
    tier_data = TIER_PRICES.get(body.tier)
    if not tier_data or body.tier == "free":
        raise HTTPException(status_code=400, detail="Invalid tier")

    price_id = tier_data.get(body.billing)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid billing period")

    origin = body.origin_url.rstrip("/")
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{origin}/account?session_id={{CHECKOUT_SESSION_ID}}&tier={body.tier}",
            cancel_url=f"{origin}/pricing?cancelled=1",
            customer_email=user["email"],
            metadata={"user_id": user["user_id"], "tier": body.tier},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": user["user_id"],
        "tier": body.tier,
        "amount": tier_data["amount"],
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.id}

@api.get("/billing/status/{session_id}")
async def billing_status(session_id: str, request: Request):
    user = await require_user(request)
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if session.payment_status == "paid" and tx.get("payment_status") != "paid":
        tier = tx.get("tier", "free")
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid"}})
        await db.users.update_one({"user_id": tx["user_id"]}, {"$set": {"tier": tier}})

    return {"status": session.status, "payment_status": session.payment_status, "tier": tx.get("tier")}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        ev = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        return JSONResponse({"received": False}, status_code=400)

    if ev["type"] == "checkout.session.completed":
        session = ev["data"]["object"]
        if session.get("payment_status") == "paid":
            meta = session.get("metadata", {})
            user_id = meta.get("user_id")
            tier = meta.get("tier", "free")
            if user_id:
                await db.users.update_one({"user_id": user_id}, {"$set": {"tier": tier}})
                await db.payment_transactions.update_one(
                    {"session_id": session["id"]},
                    {"$set": {"payment_status": "paid"}}
                )
    return {"received": True}

# --- Gelato integration -----------------------------------------------------
GELATO_BASE = "https://order.gelatoapis.com"
GELATO_ECOMMERCE = "https://ecommerce.gelatoapis.com"

@api.get("/gelato/stores")
async def gelato_stores(request: Request):
    user = await require_user(request)
    key = user.get("gelato_api_key")
    if not key:
        raise HTTPException(status_code=400, detail="No Gelato API key configured")
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{GELATO_ECOMMERCE}/v1/stores", headers={"X-API-KEY": key})
        r.raise_for_status()
    return r.json()

# --- Health -----------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "raven-sharp-pod"}

app.add_middleware(CORSMiddleware, 
    allow_origins=[
        "https://pod.raven-sharp.com",
        "https://ravensharppod.pages.dev",
        "http://localhost:3000",
        "http://localhost:3001",
    ], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)
app.include_router(api)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
