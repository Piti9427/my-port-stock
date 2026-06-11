from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "artifacts/pdf/avgo-post-earnings-analysis-2026-06-05.pdf"
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def p(text: str, style):
    return Paragraph(text, style)


def bullets(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=5) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontName="AVGOThai",
        bulletFontSize=7,
    )


def numbered(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=5) for item in items],
        bulletType="1",
        leftIndent=16,
    )


def table(rows, widths=None):
    if widths is None:
        widths = [42 * mm, 128 * mm]
    tbl = Table(rows, colWidths=widths, repeatRows=1)
    tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "AVGOThai"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 13),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef3f8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#17202a")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cfd8e3")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def add_section(story, title, heading):
    story.append(Spacer(1, 8))
    story.append(p(title, heading))
    story.append(Spacer(1, 4))


def main():
    pdfmetrics.registerFont(TTFont("AVGOThai", FONT_PATH))
    pdfmetrics.registerFont(TTFont("AVGOThaiBold", FONT_PATH))

    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleThai",
        parent=base["Title"],
        fontName="AVGOThaiBold",
        fontSize=20,
        leading=25,
        textColor=colors.HexColor("#17202a"),
        alignment=TA_LEFT,
        spaceAfter=5,
    )
    meta = ParagraphStyle(
        "MetaThai",
        parent=base["Normal"],
        fontName="AVGOThai",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#566573"),
    )
    normal = ParagraphStyle(
        "NormalThai",
        parent=base["Normal"],
        fontName="AVGOThai",
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#17202a"),
        spaceAfter=4,
    )
    heading = ParagraphStyle(
        "HeadingThai",
        parent=base["Heading2"],
        fontName="AVGOThaiBold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#17202a"),
        borderColor=colors.HexColor("#d7dde5"),
        borderWidth=0.6,
        borderPadding=(6, 0, 0),
        spaceBefore=8,
        spaceAfter=4,
    )
    subhead = ParagraphStyle(
        "SubheadThai",
        parent=base["Heading3"],
        fontName="AVGOThaiBold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#263645"),
        spaceAfter=2,
    )
    callout = ParagraphStyle(
        "CalloutThai",
        parent=normal,
        backColor=colors.HexColor("#f2f7f4"),
        borderColor=colors.HexColor("#2e7d32"),
        borderWidth=0,
        borderPadding=8,
        leftIndent=0,
        rightIndent=0,
        spaceAfter=8,
    )
    warn = ParagraphStyle(
        "WarnThai",
        parent=normal,
        backColor=colors.HexColor("#fff8e6"),
        borderPadding=7,
        spaceAfter=8,
    )
    source = ParagraphStyle(
        "SourceThai",
        parent=normal,
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#3f5367"),
    )

    story = []
    story.append(p("AVGO Post-Earnings Deep Dive", title))
    story.append(
        p(
            "Prepared: 2026-06-05 Asia/Bangkok | Ticker: Broadcom Inc. (AVGO) | Mode: Swing Trade / Watchlist Entry Review",
            meta,
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        p(
            "<b>TL;DR:</b> AVGO ยังไม่ใช่กรณี AI thesis พัง แต่เป็น expectation-gap selloff หลังราคาวิ่งแรงเกินงบจริงไปมากแล้ว Verdict ตอนนี้คือ <b>Yellow / Wait</b>. ไม่ควรไล่ซื้อทันที รอฐานแถว <b>400-410</b> หรือ reclaim <b>426-432</b> พร้อม volume ก่อนค่อยคิด entry.",
            callout,
        )
    )

    snapshot_rows = [
        [p("<b>Field</b>", normal), p("<b>Decision-Critical View</b>", normal)],
        [p("Status", normal), p("<b>Yellow / Wait</b>", normal)],
        [p("Ticker / Mode", normal), p("AVGO / Swing Trade", normal)],
        [p("Score", normal), p("6.1 / 10", normal)],
        [
            p("Gate Status", normal),
            p("Regular close price gate: Pass. After-hours execution gate: Fail because only one timestamped source was available.", normal),
        ],
        [
            p("One-Line Reason", normal),
            p("ธุรกิจยังแข็งมาก แต่ราคาพังเพราะ market priced perfection และ AI guidance ต่ำกว่า whisper/consensus ที่ตลาดตั้งไว้", normal),
        ],
        [p("Immediate Action", normal), p("รอ 2-3 วันให้ฐานนิ่ง ห้าม FOMO buy ตอน gap-down day", normal)],
    ]
    story.append(KeepTogether([table(snapshot_rows), Spacer(1, 2)]))

    add_section(story, "Data Quality", heading)
    story.append(
        table(
            [
                [p("<b>Regular Close</b>", normal), p("<b>After-Hours Context</b>", normal), p("<b>Q2 Revenue</b>", normal), p("<b>Q3 Revenue Guide</b>", normal)],
                [p("418.91-419.02", normal), p("413.60", normal), p("$22.187B", normal), p("$29.4B", normal)],
            ],
            widths=[42 * mm, 42 * mm, 42 * mm, 42 * mm],
        )
    )
    story.append(
        bullets(
            [
                "StockAnalysis showed AVGO close at <b>418.91</b> on Jun 4, 2026, 4:00 PM EDT, and after-hours at <b>413.60</b> on 7:59 PM EDT.",
                "Stooq CSV showed AVGO close at <b>419.02</b> on Jun 4, 2026. The two regular-close sources differed by less than 0.5%.",
                "After-hours price was treated as context, not execution evidence, because the second timestamped after-hours source was not available.",
                "Journal check: trade_journal.md has no active AVGO trade. AVGO is a tactical watchlist name, not a held position.",
            ],
            normal,
        )
    )

    add_section(story, "Diagnosis / Root Cause", heading)
    story.append(
        p(
            "สาเหตุหลักไม่ใช่งบแย่ แต่เป็นความคาดหวังสูงเกินงบที่ดีอยู่แล้ว. Broadcom รายงาน Q2 FY2026 revenue <b>$22.187B</b>, โต <b>48% YoY</b>, non-GAAP EPS <b>$2.44</b>, free cash flow <b>$10.262B</b>, และ Q3 revenue guidance <b>$29.4B</b>, โต <b>84% YoY</b>.",
            normal,
        )
    )
    story.append(
        p(
            "AI semiconductor revenue Q2 อยู่ที่ <b>$10.8B</b>, โต <b>143% YoY</b>; Q3 คาด <b>$16.0B</b>, โตเกิน <b>200% YoY</b>. แต่ตลาดตั้ง bar สูงกว่านั้น: บาง analysis ระบุว่า consensus/whisper ฝั่ง AI Q3 อยู่แถว <b>$17.2B</b>, ทำให้ guide ที่แข็งมากยังถูกตีความเป็น miss.",
            normal,
        )
    )
    story.append(p("สรุป root cause: นี่คือ catalyst gap และ valuation reset ไม่ใช่ demand collapse. แต่เพราะ valuation ยังสูง การรีบซื้อทันทีหลัง gap-down ยังเป็น false-buy risk.", warn))

    add_section(story, "Thesis", heading)
    story.append(p("Bull Case", subhead))
    story.append(
        bullets(
            [
                "AI semiconductor bookings ใน transcript ระบุว่าเกิน <b>$30B</b> เทียบกับ Q2 shipments <b>$10.8B</b>, สะท้อน demand visibility.",
                "ลูกค้าหลักยังเป็น hyperscaler/frontier labs เช่น Google, Anthropic, OpenAI, Meta.",
                "Networking เป็นเกือบ <b>40%</b> ของ AI revenue และ AVGO ยังมี moat ใน custom ASIC, Ethernet switching, fabric, DSP และ co-packaged optics.",
            ],
            normal,
        )
    )
    story.append(p("Bear Case", subhead))
    story.append(
        bullets(
            [
                "Valuation ยังแพง: StockAnalysis showed trailing PE <b>81.64</b>, forward PE <b>26.74</b>, P/FCF <b>60.54</b>.",
                "หุ้นวิ่งจาก low ปลายมีนาคมแถว <b>293</b> ไป high <b>495</b> ก่อนงบ การลงแรงอาจเป็น de-rating ไม่ใช่ dip วันเดียวจบ.",
                "ถ้า hyperscaler เริ่ม diversify supplier หรือ AI capex เข้าสู่ rational phase, multiple อาจถูกกดต่อ.",
            ],
            normal,
        )
    )

    add_section(story, "Technical", heading)
    story.append(
        table(
            [
                [p("<b>Level</b>", normal), p("<b>Meaning</b>", normal), p("<b>Action</b>", normal)],
                [p("400-410", normal), p("First support / panic-low zone", normal), p("Watch for reversal candle or absorption before considering entry", normal)],
                [p("397", normal), p("50-day moving average area from StockAnalysis", normal), p("If price closes below this, downgrade setup quality", normal)],
                [p("426-432", normal), p("First reclaim zone", normal), p("Reclaim with volume can trigger a fresh swing review", normal)],
                [p("459-480", normal), p("Supply zone from pre-earnings range", normal), p("Target / scale-out zone, not automatic hold-through area", normal)],
                [p("355", normal), p("200-day moving average area", normal), p("Long-term trend damage if reached and fails", normal)],
            ],
            widths=[28 * mm, 62 * mm, 80 * mm],
        )
    )

    add_section(story, "Investment Plan", heading)
    story.append(
        table(
            [
                [p("<b>Option</b>", normal), p("<b>Pros</b>", normal), p("<b>Cons</b>", normal), p("<b>Recommendation</b>", normal)],
                [p("Buy immediately", normal), p("ได้ราคาใกล้ panic low", normal), p("ยังเป็น falling knife; after-hours gate ไม่ผ่าน", normal), p("ไม่แนะนำ", normal)],
                [p("Wait for 400-410 base", normal), p("R/R ดีสุด; stop วางง่ายกว่า", normal), p("อาจพลาด V-shape bounce", normal), p("แนะนำที่สุด", normal)],
                [p("Buy reclaim 426-432", normal), p("ได้ confirmation", normal), p("R/R แคบลง", normal), p("ใช้ได้ถ้า volume กลับมา", normal)],
                [p("Long-term starter small", normal), p("ได้ exposure ใน leader", normal), p("Valuation ยังไม่ถูกจริง", normal), p("ทำได้เฉพาะมี risk budget ชัด", normal)],
            ],
            widths=[42 * mm, 44 * mm, 50 * mm, 34 * mm],
        )
    )

    add_section(story, "Risk Plan", heading)
    story.append(
        bullets(
            [
                "Entry watch: <b>400-410</b> เฉพาะเมื่อมี reversal candle หรือ absorption.",
                "Stop idea: ใต้ <b>388-392</b> หรือใต้ฐานที่เกิดจริงหลังตลาดนิ่ง.",
                "Target 1: <b>426-432</b>.",
                "Target 2: <b>459-480</b>.",
                "Position sizing formula: shares = risk_THB / ((entry - stop) x USDTHB).",
            ],
            normal,
        )
    )

    add_section(story, "Prevention Guidance", heading)
    story.append(p('อย่าซื้อ AVGO ด้วยเหตุผลว่า "ลงมา 12-15% แล้วถูก" เพราะก่อนลงหุ้นเพิ่งวิ่งแรงมากและยังอยู่เหนือ 50D. ให้แยก great company ออกจาก great entry. ถ้าราคาเด้งแต่ volume อ่อนและปิดต่ำกว่า 426-432 ให้ถือว่าเป็น technical bounce ไม่ใช่ confirmation.', normal))

    add_section(story, "Observability / Verification Steps", heading)
    story.append(
        numbered(
            [
                "ปิดเหนือ 426-432 ได้ไหม.",
                "หลุด 403 หรือ 50D ประมาณ 397 ไหม.",
                "Volume หลัง gap-down ลดลงหรือยัง panic ต่อ.",
                "Analyst revision หลังงบ: AI revenue FY2026/FY2027 ถูกปรับขึ้นหรือลง.",
                "Peer confirmation: NVDA, ANET, MRVL, MU, SOXX ฟื้นพร้อมกันหรือ AVGO ยัง underperform เฉพาะตัว.",
            ],
            normal,
        )
    )

    add_section(story, "Actionable Next Steps", heading)
    story.append(
        numbered(
            [
                "ตอนนี้ verdict: <b>Wait</b>, ไม่ chase.",
                "ตั้ง alert ที่ <b>410, 403, 397, 426, 432, 459</b>.",
                "ถ้าเปิดตลาดแล้ว AVGO ยืน 400-410 ได้พร้อมแท่ง reversal ให้ทำ risk plan ใหม่.",
                "ถ้าราคา reclaim 426-432 พร้อม volume สูงกว่า 20D avg ค่อยประเมิน swing entry.",
                "ก่อนส่งคำสั่งจริง ให้ใช้ broker quote หรือ TradingView visible quote พร้อม session เพื่อ confirm current price gate และคำนวณ stop/R/R/THB risk.",
            ],
            normal,
        )
    )

    add_section(story, "Sources", heading)
    for src in [
        "Broadcom Q2 FY2026 release: https://investors.broadcom.com/node/64371/pdf",
        "Broadcom Q2 FY2026 earnings transcript: https://www.fool.com/earnings/call-transcripts/2026/06/03/broadcom-avgo-q2-2026-earnings-transcript/",
        "StockAnalysis AVGO quote/history: https://stockanalysis.com/stocks/avgo/ and https://stockanalysis.com/stocks/avgo/history/",
        "StockAnalysis AVGO statistics: https://stockanalysis.com/stocks/avgo/statistics/",
        "Investing.com post-earnings reaction: https://www.investing.com/news/stock-market-news/why-is-broadcom-stock-tumbling-afterhours-93CH-4725349",
        "TradingKey market expectation analysis: https://www.tradingkey.com/analysis/stocks/us-stocks/261945656-broadcom-avgo-earnings-ai-semiconductor-guidance-miss-chips-only-order-backlog-valuation-correction-profit-taking-tradingkey",
    ]:
        story.append(p(src, source))

    story.append(Spacer(1, 8))
    story.append(p("This report is for investment analysis workflow use only. It is not a guarantee of return or personalized financial advice. Execution requires fresh broker-visible quote confirmation, stop-loss, R/R >= 1:2, and hard THB risk sizing.", source))

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=16 * mm,
        bottomMargin=17 * mm,
        title="AVGO Post-Earnings Analysis - 2026-06-05",
        author="Codex",
    )
    doc.build(story)


if __name__ == "__main__":
    main()
