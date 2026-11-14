import tempfile
import unittest
from unittest.mock import patch
import httpx
import platforms
from pathlib import Path
from PIL import Image
from readiness import inspect_artwork, final_readiness, quote_margin, VISUAL_CHECKS

class ReadinessTests(unittest.TestCase):
    def test_invalid_physical_dimensions(self):
        for value in (float('nan'), float('inf'), True, 0, -1):
            with self.subTest(value=value), self.assertRaises(ValueError):
                inspect_artwork('unused.png', value, 10)

    def test_pixels_not_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)/'art.png'
            Image.new('RGB', (80, 100), '#274c43').save(p, dpi=(300, 300))
            self.assertIn('insufficient_actual_pixels', inspect_artwork(p, 8, 10)['reasons'])

    def test_cropping_and_transparency(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)/'art.png'
            Image.new('RGBA', (300, 300), (0, 0, 0, 0)).save(p)
            checks = inspect_artwork(p, 1, 2)
            self.assertIn('fully_transparent_artwork', checks['reasons'])
            self.assertIn('aspect_ratio_would_crop_or_distort', checks['reasons'])

    def test_requires_exact_visual_review_and_mockup(self):
        inspection = {'sha256':'original', 'reasons':[]}
        review = dict.fromkeys(VISUAL_CHECKS, True)
        review.update(sha256='original', provider_mockup_confirmed=True)
        self.assertEqual(final_readiness(inspection, review, ['https://provider/mockup.png'])['status'], 'reviewed_ready')
        self.assertEqual(final_readiness(inspection, review, [])['status'], 'blocked')
        review['sha256'] = 'old'
        self.assertEqual(final_readiness(inspection, review, ['https://provider/mockup.png'])['status'], 'blocked')

    def test_all_costs_and_fulfilment_cash(self):
        quote = quote_margin(retail=25, buyer_shipping=5, production=10, shipping=5,
            tax_cost=1, marketplace_rate=.10, payment_rate=.03, fixed_fees=.25,
            refund_reserve=1, currency='USD', quote_date='2026-11-14')
        self.assertEqual(quote['contribution'], '8.85')
        self.assertEqual(quote['fulfilment_cash_required'], '16.00')
        with self.assertRaises(ValueError):
            quote_margin(retail='NaN', buyer_shipping=0, production=0, shipping=0,
                tax_cost=0, marketplace_rate=0, payment_rate=0, fixed_fees=0,
                refund_reserve=0, currency='USD', quote_date='2026-11-14')

class ProviderPricingTests(unittest.IsolatedAsyncioTestCase):
    async def test_unknown_cost_not_zero_and_worst_variant_priced(self):
        def handle(request):
            if str(request.url).endswith('print_providers.json'):
                return httpx.Response(200, json=[{'id': 1, 'title': 'Provider'}])
            return httpx.Response(200, json={'variants': [
                {'id': 1}, {'id': 2, 'cost': 0}, {'id': 3, 'cost': 1000},
                {'id': 4, 'cost': 1800}]})
        original = httpx.AsyncClient
        def client(**kwargs):
            return original(transport=httpx.MockTransport(handle))
        platforms._provider_cache.clear()
        with patch.object(platforms.httpx, 'AsyncClient', client):
            provider = await platforms.get_best_provider_for_blueprint(6, 'offline')
        self.assertEqual(provider['base_cost_usd'], 18)
        self.assertEqual([v['id'] for v in provider['variants']], [3, 4])

if __name__ == '__main__': unittest.main()

