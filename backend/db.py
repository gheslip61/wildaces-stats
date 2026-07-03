import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def compute_rates(row: dict) -> dict:
    ab = row.get("ab") or 0
    hits = row.get("hits") or 0
    singles = row.get("singles") or 0
    doubles = row.get("doubles") or 0
    triples = row.get("triples") or 0
    home_runs = row.get("home_runs") or 0
    walks = row.get("walks") or 0

    sac_flies = row.get("sac_flies") or 0
    ba = hits / ab if ab > 0 else 0.0
    obp = (hits + walks) / (ab + walks + sac_flies) if (ab + walks + sac_flies) > 0 else 0.0
    slg = (singles + doubles * 2 + triples * 3 + home_runs * 4) / ab if ab > 0 else 0.0
    ops = obp + slg

    return {**row, "ba": round(ba, 3), "obp": round(obp, 3), "slg": round(slg, 3), "ops": round(ops, 3)}


def fetch_players():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, team, position, handedness FROM players ORDER BY name;")
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_player_stats(player_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    SUM(CASE WHEN result != 'Walk' AND NOT (result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(rbi,0) >= 1) THEN 1 ELSE 0 END) AS ab,
                    SUM(CASE WHEN result IN ('Single','Double','Triple','Home Run') THEN 1 ELSE 0 END) AS hits,
                    SUM(CASE WHEN result = 'Single' THEN 1 ELSE 0 END) AS singles,
                    SUM(CASE WHEN result = 'Double' THEN 1 ELSE 0 END) AS doubles,
                    SUM(CASE WHEN result = 'Triple' THEN 1 ELSE 0 END) AS triples,
                    SUM(CASE WHEN result = 'Home Run' THEN 1 ELSE 0 END) AS home_runs,
                    SUM(CASE WHEN result = 'Walk' THEN 1 ELSE 0 END) AS walks,
                    SUM(CASE WHEN result = 'Strikeout' THEN 1 ELSE 0 END) AS strikeouts,
                    SUM(CASE WHEN result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(rbi,0) >= 1 THEN 1 ELSE 0 END) AS sac_flies,
                    SUM(rbi) AS rbi
                FROM at_bats WHERE player_id = %s;
                """,
                (player_id,),
            )
            row = dict(cur.fetchone())
            return compute_rates(row)
    finally:
        conn.close()


def fetch_game_stats(player_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    game_date,
                    opponent,
                    SUM(CASE WHEN result != 'Walk' AND NOT (result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(rbi,0) >= 1) THEN 1 ELSE 0 END) AS ab,
                    SUM(CASE WHEN result IN ('Single','Double','Triple','Home Run') THEN 1 ELSE 0 END) AS hits,
                    SUM(CASE WHEN result = 'Single' THEN 1 ELSE 0 END) AS singles,
                    SUM(CASE WHEN result = 'Double' THEN 1 ELSE 0 END) AS doubles,
                    SUM(CASE WHEN result = 'Triple' THEN 1 ELSE 0 END) AS triples,
                    SUM(CASE WHEN result = 'Home Run' THEN 1 ELSE 0 END) AS home_runs,
                    SUM(CASE WHEN result = 'Walk' THEN 1 ELSE 0 END) AS walks,
                    SUM(CASE WHEN result = 'Strikeout' THEN 1 ELSE 0 END) AS strikeouts,
                    SUM(CASE WHEN result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(rbi,0) >= 1 THEN 1 ELSE 0 END) AS sac_flies,
                    SUM(rbi) AS rbi
                FROM at_bats
                WHERE player_id = %s
                GROUP BY game_date, opponent
                ORDER BY game_date DESC;
                """,
                (player_id,),
            )
            return [compute_rates(dict(r)) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_team_stats():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    p.id AS player_id,
                    p.name,
                    SUM(CASE WHEN a.result != 'Walk' AND NOT (a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1) THEN 1 ELSE 0 END) AS ab,
                    SUM(CASE WHEN a.result IN ('Single','Double','Triple','Home Run') THEN 1 ELSE 0 END) AS hits,
                    SUM(CASE WHEN a.result = 'Single' THEN 1 ELSE 0 END) AS singles,
                    SUM(CASE WHEN a.result = 'Double' THEN 1 ELSE 0 END) AS doubles,
                    SUM(CASE WHEN a.result = 'Triple' THEN 1 ELSE 0 END) AS triples,
                    SUM(CASE WHEN a.result = 'Home Run' THEN 1 ELSE 0 END) AS home_runs,
                    SUM(CASE WHEN a.result = 'Walk' THEN 1 ELSE 0 END) AS walks,
                    SUM(CASE WHEN a.result = 'Strikeout' THEN 1 ELSE 0 END) AS strikeouts,
                    SUM(CASE WHEN a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1 THEN 1 ELSE 0 END) AS sac_flies,
                    SUM(a.rbi) AS rbi
                FROM at_bats a
                JOIN players p ON p.id = a.player_id
                GROUP BY p.id, p.name
                ORDER BY p.name;
                """
            )
            return [compute_rates(dict(r)) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_all_games():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT DISTINCT game_date, opponent FROM at_bats ORDER BY game_date DESC, opponent;"
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_all_player_game_stats():
    """Per-game stats for every player — used for recency-weighted lineup."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    p.id AS player_id,
                    p.name,
                    a.game_date::text,
                    a.opponent,
                    SUM(CASE WHEN a.result != 'Walk' AND NOT (a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1) THEN 1 ELSE 0 END) AS ab,
                    SUM(CASE WHEN a.result IN ('Single','Double','Triple','Home Run') THEN 1 ELSE 0 END) AS hits,
                    SUM(CASE WHEN a.result = 'Single' THEN 1 ELSE 0 END) AS singles,
                    SUM(CASE WHEN a.result = 'Double' THEN 1 ELSE 0 END) AS doubles,
                    SUM(CASE WHEN a.result = 'Triple' THEN 1 ELSE 0 END) AS triples,
                    SUM(CASE WHEN a.result = 'Home Run' THEN 1 ELSE 0 END) AS home_runs,
                    SUM(CASE WHEN a.result = 'Walk' THEN 1 ELSE 0 END) AS walks,
                    SUM(CASE WHEN a.result = 'Strikeout' THEN 1 ELSE 0 END) AS strikeouts,
                    SUM(CASE WHEN a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1 THEN 1 ELSE 0 END) AS sac_flies,
                    SUM(a.rbi) AS rbi
                FROM at_bats a
                JOIN players p ON p.id = a.player_id
                GROUP BY p.id, p.name, a.game_date, a.opponent
                ORDER BY p.name, a.game_date DESC;
                """
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_team_stats_for_game(game_date: str, opponent: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    p.id AS player_id,
                    p.name,
                    SUM(CASE WHEN a.result != 'Walk' AND NOT (a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1) THEN 1 ELSE 0 END) AS ab,
                    SUM(CASE WHEN a.result IN ('Single','Double','Triple','Home Run') THEN 1 ELSE 0 END) AS hits,
                    SUM(CASE WHEN a.result = 'Single' THEN 1 ELSE 0 END) AS singles,
                    SUM(CASE WHEN a.result = 'Double' THEN 1 ELSE 0 END) AS doubles,
                    SUM(CASE WHEN a.result = 'Triple' THEN 1 ELSE 0 END) AS triples,
                    SUM(CASE WHEN a.result = 'Home Run' THEN 1 ELSE 0 END) AS home_runs,
                    SUM(CASE WHEN a.result = 'Walk' THEN 1 ELSE 0 END) AS walks,
                    SUM(CASE WHEN a.result = 'Strikeout' THEN 1 ELSE 0 END) AS strikeouts,
                    SUM(CASE WHEN a.result NOT IN ('Single','Double','Triple','Home Run','Walk') AND COALESCE(a.rbi,0) >= 1 THEN 1 ELSE 0 END) AS sac_flies,
                    SUM(a.rbi) AS rbi
                FROM at_bats a
                JOIN players p ON p.id = a.player_id
                WHERE a.game_date = %s AND a.opponent = %s
                GROUP BY p.id, p.name
                ORDER BY p.name;
                """,
                (game_date, opponent),
            )
            return [compute_rates(dict(r)) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_at_bats(player_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, game_date, opponent, result, rbi, created_at
                FROM at_bats
                WHERE player_id = %s
                ORDER BY game_date DESC, created_at DESC;
                """,
                (player_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def add_player(name: str, team: str, position: str, handedness: str = "") -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO players (name, team, position, handedness) VALUES (%s, %s, %s, %s) RETURNING id;",
                (name, team, position, handedness),
            )
            player_id = cur.fetchone()[0]
        conn.commit()
        return player_id
    finally:
        conn.close()


def delete_player(player_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM players WHERE id = %s;", (player_id,))
        conn.commit()
    finally:
        conn.close()


def fetch_game_at_bats(game_date: str, opponent: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT a.id, a.player_id, p.name AS player_name,
                       a.result, a.rbi, a.inning
                FROM at_bats a
                JOIN players p ON p.id = a.player_id
                WHERE a.game_date = %s AND a.opponent = %s
                ORDER BY a.inning NULLS LAST, a.created_at;
                """,
                (game_date, opponent),
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def log_at_bat(
    player_id: int,
    game_date: str,
    opponent: str,
    result: str,
    rbi: int,
    inning: int | None = None,
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO at_bats (player_id, game_date, opponent, result, rbi, inning) VALUES (%s, %s, %s, %s, %s, %s);",
                (player_id, game_date, opponent, result, rbi, inning),
            )
        conn.commit()
    finally:
        conn.close()


def fetch_game_scores():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT game_date::text, opponent, is_home,
                       wild_aces_runs, opponent_runs
                FROM game_scores
                ORDER BY game_date DESC, opponent;
                """
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def fetch_game_score(game_date: str, opponent: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT game_date::text, opponent, is_home,
                       wild_aces_runs, opponent_runs
                FROM game_scores
                WHERE game_date = %s AND opponent = %s;
                """,
                (game_date, opponent),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def upsert_game_score(
    game_date: str,
    opponent: str,
    is_home: bool | None,
    wild_aces_runs: list,
    opponent_runs: list,
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO game_scores (game_date, opponent, is_home, wild_aces_runs, opponent_runs)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (game_date, opponent)
                DO UPDATE SET
                    is_home = EXCLUDED.is_home,
                    wild_aces_runs = EXCLUDED.wild_aces_runs,
                    opponent_runs = EXCLUDED.opponent_runs;
                """,
                (game_date, opponent, is_home, wild_aces_runs, opponent_runs),
            )
        conn.commit()
    finally:
        conn.close()


def delete_game_score(game_date: str, opponent: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM game_scores WHERE game_date = %s AND opponent = %s;",
                (game_date, opponent),
            )
        conn.commit()
    finally:
        conn.close()


def delete_at_bat(at_bat_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM at_bats WHERE id = %s;", (at_bat_id,))
        conn.commit()
    finally:
        conn.close()
