"""
Raven Sharp POD Suite — FastAPI Backend
Full autonomous POD pipeline with AI upscaling, image gen, multi-platform push
Part of Ascension Digital Group
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient as AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os, uuid, json, logging, httpx, base64, bcrypt, jwt, asyncio
from platforms import (push_printify_full, push_gelato_full, push_printful_full,
    push_etsy_draft, etsy_auth_url, etsy_exchange_token,
    generate_redbubble_package, generate_teepublic_package,
    generate_merch_amazon_package, generate_csv_download)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
MONGO_URL         = os.environ["MONGO_URL"]
DB_NAME           = os.environ["DB_NAME"]
JWT_SECRET        = os.environ["JWT_SECRET"]
ANTHROPIC_KEY     = os.environ.get("ANTHROPIC_API_KEY", "")
REPLICATE_KEY     = os.environ.get("REPLICATE_API_KEY", "")
# Image generation uses Replicate FLUX.1 — same key as upscaling
# REPLICATE_KEY handles both upscaling (Real-ESRGAN) and image gen (FLUX.1)
R2_ENDPOINT       = os.environ.get("R2_ENDPOINT", "")  # https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY     = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY     = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET         = os.environ.get("R2_BUCKET", "adg-images")
STRIPE_KEY        = os.environ.get("STRIPE_API_KEY", "")
OWNER_EMAIL       = os.environ.get("OWNER_EMAIL", "ascensiondigitalagency@outlook.com")
ETSY_API_KEY      = os.environ.get("ETSY_API_KEY", "")
BACKEND_URL       = os.environ.get("BACKEND_URL", "https://raven-sharp-pod.onrender.com")
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ravensharp-pod")

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
    "free":    {"pipeline_runs": 3,     "images_per_run": 1,  "ai_gen_credits": 5,   "scheduling": False,       "bulk_approve": False, "workspaces": 1,     "style_profiles": 0,  "priority": False, "price": 0},
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

class PipelineRunIn(BaseModel):
    platform: str
    images: List[Dict[str, Any]]  # [{name, base64, mime}]
    style_profile_id: Optional[str] = None
    market: Optional[str] = "global"
    price_tier: Optional[str] = "mid"

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
    frontend_is_https = FRONTEND_URL.startswith("https://")
    kw = dict(
        httponly=True,
        secure=frontend_is_https,
        samesite="none" if frontend_is_https else "lax",
        path="/",
    )
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
async def _process_image_gen(batch_id: str, user_id: str, full_prompt: str,
                              negative: str, dims: dict, quantity: int):
    """Background worker for image generation. Saves progress after EVERY image,
    not just at the end — so a slow/failed generation never loses earlier results."""
    generated = []
    total = min(quantity, 10)
    async with httpx.AsyncClient(timeout=180) as client_http:
        for i in range(total):
            await db.image_gen_batches.update_one(
                {"id": batch_id},
                {"$set": {"current_step": f"Submitting image {i+1} of {total}...",
                           "current_index": i}}
            )
            try:
                res = await client_http.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={"Authorization": f"Token {REPLICATE_KEY}",
                             "Content-Type": "application/json"},
                    json={
                        "version": "black-forest-labs/flux-schnell",
                        "input": {
                            "prompt": full_prompt,
                            "width":  dims["width"],
                            "height": dims["height"],
                            "num_outputs": 1,
                            "num_inference_steps": 4,
                            "output_format": "png",
                            "output_quality": 100,
                            "go_fast": True,
                        }
                    })

                if res.status_code != 201:
                    log.error(f"[{batch_id}] FLUX submit error {res.status_code}: {res.text[:200]}")
                    await db.image_gen_batches.update_one(
                        {"id": batch_id},
                        {"$push": {"errors": {"index": i, "message": f"Replicate returned {res.status_code} — {res.text[:150]}"}}}
                    )
                    continue

                prediction_id = res.json()["id"]

                await db.image_gen_batches.update_one(
                    {"id": batch_id},
                    {"$set": {"current_step": f"Generating image {i+1} of {total} (FLUX.1)..."}}
                )

                for poll_attempt in range(60):
                    await asyncio.sleep(3)
                    poll = await client_http.get(
                        f"https://api.replicate.com/v1/predictions/{prediction_id}",
                        headers={"Authorization": f"Token {REPLICATE_KEY}"})
                    pdata = poll.json()

                    if pdata["status"] == "succeeded":
                        output = pdata.get("output")
                        img_url = output[0] if isinstance(output, list) else output
                        if img_url:
                            generated.append({"url": img_url, "prompt": full_prompt, "index": i})
                        break
                    elif pdata["status"] == "failed":
                        log.error(f"[{batch_id}] FLUX prediction failed: {pdata.get('error')}")
                        await db.image_gen_batches.update_one(
                            {"id": batch_id},
                            {"$push": {"errors": {"index": i, "message": f"Generation failed — {pdata.get('error')}"}}}
                        )
                        break

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
    await db.image_gen_batches.update_one(
        {"id": batch_id},
        {"$set": {"status": "pending_review", "current_step": "Done"}}
    )


async def _retry_single_image(batch_id: str, index: int, full_prompt: str, dims: dict):
    """Regenerates one specific failed image within an existing batch,
    without re-running or re-charging for the whole batch."""
    async with httpx.AsyncClient(timeout=180) as client_http:
        try:
            res = await client_http.post(
                "https://api.replicate.com/v1/predictions",
                headers={"Authorization": f"Token {REPLICATE_KEY}",
                         "Content-Type": "application/json"},
                json={
                    "version": "black-forest-labs/flux-schnell",
                    "input": {
                        "prompt": full_prompt,
                        "width":  dims["width"],
                        "height": dims["height"],
                        "num_outputs": 1,
                        "num_inference_steps": 4,
                        "output_format": "png",
                        "output_quality": 100,
                        "go_fast": True,
                    }
                })
            if res.status_code != 201:
                return
            prediction_id = res.json()["id"]
            for _ in range(60):
                await asyncio.sleep(3)
                poll = await client_http.get(
                    f"https://api.replicate.com/v1/predictions/{prediction_id}",
                    headers={"Authorization": f"Token {REPLICATE_KEY}"})
                pdata = poll.json()
                if pdata["status"] == "succeeded":
                    output = pdata.get("output")
                    img_url = output[0] if isinstance(output, list) else output
                    if img_url:
                        batch = await db.image_gen_batches.find_one({"id": batch_id})
                        images = batch.get("images", [])
                        images.append({"url": img_url, "prompt": full_prompt, "index": index})
                        # Remove the old error entry for this index
                        errors = [e for e in batch.get("errors", []) if e.get("index") != index]
                        await db.image_gen_batches.update_one(
                            {"id": batch_id},
                            {"$set": {"images": images, "errors": errors}}
                        )
                    break
                elif pdata["status"] == "failed":
                    break
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
    if not REPLICATE_KEY:
        raise HTTPException(500, "Replicate API key not configured — needed for both upscaling and image generation")

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
        full_prompt, negative, dims, payload.quantity
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

@api.post("/image-gen/{batch_id}/retry/{index}")
async def retry_image(batch_id: str, index: int, background_tasks: BackgroundTasks,
                       user: dict = Depends(get_user)):
    """Re-generate just one failed image from a batch, without re-running
    or re-charging for the whole thing."""
    if not check_tier_limit(user, "ai_gen_credits"):
        raise HTTPException(403, "AI generation credits exhausted for this month")

    batch = await db.image_gen_batches.find_one(
        {"id": batch_id, "user_id": user["id"]})
    if not batch:
        raise HTTPException(404, "Batch not found")

    full_prompt = batch.get("prompt", "")
    dims = batch.get("dims", {"width": 1024, "height": 1024})

    background_tasks.add_task(_retry_single_image, batch_id, index, full_prompt, dims)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"ai_gen_credits_used": 1}})

    return {"status": "retrying", "index": index}

@api.post("/image-gen/{batch_id}/approve")
async def approve_gen_batch(batch_id: str, approved_ids: List[int],
                             user: dict = Depends(get_user)):
    await db.image_gen_batches.update_one(
        {"id": batch_id, "user_id": user["id"]},
        {"$set": {"status": "approved", "approved_indices": approved_ids}})
    return {"ok": True, "batch_id": batch_id}

# ── True AI Upscaling via Replicate ───────────────────────────────────────────
async def true_upscale(image_base64: str, mime: str, scale: int = 4) -> str:
    """Real AI upscaling using Real-ESRGAN via Replicate API"""
    if not REPLICATE_KEY:
        log.warning("No Replicate key — returning original")
        return image_base64

    async with httpx.AsyncClient(timeout=120) as client_http:
        # Submit prediction
        res = await client_http.post(
            "https://api.replicate.com/v1/predictions",
            headers={"Authorization": f"Token {REPLICATE_KEY}",
                     "Content-Type": "application/json"},
            json={"version": "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                  "input": {"image": f"data:{mime};base64,{image_base64}",
                             "scale": scale,
                             "face_enhance": False}})

        if res.status_code != 201:
            log.error(f"Replicate submit failed: {res.text}")
            return image_base64

        prediction = res.json()
        prediction_id = prediction["id"]

        # Poll for result
        for _ in range(60):
            await asyncio.sleep(5)
            poll = await client_http.get(
                f"https://api.replicate.com/v1/predictions/{prediction_id}",
                headers={"Authorization": f"Token {REPLICATE_KEY}"})
            data = poll.json()
            if data["status"] == "succeeded":
                output_url = data["output"]
                # Download result and convert to base64
                img_res = await client_http.get(output_url)
                return base64.b64encode(img_res.content).decode()
            elif data["status"] == "failed":
                log.error(f"Replicate prediction failed: {data.get('error')}")
                return image_base64

    return image_base64

# ── Pipeline ──────────────────────────────────────────────────────────────────
async def upload_to_r2(image_base64: str, filename: str, mime: str = "image/png") -> str:
    """Upload image to Cloudflare R2 for public URL (replaces imgbb)"""
    if not R2_ENDPOINT or not R2_ACCESS_KEY: 
        log.warning("R2 not configured — image URL will be empty")
        return ""
    import hashlib, hmac, base64 as b64mod
    from datetime import datetime, timezone
    
    image_bytes = base64.b64decode(image_base64)
    key = f"pod-images/{filename}"
    url = f"{R2_ENDPOINT}/{R2_BUCKET}/{key}"
    
    # AWS Signature v4 for R2
    now = datetime.now(timezone.utc)
    datestamp = now.strftime("%Y%m%d")
    amzdate   = now.strftime("%Y%m%dT%H%M%SZ")
    
    headers = {
        "Content-Type": mime,
        "x-amz-date": amzdate,
        "x-amz-content-sha256": hashlib.sha256(image_bytes).hexdigest(),
    }
    
    async with httpx.AsyncClient(timeout=60) as c:
        try:
            # Simple PUT to R2 with pre-signed style headers
            res = await c.put(url, content=image_bytes, headers={
                **headers,
                "Authorization": f"Bearer {R2_ACCESS_KEY}",  # simplified — use boto3 in production for full SigV4
            })
            if res.status_code in [200, 201]:
                return url
            log.error(f"R2 upload failed: {res.status_code} {res.text[:200]}")
        except Exception as e:
            log.error(f"R2 upload error: {e}")
    return ""

async def analyse_with_claude(image_base64: str, mime: str, platform: str,
                               market: str, price_tier: str) -> dict:
    """Claude Vision — analyse image, pick products, write listing copy"""
    if not ANTHROPIC_KEY:
        raise HTTPException(500, "No Anthropic API key configured")

    platform_info = PLATFORMS.get(platform, {})
    platform_name = platform_info.get("name", platform)

    prompt = f"""You are an expert POD (print-on-demand) product strategist and copywriter.

