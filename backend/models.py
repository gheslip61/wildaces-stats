from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class Player(BaseModel):
    id: int
    name: str
    team: Optional[str] = None
    position: Optional[str] = None
    handedness: Optional[str] = None


class PlayerCreate(BaseModel):
    name: str
    team: Optional[str] = None
    position: Optional[str] = None
    handedness: Optional[str] = None


class StatsRow(BaseModel):
    ab: int = 0
    hits: int = 0
    singles: int = 0
    doubles: int = 0
    triples: int = 0
    home_runs: int = 0
    walks: int = 0
    strikeouts: int = 0
    rbi: int = 0
    ba: float = 0.0
    obp: float = 0.0
    slg: float = 0.0
    ops: float = 0.0


class GameStatsRow(StatsRow):
    game_date: date
    opponent: str


class TeamStatsRow(StatsRow):
    player_id: int
    name: str


class AtBat(BaseModel):
    id: int
    game_date: date
    opponent: str
    result: str
    rbi: int
    inning: Optional[int] = None
    created_at: Optional[datetime] = None


class AtBatCreate(BaseModel):
    player_id: int
    game_date: date
    opponent: str
    result: str
    rbi: int = 0
    inning: Optional[int] = None


class GameAtBat(BaseModel):
    id: int
    player_id: int
    player_name: str
    result: str
    rbi: int
    inning: Optional[int] = None


class Game(BaseModel):
    game_date: date
    opponent: str


class AuthRequest(BaseModel):
    password: str


class AuthResponse(BaseModel):
    success: bool


class GameScore(BaseModel):
    game_date: str
    opponent: str
    is_home: Optional[bool] = None
    wild_aces_runs: list[int] = []
    opponent_runs: list[int] = []


class GameScoreCreate(BaseModel):
    game_date: str
    opponent: str
    is_home: Optional[bool] = None
    wild_aces_runs: list[int] = []
    opponent_runs: list[int] = []


class LineScore(BaseModel):
    wild_aces_runs: list[int] = []
    opponent_runs: list[int] = []
    is_home: Optional[bool] = None


class ScannedAtBat(BaseModel):
    player_name: str
    matched: bool
    result: str
    rbi: int = 0
    inning: Optional[int] = None
    confidence: float = 0.0
    note: str = ""


class ScanResult(BaseModel):
    game_date: Optional[str] = None
    opponent: Optional[str] = None
    line_score: Optional[LineScore] = None
    at_bats: list[ScannedAtBat] = []


class AtBatBulkCreate(BaseModel):
    at_bats: list[AtBatCreate]


class LineupSpot(BaseModel):
    spot: int
    label: str
    player_id: int
    name: str
    ops: float
    obp: float
    slg: float
    ba: float
    ab: int
    hits: int
    home_runs: int
    rbi: int
