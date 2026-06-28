"""Scoresheet scanning via Claude Vision.

Takes an uploaded scoresheet photo, sends it to Claude with the current
roster for name-matching, and returns a draft list of at-bats for the
user to review before anything touches the database.
"""

import base64
import io
import json
import os

import anthropic
from PIL import Image

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

MODEL = os.getenv("SCORESHEET_MODEL", "claude-sonnet-4-6")
MAX_DIMENSION = 1568  # Anthropic's recommended max image edge

VALID_RESULTS = ["Single", "Double", "Triple", "Home Run", "Walk", "Strikeout", "Out"]

SYSTEM_PROMPT = """You are an expert slo-pitch scorekeeper. You read handwritten \
scoresheets and extract every at-bat into structured data.

The team uses a custom pre-printed sheet titled "WILD ACES — SLO-PITCH SCORESHEET". \
Read it with EXACTLY these rules:

Header (top of sheet):
- Boxed fields for DATE, OPPONENT, HOME/VISITOR, FIELD/LOCATION, and FINAL SCORE. \
Extract the handwritten date (return as YYYY-MM-DD) and opponent name if filled in.

Grid layout:
- Player names run down the left column, one numbered row per batter, with a POS \
column. Grey rows labelled SUB are substitute slots — skip them unless clearly \
filled in.
- Seven numbered inning columns (INNING 1 through INNING 7). Each cell is one \
potential plate appearance.

Cell anatomy — every cell is split into a LEFT zone and a RIGHT zone:
1. A faint grey printed ID in the top-left corner: R{row}-I{inning}, e.g. R3-I5 = \
row 3, inning 5 (sub-row cells read R3s-I5). USE THESE IDs to confirm which row and \
inning every mark belongs to — they make tilt and misalignment irrelevant.
2. LEFT zone: a small dashed base-running diamond (printed base labels 2/1/3/H). \
This is for base running ONLY and is NEVER the result. Ignore it entirely when \
reading the result.
3. RIGHT zone: a large rectangular WRITE BOX under a faint printed "RESULT-RBI" hint. \
This is where the scorekeeper hand-writes the at-bat as a CODE.

Also note: rows alternate white/light-grey shading, and thicker vertical rules run \
after innings 3 and 6 — these are printed structure, not handwriting.

How results are recorded — READ THE HANDWRITTEN CODE IN THE WRITE BOX:
- The scorekeeper writes ONE code per at-bat in the box, in the form RESULT-RBI, \
e.g. "1B-2" = Single with 2 RBIs, "HR-3" = Home Run with 3 RBIs, "OUT-0" = Out with \
0 RBIs, "K-0" = Strikeout. Read the handwritten token directly.
- RESULT codes map exactly: 1B = Single, 2B = Double, 3B = Triple, HR = Home Run, \
BB = Walk, K = Strikeout, OUT = Out.
- The digit AFTER the dash is the RBI count (0-4). If the digit is missing or \
unreadable, default rbi to 0 and note it.
- The LEFT-zone diamond records base running only — IGNORE it for the result. \
(For reference: a filled diamond = the runner later scored, an X on a base = out on \
the bases, diagonal lines on a base = left stranded. None of this changes the at-bat \
result, which comes only from the written code.)
- A cell contains an at-bat ONLY if the write box has a handwritten code. An empty \
write box = no plate appearance = OMIT the cell. Most players bat in only 4-6 \
innings, so many cells are empty. A phantom at-bat is a worse error than a missed \
detail. Marks in the diamond alone, with an empty write box, do NOT count as an \
at-bat.
- A crossed-out player name means that player did not play; skip their whole row.
- Ignore the HOW TO SCORE legend at the bottom of the page.

LEGACY SHEETS — if the photo instead shows a generic scoresheet where each cell has \
a diamond with a vertical stack of small labels (HR/3B/2B/1B/BB) on its right edge: \
the scorekeeper CIRCLES a label for the result (judge by the circle's centre), an X \
through the diamond = Out, a handwritten K = Strikeout, a handwritten digit beside \
the cell = RBIs, and a circled label belongs to the diamond on its LEFT. Stray \
diagonal advancement lines spilling into empty cells are NOT at-bats.

Extraction rules:
- Work row by row: for each player, scan their row left to right across innings 1-9 \
and list every marked cell in order.
- Match each handwritten name to the provided roster. Names may be partial, \
first-only, last-only, or nicknames. If no reasonable roster match exists, still \
include the at-bat with your best reading of the name and matched=false.
- result must be exactly one of: Single, Double, Triple, Home Run, Walk, Strikeout, Out.
- confidence is your honest 0-1 estimate that the row (player + result + rbi) is \
correct. Be honest: if you cannot clearly read the written code, say so in the note \
and lower the confidence.
- If a cell is unreadable, omit it rather than guessing.

Line score (bottom of sheet):
- There is a diagonal-split box score table at the bottom with rows for Visiting \
and Home inning runs. The scorekeeper writes the runs scored in each inning.
- The header HOME/VISITOR field shows which team is Wild Aces.
- Extract wild_aces_runs and opponent_runs as integer arrays — one entry per inning \
played (7 for a full slo-pitch game). Omit trailing innings if not played.
- is_home is true if Wild Aces are the Home team, false if Visitor.
- If the line score section is entirely blank, omit "line_score" from the JSON.

CRITICAL OUTPUT RULE: Do NOT write any reasoning, analysis, player mapping, or \
explanation. Do NOT restate the rows. Your entire response must be ONLY the JSON \
object — the very first character you output must be "{". Keep each "note" under 8 \
words. Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{
  "game_date": "YYYY-MM-DD or null if not visible",
  "opponent": "string or null if not visible",
  "line_score": {
    "wild_aces_runs": [2, 0, 3, 1, 0, 2, 4],
    "opponent_runs": [0, 1, 0, 2, 0, 0, 1],
    "is_home": true
  },
  "at_bats": [
    {
      "player_name": "name as matched to roster, or best reading if unmatched",
      "matched": true,
      "inning": 3,
      "result": "Single",
      "rbi": 0,
      "confidence": 0.9,
      "note": "optional short note about ambiguity, else empty string"
    }
  ]
}"""


