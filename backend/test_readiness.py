import tempfile
import unittest
from unittest.mock import patch
import httpx
import platforms
import ast
from types import SimpleNamespace
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
from readiness import inspect_artwork, inspect_artwork_bytes, draft_preflight, final_readiness, quote_margin, VISUAL_CHECKS

class ReadinessTests(unittest.TestCase):
    def test_invalid_physical_dimensions(self):
        for value in (float('nan'), float('inf'), True, 0, -1):
            with self.subTest(value=value), self.assertRaises(ValueError):
                inspect_artwork_bytes(b'', value, 10)

    def test_provider_draft_requires_measured_size_and_review(self):
        meta = {'sha256': 'exact', 'width': 2400, 'height': 3000, 'blank': False}
        review = dict.fromkeys(VISUAL_CHECKS, True)
        review['sha256'] = 'exact'
        spec = {'width_inches': 8, 'height_inches': 10, 'dpi': 300}
        self.assertEqual(draft_preflight(meta, spec, review)['status'], 'draft_allowed')
        self.assertEqual(draft_preflight({}, spec, review)['status'], 'blocked')
        self.assertEqual(draft_preflight(meta, {}, review)['status'], 'blocked')
        self.assertEqual(draft_preflight(meta, {**spec, 'width_inches': 20}, review)['status'], 'blocked')
        self.assertEqual(draft_preflight(meta, spec, {**review, 'sha256': 'stale'})['status'], 'blocked')

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

class DraftRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_server_record_blocks_spoofed_pixels_before_provider_call(self):
        # Execute the actual route body with fake persistence/provider; no app,
        # credential, database or network startup is needed for this regression.
        source = ast.parse(Path(__file__).with_name('server.py').read_text())
        route = next(n for n in source.body if isinstance(n, ast.AsyncFunctionDef)
                     and n.name == 'approve_listings')
        route.decorator_list = []
        route.returns = None
        for arg in route.args.args:
            arg.annotation = None
        route.args.defaults = []
        saved = {'results': [{'id': 'one', 'public_url': 'https://stored/art.png',
                  'artwork_metadata': {'sha256':'server', 'width':2400, 'height':3000}}]}
        calls, updates = [], []
        class Collection:
            async def find_one(self, *args): return saved
            async def update_one(self, *args): updates.append(args)
        async def push(listing, platform, user):
            calls.append(listing)
            return {'drafts_ready':1}
        scope = {'TIERS': {'free':{}}, 'db':SimpleNamespace(pipeline_runs=Collection()),
                 'draft_preflight':draft_preflight, 'push_to_platform':push,
                 'datetime':datetime, 'timezone':timezone}
        exec(compile(ast.Module(body=[route], type_ignores=[]), 'actual-route', 'exec'), scope)
        review = {**dict.fromkeys(VISUAL_CHECKS, True), 'sha256':'spoof'}
        listing = {'id':'one', 'public_url':'https://spoof/art.png',
                   'artwork_metadata': {'sha256':'spoof', 'width':99999, 'height':99999},
                   'print_spec':{'width_inches':8,'height_inches':10,'dpi':300},
                   'visual_review':review}
        payload = SimpleNamespace(approve_all=False, listings=[listing], platform='printify')
        result = await scope['approve_listings']('run', payload, {'id':'user'})
        self.assertEqual(result['pushed'], 0)
        self.assertEqual(calls, [])
        self.assertEqual(updates[-1][1]['$set']['status'], 'blocked')
        review['sha256'] = 'server'
        result = await scope['approve_listings']('run', payload, {'id':'user'})
        self.assertEqual(result['pushed'], 1)
        self.assertEqual(calls[0]['public_url'], 'https://stored/art.png')
        self.assertEqual(updates[-1][1]['$set']['status'], 'completed')

if __name__ == '__main__': unittest.main()

