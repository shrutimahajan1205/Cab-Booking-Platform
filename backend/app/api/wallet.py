from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import User
from app.schemas.all_schemas import WalletTopUp

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "wallet_balance": current_user.wallet_balance
    }

@router.post("/top-up")
async def top_up_wallet(
    top_up: WalletTopUp,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_user.wallet_balance += top_up.amount
    await db.commit()
    return {
        "message": f"Successfully topped up ₹{top_up.amount}",
        "new_balance": current_user.wallet_balance
    }
