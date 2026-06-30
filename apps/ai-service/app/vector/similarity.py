import math
from typing import Any


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (left_norm * right_norm)))


def average_max_chunk_similarity(
    source_embeddings: list[list[float]],
    target_embeddings: list[list[float]],
) -> float:
    if not source_embeddings or not target_embeddings:
        return 0.0

    scores: list[float] = []
    for source in source_embeddings:
        best = max(cosine_similarity(source, target) for target in target_embeddings)
        scores.append(best)

    return sum(scores) / len(scores)
