"""Offline POD preflight. No API calls, inference, or publication authority."""
from decimal import Decimal
from pathlib import Path
import hashlib
import math
import io
from PIL import Image

VISUAL_CHECKS = ("prompt_match", "composition", "no_crop", "no_artefacts",
                 "text_correct", "no_watermark", "clean_edges", "contrast",
                 "background_suitable", "product_fit", "original_rights")

def artwork_is_blank(image):
    """Ignore hidden RGB pixels; preserve artwork expressed through alpha.

    Check both light and dark print surfaces so transparent white or black
    lettering remains valid, while uniform and fully transparent files block.
    """
    rgba = image.convert("RGBA")
    return all(all(lo == hi for lo, hi in Image.alpha_composite(
        Image.new("RGBA", rgba.size, background), rgba).convert("RGB").getextrema())
        for background in ("white", "black"))

def inspect_artwork(path, width_inches, height_inches, dpi=300):
    return inspect_artwork_bytes(Path(path).read_bytes(), width_inches, height_inches, dpi)

def inspect_artwork_bytes(data, width_inches, height_inches, dpi=300):
    """Use actual decoded pixels; changing DPI metadata cannot pass this gate."""
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0 for v in
           (width_inches, height_inches, dpi)):
        raise ValueError("Positive physical dimensions and DPI required")
    with Image.open(io.BytesIO(data)) as image:
        image.verify()
    with Image.open(io.BytesIO(data)) as image:
        width, height = image.size
        reasons = []
        if width < width_inches * dpi or height < height_inches * dpi:
            reasons.append("insufficient_actual_pixels")
        if abs(width / height / (width_inches / height_inches) - 1) > .01:
            reasons.append("aspect_ratio_would_crop_or_distort")
        if artwork_is_blank(image):
            reasons.append("blank_artwork")
        if image.convert("RGBA").getchannel("A").getextrema()[1] == 0:
            reasons.append("fully_transparent_artwork")
    return {"sha256": hashlib.sha256(data).hexdigest(), "width": width,
            "height": height, "effective_dpi": min(width/width_inches, height/height_inches),
            "print_safe": not reasons, "reasons": reasons}

def draft_preflight(metadata, spec, review):
    """Block provider mutation until actual uploaded bytes have a size-bound review."""
    metadata, spec, review = metadata or {}, spec or {}, review or {}
    reasons = []
    if not metadata or not metadata.get("sha256"):
        reasons.append("regenerate_artwork_to_record_actual_pixels")
    try:
        w, h, dpi = (float(spec[k]) for k in ("width_inches", "height_inches", "dpi"))
        if any(not math.isfinite(v) or v <= 0 for v in (w, h, dpi)):
            raise ValueError()
        if metadata.get("width", 0) < w*dpi or metadata.get("height", 0) < h*dpi:
            reasons.append("insufficient_actual_pixels")
        if abs(metadata.get("width", 0)/metadata.get("height", 1)/(w/h)-1) > .01:
            reasons.append("aspect_ratio_would_crop_or_distort")
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        reasons.append("physical_print_size_and_dpi_required")
    if review.get("sha256") != metadata.get("sha256") or not metadata.get("sha256"):
        reasons.append("visual_review_missing_or_stale")
    reasons += ["visual_"+key for key in VISUAL_CHECKS if review.get(key) is not True]
    if metadata.get("blank"):
        reasons.append("blank_artwork")
    return {"status": "draft_allowed" if not reasons else "blocked", "reasons": reasons,
            "sha256": metadata.get("sha256"), "published": False}

def final_readiness(inspection, review, mockup_urls):
    """Bind human visual review to exact bytes and require provider mockups."""
    reasons = list(inspection["reasons"])
    if review.get("sha256") != inspection["sha256"]:
        reasons.append("visual_review_missing_or_stale")
    reasons += ["visual_" + key for key in VISUAL_CHECKS if review.get(key) is not True]
    if not mockup_urls or not all(isinstance(u, str) and u.startswith("https://") for u in mockup_urls):
        reasons.append("authentic_provider_mockup_required")
    # URLs must come from the existing provider response; URL shape alone cannot authenticate them.
    if review.get("provider_mockup_confirmed") is not True:
        reasons.append("provider_mockup_provenance_unconfirmed")
    return {"status": "reviewed_ready" if not reasons else "blocked", "reasons": reasons,
            "sha256": inspection["sha256"], "published": False}

def quote_margin(*, retail, buyer_shipping, production, shipping, tax_cost,
                 marketplace_rate, payment_rate, fixed_fees, refund_reserve,
                 currency, quote_date):
    """Require all costs explicitly. Return contribution, never projected earnings."""
    vals = [Decimal(str(v)) for v in (retail, buyer_shipping, production, shipping,
            tax_cost, marketplace_rate, payment_rate, fixed_fees, refund_reserve)]
    if any(not v.is_finite() or v < 0 for v in vals):
        raise ValueError("Nonnegative finite costs required")
    r, bs, p, s, t, mr, pr, f, rr = vals
    if mr > 1 or pr > 1 or not currency or not quote_date:
        raise ValueError("Valid rates, currency and dated quote required")
    gross = r + bs
    contribution = gross - p - s - t - gross * (mr + pr) - f - rr
    return {"currency": currency, "quote_date": quote_date,
            "contribution": str(contribution.quantize(Decimal('.01'))),
            "fulfilment_cash_required": str((p+s+t).quantize(Decimal('.01'))),
            "payout_timing": "unverified", "sales": "unverified"}
