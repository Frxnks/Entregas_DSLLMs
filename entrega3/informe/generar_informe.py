from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Informe_Entrega_3_MIRA.md"
OUTPUT = ROOT / "Informe_Entrega_3_MIRA.pdf"
NAVY = colors.HexColor("#123047")
TEAL = colors.HexColor("#0D7C78")
LIGHT = colors.HexColor("#F4F7F9")
MUTED = colors.HexColor("#536873")


def inline(text: str) -> str:
    text = html.escape(text.strip())
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D6E0E5"))
    canvas.line(18 * mm, 16 * mm, 192 * mm, 16 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "MIRA · Entrega 3 · CU-1 · v3.0")
    canvas.drawRightString(192 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def make_styles():
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=28, leading=33, textColor=NAVY, alignment=TA_CENTER, spaceAfter=12),
        "cover_sub": ParagraphStyle("cover_sub", parent=base["Normal"], fontName="Helvetica", fontSize=15, leading=20, textColor=TEAL, alignment=TA_CENTER),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=NAVY, spaceBefore=8, spaceAfter=9, keepWithNext=True),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=TEAL, spaceBefore=7, spaceAfter=5, keepWithNext=True),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=colors.HexColor("#24343D"), alignment=TA_JUSTIFY, spaceAfter=6),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=12.5, leftIndent=12, firstLineIndent=-8, bulletIndent=2, spaceAfter=3),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.2, textColor=colors.HexColor("#24343D")),
    }


def parse_table(lines: list[str], st: dict) -> Table:
    rows = []
    for index, line in enumerate(lines):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if index == 1 and all(set(cell) <= {"-", ":"} for cell in cells):
            continue
        rows.append([Paragraph(inline(cell), st["small"]) for cell in cells])
    width = 174 * mm
    count = max(len(row) for row in rows)
    table = Table(rows, colWidths=[width / count] * count, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C7D6DD")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def build_story(text: str):
    st = make_styles(); lines = text.splitlines(); story = []; paragraph = []; index = 0

    def flush():
        if paragraph:
            story.append(Paragraph(inline(" ".join(paragraph)), st["body"])); paragraph.clear()

    while index < len(lines):
        line = lines[index].rstrip()
        if line == "\\newpage":
            flush(); story.append(PageBreak()); index += 1; continue
        if line.startswith("# "):
            flush(); story.append(Paragraph(inline(line[2:]), st["h1"])); index += 1; continue
        if line.startswith("## "):
            flush(); story.append(Paragraph(inline(line[3:]), st["h2"])); index += 1; continue
        if line.startswith("| "):
            flush(); table_lines = []
            while index < len(lines) and lines[index].lstrip().startswith("|"):
                table_lines.append(lines[index]); index += 1
            story.extend([parse_table(table_lines, st), Spacer(1, 6)]); continue
        if re.match(r"^\d+\. ", line):
            flush(); number, content = line.split(". ", 1)
            story.append(Paragraph(inline(content), st["bullet"], bulletText=f"{number}.")); index += 1; continue
        if line.startswith("- "):
            flush(); story.append(Paragraph(inline(line[2:]), st["bullet"], bulletText="•")); index += 1; continue
        if not line.strip():
            flush(); index += 1; continue
        paragraph.append(line.strip()); index += 1
    flush(); return story


def main():
    text = SOURCE.read_text(encoding="utf-8")
    normal = PageTemplate("normal", [Frame(18 * mm, 20 * mm, 174 * mm, 257 * mm, id="body_frame")], onPage=footer)
    doc = BaseDocTemplate(str(OUTPUT), pagesize=A4, title="MIRA Entrega 3 — RAG + MCP", author="Equipo MIRA")
    doc.addPageTemplates([normal])
    st = make_styles()
    story = [
        Spacer(1, 32 * mm),
        Table([[Paragraph("MIRA", ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=42, textColor=colors.white, alignment=TA_CENTER))]], colWidths=[174 * mm], rowHeights=[35 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")])),
        Spacer(1, 13 * mm), Paragraph("Entrega 3", st["cover_title"]),
        Paragraph("Asistente RAG + MCP para el operador de revisión (CU-1)", st["cover_sub"]), Spacer(1, 20 * mm),
        Table([["v3.0", "17 pruebas", "Recall@4 0,85"]], colWidths=[58 * mm] * 3, style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL), ("TEXTCOLOR", (0, 0), (-1, -1), colors.white), ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 12), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)])),
        Spacer(1, 18 * mm), Paragraph("Lagos · Moraga · Chaves · Caru<br/>9 de noviembre de 2026", ParagraphStyle("cover_meta", parent=st["cover_sub"], fontSize=11, leading=16)), PageBreak(),
    ]
    body = "\n".join(text.splitlines()[9:]).replace("\\newpage", "", 1)
    story.extend(build_story(body)); doc.build(story); print(OUTPUT)


if __name__ == "__main__":
    main()
