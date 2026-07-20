"""
Raven Sharp POD Suite — FastAPI Backend
Full autonomous POD pipeline with AI upscaling, image gen, multi-platform push
Part of Ascension Digital Group
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os, uuid, json, logging, httpx, base64, bcrypt, jwt, asyncio, hmac, hashlib, io, re
from PIL import Image
from platforms import (push_printify_full, push_gelato_full, push_printful_full,
    push_etsy_draft, etsy_auth_url, etsy_exchange_token,
    generate_redbubble_package, generate_teepublic_package,
    generate_merch_amazon_package, generate_csv_download,
    ARTWORK_TYPE_PRODUCTS, PRINTIFY_BLUEPRINTS)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ravensharp-pod")

# --- Self-healing startup config -------------------------------------------
# Some vars have a safe auto-fix (app boots in a slightly degraded mode with a
# loud warning). MONGO_URL has no safe default — if it's missing, we can't
# invent a working database, so we fail fast with ONE clear diagnostic line
# instead of a bare KeyError traceback that's hard to read in Railway logs.
_startup_warnings = []

MONGO_URL = os.environ.get("MONGO_URL")
if not MONGO_URL:
    log.critical(
        "STARTUP FAILURE: MONGO_URL is not set on this deployment. "
        "The app cannot start without a database connection string. "
        "Set MONGO_URL in Railway's environment variables for this service and redeploy."
    )
    raise RuntimeError("Missing required environment variable: MONGO_URL")

DB_NAME = os.environ.get("DB_NAME")
if not DB_NAME:
    DB_NAME = "ravensharp_pod"
    _startup_warnings.append(f"DB_NAME was not set — defaulting to '{DB_NAME}'.")

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    import secrets as _secrets
    JWT_SECRET = _secrets.token_hex(32)
    _startup_warnings.append(
        "JWT_SECRET was not set — auto-generated a temporary one for this boot. "
        "Existing user sessions will be invalidated on every restart until a permanent "
        "JWT_SECRET is set in Railway's environment variables."
    )

for _w in _startup_warnings:
    log.warning("STARTUP: %s", _w)

ANTHROPIC_KEY     = os.environ.get("ANTHROPIC_API_KEY", "")
RUNWARE_API_KEY   = os.environ.get("RUNWARE_API_KEY", "")
RUNWARE_MODEL     = os.environ.get("RUNWARE_MODEL", "runware:101@1")  # image generation — verify/pick exact model in your Runware dashboard's model browser
RUNWARE_UPSCALE_MODEL = os.environ.get("RUNWARE_UPSCALE_MODEL", "runware:504@1")  # Real-ESRGAN — matches the UI label, supports true 4x
RUNWARE_BGREMOVE_MODEL = os.environ.get("RUNWARE_BGREMOVE_MODEL", "runware:110@1")  # verify against your dashboard
R2_ENDPOINT       = os.environ.get("R2_ENDPOINT", "")  # https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY     = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY     = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET         = os.environ.get("R2_BUCKET", "adg-images")
STRIPE_KEY        = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
if STRIPE_KEY and not STRIPE_WEBHOOK_SECRET:
    # NOTE: _startup_warnings' print loop already ran above this point in the
    # file, so appending to that list here would never actually get logged —
    # logging directly instead.
    log.warning(
        "STARTUP: STRIPE_WEBHOOK_SECRET was not set — /billing/webhook will REJECT all events "
        "(fail-closed) until this is set. Get it from Stripe Dashboard -> Developers -> Webhooks."
    )
OWNER_EMAIL       = os.environ.get("OWNER_EMAIL", "ascensiondigitalagency@outlook.com")
ETSY_API_KEY      = os.environ.get("ETSY_API_KEY", "")
BACKEND_URL       = os.environ.get("BACKEND_URL", "")
if not BACKEND_URL:
    log.warning(
        "STARTUP: BACKEND_URL was not set — Etsy Connect's OAuth redirect will be malformed "
        "until this is set to this service's real public Railway URL."
    )
FRONTEND_URL      = os.environ.get("FRONTEND_URL", "https://pod.raven-sharp.com")
CORS_ORIGINS      = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        ",".join([
            FRONTEND_URL,
            "https://pod.raven-sharp.com",
            "https://ravensharppod.pages.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]),
    ).split(",")
    if origin.strip()
]

client = AsyncIOMotorClient(MONGO_URL)
db     = client[DB_NAME]

app = FastAPI(title="Raven Sharp POD Suite API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.raven-sharp\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Tier config ───────────────────────────────────────────────────────────────
TIERS = {
    "free":    {"pipeline_runs": 3,     "images_per_run": 3,  "ai_gen_credits": 5,   "scheduling": False,       "bulk_approve": False, "workspaces": 1,     "style_profiles": 0,  "priority": False, "price": 0},
    "creator": {"pipeline_runs": 20,    "images_per_run": 10, "ai_gen_credits": 30,  "scheduling": "gen_only",  "bulk_approve": False, "workspaces": 1,     "style_profiles": 3,  "priority": False, "price": 39},
    "growth":  {"pipeline_runs": 35,    "images_per_run": 15, "ai_gen_credits": 60,  "scheduling": "gen_only",  "bulk_approve": False, "workspaces": 1,     "style_profiles": 5,  "priority": False, "price": 69},
    "pro":     {"pipeline_runs": 50,    "images_per_run": 25, "ai_gen_credits": 100, "scheduling": "full",      "bulk_approve": True,  "workspaces": 1,     "style_profiles": 10, "priority": True,  "price": 119},
    "agency":  {"pipeline_runs": 80,    "images_per_run": 40, "ai_gen_credits": 250, "scheduling": "full",      "bulk_approve": True,  "workspaces": 5,     "style_profiles": -1, "priority": True,  "price": 189},
    "owner":   {"pipeline_runs": 99999, "images_per_run": 99999, "ai_gen_credits": 99999, "scheduling": "full", "bulk_approve": True,  "workspaces": 99999, "style_profiles": -1, "priority": True,  "price": 0},
}

STRIPE_PRICES = {
    "creator": {"monthly": "price_1TcNq82NTuOJBly9M6kV8PwJ", "annual": "price_1TcNq82NTuOJBly98Z01R5Tc"},
    "growth":  {"monthly": "price_1TcNq92NTuOJBly9GzAZIPtU", "annual": "price_1TcNqA2NTuOJBly9JCgCSd69"},
    "pro":     {"monthly": "price_1TcNqB2NTuOJBly9W1WoA1Kc", "annual": "price_1TcNqB2NTuOJBly9YgsJxgoZ"},
    "agency":  {"monthly": "price_1TcNqC2NTuOJBly9N76UNDLq", "annual": "price_1TcNqD2NTuOJBly92U08Js3K"},
}

# ── Platform config ───────────────────────────────────────────────────────────
PLATFORMS = {
    "gelato":    {"name": "Gelato",          "api": True,  "auth": "api_key"},
    "printify":  {"name": "Printify",        "api": True,  "auth": "api_key"},
    "printful":  {"name": "Printful",        "api": True,  "auth": "api_key"},
    "prodigi":   {"name": "Prodigi",         "api": True,  "auth": "api_key"},
    "etsy":      {"name": "Etsy",            "api": True,  "auth": "oauth2"},
    "shopify":   {"name": "Shopify",         "api": True,  "auth": "store_token"},
    "redbubble": {"name": "Redbubble",       "api": False, "auth": None},
    "teepublic": {"name": "TeePublic",       "api": False, "auth": None},
    "merch":     {"name": "Merch by Amazon", "api": False, "auth": None},
}

# ── Pydantic models ───────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    email: str
    password: str
    name: str

class LoginIn(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str]
    tier: str
    pipeline_runs_used: int = 0
    ai_gen_credits_used: int = 0
    created_at: datetime
    platform_keys: Optional[Dict[str, str]] = {}

class PlatformKeyIn(BaseModel):
    platform: str
    api_key: str
    store_id: Optional[str] = None

class PlatformDisconnectIn(BaseModel):
    platform: str

class StyleProfileIn(BaseModel):
    name: str
    base_prompt: str
    negative_prompt: Optional[str] = ""
    aspect_ratio: Optional[str] = "square"
    colour_palette: Optional[str] = ""
    mood_tags: Optional[List[str]] = []
    reference_image_url: Optional[str] = None  # if set, generation uses Runware (real character-consistency support) instead of FLUX Schnell (which has none)

class PipelineRunIn(BaseModel):
    # Optional for backwards compatibility. New runs are platform-neutral;
    # the destination is selected after review/export.
    platform: Optional[str] = None
    images: List[Dict[str, Any]]  # [{name, base64, mime}]
    style_profile_id: Optional[str] = None
    market: Optional[str] = "global"
    price_tier: Optional[str] = "mid"

class PipelineRetryIn(BaseModel):
    # Only required if the failed image never made it past the upscale step
    # (no checkpoint) — the source file isn't kept in the DB to save space,
    # so the frontend re-sends it from the browser's copy for that case only.
    base64: Optional[str] = None
    mime: Optional[str] = "image/jpeg"

class ImageGenIn(BaseModel):
    prompt: str
    style_profile_id: Optional[str] = None
    quantity: int = 1
    aspect_ratio: Optional[str] = "square"

class ScheduleIn(BaseModel):
    name: str
    platform: str
    source: str  # "preloaded" | "generated"
    style_profile_id: Optional[str] = None
    prompt: Optional[str] = None
    quantity: Optional[int] = 10
    frequency: str  # "once" | "daily" | "weekly"
    run_time: str   # "HH:MM"
    days: Optional[List[str]] = []
    active: bool = True

class ListingApprovalIn(BaseModel):
    run_id: str
    listings: List[Dict[str, Any]]  # approved/edited listings
    approve_all: bool = False
    platform: Optional[str] = None  # chosen at the final publish/export stage

class StripeCheckoutIn(BaseModel):
    tier: str
    billing: str = "monthly"  # monthly | annual

# ── Auth helpers ──────────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def make_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email,
                       "exp": datetime.now(timezone.utc) + timedelta(days=1)},
                      JWT_SECRET, algorithm="HS256")

def make_refresh(user_id: str) -> str:
    return jwt.encode({"sub": user_id,
                       "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                      JWT_SECRET, algorithm="HS256")

def set_cookies(response: Response, access: str, refresh: str):
    # Always secure/cross-site in production — Railway backend and Cloudflare
    # Pages frontend are always on different HTTPS domains from each other,
    # regardless of what FRONTEND_URL happens to be set to. Tying this to
    # FRONTEND_URL was fragile: if that one env var wasn't set correctly,
    # cookies silently fell back to settings that don't work cross-origin at
    # all, making every request after login look unauthenticated.
    kw = dict(httponly=True, secure=True, samesite="none", path="/")
    response.set_cookie("access_token", access,  max_age=86400, **kw)
    response.set_cookie("refresh_token", refresh, max_age=604800, **kw)

async def get_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user: raise HTTPException(401, "User not found")
        # Self-heal: an account matching OWNER_EMAIL can end up permanently
        # stuck on free-tier limits if it was created before OWNER_EMAIL was
        # configured correctly on Railway (tier is only set at registration
        # time and never re-checked). Fix it here on every authenticated
        # request rather than leaving the owner capped.
        if user.get("email", "").lower() == OWNER_EMAIL.lower() and user.get("tier") != "owner":
            log.warning(f"Self-healing: {user.get('email')} matches OWNER_EMAIL but had tier={user.get('tier')!r} — upgrading to owner")
            await db.users.update_one({"id": user["id"]}, {"$set": {"tier": "owner"}})
            user["tier"] = "owner"
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")

def check_tier_limit(user: dict, resource: str) -> bool:
    tier = user.get("tier", "free")
    limits = TIERS.get(tier, TIERS["free"])
    if tier == "owner": return True
    used_key = f"{resource}_used"
    limit = limits.get(resource, 0)
    used  = user.get(used_key, 0)
    if limit == -1: return True
    return used < limit

# ── Auth routes ───────────────────────────────────────────────────────────────
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    tier = "owner" if email == OWNER_EMAIL.lower() else "free"
    user = {"id": str(uuid.uuid4()), "email": email, "name": payload.name,
            "password_hash": hash_pw(payload.password), "tier": tier,
            "pipeline_runs_used": 0, "ai_gen_credits_used": 0,
            "platform_keys": {}, "style_profiles": [],
            "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(user)
    access = make_token(user["id"], email)
    refresh = make_refresh(user["id"])
    set_cookies(response, access, refresh)
    return {"id": user["id"], "email": email, "name": payload.name,
            "tier": tier, "pipeline_runs_used": 0, "ai_gen_credits_used": 0,
            "created_at": user["created_at"], "platform_keys": {}}

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    access = make_token(user["id"], email)
    refresh = make_refresh(user["id"])
    set_cookies(response, access, refresh)
    return {"id": user["id"], "email": email, "name": user.get("name"),
            "tier": user.get("tier", "free"),
            "pipeline_runs_used": user.get("pipeline_runs_used", 0),
            "ai_gen_credits_used": user.get("ai_gen_credits_used", 0),
            "created_at": user["created_at"],
            "platform_keys": {k: "***" for k in user.get("platform_keys", {}).keys()}}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_user)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name"),
            "tier": user.get("tier", "free"),
            "pipeline_runs_used": user.get("pipeline_runs_used", 0),
            "ai_gen_credits_used": user.get("ai_gen_credits_used", 0),
            "created_at": user["created_at"],
            "platform_keys": {k: "***" for k in user.get("platform_keys", {}).keys()}}

@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token: raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user: raise HTTPException(401, "User not found")
        access = make_token(user["id"], user["email"])
        refresh = make_refresh(user["id"])
        set_cookies(response, access, refresh)
        return {"ok": True}
    except Exception:
        raise HTTPException(401, "Invalid refresh token")

# ── Platform keys ─────────────────────────────────────────────────────────────
@api.post("/account/platform-key")
async def save_platform_key(payload: PlatformKeyIn, user: dict = Depends(get_user)):
    if payload.platform not in PLATFORMS:
        raise HTTPException(400, "Unknown platform")
    if PLATFORMS[payload.platform]["auth"] == "oauth2":
        raise HTTPException(400, "Use the platform connect button instead")
    update = {f"platform_keys.{payload.platform}": payload.api_key}
    if payload.store_id:
        update[f"platform_store_ids.{payload.platform}"] = payload.store_id
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {"ok": True, "platform": payload.platform}

@api.post("/account/platform-disconnect")
async def disconnect_platform(payload: PlatformDisconnectIn, user: dict = Depends(get_user)):
    if payload.platform not in PLATFORMS:
        raise HTTPException(400, "Unknown platform")
    unset = {
        f"platform_keys.{payload.platform}": "",
        f"platform_store_ids.{payload.platform}": "",
    }
    if payload.platform == "etsy":
        unset.update({
            "etsy_access_token": "",
            "etsy_refresh_token": "",
            "etsy_code_verifier": "",
            "etsy_oauth_state": "",
        })
    await db.users.update_one({"id": user["id"]}, {"$unset": unset})
    return {"ok": True, "platform": payload.platform}

@api.get("/account/platforms")
async def get_platforms(user: dict = Depends(get_user)):
    keys = user.get("platform_keys", {})
    return {
        "connected": list(keys.keys()),
        "stores": user.get("platform_store_ids", {}),
        "available": PLATFORMS,
    }

# ── Style profiles ────────────────────────────────────────────────────────────
@api.post("/style-profiles")
async def create_profile(payload: StyleProfileIn, user: dict = Depends(get_user)):
    tier_limits = TIERS.get(user.get("tier", "free"), TIERS["free"])
    max_profiles = tier_limits.get("style_profiles", 0)
    existing = await db.style_profiles.count_documents({"user_id": user["id"]})
    if max_profiles != -1 and existing >= max_profiles:
        raise HTTPException(403, f"Style profile limit reached for your tier")
    profile = {"id": str(uuid.uuid4()), "user_id": user["id"],
               "name": payload.name, "base_prompt": payload.base_prompt,
               "negative_prompt": payload.negative_prompt,
               "aspect_ratio": payload.aspect_ratio,
               "colour_palette": payload.colour_palette,
               "mood_tags": payload.mood_tags,
               "reference_image_url": payload.reference_image_url,
               "created_at": datetime.now(timezone.utc)}
    await db.style_profiles.insert_one(profile)
    profile.pop("_id", None)
    return profile

@api.get("/style-profiles")
async def list_profiles(user: dict = Depends(get_user)):
    cursor = db.style_profiles.find({"user_id": user["id"]}, {"_id": 0})
    return [p async for p in cursor]

@api.delete("/style-profiles/{profile_id}")
async def delete_profile(profile_id: str, user: dict = Depends(get_user)):
    await db.style_profiles.delete_one({"id": profile_id, "user_id": user["id"]})
    return {"ok": True}

# ── AI Image Generation ───────────────────────────────────────────────────────
async def call_runware_image(prompt: str, width: int, height: int,
                              reference_image_url: Optional[str] = None) -> Optional[dict]:
    """Real character-consistency support via Runware's referenceImages
    parameter — FLUX Schnell (this app's default generator) has no such
    mechanism at all, so this is a genuine capability gap-fill, not just an
    alternative provider. Verify RUNWARE_MODEL against your dashboard's
    model browser — 'runware:101@1' is a placeholder default."""
    if not RUNWARE_API_KEY:
        return None
    task = {
        "taskType": "imageInference",
        "taskUUID": str(uuid.uuid4()),
        "model": RUNWARE_MODEL,
        "positivePrompt": prompt,
        "width": width, "height": height,
        "numberResults": 1,
        "outputType": "URL",
    }
    if reference_image_url:
        task["referenceImages"] = [reference_image_url]
    try:
        async with httpx.AsyncClient(timeout=90) as c:
            res = await c.post(
                "https://api.runware.ai/v1",
                headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
                json=[task],
            )
            if res.status_code != 200:
                log.error(f"Runware error {res.status_code}: {res.text[:300]}")
                return None
            data = res.json()
            results = data.get("data", data) if isinstance(data, dict) else data
            if isinstance(results, list) and results:
                return {"image_url": results[0].get("imageURL")}
            return None
    except Exception as e:
        log.error(f"Runware call failed: {e}")
        return None


async def _process_image_gen(batch_id: str, user_id: str, full_prompt: str,
                              negative: str, dims: dict, quantity: int,
                              reference_image_url: Optional[str] = None):
    """Background worker for image generation. Saves progress after EVERY image,
    not just at the end — so a slow/failed generation never loses earlier results.
    Uses Runware for all generation (replaced Replicate/FLUX entirely) — passes
    reference_image_url through for real character consistency when a style
    profile has one set."""
    generated = []
    total = min(quantity, 10)
    async with httpx.AsyncClient(timeout=180) as client_http:
        for i in range(total):
            await db.image_gen_batches.update_one(
                {"id": batch_id},
                {"$set": {"current_step": f"Generating image {i+1} of {total} (Runware)...",
                           "current_index": i}}
            )
            try:
                runware_result = await call_runware_image(full_prompt, dims["width"], dims["height"], reference_image_url)
                if runware_result and runware_result.get("image_url"):
                    img_res = await client_http.get(runware_result["image_url"])
                    if img_res.is_success:
                        generated.append({"index": i, "url": runware_result["image_url"], "base64": base64.b64encode(img_res.content).decode(), "provider": "runware"})
                    else:
                        await db.image_gen_batches.update_one(
                            {"id": batch_id},
                            {"$push": {"errors": {"index": i, "message": "Failed to fetch generated image from Runware"}}}
                        )
                else:
                    await db.image_gen_batches.update_one(
                        {"id": batch_id},
                        {"$push": {"errors": {"index": i, "message": "Runware generation failed — no result returned"}}}
                    )
            except Exception as e:
                log.error(f"[{batch_id}] Image gen error: {e}")
                await db.image_gen_batches.update_one(
                    {"id": batch_id},
                    {"$push": {"errors": {"index": i, "message": str(e)}}}
                )

            # Save after EVERY image attempt, success or failure — never lose progress
            await db.image_gen_batches.update_one(
                {"id": batch_id},
                {"$set": {"images": generated}}
            )

    await db.users.update_one({"id": user_id},
                               {"$inc": {"ai_gen_credits_used": len(generated)}})
    final_status = "pending_review" if generated else "failed"
    final_step = "Done" if generated else "Generation failed — see errors"
    await db.image_gen_batches.update_one(
        {"id": batch_id},
        {"$set": {"status": final_status, "current_step": final_step}}
    )


async def _retry_single_image(batch_id: str, index: int, full_prompt: str, dims: dict):
    """Regenerates one specific failed image within an existing batch,
    without re-running or re-charging for the whole batch."""
    try:
        runware_result = await call_runware_image(full_prompt, dims["width"], dims["height"])
        if not runware_result or not runware_result.get("image_url"):
            return
        async with httpx.AsyncClient(timeout=60) as client_http:
            img_res = await client_http.get(runware_result["image_url"])
            if not img_res.is_success:
                return
            b64 = base64.b64encode(img_res.content).decode()
        batch = await db.image_gen_batches.find_one({"id": batch_id})
        images = batch.get("images", [])
        images.append({"index": index, "base64": b64, "provider": "runware"})
        # Remove the old error entry for this index
        errors = [e for e in batch.get("errors", []) if e.get("index") != index]
        await db.image_gen_batches.update_one(
            {"id": batch_id},
            {"$set": {"images": images, "errors": errors}}
        )
    except Exception as e:
        log.error(f"[{batch_id}] Retry error for image {index}: {e}")


@api.post("/image-gen")
async def generate_images(payload: ImageGenIn, background_tasks: BackgroundTasks,
                           user: dict = Depends(get_user)):
    """Kicks off image generation and returns immediately with a batch_id.
    Generation continues in the background — poll GET /image-gen/batches
    or the new GET /image-gen/{batch_id} for live progress."""
    if not check_tier_limit(user, "ai_gen_credits"):
        raise HTTPException(403, "AI generation credits exhausted for this month")
    if not RUNWARE_API_KEY:
        raise HTTPException(500, "Runware API key not configured — needed for image generation")

    profile = None
    if payload.style_profile_id:
        profile = await db.style_profiles.find_one(
            {"id": payload.style_profile_id, "user_id": user["id"]}, {"_id": 0})

    full_prompt = payload.prompt
    if profile:
        full_prompt = f"{profile['base_prompt']}. {payload.prompt}"
        if profile.get("mood_tags"):
            full_prompt += f". Style: {', '.join(profile['mood_tags'])}"

    negative = profile.get("negative_prompt", "") if profile else \
               "text, watermarks, low quality, blurry, distorted"

    aspect_ratio = profile.get("aspect_ratio", "square") if profile else "square"
    size_map = {
        "square":    {"width": 1024, "height": 1024},
        "portrait":  {"width": 832,  "height": 1216},
        "landscape": {"width": 1216, "height": 832},
        "wide":      {"width": 1344, "height": 768},
    }
    dims = size_map.get(aspect_ratio, {"width": 1024, "height": 1024})

    batch_id = str(uuid.uuid4())
    await db.image_gen_batches.insert_one({
        "id": batch_id, "user_id": user["id"],
        "images": [], "errors": [], "status": "processing",
        "current_step": "Starting...", "current_index": 0,
        "total_requested": min(payload.quantity, 10),
        "prompt": full_prompt, "dims": dims,
        "created_at": datetime.now(timezone.utc)})

    background_tasks.add_task(
        _process_image_gen, batch_id, user["id"],
        full_prompt, negative, dims, payload.quantity,
        profile.get("reference_image_url") if profile else None
    )

    return {"batch_id": batch_id, "status": "processing",
            "total_requested": min(payload.quantity, 10)}

@api.get("/image-gen/batches")
async def list_gen_batches(user: dict = Depends(get_user)):
    cursor = db.image_gen_batches.find(
        {"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(20)
    return [b async for b in cursor]

@api.get("/image-gen/{batch_id}")
async def get_gen_batch(batch_id: str, user: dict = Depends(get_user)):
    batch = await db.image_gen_batches.find_one(
        {"id": batch_id, "user_id": user["id"]}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Batch not found")
    return batch

class RetryImageIn(BaseModel):
    prompt: Optional[str] = None  # if provided, overrides the batch's original prompt for this regeneration

@api.post("/image-gen/{batch_id}/retry/{index}")
async def retry_image(batch_id: str, index: int, payload: RetryImageIn, background_tasks: BackgroundTasks,
                       user: dict = Depends(get_user)):
    """Re-generate just one failed image from a batch, without re-running
    or re-charging for the whole thing. Pass a new `prompt` to actually
    refine the image instead of just re-rolling the same one."""
    if not check_tier_limit(user, "ai_gen_credits"):
        raise HTTPException(403, "AI generation credits exhausted for this month")

    batch = await db.image_gen_batches.find_one(
        {"id": batch_id, "user_id": user["id"]})
    if not batch:
        raise HTTPException(404, "Batch not found")

    full_prompt = payload.prompt.strip() if payload.prompt and payload.prompt.strip() else batch.get("prompt", "")
    dims = batch.get("dims", {"width": 1024, "height": 1024})

    # Remember the edited prompt so a future retry (or just viewing this
    # image's history) reflects what was actually asked for, not the batch's
    # original stale prompt.
    if payload.prompt and payload.prompt.strip():
        await db.image_gen_batches.update_one(
            {"id": batch_id}, {"$set": {f"prompt_overrides.{index}": full_prompt}}
        )

    background_tasks.add_task(_retry_single_image, batch_id, index, full_prompt, dims)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"ai_gen_credits_used": 1}})

    return {"status": "retrying", "index": index, "prompt_used": full_prompt}

@api.post("/image-gen/{batch_id}/approve")
async def approve_gen_batch(batch_id: str, approved_ids: List[int],
                             user: dict = Depends(get_user)):
    await db.image_gen_batches.update_one(
        {"id": batch_id, "user_id": user["id"]},
        {"$set": {"status": "approved", "approved_indices": approved_ids}})
    return {"ok": True, "batch_id": batch_id}

# ── True AI Upscaling via Runware ────────────────────────────────────────────
async def true_upscale(image_base64: str, mime: str, scale: int = 4) -> str:
    """Real AI upscaling via Runware (replaced Real-ESRGAN/Replicate).
    Real-ESRGAN (runware:504@1) genuinely supports 4x upscaling — unlike
    the Stable Diffusion Latent Upscaler default, which only supports 2x."""
    if not RUNWARE_API_KEY:
        log.warning("No Runware key — returning original")
        return image_base64

    task = {
        "taskType": "upscale",
        "taskUUID": str(uuid.uuid4()),
        "model": RUNWARE_UPSCALE_MODEL,
        "upscaleFactor": scale,
        "outputType": "URL",
        "outputFormat": "PNG",  # preserve transparency if input came from bg removal
        "inputImage": f"data:{mime};base64,{image_base64}",
    }
    async with httpx.AsyncClient(timeout=120) as client_http:
        res = await client_http.post(
            "https://api.runware.ai/v1",
            headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
            json=[task])

        if res.status_code != 200:
            log.error(f"Runware upscale failed: {res.text[:300]}")
            return image_base64

        data = res.json()
        results = data.get("data", data) if isinstance(data, dict) else data
        image_url = results[0].get("imageURL") if isinstance(results, list) and results else None
        if not image_url:
            log.error(f"Runware upscale — no imageURL in response: {data}")
            return image_base64

        img_res = await client_http.get(image_url)
        if not img_res.is_success:
            return image_base64
        return base64.b64encode(img_res.content).decode()

# ── Background Removal via Replicate ─────────────────────────────────────────
async def remove_background(image_base64: str, mime: str) -> str:
    """AI background removal via Runware (replaced 851-labs/Replicate).
    Mirrors true_upscale()'s style: logs and returns the original image on
    any failure rather than raising, so one failed background-removal step
    doesn't take down the whole pipeline run for that image."""
    if not RUNWARE_API_KEY:
        log.warning("No Runware key — skipping background removal, returning original")
        return image_base64

    task = {
        "taskType": "removeBackground",
        "taskUUID": str(uuid.uuid4()),
        "model": RUNWARE_BGREMOVE_MODEL,
        "outputType": "URL",
        "outputFormat": "PNG",  # required for transparency — JPG doesn't support it
        "inputImage": f"data:{mime};base64,{image_base64}",
    }
    async with httpx.AsyncClient(timeout=90) as client_http:
        res = await client_http.post(
            "https://api.runware.ai/v1",
            headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
            json=[task],
        )
        if res.status_code != 200:
            log.error(f"Runware bg-removal error: {res.text[:300]}")
            return image_base64

        data = res.json()
        results = data.get("data", data) if isinstance(data, dict) else data
        image_url = results[0].get("imageURL") if isinstance(results, list) and results else None
        if not image_url:
            log.error(f"Runware bg-removal — no imageURL in response: {data}")
            return image_base64

        img_res = await client_http.get(image_url)
        if not img_res.is_success:
            return image_base64
        return base64.b64encode(img_res.content).decode()
    return image_base64

# ── Pipeline ──────────────────────────────────────────────────────────────────
async def upload_to_r2(image_base64: str, filename: str, mime: str = "image/png") -> str:
    """Upload image to Cloudflare R2 using boto3 with proper AWS SigV4 auth.
    boto3 has no native async support — its calls are blocking/synchronous.
    Running that directly inside this async function would freeze the
    entire event loop (and therefore every other in-flight request, including
    progress-polling checks) for however long the upload takes. Wrapping it
    in asyncio.to_thread() runs it on a separate thread instead, so the rest
    of the server keeps responding normally while an upload is in progress."""
    if not R2_ENDPOINT or not R2_ACCESS_KEY or not R2_SECRET_KEY:
        log.warning("R2 not fully configured — skipping upload, public_url will be empty")
        return ""

    def _blocking_upload():
        import boto3
        from botocore.config import Config
        import io

        image_bytes = base64.b64decode(image_base64)
        key = f"pod-images/{filename}"

        s3 = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY,
            aws_secret_access_key=R2_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

        s3.upload_fileobj(
            io.BytesIO(image_bytes),
            R2_BUCKET,
            key,
            ExtraArgs={"ContentType": mime, "ACL": "public-read"},
        )

        public_base = os.environ.get("R2_PUBLIC_URL", f"{R2_ENDPOINT}/{R2_BUCKET}")
        return f"{public_base.rstrip('/')}/{key}"

    try:
        public_url = await asyncio.to_thread(_blocking_upload)
        log.info(f"R2 upload success: {public_url}")
        return public_url
    except Exception as e:
        log.error(f"R2 upload error: {e}")
        return ""

def _format_artwork_type_guide() -> str:
    """Renders ARTWORK_TYPE_PRODUCTS (platforms.py) into prompt text, using
    each blueprint's friendly note instead of its raw dict key."""
    def label(key: str) -> str:
        bp = PRINTIFY_BLUEPRINTS.get(key)
        return bp["note"] if bp else key
    lines = []
    type_descriptions = {
        "A": "Large scenic/atmospheric artwork (landscapes, wide scenes, detailed panoramic compositions)",
        "B": "Bold graphic/typographic design (text-driven, high contrast, meme-style or slogan art)",
        "C": "Cute/simple character or icon-style design (small detail, single-subject, kid-friendly)",
        "D": "Dark/edgy/psychedelic or intricate detailed art (busy detail, moody or surreal style)",
        "E": "Fine art/photography-style realistic image (photographic detail, painterly realism)",
    }
    for t, rules in ARTWORK_TYPE_PRODUCTS.items():
        lines.append(
            f"TYPE {t} — {type_descriptions.get(t, '')}\n"
            f"  MUST include at least one of: {', '.join(label(k) for k in rules['must'])}\n"
            f"  SHOULD consider: {', '.join(label(k) for k in rules['should'])}\n"
            f"  AVOID: {', '.join(label(k) for k in rules['avoid'])}"
        )
    return "\n".join(lines)


def prepare_claude_vision_image(image_base64: str, max_edge: int = 1568,
                                max_bytes: int = 3_500_000) -> tuple[str, str]:
    """Create a compact analysis-only copy for Claude Vision.

    The full-resolution/upscaled artwork remains untouched for R2, mockups and
    downloads. This prevents large print-ready PNGs from exceeding Anthropic's
    request-size limit while retaining enough detail for product and SEO analysis.
    """
    try:
        img = Image.open(io.BytesIO(base64.b64decode(image_base64)))
        img.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)

        # JPEG is substantially smaller than a print-ready PNG. Composite any
        # transparency over white so transparent artwork analyses correctly.
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            rgba = img.convert("RGBA")
            background = Image.new("RGB", rgba.size, "white")
            background.paste(rgba, mask=rgba.getchannel("A"))
            img = background
        else:
            img = img.convert("RGB")

        quality = 85
        while True:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            payload = buf.getvalue()
            if len(payload) <= max_bytes:
                log.info(
                    "Claude analysis copy prepared: %sx%s, %.2f MB, quality=%s",
                    img.width, img.height, len(payload) / 1_048_576, quality,
                )
                return base64.b64encode(payload).decode(), "image/jpeg"
            if quality > 55:
                quality -= 10
                continue
            new_size = (max(512, int(img.width * 0.8)),
                        max(512, int(img.height * 0.8)))
            if new_size == img.size:
                raise ValueError("Could not reduce Claude analysis image below size limit")
            img = img.resize(new_size, Image.Resampling.LANCZOS)
    except Exception as e:
        log.warning("Could not prepare compact Claude image; using original: %s", e)
        return image_base64, "image/jpeg"


