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
    "t-shirt":      {"id": 5,   "variants": [17887, 17888, 17889, 17890],   "position": "front", "note": "Unisex Softstyle T-Shirt"},
    "hoodie":       {"id": 92,  "variants": [52743, 52744, 52745, 52746],   "position": "front", "note": "Unisex Heavy Blend Hoodie"},
    "art_print_a4": {"id": 681, "variants": [65763],                         "position": "front", "note": "Premium Luster Photo Paper Poster 12x16"},
    "poster":       {"id": 400, "variants": [43435],                         "position": "front", "note": "Enhanced Matte Paper Poster"},
    "canvas":       {"id": 638, "variants": [48985],                         "position": "front", "note": "Canvas"},
    "mug":          {"id": 19,  "variants": [1441, 1442],                    "position": "front", "note": "White Glossy Mug"},
    "tote_bag":     {"id": 623, "variants": [62021, 62022],                  "position": "front", "note": "Heavy Tote Bag"},
    "phone_case":   {"id": 25,  "variants": [2010, 2011],                    "position": "back",  "note": "Tough Phone Case"},
    "sticker":      {"id": 505, "variants": [48050],                         "position": "front", "note": "Kiss-Cut Stickers"},
    "pillow":       {"id": 66,  "variants": [7023, 7024],                    "position": "front", "note": "Throw Pillow"},
}

PRINTIFY_AU_PROVIDERS = [99, 98, 88, 1]  # prefer AU/NZ providers

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
            recommended = [{"product": "art print"}, {"product": "poster"}, {"product": "t-shirt"}]

        # Step 3: Create product for each recommendation
        for rec in recommended[:5]:  # max 5 products per run
            product_name = rec.get("product", "art print").lower().replace(" ", "_")
            blueprint = PRINTIFY_BLUEPRINTS.get(product_name) or \
                        next((v for k, v in PRINTIFY_BLUEPRINTS.items()
                              if k in product_name or product_name in k),
                             PRINTIFY_BLUEPRINTS["art_print_a4"])

            # Build variants with pricing
            base_price = rec.get("price_usd", 29)
            variants = [{"id": vid,
                          "price": int(base_price * 100),  # Printify uses cents
                          "is_enabled": True}
                        for vid in blueprint["variants"]]

            product_payload = {
                "title": analysis.get("seo_title", f"Art Print — {product_name.replace('_',' ').title()}"),
                "description": analysis.get("description", ""),
                "blueprint_id": blueprint["id"],
                "print_provider_id": 99,  # SwiftPOD AU — update after /catalog call
                "variants": variants,
                "print_areas": [{
                    "variant_ids": blueprint["variants"],
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
                published.append({"product": product_name, "status": "failed",
                                   "error": create_res.text[:200]})
                continue

            product_id = create_res.json()["id"]

            # Step 4: Publish to connected sales channel
            pub_res = await c.post(
                f"https://api.printify.com/v1/shops/{shop_id}/products/{product_id}/publish.json",
                headers=headers,
                json={"title": True, "description": True, "images": True,
                      "variants": True, "tags": True, "keyFeatures": True,
                      "shipping_template": True}
            )

            published.append({
                "product": product_name,
                "printify_id": product_id,
                "status": "published" if pub_res.status_code in [200, 201] else "draft",
                "note": blueprint["note"],
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


