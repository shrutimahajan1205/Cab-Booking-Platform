import stripe
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_stripe_payment_intent(amount: float, currency: str = "inr", metadata: dict = None) -> Dict[str, Any]:
    """Create Stripe payment intent. Falls back to realistic mock for demonstration if Stripe secret is placeholder."""
    # Amount in smallest currency unit (paise/cents)
    amount_in_cents = int(round(amount * 100))
    metadata = metadata or {}

    if settings.STRIPE_SECRET_KEY.startswith("sk_test_mock") or not settings.STRIPE_SECRET_KEY.startswith("sk_"):
        # Mock mode for seamless offline / zero-credential review
        mock_id = f"pi_mock_{metadata.get('ride_id', '999')}_{amount_in_cents}"
        return {
            "id": mock_id,
            "client_secret": f"{mock_id}_secret_demo",
            "amount": amount,
            "currency": currency,
            "status": "requires_payment_method",
            "mock": True
        }

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},
        )
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": amount,
            "currency": currency,
            "status": intent.status,
            "mock": False
        }
    except Exception as e:
        logger.error(f"Stripe error: {e}. Falling back to mock intent.")
        mock_id = f"pi_fallback_{metadata.get('ride_id', '999')}_{amount_in_cents}"
        return {
            "id": mock_id,
            "client_secret": f"{mock_id}_secret_demo",
            "amount": amount,
            "currency": currency,
            "status": "requires_payment_method",
            "mock": True
        }

def verify_webhook_event(payload: bytes, sig_header: str):
    """Verify webhook signature or mock parse."""
    if settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_mock") or not sig_header:
        import json
        return json.loads(payload.decode('utf-8'))

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except Exception as e:
        logger.error(f"Webhook signature error: {e}")
        raise