async def analyse_with_claude(image_base64: str, mime: str, platform: Optional[str],
                               market: str, price_tier: str) -> dict:
    """Claude Vision — analyse image, pick products, write listing copy"""
    if not ANTHROPIC_KEY:
        raise HTTPException(500, "No Anthropic API key configured")

    platform_info = PLATFORMS.get(platform, {}) if platform else {}
    platform_name = platform_info.get("name", platform) if platform else "platform-neutral POD marketplaces"
    title_guidance = (f"optimised title for {platform_name} (max 140 chars)"
                      if platform else
                      "platform-neutral SEO title suitable for later adaptation (max 140 chars)")
    tag_guidance = ("Tags: max 13 for Etsy, max 15 for Redbubble, unlimited for others."
                    if platform else
                    "Tags: return the 13 strongest reusable search tags; platform-specific limits are applied at export.")

    prompt = f"""You are an expert POD (print-on-demand) product strategist and copywriter.

Analyse this artwork carefully and respond ONLY with valid JSON — no markdown, no preamble.

Platform: {platform_name}
Market: {market}
Price tier: {price_tier}

STEP 1 — Classify this artwork as ONE of these five types (this is based on real research into
which product categories actually sell well for each artwork style — follow it, don't guess a
generic list):

{_format_artwork_type_guide()}

STEP 2 — Product recommendations must come from your classified type's MUST/SHOULD lists, and
must respect its AVOID list. Every recommendation's "reasoning" field must explain specifically why
THIS image (its actual orientation, subject, and detail level) suits that product — not generic
marketing language. If none of a type's products genuinely fit this specific image, say so rather
than forcing a bad match.

Return this exact JSON structure:
{{
  "artwork_type": "A" | "B" | "C" | "D" | "E",
  "artwork_description": "brief description of the artwork style, colours, mood, AND orientation/composition (landscape/portrait/square, wide scene vs detailed close-up, etc.)",
  "seo_filename": "5-8 lowercase hyphenated words describing the exact subject, colours and style, ending in -pod",
  "recommended_products": [
    {{
      "product": "product name",
      "category": "category",
      "reasoning": "specifically why THIS image's orientation/composition/detail level suits this product — not generic",
      "variants": ["variant1", "variant2"],
      "base_cost": 0.00,
      "retail_price": 0.00,
      "profit_margin": 0.00
    }}
  ],
  "seo_title": "{title_guidance}",
  "description": "full listing description 150-300 words, engaging, keyword-rich",
  "tags": ["tag1", "tag2"],
  "primary_colour": "dominant colour",
  "style_category": "art style category",
  "target_audience": "who would buy this"
}}

Recommend 4-8 products that genuinely suit this artwork across major POD marketplaces.
Do not assume or require a fulfilment provider; the user chooses that after reviewing the results.
Price in AUD for {market} market at {price_tier} pricing.
{tag_guidance}"""

    analysis_image_base64, analysis_mime = prepare_claude_vision_image(image_base64)

    async with httpx.AsyncClient(timeout=60) as client_http:
        res = await client_http.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY,
                     "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": "claude-sonnet-5",
                  # Product strategy can legitimately exceed 2,000 tokens (4-8 products,
                  # listing copy, tags and reasoning). A low cap truncates valid JSON mid-string.
                  "max_tokens": 6000,
                  "messages": [{"role": "user", "content": [
                      {"type": "image", "source": {
                          "type": "base64", "media_type": analysis_mime,
                          "data": analysis_image_base64}},
                      {"type": "text", "text": prompt}]}]})

    if res.status_code != 200:
        raise HTTPException(500, f"Claude API error: {res.text}")

    response_data = res.json()
    # Claude may return non-text blocks before the answer (for example
    # thinking/redacted-thinking blocks). Collect only actual text blocks
    # instead of assuming content[0] always contains a "text" key.
    content = "".join(
        block.get("text", "")
        for block in response_data.get("content", [])
        if block.get("type") == "text"
    ).strip()
    if not content:
        block_types = [block.get("type", "unknown") for block in response_data.get("content", [])]
        raise HTTPException(
            500,
            f"Claude returned no text response (blocks: {', '.join(block_types) or 'none'})",
        )
    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"): content = content[4:]
    return json.loads(content.strip())

