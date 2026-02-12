import json
import re

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException

from app.schemas import ScrapeRequest, ScrapeResponse

router = APIRouter(prefix="/api", tags=["scrape"])


def _parse_price(text: str | None) -> tuple[int | None, str | None]:
    if not text:
        return None, None
    # Try to extract number and currency
    text = text.strip()
    # Common patterns: "$29.99", "29.99 USD", "€15.00"
    currency_map = {"$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₽": "RUB"}
    currency = None
    for symbol, code in currency_map.items():
        if symbol in text:
            currency = code
            break
    numbers = re.findall(r"[\d,]+\.?\d*", text.replace(",", ""))
    if numbers:
        try:
            price = float(numbers[0])
            return int(price * 100), currency or "USD"
        except ValueError:
            pass
    return None, None


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(body: ScrapeRequest):
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(
                body.url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; WishlistBot/1.0)"},
            )
            resp.raise_for_status()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not fetch URL")

    soup = BeautifulSoup(resp.text, "html.parser")

    # Title: og:title > title tag
    title = None
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"]
    elif soup.title:
        title = soup.title.string

    # Image: og:image
    image_url = None
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        image_url = og_image["content"]

    # Price: JSON-LD first, then og:price:amount, then meta price
    price_cents = None
    currency = None

    # Try JSON-LD
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            offers = None
            if isinstance(data, dict):
                offers = data.get("offers") or data.get("Offers")
                if not offers and "@graph" in data:
                    for node in data["@graph"]:
                        if isinstance(node, dict) and node.get("offers"):
                            offers = node["offers"]
                            break
            if isinstance(offers, list):
                offers = offers[0]
            if isinstance(offers, dict):
                price_str = str(offers.get("price", ""))
                currency = offers.get("priceCurrency", "USD")
                if price_str:
                    try:
                        price_cents = int(float(price_str) * 100)
                    except ValueError:
                        pass
        except (json.JSONDecodeError, TypeError):
            continue

    # Fallback: og:price
    if price_cents is None:
        og_price = soup.find("meta", property="og:price:amount")
        og_currency = soup.find("meta", property="og:price:currency")
        if og_price and og_price.get("content"):
            try:
                price_cents = int(float(og_price["content"]) * 100)
                currency = og_currency["content"] if og_currency and og_currency.get("content") else "USD"
            except (ValueError, TypeError):
                pass

    # Fallback: product price meta
    if price_cents is None:
        price_meta = soup.find("meta", {"name": "price"}) or soup.find("meta", {"itemprop": "price"})
        if price_meta and price_meta.get("content"):
            price_cents, currency = _parse_price(price_meta["content"])

    return ScrapeResponse(
        title=title,
        image_url=image_url,
        price_cents=price_cents,
        currency=currency,
    )