Analyse this artwork carefully and respond ONLY with valid JSON — no markdown, no preamble.

Platform: {platform_name}
Market: {market}
Price tier: {price_tier}

Return this exact JSON structure:
{{
  "artwork_description": "brief description of the artwork style, colours, mood",
  "recommended_products": [
    {{
      "product": "product name",
      "category": "category",
      "reasoning": "why this artwork suits this product",
      "variants": ["variant1", "variant2"],
      "base_cost": 0.00,
      "retail_price": 0.00,
      "profit_margin": 0.00
    }}
  ],
  "seo_title": "optimised title for {platform_name} (max 140 chars)",
  "description": "full listing description 150-300 words, engaging, keyword-rich",
  "tags": ["tag1", "tag2"],
  "primary_colour": "dominant colour",
  "style_category": "art style category",
  "target_audience": "who would buy this"
}}

Recommend 4-8 products that genuinely suit this artwork for {platform_name}.
Price in AUD for {market} market at {price_tier} pricing.
Tags: max 13 for Etsy, max 15 for Redbubble, unlimited for others."""

    async with httpx.AsyncClient(timeout=60) as client_http:
        res = await client_http.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY,
                     "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514",
                  "max_tokens": 2000,
                  "messages": [{"role": "user", "content": [
                      {"type": "image", "source": {
                          "type": "base64", "media_type": mime,
                          "data": image_base64}},
                      {"type": "text", "text": prompt}]}]})

    if res.status_code != 200:
        raise HTTPException(500, f"Claude API error: {res.text}")

    content = res.json()["content"][0]["text"].strip()
    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"): content = content[4:]
    return json.loads(content.strip())

async def _process_pipeline_images(run_id: str, user_id: str, images_payload, platform, market, price_tier):
    """Background worker — processes images one at a time, saving progress after each.
    Runs independently of the original HTTP request, so a closed browser tab or
    network drop never loses completed work."""
    results = []
    for img_data in images_payload:
        try:
            image_b64 = img_data["base64"]
            mime      = img_data.get("mime", "image/jpeg")
            name      = img_data.get("name", "artwork")

            log.info(f"[{run_id}] Upscaling {name}...")
            upscaled_b64 = await true_upscale(image_b64, mime, scale=4)

            log.info(f"[{run_id}] Uploading {name} to R2...")
            public_url = await upload_to_r2(upscaled_b64, f"{uuid.uuid4()}-{name}.png")

            log.info(f"[{run_id}] Analysing {name} with Claude Vision...")
            analysis = await analyse_with_claude(
                upscaled_b64, mime, platform, market, price_tier)

            result_item = {
                "id": str(uuid.uuid4()),
                "name": name,
                "public_url": public_url,
                "upscaled_b64": upscaled_b64[:100] + "...",
                "analysis": analysis,
                "status": "pending_review",
                "platform": platform,
                "edited": False
            }
        except Exception as e:
            log.error(f"[{run_id}] Pipeline error for {img_data.get('name')}: {e}")
            result_item = {
                "id": str(uuid.uuid4()),
                "name": img_data.get("name", "unknown"),
                "error": str(e),
                "status": "failed"
            }

        results.append(result_item)

        # Save after every single image — partial progress is never lost
        await db.pipeline_runs.update_one(
            {"id": run_id},
            {"$set": {"results": results, "total_count": len(results)}}
        )

    await db.pipeline_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "pending_review"}}
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
    platform = run["platform"]

    push_results = []
    for listing in approved_listings:
        try:
            result = await push_to_platform(listing, platform, user)
            push_results.append({"listing_id": listing.get("id"),
                                  "status": "published", "result": result})
        except Exception as e:
            push_results.append({"listing_id": listing.get("id"),
                                  "status": "failed", "error": str(e)})

    # Update run status
    success = sum(1 for r in push_results if r["status"] == "published")
    await db.pipeline_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "completed", "approved_count": success,
                  "completed_at": datetime.now(timezone.utc)}})

    return {"run_id": run_id, "pushed": success,
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
    redirect_uri = f"{os.environ.get('BACKEND_URL', 'https://raven-sharp-pod.onrender.com')}/api/etsy/callback"
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
    redirect_uri = f"{os.environ.get('BACKEND_URL', 'https://raven-sharp-pod.onrender.com')}/api/etsy/callback"
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

@api.post("/billing/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    # In production: verify webhook signature
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
                          "subscription_id": session.get("subscription")}})
        elif event["type"] in ["customer.subscription.deleted",
                                "customer.subscription.paused"]:
            sub_id = event["data"]["object"]["id"]
            await db.users.update_one(
                {"subscription_id": sub_id},
                {"$set": {"tier": "free"}})
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
@api.get("/")
async def root():
    return {"service": "raven-sharp-pod", "status": "ok",
            "version": "2.0", "part_of": "Ascension Digital Group"}

app.include_router(api)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "raven-sharp-pod"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