def apply_dpi_and_bleed(image_b64: str, dpi: int = 300, add_bleed: bool = False) -> str:
    """Sets the image's actual DPI metadata (so print platforms read the
    correct print size) and optionally adds bleed padding — ported from the
    original working tool's formula: 35px of bleed at 300 DPI, scaled
    proportionally for other DPI targets. This didn't exist anywhere in the
    rebuilt backend at all — no DPI enforcement, no bleed option."""
    try:
        img = Image.open(io.BytesIO(base64.b64decode(image_b64)))
        if add_bleed:
            bleed_px = round(35 * (dpi / 300))
            w, h = img.size
            canvas = Image.new(img.mode, (w + bleed_px * 2, h + bleed_px * 2),
                                (255, 255, 255) if img.mode == "RGB" else (0, 0, 0, 0))
            canvas.paste(img, (bleed_px, bleed_px))
            img = canvas
        buf = io.BytesIO()
        fmt = "PNG" if img.mode == "RGBA" else "JPEG"
        img.save(buf, format=fmt, dpi=(dpi, dpi), quality=95 if fmt == "JPEG" else None)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        log.warning(f"apply_dpi_and_bleed failed, returning original: {e}")
        return image_b64


async def generate_seo_filename(image_b64: str, mime: str, fallback_name: str, niche: str = "") -> str:
    """Dedicated Claude Vision call just for the filename — separate from
    analyse_with_claude's seo_title, which is written for a listing, not a
    filename. Ported prompt style from the original tool: concrete good/bad
    examples, and a genericness check that falls back to a cleaned-up
    original filename rather than trusting a vague AI answer."""
    if not ANTHROPIC_KEY:
        return fallback_name
    prompt = (
        "You are a POD SEO expert. Look at this image carefully and reply with ONE hyphenated "
        "filename only. No explanation, no preamble, nothing else.\n"
        + (f"Design niche: {niche}.\n" if niche else "")
        + "Rules: all lowercase, hyphens only, 5-8 words, describe EXACTLY what you see "
        "(main subject + colours + art style), end with -pod.\n"
        "Good: psychedelic-mushroom-rainbow-swirl-trippy-art-pod\n"
        "Good: banksy-style-corrupt-politician-money-graffiti-pod\n"
        "Bad: cool-design-artwork-pod (too vague)\n"
        "Reply with the filename ONLY. No extension. No quotes. No punctuation. Nothing else."
    )
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            res = await c.post("https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-5", "max_tokens": 60,
                      "messages": [{"role": "user", "content": [
                          {"type": "image", "source": {"type": "base64", "media_type": mime, "data": image_b64}},
                          {"type": "text", "text": prompt},
                      ]}]})
            if res.status_code != 200:
                return fallback_name
            raw = "".join(b.get("text", "") for b in res.json().get("content", []) if b.get("type") == "text")
            import re as _re
            cleaned = _re.sub(r"[^a-z0-9-]+", "-", _re.sub(r"\.(png|jpe?g|webp)$", "", raw.strip().lower()))
            cleaned = _re.sub(r"-+", "-", cleaned).strip("-")
            # Reject vague/generic answers rather than trust them blindly
            if len(cleaned) > 8 and "artwork-original" not in cleaned and "unique-artwork" not in cleaned:
                return cleaned
            return fallback_name
    except Exception as e:
        log.warning(f"generate_seo_filename failed, using fallback: {e}")
        return fallback_name


