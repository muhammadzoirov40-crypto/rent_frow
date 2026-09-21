from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.city import CityResponse, DistrictResponse
from app.schemas.base import APIResponse
from app.repositories.city import CityRepository

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("", response_model=APIResponse[list[CityResponse]])
async def get_cities(db: AsyncSession = Depends(get_db)):
    repo = CityRepository(db)
    cities = await repo.get_all_active()
    items = [CityResponse.model_validate(c) for c in cities]
    return APIResponse(data=items)


@router.get("/{city_id}/districts", response_model=APIResponse[list[DistrictResponse]])
async def get_districts(city_id: int, db: AsyncSession = Depends(get_db)):
    repo = CityRepository(db)
    city = await repo.get_by_id(city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    districts = await repo.get_districts(city_id)
    items = [DistrictResponse.model_validate(d) for d in districts]
    return APIResponse(data=items)
