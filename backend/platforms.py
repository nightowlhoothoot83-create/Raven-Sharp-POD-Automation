"""
Raven Sharp POD Suite — Platform Push Handlers
Handles all platform integrations: API-direct and CSV/package output
Part of Ascension Digital Group
"""
import httpx, csv, io, json, uuid, base64, os
from typing import Optional

# ── PRINTIFY ──────────────────────────────────────────────────────────────────
# Full product creation: upload image → find best provider → create product → publish

PRINTIFY_BLUEPRINTS = {
    # APPAREL
    "t_shirt":          {"id": 6,   "position": "front", "note": "Unisex T-Shirt"},
    "hoodie":           {"id": 77,  "position": "front", "note": "Pullover Hoodie"},
    "sweatshirt":       {"id": 167, "position": "front", "note": "Crewneck Sweatshirt"},
    "womens_t_shirt":   {"id": 357, "position": "front", "note": "Women's T-Shirt"},
    "kids_t_shirt":     {"id": 9,   "position": "front", "note": "Kids T-Shirt"},
    "tank_top":         {"id": 295, "position": "front", "note": "Tank Top"},
    "long_sleeve":      {"id": 246, "position": "front", "note": "Long Sleeve Shirt"},
    "cap":              {"id": 210, "position": "front", "note": "Baseball Cap"},
    "beanie":           {"id": 100, "position": "front", "note": "Beanie"},
    "socks":            {"id": 228, "position": "front", "note": "Socks"},
    # WALL ART
    "art_print_poster": {"id": 1,   "position": "front", "note": "Art Print Poster"},
    "canvas":           {"id": 16,  "position": "front", "note": "Stretched Canvas"},
    "framed_poster":    {"id": 461, "position": "front", "note": "Framed Poster"},
    "tapestry":         {"id": 459, "position": "front", "note": "Tapestry"},
    "metal_print":      {"id": 347, "position": "front", "note": "Metal Print"},
    "acrylic_print":    {"id": 348, "position": "front", "note": "Acrylic Print"},
    # HOME & LIVING
    "mug":              {"id": 45,  "position": "front", "note": "Ceramic Mug (11oz)"},
    "magic_mug":        {"id": 203, "position": "front", "note": "Magic Colour-Changing Mug"},
    "pillow":           {"id": 168, "position": "front", "note": "Throw Pillow"},
    "blanket":          {"id": 384, "position": "front", "note": "Blanket"},
    "beach_towel":      {"id": 412, "position": "front", "note": "Beach Towel"},
    "tea_towel":        {"id": 490, "position": "front", "note": "Tea Towel"},
    "wall_clock":       {"id": 530, "position": "front", "note": "Wall Clock"},
    # STATIONERY & ACCESSORIES
    "sticker":          {"id": 148, "position": "front", "note": "Sticker Sheet"},
    "die_cut_sticker":  {"id": 512, "position": "front", "note": "Die-Cut Sticker"},
    "notebook":         {"id": 180, "position": "front", "note": "Spiral Notebook / Journal"},
    "hardcover_journal":{"id": 521, "position": "front", "note": "Hardcover Journal"},
    "wall_calendar":    {"id": 526, "position": "front", "note": "Wall Calendar"},
    "desk_calendar":    {"id": 527, "position": "front", "note": "Desk Calendar"},
    "greeting_cards":   {"id": 199, "position": "front", "note": "Greeting Cards (set of 10)"},
    # BAGS
    "tote_bag":         {"id": 92,  "position": "front", "note": "Tote Bag"},
    "drawstring_bag":   {"id": 381, "position": "front", "note": "Drawstring Bag"},
    "fanny_pack":       {"id": 435, "position": "front", "note": "Fanny Pack"},
    # TECH
    "phone_case":       {"id": 370, "position": "back",  "note": "Phone Case"},
    "laptop_sleeve":    {"id": 382, "position": "front", "note": "Laptop Sleeve"},
    # PRINTS & SPECIALTY
    "puzzle":           {"id": 523, "position": "front", "note": "Puzzle (252 piece)"},
    "playing_cards":    {"id": 378, "position": "front", "note": "Playing Cards"},
    "pet_bowl":         {"id": 391, "position": "front", "note": "Pet Bowl"},
    "apron":            {"id": 443, "position": "front", "note": "Apron"},
}