async def _process_one_pipeline_image(run_id, idx, total, img_data, platform, market, price_tier, checkpoint=None):
    """Processes a single image through upscale -> R2 upload -> Claude analysis.
    Each substep result is saved to the DB the moment it completes, and a
    `checkpoint` (from a previous failed attempt) lets a retry skip straight to
    the step that actually failed, instead of re-paying for upscaling or
    re-uploading an image that already succeeded last time."""
    checkpoint = checkpoint or {}
    image_b64 = img_data["base64"]
    mime      = img_data.get("mime", "image/jpeg")
    name      = img_data.get("name", "artwork")
    remove_bg = img_data.get("removeBg", False)

    async def set_step(step_label):
        await db.pipeline_runs.update_one(
            {"id": run_id},
            {"$set": {"current_step": f"Image {idx+1} of {total} ({name}): {step_label}"}}
        )

    bg_removed_b64 = checkpoint.get("bg_removed_b64")
    upscaled_b64 = checkpoint.get("upscaled_b64")
    public_url = checkpoint.get("public_url")
    seo_name = checkpoint.get("seo_name")
    try:
        if remove_bg and not upscaled_b64:
            if bg_removed_b64:
                log.info(f"[{run_id}] {name}: reusing already-background-removed result (checkpoint)")
                image_b64 = bg_removed_b64
            else:
                await set_step("removing background")
                log.info(f"[{run_id}] Removing background for {name}...")
                bg_removed_b64 = await remove_background(image_b64, mime)
                image_b64 = bg_removed_b64
                mime = "image/png"  # background removal always outputs PNG (transparency)

        if upscaled_b64:
            log.info(f"[{run_id}] {name}: reusing already-upscaled result (checkpoint)")
        else:
            await set_step("upscaling")
            log.info(f"[{run_id}] Upscaling {name}...")
            upscaled_b64 = await true_upscale(image_b64, mime, scale=4)
            upscaled_b64 = apply_dpi_and_bleed(upscaled_b64, dpi=img_data.get("dpi", 300), add_bleed=img_data.get("addBleed", False))

        # One Claude Vision call supplies every visual result, including the
        # SEO filename. This avoids paying for a second vision request per image.
        await set_step("analysing artwork and generating SEO")
        log.info(f"[{run_id}] Analysing {name} with Claude Vision...")
        analysis = await analyse_with_claude(upscaled_b64, mime, platform, market, price_tier)

        if not seo_name:
            proposed_name = str(analysis.get("seo_filename") or "").lower().strip()
            proposed_name = re.sub(r"[^a-z0-9]+", "-", proposed_name).strip("-")
            if proposed_name and not proposed_name.endswith("-pod"):
                proposed_name += "-pod"
            if len(proposed_name.split("-")) < 5:
                fallback_stem = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                proposed_name = f"{fallback_stem or 'original-artwork'}-print-on-demand-pod"
            seo_name = proposed_name[:120]

        if public_url:
            log.info(f"[{run_id}] {name}: reusing already-uploaded R2 url (checkpoint)")
        else:
            await set_step("uploading to storage")
            log.info(f"[{run_id}] Uploading {seo_name} to R2...")
            public_url = await upload_to_r2(upscaled_b64, f"{uuid.uuid4()}-{seo_name}.png")

        return {
            "id": checkpoint.get("id") or str(uuid.uuid4()),
            "name": seo_name,
            "original_name": name,
            "public_url": public_url,
            "upscaled_b64": upscaled_b64[:100] + "...",
            "analysis": analysis,
            "status": "pending_review",
            "platform": platform,
            "edited": False,
            # Never persist full image base64 in MongoDB (16 MB document limit).
            # The image itself lives in R2; Mongo stores only its URL and metadata.
            "checkpoint": {"public_url": public_url, "seo_name": seo_name},
        }
    except Exception as e:
        log.error(f"[{run_id}] Pipeline error for {name}: {e}")
        # Preserve whatever succeeded so a retry can resume instead of restart
        # and re-pay for API calls that already completed.
        preserved = {}
        # Large base64 checkpoints can exceed MongoDB's 16 MB document limit.
        # The retry endpoint accepts the source image again when no R2 URL exists.
        if public_url: preserved["public_url"] = public_url
        if seo_name: preserved["seo_name"] = seo_name
        return {
            "id": checkpoint.get("id") or str(uuid.uuid4()),
            "name": name,
            "error": str(e),
            "status": "failed",
            "checkpoint": preserved,
        }


