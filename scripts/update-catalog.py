import concurrent.futures
import json
from html import unescape
import math
import os
from pathlib import Path
import re
import time
from urllib import parse, request
from urllib.error import HTTPError, URLError

ENDPOINT = "https://search.openfoodfacts.org/search"
FIELDS = "code,product_name,product_name_ru,brands,nutriments"
NUTRIENTS = ("energy-kcal_100g", "proteins_100g", "fat_100g", "carbohydrates_100g")
MAX_VALUES = (1000, 100, 100, 100)
LOCAL_FILTERS = ('lang:ru', 'countries_tags:"en:russia"')
COMMON_QUERIES = (
    "борщ", "солянка", "окрошка", "пельмени", "вареники", "сырники",
    "гречка", "макароны", "рис", "овсянка", "творог", "кефир", "йогурт",
    "молоко", "хлеб", "курица", "тунец", "котлеты", "шоколад", "нутелла",
    "Nutella", "Простоквашино", "Савушкин", "ВкусВилл",
)


def search(query, size, page=1):
    url = ENDPOINT + "?" + parse.urlencode(dict(q=query, page_size=size, page=page, fields=FIELDS))
    req = request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "PitanieVBalance/1.6 (https://github.com/dolzenkoanna90-hash/pitanie-v-balanse)",
    })
    for attempt in range(3):
        try:
            with request.urlopen(req, timeout=45) as response:
                hits = json.load(response)["hits"]
                if not isinstance(hits, list):
                    raise ValueError("Expected a list of products")
                return hits
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as error:
            if attempt == 2:
                raise error
            time.sleep(2 ** attempt)


def product_from_hit(hit):
    code = str(hit.get("code") or "")
    name = str(hit.get("product_name_ru") or hit.get("product_name") or "").strip()
    brand = hit.get("brands") or ""
    if isinstance(brand, list):
        brand = ", ".join(str(item) for item in brand)
    if not re.fullmatch(r"\d{5,18}", code) or not name:
        return
    nutrients = hit.get("nutriments") or {}
    stats = []
    for key, limit in zip(NUTRIENTS, MAX_VALUES):
        try:
            value = float(nutrients[key])
        except (TypeError, ValueError, KeyError):
            return
        if not math.isfinite(value) or not 0 <= value <= limit:
            return
        stats.append(round(value, 2))
    return [code, unescape(name)[:120], unescape(str(brand)).strip()[:120], stats]


def load_catalog():
    queries = [(query, 60, 1) for query in COMMON_QUERIES]
    queries.extend((query, 10000, 1) for query in LOCAL_FILTERS)
    catalog = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(search, *query) for query in queries]
        for query, work in zip(queries, futures):
            try:
                for hit in work.result():
                    product = product_from_hit(hit)
                    if product:
                        catalog.setdefault(product[0], product)
            except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as error:
                print(f"{query}: {error}")
    return catalog


def main():
    destination = Path(os.getenv("CATALOG_OUTPUT", "web/products.json"))
    existing = json.loads(destination.read_text()) if destination.is_file() else []
    products = load_catalog()
    minimum = max(500, int(len(existing) * 0.8))
    if len(products) < minimum:
        raise SystemExit(f"Open Food Facts returned only {len(products)} products, expected at least {minimum}.")
    
    temp = destination.with_suffix(".tmp")
    temp.write_text(json.dumps(list(products.values()), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(destination)
    print(f"Open Food Facts catalog: {len(products)} products")


if __name__ == "__main__":
    main()
