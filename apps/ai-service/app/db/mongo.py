from datetime import UTC, datetime
from urllib.parse import urlparse

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.config import Settings

_client: MongoClient | None = None


def get_mongo_client(settings: Settings) -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client


def get_database(settings: Settings) -> Database:
    return get_mongo_client(settings)[_database_name(settings)]


def get_embeddings_collection(settings: Settings) -> Collection:
    return get_database(settings)[settings.vector_collection_name]


def _database_name(settings: Settings) -> str:
    path = urlparse(settings.mongodb_uri).path.lstrip("/")
    if path:
        return path.split("?")[0]
    return "talentos"


def ensure_embedding_indexes(collection: Collection) -> None:
    collection.create_index(
        [
            ("organization_id", ASCENDING),
            ("entity_type", ASCENDING),
            ("entity_id", ASCENDING),
            ("chunk_index", ASCENDING),
        ],
        unique=True,
        name="org_entity_chunk_unique",
    )
    collection.create_index(
        [("organization_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING)],
        name="org_entity_lookup",
    )


def utc_now() -> datetime:
    return datetime.now(UTC)
