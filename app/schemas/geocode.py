from pydantic import BaseModel


class GeocodeSearchResult(BaseModel):
    """One place the geocoder found for a free-text address query."""

    latitude: float
    longitude: float
    # The geocoder's own rendering of the address, so the person who searched
    # can see whether it understood them before trusting the pin.
    label: str
