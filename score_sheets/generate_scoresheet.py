#!/usr/bin/env python3
"""
Wild Aces Slo-Pitch Scoresheet Generator
AI/camera-readable design — reportlab version
"""

from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas as rl_canvas

# ── Output ────────────────────────────────────────────────────────────────────
OUTPUT = "wild_aces_scoresheet.pdf"

# ── Page ──────────────────────────────────────────────────────────────────────
PW, PH = landscape(letter)   # 792 × 612 pt
MARGIN = 18                   # 0.25 in — safe printable margin for all printers

# ── Vertical zones ────────────────────────────────────────────────────────────
HEADER_H    = 30   # slim game-info block (title/subtitle removed)
INN_HDR_H   = 15   # inning-label strip
LINESCORE_H = 58   # diagonal-split line score at the bottom
LS_GAP      = 6    # gap between grid and line score

GRID_TOP = PH - MARGIN - HEADER_H - INN_HDR_H
GRID_BOT = MARGIN + LINESCORE_H + LS_GAP
GRID_H   = GRID_TOP - GRID_BOT

# ── Column widths ─────────────────────────────────────────────────────────────
NAME_W = 82
POS_W  = 22
N_INN  = 7
INN_W  = (PW - 2 * MARGIN - NAME_W - POS_W) / N_INN

# ── Row heights — computed to fill the grid exactly ──────────────────────────
N_PLAYERS = 14
_row_total = GRID_H / N_PLAYERS   # total height per player slot
SUB_FRAC   = 9 / 35               # sub row is ~26 % of the slot
SUB_H      = _row_total * SUB_FRAC
PLAYER_H   = _row_total - SUB_H

GRID_LEFT = MARGIN

# ── Colors ────────────────────────────────────────────────────────────────────
C_BLACK   = colors.black
C_GRAY    = colors.Color(0.55, 0.55, 0.55)
C_LGRAY   = colors.Color(0.88, 0.88, 0.88)
C_XLGRAY  = colors.Color(0.96, 0.96, 0.96)
C_DARKBG  = colors.Color(0.15, 0.15, 0.15)
C_WHITE   = colors.white
C_FAINT   = colors.Color(0.72, 0.72, 0.72)
C_ALTROW  = colors.Color(0.94, 0.94, 0.94)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: labelled input field
# ─────────────────────────────────────────────────────────────────────────────
def labelled_field(c, x, y, w, h, label):
    c.setStrokeColor(C_BLACK)
    c.setLineWidth(0.8)
    c.rect(x, y, w, h, fill=0)
    c.setFont("Helvetica", 5.2)
    c.setFillColor(C_GRAY)
    c.drawString(x + 2, y + h + 1.5, label)
    c.setFillColor(C_BLACK)


# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
def draw_header(c):
    y = PH - MARGIN - HEADER_H
    x = GRID_LEFT

    # Input fields row (title/subtitle removed to make room for the line score)
    fy  = y + 5
    fh  = 18

    fields = [
        ("DATE", 95),
        ("OPPONENT", 150),
        ("HOME  /  VISITOR", 105),
        ("FIELD / LOCATION", 120),
    ]
    fx = x + 2
    for label, fw in fields:
        labelled_field(c, fx, fy, fw, fh, label)
        fx += fw + 8

    # Code reference (replaces the removed how-to-score legend)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(C_BLACK)
    c.drawString(fx + 4, y + HEADER_H - 11, "SCORE CODE  =  RESULT - RBI")
    c.setFont("Helvetica", 5.6)
    c.setFillColor(C_GRAY)
    c.drawString(fx + 4, y + 4, "1B 2B 3B HR BB K OUT  ·  e.g. 1B-2, HR-0, OUT-0")
    c.setFillColor(C_BLACK)