def _to_b64_jpeg(img: Image.Image) -> str:
    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


def _prepare_images(data: bytes) -> list[tuple[str, str]]:
    """Return (label, base64) pairs: the full sheet plus zoomed halves.

    The API downscales images to ~1568px on the long edge, which makes the small
    circled labels hard to read on a full-sheet photo. Sending the top and bottom
    halves as separate images doubles the effective resolution of the grid.
    """
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size

    images = [("Full scoresheet (for layout and row order)", _to_b64_jpeg(img))]

    # Quadrant crops at near-native resolution so the circled labels are legible.
    ox, oy = int(w * 0.06), int(h * 0.06)
    quads = [
        ("Zoomed TOP-LEFT quadrant", (0, 0, w // 2 + ox, h // 2 + oy)),
        ("Zoomed TOP-RIGHT quadrant", (w // 2 - ox, 0, w, h // 2 + oy)),
        ("Zoomed BOTTOM-LEFT quadrant", (0, h // 2 - oy, w // 2 + ox, h)),
        ("Zoomed BOTTOM-RIGHT quadrant", (w // 2 - ox, h // 2 - oy, w, h)),
    ]
    for label, box in quads:
        images.append((label, _to_b64_jpeg(img.crop(box))))
    return images


def scan_scoresheet(image_bytes: bytes, roster_names: list[str]) -> dict:
    """Send the scoresheet to Claude Vision and return the parsed draft."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Add it to backend/.env to enable scoresheet scanning."
        )

    images = _prepare_images(image_bytes)
    client = anthropic.Anthropic(api_key=api_key)

    roster_list = "\n".join(f"- {n}" for n in roster_names) or "(no roster provided)"

    content = []
    for label, b64 in images:
        content.append({"type": "text", "text": f"{label}:"})
        content.append(
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
            }
        )
    content.append(
        {
            "type": "text",
            "text": (
                "All images show the SAME scoresheet — use the zoomed halves to read "
                "which label is circled in each cell.\n\n"
                "Here is the team roster to match names against:\n"
                f"{roster_list}\n\n"
                "Extract every at-bat from this scoresheet."
            ),
        }
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )

    # Collect all text blocks (the response may contain non-text blocks too)
    raw = "".join(
        block.text for block in response.content if getattr(block, "type", "") == "text"
    ).strip()

    if not raw:
        raise RuntimeError(
            f"Model returned no text (stop_reason={response.stop_reason}). Try again."
        )

    if response.stop_reason == "max_tokens" and "{" not in raw:
        raise RuntimeError(
            "The model ran out of room before returning data. Try a clearer or tighter photo."
        )

    # Extract the JSON object even if the model wrapped it in fences or preamble
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f"Model did not return JSON. Response started with: {raw[:200]}")

    try:
        parsed = json.loads(raw[start : end + 1])
    except json.JSONDecodeError as e:
        if response.stop_reason == "max_tokens":
            raise RuntimeError(
                "Response was cut off before completing — the scoresheet may have too many "
                "entries. Try a clearer or tighter photo."
            )
        raise RuntimeError(f"Could not parse model response as JSON: {e}. "
                           f"Response started with: {raw[:200]}")

    # Sanitise: clamp results to valid options, coerce types
    clean_at_bats = []
    for ab in parsed.get("at_bats", []):
        result = ab.get("result", "Out")
        if result not in VALID_RESULTS:
            result = "Out"
        raw_inning = ab.get("inning")
        inning = int(raw_inning) if raw_inning is not None else None
        clean_at_bats.append(
            {
                "player_name": str(ab.get("player_name", "")).strip(),
                "matched": bool(ab.get("matched", False)),
                "inning": inning,
                "result": result,
                "rbi": max(0, min(4, int(ab.get("rbi") or 0))),
                "confidence": max(0.0, min(1.0, float(ab.get("confidence") or 0.0))),
                "note": str(ab.get("note", "")),
            }
        )

    # Extract and sanitise line score
    line_score = None
    raw_ls = parsed.get("line_score")
    if raw_ls and isinstance(raw_ls, dict):
        try:
            wa = [max(0, int(x)) for x in raw_ls.get("wild_aces_runs", [])]
            opp = [max(0, int(x)) for x in raw_ls.get("opponent_runs", [])]
            if wa or opp:
                line_score = {
                    "wild_aces_runs": wa,
                    "opponent_runs": opp,
                    "is_home": raw_ls.get("is_home"),
                }
        except (TypeError, ValueError):
            pass

    return {
        "game_date": parsed.get("game_date"),
        "opponent": parsed.get("opponent"),
        "line_score": line_score,
        "at_bats": clean_at_bats,
    }
