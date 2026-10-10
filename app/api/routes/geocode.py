"""Address search behind the listing form's pin picker.

The browser never talks to Nominatim directly: the server does, under its own
User-Agent and the one-request-per-second policy, and answers with the first
hit.  Signed-in users only - a listing owner searching for their own address
is the entire use case, and requiring an account is what stops the endpoint
from being an open geocoding proxy at our rate limit's expense.

A miss is a 200 with null data, not an error: "this address is not on the map"
is a perfectly normal answer the form turns into "click the map instead".
"""

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import require_auth
from app.schemas.base import APIResponse
from app.schemas.geocode import GeocodeSearchResult
from app.services.geocode import geocode_search

router = APIRouter(prefix="/geocode", tags=["Geocode"])


@router.get("/search", response_model=APIResponse[GeocodeSearchResult])
async def search_place(
    q: str = Query(..., min_length=4, max_length=200),
    _user=Depends(require_auth),
):
    hit = await geocode_search(q)
    return APIResponse(data=GeocodeSearchResult(**hit) if hit else None)