# ─────────────────────────────────────────────────────────────────────────────
# INNING HEADER STRIP
# ─────────────────────────────────────────────────────────────────────────────
def draw_inning_headers(c):
    y  = PH - MARGIN - HEADER_H - INN_HDR_H
    x0 = GRID_LEFT

    # Name / Pos header
    c.setFillColor(C_DARKBG)
    c.rect(x0, y, NAME_W + POS_W, INN_HDR_H, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(C_WHITE)
    c.drawCentredString(x0 + (NAME_W) / 2, y + 3.5, "PLAYER")
    c.drawCentredString(x0 + NAME_W + POS_W / 2, y + 3.5, "POS")
    c.setFillColor(C_BLACK)

    # Inning labels
    for i in range(N_INN):
        xi = x0 + NAME_W + POS_W + i * INN_W
        c.setFillColor(C_DARKBG)
        c.setStrokeColor(C_BLACK)
        c.setLineWidth(0.6)
        c.rect(xi, y, INN_W, INN_HDR_H, fill=1, stroke=1)
        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(C_WHITE)
        c.drawCentredString(xi + INN_W / 2, y + 3.5, f"INNING  {i + 1}")
    c.setFillColor(C_BLACK)


# ─────────────────────────────────────────────────────────────────────────────
# INDIVIDUAL AT-BAT CELL
# ─────────────────────────────────────────────────────────────────────────────
def draw_cell(c, x, y, w, h, row_idx, inn_idx):
    """Draw one plate-appearance cell (main player row).

    Layout: base-path diamond on the LEFT (human-facing base running),
    large CODE-writing box on the RIGHT where the scorekeeper writes a
    single token like  1B-2 , HR-0 , OUT-0 .
    """
    # Alternating row background
    if row_idx % 2 == 1:
        c.setFillColor(C_XLGRAY)
        c.rect(x, y, w, h, fill=1, stroke=0)
    c.setFillColor(C_BLACK)

    # Cell border — thick to isolate cells and kill phantom-hit bleed
    c.setStrokeColor(C_BLACK)
    c.setLineWidth(1.3)
    c.rect(x, y, w, h, fill=0)

    # ── Faint cell identifier (top-left) ──────────────────────────────────────
    c.setFont("Helvetica", 3.6)
    c.setFillColor(C_FAINT)
    c.drawString(x + 1.5, y + h - 5.5, f"R{row_idx + 1}-I{inn_idx + 1}")
    c.setFillColor(C_BLACK)

    # ── Left zone: base-path diamond (base running only) ──────────────────────
    DIAMOND_ZONE_W = 26
    dm_cx = x + DIAMOND_ZONE_W / 2 + 1
    dm_cy = y + h / 2 - 1
    r     = min(9.0, (h - 12) / 2)

    c.setStrokeColor(C_GRAY)
    c.setLineWidth(0.7)
    path = c.beginPath()
    path.moveTo(dm_cx,      dm_cy + r)   # 2B (top)
    path.lineTo(dm_cx + r,  dm_cy)       # 1B (right)
    path.lineTo(dm_cx,      dm_cy - r)   # home (bottom)
    path.lineTo(dm_cx - r,  dm_cy)       # 3B (left)
    path.close()
    c.drawPath(path, stroke=1, fill=0)

    c.setFont("Helvetica", 3.0)
    c.setFillColor(C_FAINT)
    c.drawCentredString(dm_cx,          dm_cy + r - 2.6,  "2")
    c.drawCentredString(dm_cx + r - 2,  dm_cy,            "1")
    c.drawCentredString(dm_cx - r + 2,  dm_cy,            "3")
    c.drawCentredString(dm_cx,          dm_cy - r + 2.6,  "H")
    c.setFillColor(C_BLACK)

    # ── Divider between diamond zone and code box ─────────────────────────────
    sep_x = x + DIAMOND_ZONE_W
    c.setStrokeColor(C_GRAY)
    c.setLineWidth(0.5)
    c.line(sep_x, y + 2, sep_x, y + h - 2)

    # ── Right zone: large code-writing box ────────────────────────────────────
    code_pad = 3
    code_x = sep_x + code_pad
    code_y = y + 4
    code_w = (x + w) - code_x - code_pad
    code_h = h - 14

    # tiny "RESULT-RBI" hint above the box
    c.setFont("Helvetica", 3.4)
    c.setFillColor(C_FAINT)
    c.drawCentredString(code_x + code_w / 2, code_y + code_h + 1.5, "RESULT-RBI")

    # the write box itself
    c.setStrokeColor(C_BLACK)
    c.setLineWidth(0.8)
    c.rect(code_x, code_y, code_w, code_h, fill=0)
    c.setFillColor(C_BLACK)


# ─────────────────────────────────────────────────────────────────────────────
# SUB ROW CELL (thin shaded bar)
# ─────────────────────────────────────────────────────────────────────────────
def draw_sub_cell(c, x, y, w, h, row_idx, inn_idx):
    c.setFillColor(C_LGRAY)
    c.setStrokeColor(C_GRAY)
    c.setLineWidth(0.45)
    c.rect(x, y, w, h, fill=1, stroke=1)
    c.setFont("Helvetica", 3.5)
    c.setFillColor(C_GRAY)
    c.drawString(x + 2, y + 2, f"R{row_idx + 1}s-I{inn_idx + 1}")
    c.setFillColor(C_BLACK)


# ─────────────────────────────────────────────────────────────────────────────
# FULL GRID
# ─────────────────────────────────────────────────────────────────────────────
def draw_grid(c):
    y_cursor = GRID_TOP
    x0       = GRID_LEFT

    for row in range(N_PLAYERS):
        # ── Main player row ───────────────────────────────────────────────────
        row_y = y_cursor - PLAYER_H

        # Name cell background
        bg = C_XLGRAY if row % 2 == 1 else C_WHITE
        c.setFillColor(bg)
        c.setStrokeColor(C_BLACK)
        c.setLineWidth(1.0)
        c.rect(x0, row_y, NAME_W, PLAYER_H, fill=1, stroke=1)

        # Row number
        c.setFont("Helvetica-Bold", 5.5)
        c.setFillColor(C_GRAY)
        c.drawString(x0 + 2.5, row_y + PLAYER_H - 8, f"{row + 1}.")
        # Writing line
        c.setLineWidth(0.35)
        c.setStrokeColor(C_FAINT)
        c.line(x0 + 11, row_y + 8, x0 + NAME_W - 3, row_y + 8)

        # Pos cell
        c.setFillColor(bg)
        c.setStrokeColor(C_BLACK)
        c.setLineWidth(1.0)
        c.rect(x0 + NAME_W, row_y, POS_W, PLAYER_H, fill=1, stroke=1)
        c.setFont("Helvetica", 4.4)
        c.setFillColor(C_FAINT)
        c.drawCentredString(x0 + NAME_W + POS_W / 2, row_y + PLAYER_H - 8, "POS")

        # At-bat cells
        c.setFillColor(C_BLACK)
        for inn in range(N_INN):
            cell_x = x0 + NAME_W + POS_W + inn * INN_W
            draw_cell(c, cell_x, row_y, INN_W, PLAYER_H, row, inn)

        y_cursor -= PLAYER_H

        # ── Sub row ───────────────────────────────────────────────────────────
        sub_y = y_cursor - SUB_H

        # Sub name cell
        c.setFillColor(C_LGRAY)
        c.setStrokeColor(C_GRAY)
        c.setLineWidth(0.45)
        c.rect(x0, sub_y, NAME_W, SUB_H, fill=1, stroke=1)
        c.setFont("Helvetica-Oblique", 4.5)
        c.setFillColor(C_GRAY)
        c.drawString(x0 + 3, sub_y + 2.5, f"SUB {row + 1}")

        # Sub pos cell
        c.rect(x0 + NAME_W, sub_y, POS_W, SUB_H, fill=1, stroke=1)

        # Sub at-bat cells
        c.setFillColor(C_BLACK)
        for inn in range(N_INN):
            cell_x = x0 + NAME_W + POS_W + inn * INN_W
            draw_sub_cell(c, cell_x, sub_y, INN_W, SUB_H, row, inn)

        y_cursor -= SUB_H


# ─────────────────────────────────────────────────────────────────────────────
# STRUCTURAL DIVIDERS (outer border + every-3-innings thick rules)
# ─────────────────────────────────────────────────────────────────────────────
def draw_structure(c):
    total_w = NAME_W + POS_W + N_INN * INN_W
    total_h = GRID_H

    # Outer grid border
    c.setStrokeColor(C_BLACK)
    c.setLineWidth(2.2)
    c.rect(GRID_LEFT, GRID_BOT, total_w, total_h, fill=0)

    # Thick dividers after innings 3 and 6
    x0 = GRID_LEFT + NAME_W + POS_W
    c.setLineWidth(1.8)
    for i in (3, 6):
        xd = x0 + i * INN_W
        c.line(xd, GRID_BOT, xd, GRID_TOP)

    # Medium divider between name col and pos col
    c.setLineWidth(1.2)
    c.line(GRID_LEFT + NAME_W, GRID_BOT, GRID_LEFT + NAME_W, GRID_TOP)

    # Column border between pos col and innings
    c.line(GRID_LEFT + NAME_W + POS_W, GRID_BOT,
           GRID_LEFT + NAME_W + POS_W, GRID_TOP)


# ─────────────────────────────────────────────────────────────────────────────
# LINE SCORE (diagonal-split: inning runs top-left, running total bottom-right)
# ─────────────────────────────────────────────────────────────────────────────
def draw_linescore(c):
    x = GRID_LEFT
    w = PW - 2 * MARGIN
    y = MARGIN
    h = LINESCORE_H

    LS_LABEL_W = 132            # left label zone
    n_cols     = 9             # innings 1-7 + 2 extra-inning columns
    box_w      = (w - LS_LABEL_W) / n_cols
    band_h     = h / 2          # two bands: visiting (top), home (bottom)

    bands = [
        ("Visiting team Inning Score", "Visiting team Total Score", y + band_h),
        ("Home team Inning Score",     "Home team Total Score",     y),
    ]

    for inning_lbl, total_lbl, by in bands:
        # ── Label zone ───────────────────────────────────────────────────────
        c.setFont("Helvetica-Bold", 6.2)
        c.setFillColor(C_BLACK)
        # "Inning Score" label aligned to the top triangle, "Total" to the bottom
        c.drawRightString(x + LS_LABEL_W - 5, by + band_h - 9, inning_lbl)
        c.drawRightString(x + LS_LABEL_W - 5, by + 4,          total_lbl)

        # ── Inning boxes with diagonal split ─────────────────────────────────
        for i in range(n_cols):
            bx = x + LS_LABEL_W + i * box_w
            c.setStrokeColor(C_BLACK)
            c.setLineWidth(1.0)
            c.rect(bx, by, box_w, band_h, fill=0)
            # diagonal from bottom-left to top-right
            c.setLineWidth(0.7)
            c.line(bx, by, bx + box_w, by + band_h)

    # ── Outer border + band divider ──────────────────────────────────────────
    c.setStrokeColor(C_BLACK)
    c.setLineWidth(1.6)
    c.rect(x, y, w, h, fill=0)
    c.line(x, y + band_h, x + w, y + band_h)
    # divider between label zone and boxes
    c.setLineWidth(1.0)
    c.line(x + LS_LABEL_W, y, x + LS_LABEL_W, y + h)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    c = rl_canvas.Canvas(OUTPUT, pagesize=landscape(letter))
    c.setTitle("Wild Aces Slo-Pitch Scoresheet")
    c.setAuthor("Wild Aces Stats System")
    c.setSubject("AI-readable slo-pitch scoresheet")

    draw_header(c)
    draw_inning_headers(c)
    draw_grid(c)
    draw_structure(c)   # overlays thick borders last so they're crisp
    draw_linescore(c)

    c.save()
    print(f"✓  Saved → {OUTPUT}")


if __name__ == "__main__":
    main()
