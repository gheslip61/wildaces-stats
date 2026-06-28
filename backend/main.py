import os
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from typing import List, Optional

import db
from models import (
    Player,
    PlayerCreate,
    StatsRow,
    GameStatsRow,
    TeamStatsRow,
    AtBat,
    AtBatCreate,
    GameAtBat,
    Game,
    AuthRequest,
    AuthResponse,
    LineupSpot,
    ScanResult,
    AtBatBulkCreate,
    GameScore,
    GameScoreCreate,
)

load_dotenv()

app = FastAPI(title="Wild Aces Stats API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PHOTOS_DIR = os.getenv("PHOTOS_DIR", os.path.join(os.path.dirname(__file__), "photos"))
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/api/auth/verify", response_model=AuthResponse)
def verify_password(body: AuthRequest):
    expected = os.getenv("ENTRY_PASSWORD", "")
    return AuthResponse(success=(body.password == expected))


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

@app.get("/api/players", response_model=List[Player])
def get_players():
    return db.fetch_players()


@app.post("/api/players", response_model=Player, status_code=201)
def create_player(body: PlayerCreate):
    player_id = db.add_player(body.name, body.team or "", body.position or "", body.handedness or "")
    return Player(
        id=player_id,
        name=body.name,
        team=body.team,
        position=body.position,
        handedness=body.handedness,
    )


@app.delete("/api/players/{player_id}", status_code=204)
def remove_player(player_id: int):
    db.delete_player(player_id)


# ---------------------------------------------------------------------------
# Player stats
# ---------------------------------------------------------------------------

@app.get("/api/players/{player_id}/stats", response_model=StatsRow)
def get_player_stats(player_id: int):
    return db.fetch_player_stats(player_id)


@app.get("/api/players/{player_id}/game-stats", response_model=List[GameStatsRow])
def get_game_stats(player_id: int):
    return db.fetch_game_stats(player_id)


@app.get("/api/players/{player_id}/at-bats", response_model=List[AtBat])
def get_at_bats(player_id: int):
    return db.fetch_at_bats(player_id)


# ---------------------------------------------------------------------------
# At-bats
# ---------------------------------------------------------------------------

@app.post("/api/at-bats", status_code=201)
def create_at_bat(body: AtBatCreate):
    db.log_at_bat(body.player_id, str(body.game_date), body.opponent, body.result, body.rbi, body.inning)
    return {"ok": True}


@app.delete("/api/at-bats/{at_bat_id}", status_code=204)
def remove_at_bat(at_bat_id: int):
    db.delete_at_bat(at_bat_id)


@app.post("/api/at-bats/bulk", status_code=201)
def create_at_bats_bulk(body: AtBatBulkCreate):
    for ab in body.at_bats:
        db.log_at_bat(ab.player_id, str(ab.game_date), ab.opponent, ab.result, ab.rbi, ab.inning)
    return {"ok": True, "inserted": len(body.at_bats)}


# ---------------------------------------------------------------------------
# Scoresheet scanning
# ---------------------------------------------------------------------------

@app.post("/api/scoresheet/scan", response_model=ScanResult)
async def scan_scoresheet_endpoint(file: UploadFile = File(...)):
    from scoresheet import scan_scoresheet

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    roster = [p["name"] for p in db.fetch_players()]
    try:
        return scan_scoresheet(image_bytes, roster)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {e}")


# ---------------------------------------------------------------------------
# Team stats
# ---------------------------------------------------------------------------

@app.get("/api/team/stats", response_model=List[TeamStatsRow])
def get_team_stats():
    return db.fetch_team_stats()


@app.get("/api/team/game-stats-all")
def get_all_player_game_stats():
    return db.fetch_all_player_game_stats()


@app.get("/api/team/stats/game", response_model=List[TeamStatsRow])
def get_team_stats_for_game(
    date: str = Query(..., description="YYYY-MM-DD"),
    opponent: str = Query(...),
):
    return db.fetch_team_stats_for_game(date, opponent)


# ---------------------------------------------------------------------------
# Games
# ---------------------------------------------------------------------------

@app.get("/api/games", response_model=List[Game])
def get_games():
    return db.fetch_all_games()


@app.get("/api/games/at-bats", response_model=List[GameAtBat])
def get_game_at_bats(
    date: str = Query(..., description="YYYY-MM-DD"),
    opponent: str = Query(...),
):
    return db.fetch_game_at_bats(date, opponent)


# ---------------------------------------------------------------------------
# Game scores
# ---------------------------------------------------------------------------

@app.get("/api/games/scores", response_model=List[GameScore])
def get_game_scores():
    return db.fetch_game_scores()


@app.get("/api/games/scores/single", response_model=Optional[GameScore])
def get_game_score(
    date: str = Query(..., description="YYYY-MM-DD"),
    opponent: str = Query(...),
):
    return db.fetch_game_score(date, opponent)


@app.post("/api/games/scores", status_code=201)
def save_game_score(body: GameScoreCreate):
    db.upsert_game_score(
        str(body.game_date),
        body.opponent,
        body.is_home,
        body.wild_aces_runs,
        body.opponent_runs,
    )
    return {"ok": True}


@app.delete("/api/games/scores", status_code=204)
def remove_game_score(
    date: str = Query(..., description="YYYY-MM-DD"),
    opponent: str = Query(...),
):
    db.delete_game_score(date, opponent)


# ---------------------------------------------------------------------------
# Optimal lineup
# ---------------------------------------------------------------------------

LINEUP_LABELS = {
    1: "Leadoff",
    2: "2-Hole",
    3: "3-Hole",
    4: "Cleanup",
    5: "5-Hole",
    6: "6-Hole",
    7: "7-Hole",
    8: "8-Hole",
    9: "9-Hole",
}


@app.get("/api/lineup/optimal", response_model=List[LineupSpot])
def get_optimal_lineup():
    all_stats = db.fetch_team_stats()
    # Filter players with at least 1 AB
    pool = [s for s in all_stats if (s.get("ab") or 0) > 0]

    if not pool:
        return []

    remaining = list(pool)
    lineup = {}

    def pop_best(key: str, items: list):
        best = max(items, key=lambda r: r.get(key) or 0)
        items.remove(best)
        return best

    # Spot 3: best OPS
    spot3 = pop_best("ops", remaining)
    lineup[3] = spot3

    # Spot 4: best SLG from remaining
    spot4 = pop_best("slg", remaining)
    lineup[4] = spot4

    # Spot 1: best OBP from remaining
    spot1 = pop_best("obp", remaining)
    lineup[1] = spot1

    # Spot 2: 2nd best OBP (best from remaining after spot1 removed)
    spot2 = pop_best("obp", remaining)
    lineup[2] = spot2

    # Spots 5+: remaining sorted by OPS desc
    remaining.sort(key=lambda r: r.get("ops") or 0, reverse=True)
    for i, player in enumerate(remaining, start=5):
        lineup[i] = player

    result = []
    for spot in sorted(lineup.keys()):
        p = lineup[spot]
        result.append(
            LineupSpot(
                spot=spot,
                label=LINEUP_LABELS.get(spot, f"{spot}-Hole"),
                player_id=p.get("player_id") or 0,
                name=p.get("name") or "",
                ops=p.get("ops") or 0,
                obp=p.get("obp") or 0,
                slg=p.get("slg") or 0,
                ba=p.get("ba") or 0,
                ab=p.get("ab") or 0,
                hits=p.get("hits") or 0,
                home_runs=p.get("home_runs") or 0,
                rbi=p.get("rbi") or 0,
            )
        )
    return result