# Which product types each artwork TYPE (A-E, see analyse_with_claude's prompt)
# should draw from — mirrors the original researched MUST/SHOULD/AVOID rules.
ARTWORK_TYPE_PRODUCTS = {
    "A": {"must": ["art_print_poster", "canvas", "tapestry"],
          "should": ["framed_poster", "hardcover_journal", "pillow", "blanket", "puzzle", "phone_case"],
          "avoid": ["pet_bowl", "apron", "kids_t_shirt"]},
    "B": {"must": ["t_shirt", "art_print_poster"],
          "should": ["hoodie", "tote_bag", "sticker", "die_cut_sticker", "mug", "phone_case"],
          "avoid": ["tapestry", "canvas"]},
    "C": {"must": ["t_shirt", "kids_t_shirt", "sticker"],
          "should": ["tote_bag", "mug", "die_cut_sticker", "greeting_cards", "phone_case"],
          "avoid": ["tapestry", "metal_print"]},
    "D": {"must": ["tapestry", "art_print_poster", "hoodie"],
          "should": ["canvas", "hardcover_journal", "playing_cards", "puzzle", "blanket", "phone_case"],
          "avoid": ["kids_t_shirt", "greeting_cards", "desk_calendar"]},
    "E": {"must": ["canvas", "art_print_poster", "metal_print", "acrylic_print"],
          "should": ["framed_poster", "pillow", "phone_case"],
          "avoid": ["sticker", "kids_t_shirt", "apron"]},
}

PRINTIFY_AU_PROVIDERS = [99, 98, 88, 1]  # prefer AU/NZ providers

# ── Real provider scoring + smart pricing + mockups ─────────────────────────
# Ported from RavenSharp-POD-FINAL v5 (the working pre-rebuild HTML tool) —
# the rebuilt SaaS version had none of this, just a hardcoded
# print_provider_id: 99 and a flat price_usd fallback.

_provider_cache: dict = {}