async def _process_pipeline_images(run_id: str, user_id: str, images_payload, platform, market, price_tier):
    """Background worker — processes images one at a time, saving progress after each.
    Runs independently of the original HTTP request, so a closed browser tab or
    network drop never loses completed work."""
    results = []
    total = len(images_payload)
    for idx, img_data in enumerate(images_payload):
        result_item = await _process_one_pipeline_image(
            run_id, idx, total, img_data, platform, market, price_tier
        )
        results.append(result_item)

        # Save after every single image — partial progress is never lost
        await db.pipeline_runs.update_one(
            {"id": run_id},
            {"$set": {"results": results, "total_count": len(results)}}
        )

    await db.pipeline_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "pending_review", "current_step": None}}
    )
    await db.users.update_one({"id": user_id},
                               {"$inc": {"pipeline_runs_used": 1}})


async def create_pipeline_run(payload: PipelineRunIn, background_tasks: BackgroundTasks,
                              user: dict):
    """Kicks off the pipeline and returns immediately with a run_id.
    Processing continues in the background — poll GET /pipeline/runs/{run_id}
    for live progress. This means closing the browser tab or a slow connection
    will never lose completed work; the run finishes server-side regardless."""
    tier = user.get("tier", "free")
    limits = TIERS.get(tier, TIERS["free"])

    if tier != "owner":
        runs_used = user.get("pipeline_runs_used", 0)
        if runs_used >= limits["pipeline_runs"]:
            raise HTTPException(403, "Monthly pipeline run limit reached")
        max_images = limits["images_per_run"]
        if len(payload.images) > max_images:
            raise HTTPException(403, f"Batch size exceeds your tier limit of {max_images} images")

    run_id = str(uuid.uuid4())

    run = {"id": run_id, "user_id": user["id"],
           "platform": payload.platform,
           "results": [],
           "status": "processing",
           "created_at": datetime.now(timezone.utc),
           "approved_count": 0, "total_count": len(payload.images)}
    await db.pipeline_runs.insert_one(run)

    background_tasks.add_task(
        _process_pipeline_images, run_id, user["id"],
        payload.images, payload.platform, payload.market, payload.price_tier
    )

    return {"run_id": run_id, "status": "processing", "total": len(payload.images)}

