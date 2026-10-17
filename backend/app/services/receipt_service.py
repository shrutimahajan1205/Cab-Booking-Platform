import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_receipt(ride_data: dict) -> bytes:
    """Generate a clean, high quality PDF receipt buffer using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'ReceiptSub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        leading=14
    )
    section_head = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        fontName='Helvetica-Bold'
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#0F172A')
    )
    body_text = ParagraphStyle(
        'BodyRegular',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )
    paid_badge = ParagraphStyle(
        'PaidBadge',
        parent=styles['Normal'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#16A34A'),
        fontName='Helvetica-Bold',
        alignment=2 # Right aligned
    )

    elements = []

    # Header Table
    now_str = ride_data.get('completed_at') or datetime.utcnow().strftime('%b %d, %Y - %I:%M %p')
    header_data = [
        [
            Paragraph("<b>CAB BOOKING PLATFORM</b>", title_style),
            Paragraph("<b>STATUS: PAID ✓</b>", paid_badge)
        ],
        [
            Paragraph("Official Trip Invoice & Tax Receipt", subtitle_style),
            Paragraph(f"Date: {now_str}", subtitle_style)
        ]
    ]
    t_header = Table(header_data, colWidths=[340, 200])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#CBD5E1')))
    elements.append(Spacer(1, 15))

    # Ride Info Card
    ride_id = ride_data.get('id', 'N/A')
    rider_name = ride_data.get('rider_name', 'Rider')
    driver_name = ride_data.get('driver_name', 'Assigned Driver')
    vehicle = ride_data.get('vehicle_info', 'Economy Sedan')
    tier = ride_data.get('vehicle_type', 'Economy')
    distance = ride_data.get('distance_km', 0.0)
    duration = ride_data.get('duration_mins', 0)

    info_data = [
        [
            Paragraph("<b>Invoice #:</b>", body_bold),
            Paragraph(f"CBP-INV-{ride_id:05d}" if isinstance(ride_id, int) else f"CBP-INV-{ride_id}", body_text),
            Paragraph("<b>Vehicle Type:</b>", body_bold),
            Paragraph(f"{tier} ({vehicle})", body_text),
        ],
        [
            Paragraph("<b>Passenger:</b>", body_bold),
            Paragraph(str(rider_name), body_text),
            Paragraph("<b>Driver Partner:</b>", body_bold),
            Paragraph(str(driver_name), body_text),
        ],
        [
            Paragraph("<b>Distance:</b>", body_bold),
            Paragraph(f"{distance:.1f} km", body_text),
            Paragraph("<b>Trip Duration:</b>", body_bold),
            Paragraph(f"{duration} mins", body_text),
        ]
    ]
    t_info = Table(info_data, colWidths=[80, 190, 90, 180])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(t_info)
    elements.append(Spacer(1, 15))

    # Route Table
    pickup = ride_data.get('pickup_name', 'Pickup Point')
    drop = ride_data.get('drop_name', 'Drop-off Point')
    route_data = [
        [Paragraph("📍 <b>Pickup:</b>", body_bold), Paragraph(str(pickup), body_text)],
        [Paragraph("🏁 <b>Drop-off:</b>", body_bold), Paragraph(str(drop), body_text)],
    ]
    t_route = Table(route_data, colWidths=[90, 450])
    t_route.setStyle(TableStyle([
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t_route)
    elements.append(Spacer(1, 15))

    # Fare Breakdown Table
    fare = ride_data.get('fare_actual') or ride_data.get('fare_estimate') or 150.0
    discount = ride_data.get('discount_amount', 0.0)
    promo = ride_data.get('promo_code')
    subtotal = round(fare + discount, 2)
    tax = round(fare * 0.05, 2)
    grand_total = round(fare, 2)

    breakdown_data = [
        [Paragraph("<b>Description</b>", section_head), Paragraph("<b>Amount (INR)</b>", section_head)],
        [Paragraph("Base Trip Fare & Distance", body_text), Paragraph(f"₹ {subtotal:.2f}", body_text)],
    ]
    if discount > 0:
        breakdown_data.append([
            Paragraph(f"Promotional Discount ({promo or 'PROMO'})", body_text),
            Paragraph(f"- ₹ {discount:.2f}", body_text)
        ])
    breakdown_data.extend([
        [Paragraph("Applicable GST / Taxes (5% included)", body_text), Paragraph(f"₹ {tax:.2f}", body_text)],
        [Paragraph("<b>TOTAL CHARGED</b>", body_bold), Paragraph(f"<b>₹ {grand_total:.2f}</b>", body_bold)]
    ])

    t_breakdown = Table(breakdown_data, colWidths=[380, 160])
    t_breakdown.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#0F172A')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#F1F5F9')),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#CBD5E1')),
    ]))
    elements.append(t_breakdown)
    elements.append(Spacer(1, 25))

    # Footer note
    footer_text = Paragraph(
        "Thank you for riding with Cab Booking Platform. For any billing questions or support inquiries, contact support@cabbooking.local. "
        "This is a computer-generated tax invoice and does not require a physical signature.",
        subtitle_style
    )
    elements.append(footer_text)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