async def get_best_provider_for_blueprint(blueprint_id: int, api_key: str) -> Optional[dict]:
    """Scores every print provider available for a blueprint and picks the
    best one — same scoring formula as the original tool: prefer known
    global providers, more variant coverage, lower base cost."""
    if blueprint_id in _provider_cache:
        return _provider_cache[blueprint_id]

    headers = {"Authorization": f"Bearer {api_key}"}
    global_providers = ["Monster Digital", "Printify", "Awkward Styles", "District Photo", "Dimona Tee", "Gelato"]

    async with httpx.AsyncClient(timeout=30) as c:
        try:
            res = await c.get(f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers.json", headers=headers)
            if res.status_code != 200:
                return None
            providers = res.json() or []
            if not providers:
                return None

            scored = []
            for prov in providers:
                try:
                    v_res = await c.get(
                        f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{prov['id']}/variants.json",
                        headers=headers)
                    if v_res.status_code != 200:
                        continue
                    variants = v_res.json().get("variants", [])
                    if not variants:
                        continue
                    base_cost_usd = (variants[0].get("cost", 0) or 0) / 100
                    is_global = any(g in (prov.get("title") or "") for g in global_providers)
                    scored.append({
                        "id": prov["id"], "title": prov.get("title", "Unknown Provider"),
                        "base_cost_usd": base_cost_usd, "variant_count": len(variants),
                        "variants": variants[:12], "is_global": is_global,
                        "score": (20 if is_global else 0) + len(variants) - (base_cost_usd * 2),
                    })
                except Exception:
                    continue

            if not scored:
                return None
            best = sorted(scored, key=lambda x: x["score"], reverse=True)[0]
            _provider_cache[blueprint_id] = best
            return best
        except Exception:
            return None


def calc_smart_retail(base_cost_usd: float, tier: str = "mid") -> float:
    """Same formula as the original tool: buffer for worst-case international
    shipping, enforce a minimum 55% margin, round to .99, then apply the
    price-tier multiplier and round again."""
    buffered_cost = base_cost_usd * 1.3
    min_retail = buffered_cost / (1 - 0.55)
    import math
    rounded = math.ceil(min_retail) - 0.01
    tier_mult = {"budget": 1.0, "mid": 1.2, "premium": 1.5}
    final = rounded * tier_mult.get(tier, 1.2)
    return math.ceil(final) - 0.01


async def generate_printify_mockup(blueprint_id: int, provider_id: int, variant_id: int,
                                    image_id: str, api_key: str) -> Optional[str]:
    """Printify generates the actual product mockup itself — this isn't
    custom image compositing, just calling their real mockup endpoint."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=45) as c:
        try:
            res = await c.post(
                f"https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{provider_id}/mockups.json",
                headers=headers,
                json={"variant_ids": [variant_id], "images": [{"position": "front", "src": image_id}]},
            )
            if res.status_code != 200:
                return None
            mockups = res.json().get("mockups", [])
            return mockups[0].get("mockup_url") if mockups else None
        except Exception:
            return None

def _match_blueprint_key(product_name_raw: str) -> Optional[str]:
    """Matches an AI-recommended product name to a real catalog entry —
    exact match first, then keyword overlap. Returns None (never a forced
    generic fallback) if nothing reasonably matches, so the caller can skip
    it rather than substitute something that might not suit the artwork."""
    key = product_name_raw.lower().strip().replace(" ", "_").replace("-", "_")
    if key in PRINTIFY_BLUEPRINTS:
        return key
    # keyword-overlap fallback (e.g. "wall tapestry" -> "tapestry")
    for k in PRINTIFY_BLUEPRINTS:
        if k in key or key in k:
            return k
    words = set(key.split("_"))
    best_key, best_overlap = None, 0
    for k in PRINTIFY_BLUEPRINTS:
        overlap = len(words & set(k.split("_")))
        if overlap > best_overlap:
            best_key, best_overlap = k, overlap
    return best_key if best_overlap > 0 else None


async def push_printify_full(listing: dict, analysis: dict, image_url: str,
                              api_key: str, shop_id: str) -> dict:
    """Upload image, create products for recommended types, publish to Printify shop"""
    if not api_key:
        raise Exception("No Printify API key — go to Account → Connect Platforms")
    if not shop_id:
        raise Exception("No Printify shop ID — add it in Account → Connect Platforms")

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    published = []

    async with httpx.AsyncClient(timeout=60) as c:

        # Step 1: Upload image to Printify
        img_res = await c.post(
            "https://api.printify.com/v1/uploads/images.json",
            headers=headers,
            json={"file_name": f"raven-sharp-{uuid.uuid4()}.png", "url": image_url}
        )
        if img_res.status_code != 200:
            raise Exception(f"Printify image upload failed: {img_res.text[:200]}")
        image_id = img_res.json()["id"]

        # Step 2: Get recommended products from Claude analysis
        recommended = analysis.get("recommended_products", [])
        if not recommended:
            recommended = [{"product": "art print"}, {"product": "poster"}, {"product": "t_shirt"}]

        # Step 3: Create product for each recommendation
        price_tier = analysis.get("price_tier", "mid")
        for rec in recommended[:8]:  # up to 8 products per run now that the catalog is fuller
            product_name_raw = rec.get("product", "art print")
            blueprint_key = _match_blueprint_key(product_name_raw)
            if not blueprint_key:
                published.append({"product": product_name_raw, "status": "skipped",
                                   "reason": "No matching product in the researched catalog — not substituted with a generic fallback."})
                continue
            blueprint = PRINTIFY_BLUEPRINTS[blueprint_key]

            # Real provider selection + smart pricing (ported from the
            # original working tool) instead of a hardcoded provider ID and
            # a flat price fallback.
            best_provider = await get_best_provider_for_blueprint(blueprint["id"], api_key)
            if not best_provider:
                # This is the actual fix for the 80% failure rate diagnosed
                # previously: forcing a push with a guessed/default provider
                # (print_provider_id: 99) when no provider was actually
                # confirmed available is exactly what caused most publishes
                # to fail silently. Skip instead of forcing it through.
                published.append({"product": blueprint_key, "status": "skipped",
                                   "reason": f"No available print provider found for {blueprint['note']} — not force-pushed with a guessed provider."})
                continue

            provider_id = best_provider["id"]
            base_cost_usd = best_provider["base_cost_usd"]
            retail_price = calc_smart_retail(base_cost_usd, price_tier)

            # Live variant IDs from the ACTUAL chosen provider — never
            # hardcoded, since a hardcoded variant ID has no guarantee of
            # matching what this specific provider actually offers.
            variant_ids = [v["id"] for v in best_provider["variants"]]
            if not variant_ids:
                published.append({"product": blueprint_key, "status": "skipped",
                                   "reason": "Provider returned no usable variants."})
                continue

            variants = [{"id": vid,
                          "price": int(retail_price * 100),  # Printify uses cents
                          "is_enabled": True}
                        for vid in variant_ids]

            product_payload = {
                "title": analysis.get("seo_title", f"Art Print — {blueprint_key.replace('_',' ').title()}"),
                "description": analysis.get("description", ""),
                "blueprint_id": blueprint["id"],
                "print_provider_id": provider_id,
                "variants": variants,
                "print_areas": [{
                    "variant_ids": variant_ids,
                    "placeholders": [{
                        "position": blueprint["position"],
                        "images": [{
                            "id": image_id,
                            "x": 0.5, "y": 0.5,
                            "scale": 1.0, "angle": 0
                        }]
                    }]
                }],
                "tags": analysis.get("tags", [])[:13]
            }

            create_res = await c.post(
                f"https://api.printify.com/v1/shops/{shop_id}/products.json",
                headers=headers, json=product_payload
            )
            if create_res.status_code not in [200, 201]:
                published.append({"product": blueprint_key, "status": "failed",
                                   "error": create_res.text[:200]})
                continue

            product_id = create_res.json()["id"]

            # Real Printify-generated mockup (not custom compositing) —
            # best-effort, doesn't block publishing if it fails.
            mockup_url = await generate_printify_mockup(blueprint["id"], provider_id, variant_ids[0], image_id, api_key)

            # Step 4: Publish to connected sales channel
            pub_res = await c.post(
                f"https://api.printify.com/v1/shops/{shop_id}/products/{product_id}/publish.json",
                headers=headers,
                json={"title": True, "description": True, "images": True,
                      "variants": True, "tags": True, "keyFeatures": True,
                      "shipping_template": True}
            )

            published.append({
                "product": blueprint_key,
                "printify_id": product_id,
                "status": "published" if pub_res.status_code in [200, 201] else "draft",
                "note": blueprint["note"],
                "provider": best_provider["title"],
                "base_cost_usd": round(base_cost_usd, 2),
                "retail_price": retail_price,
                "margin_pct": round(((retail_price - base_cost_usd) / retail_price) * 100) if retail_price else None,
                "mockup_url": mockup_url,
                "url": f"https://printify.com/app/store/{shop_id}/products/{product_id}"
            })

    return {"platform": "printify", "image_id": image_id, "published": published,
            "count": len([p for p in published if p["status"] == "published"])}


# ── GELATO ────────────────────────────────────────────────────────────────────
# Template-based product creation — user sets up templates in Gelato dashboard once

GELATO_UIDS = {
    "art_print":  "flat_product_pf_a3_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    "poster":     "flat_product_pf_a3_pt_170-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    "canvas":     "canvas_product_pf_30x30-cm_pt_350-gsm-glossy_cl_4-0_ct_none_prt_none_sft_none_set_none_hor",
    "t_shirt":    "apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_classic_gsi_m_gco_white_gpr_4-0",
    "hoodie":     "apparel_product_gca_hoodie_gsc_pullover_gcu_unisex_gqa_classic_gsi_m_gco_white_gpr_4-0",
    "mug":        "mug_product_pf_11-oz_pt_ceramic_cl_4-0_ct_none_prt_none_sft_none_set_none",
    "tote_bag":   "flat_product_pf_38x42-cm_pt_200-gsm-natural_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
    "phone_case": "phone_case_product_pf_iphone-15_pt_glossy_cl_4-0_ct_none_prt_none_sft_none_set_none",
    "framed":     "frame_product_pf_a3_pt_200-gsm-matte_cl_4-0_ct_none_prt_none_sft_none_set_none_ver",
}

async def push_gelato_full(listing: dict, analysis: dict, image_url: str,
                            api_key: str, store_id: str,
                            template_ids: Optional[dict] = None) -> dict:
    """Create products in Gelato — uses template IDs if available, falls back to direct UIDs"""
    if not api_key:
        raise Exception("No Gelato API key — go to Account → Connect Platforms")
    if not store_id:
        raise Exception("No Gelato store ID — add it in Account → Connect Platforms")

    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    published = []
    recommended = analysis.get("recommended_products", [])
    if not recommended:
        recommended = [{"product": "art print"}, {"product": "poster"}]

    async with httpx.AsyncClient(timeout=60) as c:
        for rec in recommended[:5]:
            product_name = rec.get("product", "art print").lower().replace(" ", "_")
            uid_key = next((k for k in GELATO_UIDS if k in product_name or product_name in k),
                           "art_print")
            uid = GELATO_UIDS[uid_key]
            price_cents = int(rec.get("price_usd", 29) * 100)

            # Try template-based creation first (cleaner output, mockups included)
            template_id = (template_ids or {}).get(uid_key)
            if template_id:
                payload = {
                    "templateId": template_id,
                    "title": analysis.get("seo_title", ""),
                    "description": analysis.get("description", ""),
                    "imagePlaceholders": [{"name": "front", "url": image_url}],
                    "isVisibleInTheOnlineStore": True,
                    "tags": analysis.get("tags", [])[:10],
                    "salesChannels": [{"type": "ecommerce", "enabled": True}]
                }
                res = await c.post(
                    f"https://ecommerce.gelatoapis.com/v1/stores/{store_id}/products:create-from-template",
                    headers=headers, json=payload
                )
            else:
                # Direct product creation without template
                payload = {
                    "title": analysis.get("seo_title", ""),
                    "description": analysis.get("description", ""),
                    "isVisibleInTheOnlineStore": True,
                    "tags": analysis.get("tags", [])[:10],
                    "salesChannels": [{"type": "ecommerce", "enabled": True}],
                    "variants": [{
                        "title": rec.get("product", ""),
                        "productUid": uid,
                        "imagePlaceholders": [{"name": "front", "printArea": "default",
                                               "url": image_url}],
                        "retail_price": price_cents
                    }]
                }
                res = await c.post(
                    f"https://ecommerce.gelatoapis.com/v1/stores/{store_id}/products",
                    headers=headers, json=payload
                )

            if res.status_code in [200, 201]:
                data = res.json()
                published.append({
                    "product": rec.get("product"),
                    "gelato_id": data.get("id"),
                    "status": "published",
                    "url": data.get("externalPreviewUrl", "")
                })
            else:
                published.append({
                    "product": rec.get("product"),
                    "status": "failed",
                    "error": res.text[:200]
                })

    return {"platform": "gelato", "published": published,
            "count": len([p for p in published if p["status"] == "published"])}


# ── PRINTFUL ──────────────────────────────────────────────────────────────────

async def push_printful_full(listing: dict, analysis: dict, image_url: str,
                              api_key: str) -> dict:
    """Create sync products in Printful"""
    if not api_key:
        raise Exception("No Printful API key — go to Account → Connect Platforms")

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    published = []
    recommended = analysis.get("recommended_products", [])[:3]

    PRINTFUL_VARIANTS = {
        "t_shirt": [{"id": 4012, "price": 29.00}],  # Unisex Staple T-Shirt | Bella + Canvas 3001
        "poster":  [{"id": 1,    "price": 19.00}],  # Poster
        "canvas":  [{"id": 4072, "price": 45.00}],  # Canvas
        "mug":     [{"id": 1320, "price": 15.00}],  # White Glossy Mug
    }

    async with httpx.AsyncClient(timeout=60) as c:
        for rec in recommended:
            product_name = rec.get("product", "poster").lower().replace(" ", "_")
            variant_key = next((k for k in PRINTFUL_VARIANTS if k in product_name), "poster")
            variants = PRINTFUL_VARIANTS[variant_key]

            payload = {
                "sync_product": {
                    "name": analysis.get("seo_title", rec.get("product", "")),
                    "thumbnail": image_url
                },
                "sync_variants": [{
                    "retail_price": str(v["price"]),
                    "variant_id": v["id"],
                    "files": [{"url": image_url, "type": "front"}]
                } for v in variants]
            }

            res = await c.post(
                "https://api.printful.com/store/products",
                headers=headers, json=payload
            )

            if res.status_code in [200, 201]:
                data = res.json().get("result", {})
                published.append({
                    "product": rec.get("product"),
                    "printful_id": data.get("id"),
                    "status": "synced",
                    "url": f"https://www.printful.com/dashboard/sync"
                })
            else:
                published.append({
                    "product": rec.get("product"),
                    "status": "failed", "error": res.text[:200]
                })

    return {"platform": "printful", "published": published,
            "count": len([p for p in published if p["status"] == "synced"])}


# ── ETSY ──────────────────────────────────────────────────────────────────────
# Creates draft listings — user reviews and publishes in Etsy dashboard

async def push_etsy_draft(listing: dict, analysis: dict, image_url: str,
                           access_token: str, shop_id: str) -> dict:
    """Create draft listing in Etsy shop via OAuth token"""
    if not access_token:
        raise Exception("Etsy not connected — go to Account → Connect Platforms → Connect Etsy")
    if not shop_id:
        raise Exception("No Etsy shop ID found — reconnect Etsy in Account settings")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "x-api-key": os.environ.get("ETSY_API_KEY", "")
    }

    tags = analysis.get("tags", [])[:13]
    title = analysis.get("seo_title", "Artwork")[:140]
    description = analysis.get("description", "")[:2000]
    price = analysis.get("suggested_retail", 29.00)

    payload = {
        "quantity": 999,
        "title": title,
        "description": description,
        "price": round(float(price), 2),
        "who_made": "i_did",
        "when_made": "made_to_order",
        "taxonomy_id": 1,  # Art & Collectibles
        "tags": tags,
        "state": "draft",
        "type": "physical",
        "is_customizable": False,
        "is_personalizable": False,
        "processing_min": 1,
        "processing_max": 3,
    }

    async with httpx.AsyncClient(timeout=30) as c:
        res = await c.post(
            f"https://openapi.etsy.com/v3/application/shops/{shop_id}/listings",
            headers=headers, json=payload
        )

        if res.status_code not in [200, 201]:
            raise Exception(f"Etsy listing creation failed: {res.text[:300]}")

        listing_id = res.json().get("listing_id")

        # Upload image to the draft listing
        if image_url and listing_id:
            img_res = await c.post(
                f"https://openapi.etsy.com/v3/application/shops/{shop_id}/listings/{listing_id}/images",
                headers={"Authorization": f"Bearer {access_token}",
                         "x-api-key": os.environ.get("ETSY_API_KEY", "")},
                json={"url": image_url, "rank": 1,
                      "overwrite": True, "is_watermarked": False}
            )

    return {
        "platform": "etsy",
        "listing_id": listing_id,
        "status": "draft",
        "url": f"https://www.etsy.com/your/shops/me/tools/listings/{listing_id}/edit",
        "note": "Draft created — review and publish in your Etsy dashboard"
    }


# ── ETSY OAUTH ────────────────────────────────────────────────────────────────
import hashlib, secrets, urllib.parse

def etsy_auth_url(user_id: str, redirect_uri: str, api_key: str) -> dict:
    """Generate Etsy OAuth2 PKCE auth URL"""
    code_verifier = secrets.token_urlsafe(64)[:128]
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b'=').decode()
    state = secrets.token_urlsafe(16)

    params = {
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": "listings_r listings_w listings_d transactions_r",
        "client_id": api_key,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    url = "https://www.etsy.com/oauth/connect?" + urllib.parse.urlencode(params)
    return {"url": url, "code_verifier": code_verifier, "state": state}


async def etsy_exchange_token(code: str, code_verifier: str,
                               redirect_uri: str, api_key: str) -> dict:
    """Exchange auth code for access token"""
    async with httpx.AsyncClient(timeout=30) as c:
        res = await c.post(
            "https://api.etsy.com/v3/public/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": api_key,
                "redirect_uri": redirect_uri,
                "code": code,
                "code_verifier": code_verifier
            }
        )
        if res.status_code != 200:
            raise Exception(f"Etsy token exchange failed: {res.text}")
        return res.json()


# ── CSV OUTPUTS (Redbubble, TeePublic, Merch by Amazon) ──────────────────────
# These platforms have NO API — best output is a ready-to-use package

def generate_redbubble_package(listing: dict, analysis: dict) -> dict:
    """
    Redbubble: no API, no CSV upload — manual only.
    Returns a complete upload package the user pastes/uses manually
    or feeds to Playwright automation.
    """
    title = analysis.get("seo_title", "")[:100]
    description = analysis.get("description", "")
    tags = ", ".join(analysis.get("tags", [])[:15])

    # Redbubble optimal tags: 15 max, comma separated, no quotes
    # Title: 100 chars max
    # Description: unlimited but 500 chars shows above fold
    # Image: PNG or JPG, min 1024x1024, max 10000x10000, max 70MB

    package = {
        "platform": "redbubble",
        "status": "package_ready",
        "upload_url": "https://www.redbubble.com/portfolio/images/new",
        "fields": {
            "title": title,
            "tags": tags,
            "description": description[:2000],
            "default_product": "art-print",
            "safe_for_work": True,
        },
        "image_url": listing.get("public_url", ""),
        "playwright_data": {
            "url": "https://www.redbubble.com/portfolio/images/new",
            "fill": {
                "title_selector": "input[name='work[title]']",
                "tags_selector": "input[data-testid='tag-input']",
                "description_selector": "textarea[name='work[body_html]']",
            },
            "steps": [
                "Navigate to upload URL",
                "Upload image file",
                f"Fill title: {title}",
                f"Fill tags: {tags}",
                "Fill description",
                "Enable all products",
                "Save and submit"
            ]
        },
        "manual_steps": [
            "1. Go to redbubble.com → Upload New Work",
            "2. Upload your image (PNG, min 1024px)",
            f"3. Title: {title}",
            f"4. Tags: {tags}",
            "5. Enable all product types",
            "6. Check pricing (Redbubble sets base, you add margin %)",
            "7. Save and submit for review"
        ]
    }
    return package


def generate_teepublic_package(listing: dict, analysis: dict) -> dict:
    """TeePublic: no API — manual or Playwright automation"""
    title = analysis.get("seo_title", "")[:100]
    description = analysis.get("description", "")[:500]
    tags = " ".join([f"#{t.replace(' ', '')}" for t in analysis.get("tags", [])[:10]])

    package = {
        "platform": "teepublic",
        "status": "package_ready",
        "upload_url": "https://www.teepublic.com/user/designs/new",
        "fields": {
            "title": title,
            "description": description,
            "tags": ", ".join(analysis.get("tags", [])[:10]),
        },
        "image_url": listing.get("public_url", ""),
        "playwright_data": {
            "url": "https://www.teepublic.com/user/designs/new",
            "steps": [
                "Navigate to upload URL",
                "Upload PNG (5400x5400 ideal)",
                f"Fill title: {title}",
                f"Fill description: {description}",
                f"Add tags: {tags}",
                "Select products to enable",
                "Submit design"
            ]
        },
        "manual_steps": [
            "1. Go to teepublic.com → Upload Design",
            "2. Upload PNG — ideal 5400x5400px",
            f"3. Title: {title}",
            f"4. Description: {description}",
            f"5. Tags: {tags}",
            "6. Enable products",
            "7. Submit"
        ]
    }
    return package


def generate_merch_amazon_package(listing: dict, analysis: dict) -> dict:
    """
    Merch by Amazon: no API — manual upload required.
    PNG must be 4500x5400px, 300dpi, transparent background for apparel.
    Returns pre-written listing copy optimised for Amazon SEO.
    """
    title = analysis.get("seo_title", "")[:60]  # Amazon title: 60 chars
    description = analysis.get("description", "")
    bullets_raw = description.split(". ")

    # Amazon Merch: 5 bullet points, each max 256 chars, no ALL CAPS
    bullets = []
    for b in bullets_raw[:5]:
        b = b.strip().rstrip(".")
        if len(b) > 10:
            bullets.append(b[:256])
    while len(bullets) < 5:
        bullets.append("")

    brand = "Ascension Digital"
    dept = "Mens"  # default — user can change

    package = {
        "platform": "merch_by_amazon",
        "status": "package_ready",
        "upload_url": "https://merch.amazon.com/designs/upload",
        "image_spec": {
            "format": "PNG",
            "width": 4500,
            "height": 5400,
            "dpi": 300,
            "color_space": "sRGB",
            "background": "transparent (apparel) or white (hard goods)",
            "max_size_mb": 25
        },
        "fields": {
            "brand": brand,
            "product_type": "Standard T-Shirt",
            "department": dept,
            "title": title,
            "bullet_1": bullets[0] if len(bullets) > 0 else "",
            "bullet_2": bullets[1] if len(bullets) > 1 else "",
            "bullet_3": bullets[2] if len(bullets) > 2 else "",
            "bullet_4": bullets[3] if len(bullets) > 3 else "",
            "bullet_5": bullets[4] if len(bullets) > 4 else "",
            "description": description[:2000],
        },
        "image_url": listing.get("public_url", ""),
        "playwright_data": {
            "url": "https://merch.amazon.com/designs/upload",
            "steps": [
                "Navigate to Merch by Amazon upload",
                "Upload 4500x5400 transparent PNG",
                f"Select product type: T-Shirt",
                f"Select colours: Black, White, Navy, Dark Heather",
                f"Fill brand: {brand}",
                f"Fill title: {title}",
                f"Fill bullet 1: {bullets[0]}",
                f"Fill bullet 2: {bullets[1]}",
                f"Fill bullet 3: {bullets[2]}",
                f"Fill bullet 4: {bullets[3]}",
                f"Fill bullet 5: {bullets[4]}",
                f"Fill description: {description[:200]}...",
                "Set price: $19.99 default",
                "Submit for review"
            ]
        },
        "csv_row": {
            "Title": title,
            "Brand Name": brand,
            "Department": dept,
            "Bullet Point 1": bullets[0],
            "Bullet Point 2": bullets[1],
            "Bullet Point 3": bullets[2],
            "Bullet Point 4": bullets[3],
            "Bullet Point 5": bullets[4],
            "Description": description[:2000],
            "Image URL": listing.get("public_url", "")
        }
    }
    return package


def generate_csv_download(packages: list, platform: str) -> str:
    """Generate downloadable CSV string from package list"""
    if not packages:
        return ""

    output = io.StringIO()
    fieldnames = list(packages[0].get("csv_row", packages[0].get("fields", {})).keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for pkg in packages:
        row = pkg.get("csv_row", pkg.get("fields", {}))
        writer.writerow(row)
    return output.getvalue()


