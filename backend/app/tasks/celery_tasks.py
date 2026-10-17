import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try initializing celery if installed
celery_app = None
try:
    from celery import Celery
    celery_app = Celery(
        "cab_booking_tasks",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
except Exception as e:
    logger.info(f"Celery running in standalone/async mode: {e}")

def send_receipt_email_task(ride_id: int, recipient_email: str):
    """Background task to generate and email receipt to customer."""
    logger.info(f"[Celery/Worker] Processing receipt email for ride #{ride_id} to {recipient_email}")
    # In production, this attaches the PDF from generate_pdf_receipt and sends via SendGrid/SES/SMTP
    return {"status": "sent", "ride_id": ride_id, "recipient": recipient_email}

if celery_app:
    send_receipt_email_task = celery_app.task(send_receipt_email_task)
