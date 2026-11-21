#!/usr/bin/env python3
"""Validate independently published Springville High School sports fixtures and scores."""
import datetime as dt
import json
import pathlib
import re
from urllib.parse import urlparse

root = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((root / "data" / "sports.json").read_text(encoding="utf-8"))
assert data["school"]["name"] == "Springville High School Tigers"
assert data["school"]["city"] == "Springville, Alabama"
assert data["school"]["timezone"] == "America/Chicago"
assert dt.date.fromisoformat(data["school"]["updatedAt"])
ids, matchups = set(), set()
allowed_status = {"scheduled", "final", "unconfirmed", "postponed", "cancelled"}
for game in data["games"]:
    assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", game["id"]), game
    assert game["id"] not in ids, f"Duplicate game ID: {game['id']}"
    ids.add(game["id"])
    date = dt.date.fromisoformat(game["date"])
    season = re.fullmatch(r"(20\d{2})-(\d{2})", game["season"])
    assert season, f"Invalid school-year season: {game['id']}"
    start_year = int(season.group(1))
    end_year = int("20" + season.group(2))
    assert end_year == start_year + 1, game
    assert dt.date(start_year, 7, 1) <= date <= dt.date(end_year, 6, 30), \
        f"Game date outside claimed season: {game['id']}"
    assert game["sport"].strip() and game["opponent"].strip() and game["level"].strip(), game
    assert game["gender"] in ("Boys", "Girls", "Co-ed"), game
    assert game["site"] in ("home", "away", "neutral"), game
    assert game["status"] in allowed_status, game
    for field in ("sourceUrl", "secondarySourceUrl"):
        if field in game:
            u = urlparse(game[field])
            assert u.scheme == "https" and u.hostname, f"Bad source URL: {game['id']}"
    assert game["sourceName"].strip() and dt.date.fromisoformat(game["verifiedAt"]), game
    signature = (game["date"], game["sport"].lower(), game["gender"], game["level"].lower(),
                 game["opponent"].lower(), (game.get("time") or "").lower())
    assert signature not in matchups, f"Duplicate real-world fixture: {game['id']}"
    matchups.add(signature)
    if game["status"] == "final":
        has_score = ("springvilleScore" in game and "opponentScore" in game)
        has_result = bool(game.get("resultText"))
        assert has_score != has_result, f"Final requires either numeric score or meet result: {game['id']}"
        if has_score:
            for field in ("springvilleScore", "opponentScore"):
                assert type(game[field]) is int and game[field] >= 0, game
    else:
        assert "springvilleScore" not in game and "opponentScore" not in game and \
            not game.get("resultText"), f"Unconfirmed game cannot have a final result: {game['id']}"
print(f"OK: {len(data['games'])} verified Tigers fixtures/results.")
