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
updated = dt.datetime.fromisoformat(data["school"]["updatedAt"])
assert updated.tzinfo is not None, "Last updated timestamp must include timezone"
for coverage in data.get("scheduleCoverage", []):
    assert coverage["sport"] and coverage["gender"] in ("Boys", "Girls"), coverage
    assert coverage["status"] in ("partial", "not_published", "complete"), coverage
    assert coverage["season"] and dt.date.fromisoformat(coverage["asOf"]), coverage
    source = urlparse(coverage["sourceUrl"])
    assert source.scheme == "https" and source.hostname, coverage

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
    assert game["sport"].strip() and game["level"].strip(), game
    event_type = game.get("eventType", "game")
    assert event_type in ("game", "meet", "tournament", "news"), game
    if event_type == "game":
        assert game.get("opponent", "").strip(), game
    else:
        assert game.get("title", "").strip(), game
        if game["sport"] == "Cross Country" and game["status"] == "final":
            top = game.get("topFinishers", [])
            prs = game.get("personalRecords", [])
            assert len(top) == 3, f"Expected 3 verified Springville finishers: {game['id']}"
            assert isinstance(prs, list), game
            top_times = []
            for field, rows in (("topFinishers", top), ("personalRecords", prs)):
                assert isinstance(rows, list), game
                seen_names = set()
                for runner in rows:
                    assert isinstance(runner, dict), game
                    assert isinstance(runner.get("name"), str) and runner["name"].strip(), game
                    assert type(runner.get("place")) is int and runner["place"] > 0, game
                    assert isinstance(runner.get("time"), str) and re.fullmatch(r"\d{1,2}:\d{2}\.\d{1,2}", runner["time"]), game
                    assert runner["name"] not in seen_names, f"Duplicate {field} runner: {game['id']}"
                    seen_names.add(runner["name"])
                    if field == "topFinishers":
                        top_times.append(float(runner["time"].split(":")[0]) * 60 + float(runner["time"].split(":")[1]))
            assert top_times == sorted(top_times), f"Finishers must be sorted by fastest time: {game['id']}"
        if "specialAchievements" in game:
            assert isinstance(game["specialAchievements"], list), game
            assert all(isinstance(v, str) and 0 < len(v.strip()) <= 200 for v in game["specialAchievements"]), game
        if "highlights" in game:
            assert isinstance(game["highlights"], list) and len(game["highlights"]) <= 6, game
            assert all(isinstance(s, str) and 0 < len(s.strip()) <= 200 for s in game["highlights"]), game
        if "teamPlace" in game:
            assert type(game["teamPlace"]) is int and game["teamPlace"] > 0, game
        if "teamCount" in game:
            assert type(game["teamCount"]) is int and game["teamCount"] >= game.get("teamPlace", 1), game
        if "teamCountEstimated" in game:
            assert game.get("teamCountEstimated") is True and "teamCount" in game, game
        if "teamScore" in game:
            assert type(game["teamScore"]) is int and game["teamScore"] >= 0, game
    if "playerHighlights" in game:
        players = game["playerHighlights"]
        assert isinstance(players, list) and len(players) <= 3, f"At most 3 player highlights: {game['id']}"
        for athlete in players:
            assert isinstance(athlete, dict), game
            assert isinstance(athlete.get("name"), str) and athlete["name"].strip(), game
            assert isinstance(athlete.get("achievement"), str) and athlete["achievement"].strip(), game
            assert len(athlete["achievement"]) <= 250, game
            if "sourceUrl" in athlete:
                source = urlparse(athlete["sourceUrl"])
                assert source.scheme == "https" and source.hostname, game

    if "gameNumber" in game:
        assert game["sport"] == "Baseball" and game["level"] == "Varsity", game
        assert type(game["gameNumber"]) is int and 1 <= game["gameNumber"] <= 3, game
        assert isinstance(game.get("sourceEventId"), str) and re.fullmatch(r"\d+", game["sourceEventId"]), game
    if "venueUnconfirmed" in game:
        assert game["venueUnconfirmed"] is True and game["site"] == "neutral", game
    assert game["gender"] in ("Boys", "Girls", "Co-ed"), game
    assert game["site"] in ("home", "away", "neutral"), game
    assert game["status"] in allowed_status, game
    for field in ("sourceUrl", "secondarySourceUrl"):
        if field in game:
            u = urlparse(game[field])
            assert u.scheme == "https" and u.hostname, f"Bad source URL: {game['id']}"
    assert game["sourceName"].strip() and dt.date.fromisoformat(game["verifiedAt"]), game
    signature = (game["date"], game["sport"].lower(), game["gender"], game["level"].lower(),
                 (game.get("opponent") or game.get("title") or "").lower(), (game.get("time") or "").lower(),
                 game.get("gameNumber", 0))
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