@api.post("/pipeline/run")
async def run_pipeline(payload: PipelineRunIn, background_tasks: BackgroundTasks,
                       user: dict = Depends(get_user)):
    return await create_pipeline_run(payload, background_tasks, user)

@api.post("/pipeline/runs")
async def run_pipeline_plural(payload: PipelineRunIn, background_tasks: BackgroundTasks,
                              user: dict = Depends(get_user)):
    return await create_pipeline_run(payload, background_tasks, user)

@api.get("/pipeline/runs")
async def list_runs(user: dict = Depends(get_user)):
    cursor = db.pipeline_runs.find(
        {"user_id": user["id"]}, {"_id": 0, "results.upscaled_b64": 0}
    ).sort("created_at", -1).limit(50)
    return [r async for r in cursor]

@api.get("/pipeline/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_user)):
    run = await db.pipeline_runs.find_one(
        {"id": run_id, "user_id": user["id"]},
        {"_id": 0, "results.upscaled_b64": 0})
    if not run: raise HTTPException(404, "Run not found")
    return run

@api.post("/pipeline/runs/{run_id}/retry/{image_id}")
async def retry_pipeline_image(run_id: str, image_id: str, payload: PipelineRetryIn,
                                background_tasks: BackgroundTasks,
                                user: dict = Depends(get_user)):
    """Retry a single failed image in a pipeline run. Resumes from whatever
    steps already succeeded (checkpoint) so you don't re-pay for upscaling or
    re-upload an image that already made it through those steps last time.
    If upscaling itself is what needs retrying, the frontend must re-send the
    source image (we don't keep the raw source in the DB to save space)."""
    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run: raise HTTPException(404, "Run not found")

    item = next((r for r in run["results"] if r.get("id") == image_id), None)
    if not item: raise HTTPException(404, "Image not found in this run")
    if item.get("status") != "failed":
        raise HTTPException(400, "Only failed images can be retried")

    checkpoint = dict(item.get("checkpoint") or {})
    if not checkpoint.get("upscaled_b64") and not payload.base64:
        raise HTTPException(
            400,
            "This image never got past the upscale step, so the original file "
            "is needed again to retry — please re-upload it."
        )

    idx = run["results"].index(item)
    total = len(run["results"])

    async def _do_retry():
        img_payload = {
            "base64": payload.base64 or "",
            "mime": payload.mime or "image/jpeg",
            "name": item["name"],
        }
        checkpoint["id"] = image_id
        new_item = await _process_one_pipeline_image(
            run_id, idx, total, img_payload,
            run.get("platform"), "global", "mid",
            checkpoint=checkpoint,
        )
        results = run["results"]
        results[idx] = new_item
        await db.pipeline_runs.update_one(
            {"id": run_id}, {"$set": {"results": results, "current_step": None}}
        )

    background_tasks.add_task(_do_retry)
    return {"status": "retrying", "image_id": image_id}

@api.post("/pipeline/runs/{run_id}/process-next")
async def process_next_compat(run_id: str, user: dict = Depends(get_user)):
    """Compatibility endpoint for older frontend bundles.
    Runs are processed by the background worker now, so this simply returns
    the latest saved run state instead of failing with 404."""
    run = await db.pipeline_runs.find_one(
        {"id": run_id, "user_id": user["id"]},
        {"_id": 0, "results.upscaled_b64": 0})
    if not run: raise HTTPException(404, "Run not found")
    return run

# ── Regenerate copy for single listing ───────────────────────────────────────
@api.post("/pipeline/runs/{run_id}/listings/{listing_id}/regenerate")
async def regenerate_copy(run_id: str, listing_id: str,
                          user: dict = Depends(get_user)):
    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run: raise HTTPException(404, "Run not found")
    listing = next((r for r in run["results"] if r["id"] == listing_id), None)
    if not listing: raise HTTPException(404, "Listing not found")
    # Re-run Claude copy only (no upscale)
    # Would use stored public_url to re-fetch and re-analyse
    return {"ok": True, "message": "Copy regeneration queued"}

# ── Review & Approve ──────────────────────────────────────────────────────────
@api.post("/pipeline/runs/{run_id}/approve")
async def approve_listings(run_id: str, payload: ListingApprovalIn,
                            user: dict = Depends(get_user)):
    tier = user.get("tier", "free")
    limits = TIERS.get(tier, TIERS["free"])

    if payload.approve_all and not limits.get("bulk_approve"):
        raise HTTPException(403, "Bulk approve requires Pro tier or above")

    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run: raise HTTPException(404, "Run not found")

    approved_listings = payload.listings
    platform = payload.platform or run.get("platform")
    if not platform:
        raise HTTPException(400, "Choose a destination platform before publishing")

    push_results = []
    for listing in approved_listings:
        try:
            result = await push_to_platform(listing, platform, user)
            if platform in {"printify", "printful", "gelato"}:
                ready_count = int(result.get("drafts_ready", result.get("count", 0)) or 0)
                status = "draft_ready" if ready_count > 0 else "failed"
                entry = {"listing_id": listing.get("id"), "status": status,
                         "drafts_ready": ready_count, "result": result}
                if ready_count == 0:
                    entry["error"] = "No product returned an authentic provider mockup"
                push_results.append(entry)
            else:
                push_results.append({"listing_id": listing.get("id"),
                                     "status": "draft_ready", "result": result})
        except Exception as e:
            push_results.append({"listing_id": listing.get("id"),
                                  "status": "failed", "error": str(e)})

    # Update run status
    success = sum(1 for r in push_results if r["status"] == "draft_ready")
    await db.pipeline_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "completed", "approved_count": success,
                  "last_export_platform": platform,
                  "completed_at": datetime.now(timezone.utc)},
         "$push": {"export_history": {
             "platform": platform, "successful": success,
             "failed": len(push_results) - success,
             "created_at": datetime.now(timezone.utc)
         }}})

    return {"run_id": run_id, "pushed": success, "drafts_ready": success,
            "failed": len(push_results) - success, "results": push_results}

