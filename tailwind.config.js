"""Shared fixtures for Raven Sharp Studio backend tests."""
import os
import time
import requests
import pytest
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://integration-demo-1.preview.emergentagent.com').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


def _make_user(tier='free'):
    mc = MongoClient(MONGO_URL)
    db = mc[DB_NAME]
    ts = int(time.time() * 1000)
    user_id = f"TEST_user_{ts}"
    token = f"TEST_token_{ts}"
    db.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{ts}@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "tier": tier,
        "gelato_api_key": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mc.close()
    return user_id, token


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def free_user():
    user_id, token = _make_user('free')
    yield {"user_id": user_id, "token": token}
    mc = MongoClient(MONGO_URL); db = mc[DB_NAME]
    db.users.delete_one({"user_id": user_id})
    db.user_sessions.delete_many({"user_id": user_id})
    db.usage.delete_many({"user_id": user_id})
    db.projects.delete_many({"user_id": user_id})
    mc.close()


@pytest.fixture(scope="session")
def premium_user():
    user_id, token = _make_user('premium')
    yield {"user_id": user_id, "token": token}
    mc = MongoClient(MONGO_URL); db = mc[DB_NAME]
    db.users.delete_one({"user_id": user_id})
    db.user_sessions.delete_many({"user_id": user_id})
    db.usage.delete_many({"user_id": user_id})
    db.projects.delete_many({"user_id": user_id})
    db.payment_transactions.delete_many({"user_id": user_id})
    mc.close()


@pytest.fixture
def premium_client(premium_user):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {premium_user['token']}",
    })
    return s


@pytest.fixture
def free_client(free_user):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {free_user['token']}",
    })
    return s
