from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from database import supabase_admin
from routes.auth import get_current_user
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io

router = APIRouter(prefix="/export", tags=["export"])

MAROON = colors.HexColor('#7B1C2E')
LIGHT_GRAY = colors.HexColor('#f8f7f6')
MID_GRAY = colors.HexColor('#e8e5e1')

def make_header_style():
    style = ParagraphStyle('Header', fontName='Helvetica-Bold', fontSize=18, textColor=MAROON, spaceAfter=4)
    return style

def make_sub_style():
    return ParagraphStyle('Sub', fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#6b7280'), spaceAfter=16)

def make_section_style():
    return ParagraphStyle('Section', fontName='Helvetica-Bold', fontSize=12, textColor=MAROON, spaceBefore=16, spaceAfter=8)

def base_table_style():
    return TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MAROON),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_GRAY]),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, MID_GRAY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])


@router.get("/budget-pdf")
async def export_budget_pdf(semester: str = "Spring 2026", current_user=Depends(get_current_user)):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()

    # Header
    story.append(Paragraph("Alpha Lambda Mu", make_header_style()))
    story.append(Paragraph(f"Budget Report — {semester}", make_sub_style()))

    # Fetch data
    budget = supabase_admin.table("org_budget").select("*").order("updated_at", desc=True).limit(1).execute()
    requests = supabase_admin.table("budget_requests").select("*").execute()
    categories = supabase_admin.table("expense_categories").select("*").eq("semester", semester).execute()
    projection = supabase_admin.table("budget_projections").select("*").eq("semester", semester).execute()
    income = supabase_admin.table("budget_income").select("*").execute()

    b = budget.data[0] if budget.data else {}
    approved = [r for r in requests.data if r.get("status") == "approved"]
    spent = sum(float(r["amount"]) for r in approved)

    # Budget overview table
    story.append(Paragraph("Budget Overview", make_section_style()))
    overview_data = [
        ["Metric", "Amount"],
        ["Total Budget", f"${float(b.get('total_budget',0)):,.2f}"],
        ["Total Spent", f"${spent:,.2f}"],
        ["Remaining", f"${float(b.get('total_budget',0)) - spent:,.2f}"],
    ]
    t = Table(overview_data, colWidths=[3*inch, 2*inch])
    t.setStyle(base_table_style())
    story.append(t)
    story.append(Spacer(1, 12))

    # Income projection
    if projection.data:
        p = projection.data[0]
        story.append(Paragraph("Income Projection", make_section_style()))
        gross = (p['active_members']*p['active_dues']) + (p['pledge_count']*p['pledge_dues']) + (p['hiatus_count']*p['hiatus_dues'])
        expected = gross * (p['collection_rate']/100)
        fundraiser = p['fundraiser_count'] * p['fundraiser_profit']
        retreat = p['alumni_retreat_count'] * p['alumni_retreat_fee']
        total_inc = expected + float(p['carryover']) + float(p['imam_funding']) + fundraiser + retreat

        inc_data = [
            ["Source", "Calculation", "Amount"],
            ["Active Members", f"{p['active_members']} × ${p['active_dues']}", f"${p['active_members']*p['active_dues']:,.0f}"],
            ["Pledges", f"{p['pledge_count']} × ${p['pledge_dues']}", f"${p['pledge_count']*p['pledge_dues']:,.0f}"],
            ["Hiatus", f"{p['hiatus_count']} × ${p['hiatus_dues']}", f"${p['hiatus_count']*p['hiatus_dues']:,.0f}"],
            ["Expected Collection", f"{p['collection_rate']}% of gross", f"${expected:,.0f}"],
            ["Carryover", "Last semester", f"${float(p['carryover']):,.0f}"],
            ["Imam Omar / Funding", "", f"${float(p['imam_funding']):,.0f}"],
            ["Fundraisers", f"{p['fundraiser_count']} × ${p['fundraiser_profit']}", f"${fundraiser:,.0f}"],
            ["Alumni Retreat Fee", f"{p['alumni_retreat_count']} × ${p['alumni_retreat_fee']}", f"${retreat:,.0f}"],
            ["TOTAL INCOME ESTIMATE", "", f"${total_inc:,.0f}"],
        ]
        t = Table(inc_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
        style = base_table_style()
        style.add('FONTNAME', (0, len(inc_data)-1), (-1, len(inc_data)-1), 'Helvetica-Bold')
        style.add('BACKGROUND', (0, len(inc_data)-1), (-1, len(inc_data)-1), colors.HexColor('#f0fdf4'))
        style.add('TEXTCOLOR', (0, len(inc_data)-1), (-1, len(inc_data)-1), colors.HexColor('#166534'))
        t.setStyle(style)
        story.append(t)
        story.append(Spacer(1, 12))

    # Expense categories
    if categories.data:
        story.append(Paragraph("Expense Breakdown", make_section_style()))
        spent_by_cat = {}
        for r in approved:
            cat = r.get("category", "Events")
            spent_by_cat[cat] = spent_by_cat.get(cat, 0) + float(r["amount"])

        cat_data = [["Category", "Budgeted", "Spent", "Balance"]]
        total_budgeted = 0
        total_spent_cat = 0
        for cat in categories.data:
            s = spent_by_cat.get(cat["name"], 0)
            bal = float(cat["budgeted_amount"]) - s
            total_budgeted += float(cat["budgeted_amount"])
            total_spent_cat += s
            cat_data.append([cat["name"], f"${float(cat['budgeted_amount']):,.0f}", f"${s:,.0f}", f"${bal:,.0f}"])
        cat_data.append(["TOTAL EXPENSES", f"${total_budgeted:,.0f}", f"${total_spent_cat:,.0f}", ""])

        t = Table(cat_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        style = base_table_style()
        style.add('FONTNAME', (0, len(cat_data)-1), (-1, len(cat_data)-1), 'Helvetica-Bold')
        style.add('BACKGROUND', (0, len(cat_data)-1), (-1, len(cat_data)-1), colors.HexColor('#fef2f2'))
        style.add('TEXTCOLOR', (0, len(cat_data)-1), (-1, len(cat_data)-1), colors.HexColor('#991b1b'))
        t.setStyle(style)
        story.append(t)

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ALM_Budget_{semester.replace(' ','_')}.pdf"})


@router.get("/attendance-pdf")
async def export_attendance_pdf(semester: str = "Spring 2026", current_user=Depends(get_current_user)):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                            rightMargin=0.75*inch, leftMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("Alpha Lambda Mu", make_header_style()))
    story.append(Paragraph(f"Attendance & Standards Report — {semester}", make_sub_style()))

    MANDATORY_TYPES = {'social','fundraiser','professional','service','religious','chapter_meeting','brotherhood'}
    members = supabase_admin.table("members").select("*").eq("is_active", True).order("full_name").execute()
    events = supabase_admin.table("events").select("*").execute()
    mandatory = [e for e in events.data if e.get("event_type") in MANDATORY_TYPES]
    mandatory_ids = [e["id"] for e in mandatory]

    all_att = supabase_admin.table("attendance").select("*").in_("event_id", mandatory_ids).execute() if mandatory_ids else type('obj',(object,),{'data':[]})()
    att_map = {}
    for a in all_att.data:
        if a["member_id"] not in att_map:
            att_map[a["member_id"]] = {}
        att_map[a["member_id"]][a["event_id"]] = a["status"]

    # Chapter summary
    total_possible = len(members.data) * len(mandatory)
    total_present = sum(1 for a in all_att.data if a["status"] in ("present","tardy"))
    chapter_rate = round(total_present/total_possible*100, 1) if total_possible > 0 else 0

    story.append(Paragraph("Chapter Summary", make_section_style()))
    summary_data = [
        ["Metric", "Value"],
        ["Total Members", str(len(members.data))],
        ["Mandatory Events", str(len(mandatory))],
        ["Chapter Attendance Rate", f"{chapter_rate}%"],
    ]
    t = Table(summary_data, colWidths=[3*inch, 2*inch])
    t.setStyle(base_table_style())
    story.append(t)
    story.append(Spacer(1, 16))

    # Member strikes table
    story.append(Paragraph("Member Attendance & Strikes", make_section_style()))
    att_data = [["Member", "Present", "Tardy", "Unexcused", "Strikes", "Retreat Eligible"]]

    for member in members.data:
        mid = member["id"]
        member_att = att_map.get(mid, {})
        tardies = sum(1 for eid in mandatory_ids if member_att.get(eid) == "tardy")
        unexcused = sum(1 for eid in mandatory_ids if member_att.get(eid) == "absent")
        present = sum(1 for eid in mandatory_ids if member_att.get(eid) == "present")
        strikes = (tardies // 2) + unexcused
        eligible = "✓ Eligible" if strikes < 3 else "✗ Ineligible"
        att_data.append([member["full_name"], str(present), str(tardies), str(unexcused), str(strikes), eligible])

    t = Table(att_data, colWidths=[2.2*inch, 0.8*inch, 0.8*inch, 0.9*inch, 0.8*inch, 1.2*inch])
    style = base_table_style()
    # Color ineligible rows red
    for i, row in enumerate(att_data[1:], 1):
        if row[5] == "✗ Ineligible":
            style.add('BACKGROUND', (0,i), (-1,i), colors.HexColor('#fef2f2'))
            style.add('TEXTCOLOR', (4,i), (5,i), colors.HexColor('#991b1b'))
    t.setStyle(style)
    story.append(t)

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ALM_Attendance_{semester.replace(' ','_')}.pdf"})