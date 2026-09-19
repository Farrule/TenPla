import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def setup_japanese_font() -> str:
    """環境内の日本語フォントを検出して確実に登録する"""
    # 候補リスト: (フォントファイルパス, ReportLab内での登録フォント名)
    candidate_fonts = [
        # Linux / DevContainer (IPAフォント: 最も安定して埋め込み可能)
        ("/usr/share/fonts/truetype/ipafont/ipag.ttf", "IPAGothic"),
        ("/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf", "IPAGothic"),
        # Noto Sans CJK (単一TTFの場合)
        ("/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.otf", "NotoSansJP"),
        # Windows ホスト側で直接実行された場合
        ("C:\\Windows\\Fonts\\meiryo.ttc", "Meiryo"),
        ("C:\\Windows\\Fonts\\msgothic.ttc", "MSGothic"),
    ]

    for path, name in candidate_fonts:
        if os.path.exists(path):
            try:
                # フォントを登録（PDF内にサブセット埋め込みされる）
                pdfmetrics.registerFont(TTFont(name, path))
                print(f"[Info] 日本語フォントを正常に登録しました: {name} ({path})")
                return name
            except Exception as e:
                print(f"[Warning] フォント読み込みエラー ({path}): {e}")
                continue

    print(
        "[Error] 日本語フォントが見つかりませんでした。Helveticaを使用するため文字化けします。"
    )
    return "Helvetica"


def create_sample_invoice(output_path: str = "sample_invoice.pdf"):
    font_name = setup_japanese_font()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="TitleStyle",
        fontName=font_name,
        fontSize=20,
        leading=24,
        alignment=1,  # 中央揃え
        spaceAfter=20,
    )
    normal_style = ParagraphStyle(
        name="NormalStyle", fontName=font_name, fontSize=10, leading=14
    )
    header_right_style = ParagraphStyle(
        name="HeaderRightStyle",
        fontName=font_name,
        fontSize=10,
        leading=14,
        alignment=2,  # 右揃え
    )

    story = []

    # タイトル
    story.append(Paragraph("御 請 求 書", title_style))

    # ヘッダー情報（宛名と請求情報）
    info_data = [
        [
            Paragraph(
                "<b>株式会社テストクライアント 御中</b><br/>東京都千代田区1-1-1",
                normal_style,
            ),
            Paragraph(
                "<b>請求書番号:</b> INV-2026-001<br/>"
                "<b>請求日:</b> 2026年09月20日<br/>"
                "<b>発行者:</b> 株式会社サンプル商事<br/>"
                "〒100-0001 東京都中央区八重洲2-1",
                header_right_style,
            ),
        ]
    ]
    info_table = Table(info_data, colWidths=[280, 235])
    info_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 20))

    # ご請求金額ハイライト
    total_banner = [
        [
            Paragraph(
                "<b>ご請求金額</b>",
                ParagraphStyle(
                    name="TotalLabel", fontName=font_name, fontSize=12, leading=16
                ),
            ),
            Paragraph(
                "<b>¥ 165,000-</b> (税込)",
                ParagraphStyle(
                    name="TotalVal",
                    fontName=font_name,
                    fontSize=14,
                    leading=18,
                    alignment=2,
                ),
            ),
        ]
    ]
    total_table = Table(total_banner, colWidths=[150, 365])
    total_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(total_table)
    story.append(Spacer(1, 25))

    # 明細テーブル
    headers = ["品番 / 品名", "数量", "単価", "金額"]
    rows = [
        ["クラウドシステム導入支援", "1", "100,000", "100,000"],
        ["帳票自動化モジュール設定", "1", "30,000", "30,000"],
        ["初期データ移行作業", "2", "10,000", "20,000"],
    ]

    table_data = [[Paragraph(f"<b>{h}</b>", normal_style) for h in headers]]
    for r in rows:
        table_data.append(
            [
                Paragraph(r[0], normal_style),
                Paragraph(r[1], normal_style),
                Paragraph(r[2], normal_style),
                Paragraph(r[3], normal_style),
            ]
        )

    detail_table = Table(table_data, colWidths=[235, 60, 100, 120])
    detail_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(detail_table)
    story.append(Spacer(1, 15))

    # 備考・振込先
    note_text = (
        "【お振込先】<br/>"
        "サンプル銀行 東京支店 普通預金 1234567<br/>"
        "口座名義: カ) サンプルショウジ<br/>"
        "※お振込手数料は貴社にてご負担願います。"
    )
    story.append(Paragraph(note_text, normal_style))

    doc.build(story)
    print(f"サンプルPDFを生成しました: {Path(output_path).resolve()}")


if __name__ == "__main__":
    create_sample_invoice()