# ── Platform push ─────────────────────────────────────────────────────────────
async def push_to_platform(listing: dict, platform: str,
                            user: dict) -> dict:
    platform_keys = user.get("platform_keys", {})
    api_key = platform_keys.get(platform)
    analysis = listing.get("analysis", {})
    public_url = listing.get("public_url", "")
    store_ids = user.get("platform_store_ids", {})

    if platform == "gelato":
        template_ids = user.get("gelato_template_ids", {})
        return await push_gelato_full(listing, analysis, public_url, api_key,
                                      store_ids.get("gelato"), template_ids)
    elif platform == "printify":
        return await push_printify_full(listing, analysis, public_url, api_key,
                                         store_ids.get("printify"))
    elif platform == "printful":
        return await push_printful_full(listing, analysis, public_url, api_key)
    elif platform == "etsy":
        etsy_token = user.get("etsy_access_token")
        return await push_etsy_draft(listing, analysis, public_url, etsy_token,
                                      store_ids.get("etsy"))
    elif platform == "redbubble":
        return generate_redbubble_package(listing, analysis)
    elif platform == "teepublic":
        return generate_teepublic_package(listing, analysis)
    elif platform == "merch":
        return generate_merch_amazon_package(listing, analysis)
    else:
        raise HTTPException(400, f"Platform {platform} not supported")

# ── Scheduling ────────────────────────────────────────────────────────────────
@api.post("/schedules")
async def create_schedule(payload: ScheduleIn, user: dict = Depends(get_user)):
    tier = user.get("tier", "free")
    limits = TIERS.get(tier, TIERS["free"])
    scheduling = limits.get("scheduling", False)

    if not scheduling:
        raise HTTPException(403, "Scheduling requires Creator tier or above")
    if scheduling == "gen_only" and payload.source == "preloaded":
        raise HTTPException(403, "Full pipeline scheduling requires Pro tier or above")

    schedule = {"id": str(uuid.uuid4()), "user_id": user["id"],
                "name": payload.name, "platform": payload.platform,
                "source": payload.source,
                "style_profile_id": payload.style_profile_id,
                "prompt": payload.prompt, "quantity": payload.quantity,
                "frequency": payload.frequency, "run_time": payload.run_time,
                "days": payload.days, "active": payload.active,
                "last_run": None, "next_run": None,
                "created_at": datetime.now(timezone.utc)}
    await db.schedules.insert_one(schedule)
    schedule.pop("_id", None)
    return schedule

@api.get("/schedules")
async def list_schedules(user: dict = Depends(get_user)):
    cursor = db.schedules.find({"user_id": user["id"]}, {"_id": 0})
    return [s async for s in cursor]

@api.patch("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, active: bool,
                           user: dict = Depends(get_user)):
    await db.schedules.update_one(
        {"id": schedule_id, "user_id": user["id"]},
        {"$set": {"active": active}})
    return {"ok": True}

@api.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, user: dict = Depends(get_user)):
    await db.schedules.delete_one({"id": schedule_id, "user_id": user["id"]})
    return {"ok": True}

# ── Billing / Stripe ──────────────────────────────────────────────────────────

# ── Etsy OAuth ────────────────────────────────────────────────────────────────
@api.get("/etsy/auth-url")
async def get_etsy_auth_url(user: dict = Depends(get_user)):
    """Get Etsy OAuth URL — user clicks this to connect their shop"""
    api_key = os.environ.get("ETSY_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "Etsy Connect is not configured yet. Add ETSY_API_KEY to the backend environment.")
    if not api_key:
        raise HTTPException(500, "Etsy API key not configured — add ETSY_API_KEY to environment")
    redirect_uri = f"{BACKEND_URL}/api/etsy/callback"
    result = etsy_auth_url(user["id"], redirect_uri, api_key)
    # Store code_verifier temporarily
    await db.users.update_one({"id": user["id"]},
                               {"$set": {"etsy_code_verifier": result["code_verifier"],
                                         "etsy_oauth_state": result["state"]}})
    return {"auth_url": result["url"]}

@api.get("/etsy/callback")
async def etsy_callback(code: str, state: str):
    """Handle Etsy OAuth callback — exchanges code for token"""
    user = await db.users.find_one({"etsy_oauth_state": state})
    if not user:
        raise HTTPException(400, "Invalid OAuth state — try connecting Etsy again")
    api_key = os.environ.get("ETSY_API_KEY", "")
    redirect_uri = f"{BACKEND_URL}/api/etsy/callback"
    tokens = await etsy_exchange_token(code, user["etsy_code_verifier"], redirect_uri, api_key)
    # Get their shop ID
    async with httpx.AsyncClient(timeout=20) as c:
        me_res = await c.get("https://openapi.etsy.com/v3/application/users/me",
                              headers={"Authorization": f"Bearer {tokens['access_token']}",
                                       "x-api-key": api_key})
        shop_id = None
        if me_res.status_code == 200:
            shops = me_res.json().get("shops", [])
            shop_id = shops[0]["shop_id"] if shops else None
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"etsy_access_token": tokens["access_token"],
                  "etsy_refresh_token": tokens.get("refresh_token"),
                  "platform_store_ids.etsy": str(shop_id) if shop_id else None,
                  "platform_keys.etsy": "connected"},
         "$unset": {"etsy_code_verifier": "", "etsy_oauth_state": ""}})
    frontend = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    return RedirectResponse(f"{frontend}/account?etsy=connected")

# ── Gelato Template IDs ───────────────────────────────────────────────────────
@api.post("/account/gelato-templates")
async def save_gelato_templates(payload: dict, user: dict = Depends(get_user)):
    """Save Gelato template IDs — set these up once in Gelato dashboard"""
    await db.users.update_one({"id": user["id"]},
                               {"$set": {"gelato_template_ids": payload}})
    return {"saved": True, "templates": payload}

@api.get("/account/gelato-templates")
async def get_gelato_templates(user: dict = Depends(get_user)):
    return user.get("gelato_template_ids", {})

# ── CSV Bulk Download ─────────────────────────────────────────────────────────
@api.post("/pipeline/runs/{run_id}/export/{platform}")
async def export_approved_platform_csv(run_id: str, platform: str,
                                       payload: ListingApprovalIn,
                                       user: dict = Depends(get_user)):
    """Download a marketplace CSV containing only listings approved in review."""
    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run:
        raise HTTPException(404, "Run not found")
    if platform not in {"redbubble", "teepublic", "merch"}:
        raise HTTPException(400, f"CSV export is not supported for {platform}")

    packages = []
    for listing in payload.listings:
        analysis = listing.get("analysis", {})
        if platform == "redbubble":
            packages.append(generate_redbubble_package(listing, analysis))
        elif platform == "teepublic":
            packages.append(generate_teepublic_package(listing, analysis))
        else:
            packages.append(generate_merch_amazon_package(listing, analysis))

    csv_str = generate_csv_download(packages, platform)
    await db.pipeline_runs.update_one(
        {"id": run_id},
        {"$set": {"last_export_platform": platform},
         "$push": {"export_history": {
             "platform": platform, "successful": len(packages), "failed": 0,
             "created_at": datetime.now(timezone.utc)
         }}}
    )
    from fastapi.responses import Response as FastAPIResponse
    return FastAPIResponse(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=raven-sharp-{platform}-{run_id[:8]}.csv"}
    )


@api.get("/pipeline/runs/{run_id}/export/{platform}")
async def export_platform_csv(run_id: str, platform: str,
                               user: dict = Depends(get_user)):
    """Download CSV for no-API platforms (redbubble, teepublic, merch)"""
    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run:
        raise HTTPException(404, "Run not found")
    packages = []
    for listing in run.get("results", []):
        analysis = listing.get("analysis", {})
        if platform == "redbubble":
            packages.append(generate_redbubble_package(listing, analysis))
        elif platform == "teepublic":
            packages.append(generate_teepublic_package(listing, analysis))
        elif platform == "merch":
            packages.append(generate_merch_amazon_package(listing, analysis))
    csv_str = generate_csv_download(packages, platform)
    from fastapi.responses import Response as FastAPIResponse
    return FastAPIResponse(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=raven-sharp-{platform}-{run_id[:8]}.csv"}
    )

# ── Playwright Package Export ─────────────────────────────────────────────────
@api.get("/pipeline/runs/{run_id}/playwright-package")
async def export_playwright_package(run_id: str, user: dict = Depends(get_user)):
    """Export listings.json for Playwright automation scripts"""
    run = await db.pipeline_runs.find_one({"id": run_id, "user_id": user["id"]})
    if not run:
        raise HTTPException(404, "Run not found")
    playwright_listings = []
    for listing in run.get("results", []):
        analysis = listing.get("analysis", {})
        pkg = generate_merch_amazon_package(listing, analysis)
        playwright_listings.append({
            "image_url": listing.get("public_url", ""),
            "image_path": f"C:/Users/ascen/Downloads/{listing.get('name', 'design')}.png",
            "title": analysis.get("seo_title", ""),
            "tags": ", ".join(analysis.get("tags", [])[:15]),
            "description": analysis.get("description", ""),
            "bullet_1": pkg["fields"].get("bullet_1", ""),
            "bullet_2": pkg["fields"].get("bullet_2", ""),
            "bullet_3": pkg["fields"].get("bullet_3", ""),
            "bullet_4": pkg["fields"].get("bullet_4", ""),
            "bullet_5": pkg["fields"].get("bullet_5", ""),
            "price": "19.99",
            "brand": "Ascension Digital"
        })
    return playwright_listings

