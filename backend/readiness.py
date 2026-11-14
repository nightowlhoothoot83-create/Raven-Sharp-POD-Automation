"""Offline POD preflight. No API calls, inference, or publication authority."""
from decimal import Decimal
from pathlib import Path
import hashlib
import math
from PIL import Image

VISUAL_CHECKS = ("prompt_match", "composition", "no_crop", "no_artefacts",
                 "text_correct", "no_watermark", "clean_edges", "contrast",
                 "background_suitable", "product_fit", "original_rights")

def inspect_artwork(path, width_inches, height_inches, dpi=300):
    """Use actual decoded pixels; changing DPI metadata cannot pass this gate."""
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0 for v in
           (width_inches, height_inches, dpi)):
        raise ValueError("Positive physical dimensions and DPI required")
    data = Path(path).read_bytes()
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        width, height = image.size
        reasons = []
        if width < width_inches * dpi or height < height_inches * dpi:
            reasons.append("insufficient_actual_pixels")
        if abs(width / height / (width_inches / height_inches) - 1) > .01:
            reasons.append("aspect_ratio_would_crop_or_distort")
        if image.convert("RGB").getextrema() == ((255, 255),) * 3:
            reasons.append("blank_white_artwork")
        if image.mode == "RGBA" and image.getchannel("A").getextrema()[1] == 0:
            reasons.append("fully_transparent_artwork")
    return {"sha256": hashlib.sha256(data).hexdigest(), "width": width,
            "height": height, "effective_dpi": min(width/width_inches, height/height_inches),
            "print_safe": not reasons, "reasons": reasons}

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