@api.post("/billing/checkout")
async def create_checkout(payload: StripeCheckoutIn, user: dict = Depends(get_user)):
    if not STRIPE_KEY:
        raise HTTPException(500, "Stripe not configured")
    price_id = STRIPE_PRICES.get(payload.tier, {}).get(payload.billing)
    if not price_id:
        raise HTTPException(400, "Invalid tier or billing period")
    async with httpx.AsyncClient(timeout=30) as c:
        res = await c.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={"Authorization": f"Bearer {STRIPE_KEY}"},
            data={"mode": "subscription",
                  "line_items[0][price]": price_id,
                  "line_items[0][quantity]": "1",
                  "success_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/account?session_id={{CHECKOUT_SESSION_ID}}",
                  "cancel_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/pricing",
                  "customer_email": user["email"],
                  "metadata[user_id]": user["id"],
                  "metadata[tier]": payload.tier})
        if res.status_code != 200:
            raise HTTPException(500, f"Stripe error: {res.text}")
        return {"checkout_url": res.json()["url"]}

def verify_stripe_signature(payload: bytes, sig_header: str, secret: str, tolerance_sec: int = 300) -> bool:
    """See Book Creator's identical implementation for full explanation.
    https://docs.stripe.com/webhooks#verify-manually"""
    if not sig_header or not secret:
        return False
    try:
        parts = dict(item.split("=", 1) for item in sig_header.split(",") if "=" in item)
        timestamp = parts.get("t")
        v1 = parts.get("v1")
        if not timestamp or not v1:
            return False
        if abs(datetime.now(timezone.utc).timestamp() - int(timestamp)) > tolerance_sec:
            log.warning("Stripe webhook rejected: timestamp outside tolerance (possible replay)")
            return False
        signed_payload = f"{timestamp}.".encode() + payload
        expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, v1)
    except Exception as e:
        log.warning(f"Stripe signature verification error: {e}")
        return False


@api.post("/billing/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()

    if not STRIPE_WEBHOOK_SECRET:
        # Previously this was a "# In production: verify webhook signature"
        # comment that was never actually implemented — anyone could POST a
        # forged event and grant themselves any tier for free. Fail closed.
        log.error("Webhook rejected: STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(503, "Webhook not configured — set STRIPE_WEBHOOK_SECRET")

    sig = request.headers.get("stripe-signature", "")
    if not verify_stripe_signature(payload, sig, STRIPE_WEBHOOK_SECRET):
        log.error("Webhook rejected: invalid or missing Stripe-Signature header")
        raise HTTPException(400, "Invalid signature")

    try:
        event = json.loads(payload)
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session["metadata"]["user_id"]
            tier = session["metadata"]["tier"]
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"tier": tier,
                          "pipeline_runs_used": 0,
                          "ai_gen_credits_used": 0,
                          "subscription_id": session.get("subscription"),
                          "payment_failed_at": None, "payment_failure_count": 0}})
        elif event["type"] in ["customer.subscription.deleted",
                                "customer.subscription.paused"]:
            sub_id = event["data"]["object"]["id"]
            await db.users.update_one(
                {"subscription_id": sub_id},
                {"$set": {"tier": "free"}})
        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]
            sub_id = invoice.get("subscription")
            if sub_id:
                await db.users.update_one(
                    {"subscription_id": sub_id},
                    {"$set": {"payment_failed_at": datetime.now(timezone.utc).isoformat()},
                     "$inc": {"payment_failure_count": 1}})
                log.warning(f"Payment failed for subscription {sub_id}")
    except Exception as e:
        log.error(f"Webhook error: {e}")
    return {"ok": True}

@api.get("/billing/status/{session_id}")
async def billing_status(session_id: str, user: dict = Depends(get_user)):
    if not STRIPE_KEY:
        raise HTTPException(500, "Stripe not configured")
    async with httpx.AsyncClient(timeout=30) as c:
        res = await c.get(
            f"https://api.stripe.com/v1/checkout/sessions/{session_id}",
            headers={"Authorization": f"Bearer {STRIPE_KEY}"})
        if res.status_code != 200:
            raise HTTPException(500, "Could not fetch session")
        data = res.json()
        return {"status": data["status"],
                "payment_status": data["payment_status"],
                "tier": data.get("metadata", {}).get("tier")}

# ── Admin ─────────────────────────────────────────────────────────────────────
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_user)):
    if user.get("tier") != "owner":
        raise HTTPException(403, "Owner access only")
    users_total = await db.users.count_documents({})
    runs_total  = await db.pipeline_runs.count_documents({})
    by_tier = {}
    for tier in TIERS.keys():
        by_tier[tier] = await db.users.count_documents({"tier": tier})
    return {"users_total": users_total, "runs_total": runs_total,
            "users_by_tier": by_tier}

# Health

@api.get("/health/detailed")
async def health_detailed():
    """Detailed health check for monitoring dashboard."""
    checks = {}
    
    # MongoDB check
    try:
        await db.command("ping")
        checks["mongodb"] = {"status": "ok"}
    except Exception as e:
        checks["mongodb"] = {"status": "error", "detail": str(e)}
    
    # Runware check
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                "https://api.runware.ai/v1",
                headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
                json=[{"taskType": "ping", "ping": True}],
            )
            checks["runware"] = {"status": "ok" if r.status_code == 200 else "error"}
    except Exception as e:
        checks["runware"] = {"status": "error", "detail": str(e)}

    # Gemini/Google AI check
    checks["gemini"] = {"status": "ok" if os.environ.get("GOOGLE_AI_KEY") else "not_configured"}
    
    # Stripe check
    checks["stripe"] = {"status": "ok" if STRIPE_KEY else "not_configured"}
    
    # Claude check
    checks["claude"] = {"status": "ok" if os.environ.get("ANTHROPIC_API_KEY") else "not_configured"}
    
    # R2/Storage check
    checks["r2_storage"] = {"status": "ok" if os.environ.get("R2_BUCKET") else "not_configured"}
    
    overall = "ok" if all(v["status"] in ("ok", "not_configured") for v in checks.values()) else "degraded"
    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": checks
    }

@api.get("/health/stats")
async def health_stats(user: dict = Depends(get_user)):
    """Usage stats for owner dashboard."""
    if user.get("tier") not in ("owner", "admin"):
        raise HTTPException(403, "Owner only")
    
    total_users = await db.users.count_documents({})
    total_pipelines = await db.pipeline_runs.count_documents({})
    
    pipeline_agg = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_cursor = db.pipeline_runs.aggregate(pipeline_agg)
    statuses = {}
    async for doc in status_cursor:
        statuses[doc["_id"]] = doc["count"]
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    runs_today = await db.pipeline_runs.count_documents({"created_at": {"$gte": today}})
    
    return {
        "total_users": total_users,
        "total_pipeline_runs": total_pipelines,
        "runs_today": runs_today,
        "runs_by_status": statuses,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/")
async def root():
    return {"service": "raven-sharp-pod", "status": "ok",
            "version": "2.0", "part_of": "Ascension Digital Group"}

app.include_router(api)

# ── Global error visibility ──────────────────────────────────────────────────
# Any exception not already handled by a specific try/except becomes a bare
# 500 by default, with nothing useful in the response and no easy way to match
# a customer's "it broke" report to the right line in the logs. This catches
# everything, logs the full traceback under a short error ID, and returns that
# same ID to the frontend so it can be shown to the customer — if they report
# "error 7F3K2Q", you can grep Railway logs for that exact ID and see the full
# trace immediately instead of guessing.
import traceback as _traceback
import secrets as _secrets_err

@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    error_id = _secrets_err.token_hex(4).upper()
    log.error(
        "UNHANDLED ERROR [%s] on %s %s: %s\n%s",
        error_id, request.method, request.url.path, repr(exc),
        "".join(_traceback.format_exception(type(exc), exc, exc.__traceback__)),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": f"Something went wrong ({type(exc).__name__}). "
                     f"If this keeps happening, report error {error_id} to support.",
            "error_id": error_id,
        },
    )

@app.get("/health")
async def health():
    checks = {}
    overall_ok = True

    try:
        await asyncio.wait_for(client.admin.command("ping"), timeout=3.0)
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = f"unreachable: {type(e).__name__}"
        overall_ok = False

    checks["r2_configured"] = bool(R2_ENDPOINT and R2_ACCESS_KEY and R2_SECRET_KEY)
    checks["runware_configured"] = bool(RUNWARE_API_KEY)
    checks["anthropic_configured"] = bool(ANTHROPIC_KEY)
    checks["stripe_configured"] = bool(STRIPE_KEY)
    if _startup_warnings:
        checks["startup_warnings"] = _startup_warnings

    return JSONResponse(
        status_code=200 if overall_ok else 503,
        content={"status": "ok" if overall_ok else "degraded", "service": "raven-sharp-pod", "checks": checks},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
