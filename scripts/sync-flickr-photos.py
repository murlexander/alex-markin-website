#!/usr/bin/env python3
"""Refresh the complete public Flickr album, then publish its local manifest."""
import json
import os
from pathlib import Path
import re
from urllib.parse import urlencode, urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OWNER = "194911743@N06"
ALBUM = "72177720334709474"
ALBUM_URL = f"https://www.flickr.com/photos/{OWNER}/albums/{ALBUM}/"


def read_url(url):
    with urlopen(url, timeout=30) as response:
        return response.read()


def album_photos():
    # Flickr exposes a short-lived public site key in its album HTML. Obtain a
    # fresh one each run; never hard-code it or send it to site visitors.
    key = os.environ.get("FLICKR_API_KEY")
    if not key:
        html = read_url(ALBUM_URL).decode("utf-8")
        match = re.search(r'api\.site_key\s*=\s*"([a-f0-9]+)"', html)
        if not match:
            raise RuntimeError("Flickr public API key unavailable; snapshot unchanged.")
        key = match[1]

    photos = []
    seen = set()
    page = 1
    expected = None
    while True:
        query = urlencode({
            "method": "flickr.photosets.getPhotos", "api_key": key,
            "photoset_id": ALBUM, "user_id": OWNER,
            "extras": "url_z,url_m,url_n,url_s,media", "per_page": 500, "page": page,
            "format": "json", "nojsoncallback": 1,
        })
        result = json.loads(read_url("https://www.flickr.com/services/rest/?" + query))
        if result.get("stat") != "ok":
            raise RuntimeError("Flickr album request failed; snapshot unchanged.")
        album = result["photoset"]
        total = int(album["total"])
        if expected is None:
            expected = total
        if (str(album["id"]) != ALBUM or album["owner"] != OWNER
                or int(album["page"]) != page or total != expected):
            raise RuntimeError("Flickr album changed during sync; snapshot unchanged.")
        entries = album["photo"]
        if not entries:
            raise RuntimeError("Flickr album is empty or incomplete; snapshot unchanged.")
        for photo in entries:
            photo_id = str(photo["id"])
            if not photo_id.isdigit() or photo_id in seen:
                raise RuntimeError("Invalid or repeated Flickr photo; snapshot unchanged.")
            seen.add(photo_id)
            photos.append(photo)
        if page >= int(album["pages"]):
            break
        page += 1
    if len(photos) != expected:
        raise RuntimeError("Flickr album was only partially loaded; snapshot unchanged.")
    return photos


def main():
    photos = []
    downloads = []
    # Validate the complete album before touching the existing snapshot.
    for photo in album_photos():
        if photo.get("media", "photo") != "photo":
            continue
        photo_id = str(photo["id"])
        size = next((name for name in ("z", "m", "n", "s") if photo.get("url_" + name)), None)
        if size is None:
            raise ValueError("Flickr photo has no downloadable display size")
        url = photo["url_" + size]
        parsed = urlparse(url)
        width, height = int(photo["width_" + size]), int(photo["height_" + size])
        if (parsed.scheme != "https" or parsed.hostname != "live.staticflickr.com"
                or width <= 0 or height <= 0):
            raise ValueError("Invalid Flickr image URL or dimensions")
        downloads.append((photo_id, url))
        photos.append({
            "src": f"flickr-photos/{photo_id}.jpg",
            "title": photo["title"].lower() or "untitled",
            "href": f"https://www.flickr.com/photos/{OWNER}/{photo_id}/in/set-{ALBUM}/",
            "width": width, "height": height,
        })
    if not photos:
        raise RuntimeError("Album contains no photographs; snapshot unchanged.")

    directory = ROOT / "flickr-photos"
    directory.mkdir(exist_ok=True)
    for photo_id, url in downloads:
        path = directory / f"{photo_id}.jpg"
        if not path.exists():
            data = read_url(url)
            if not data.startswith(b"\xff\xd8\xff") or not data.endswith(b"\xff\xd9"):
                raise ValueError("Flickr returned an incomplete or invalid JPEG")
            temporary = path.with_suffix(".tmp")
            temporary.write_bytes(data)
            temporary.replace(path)
    # Only expose new selections after every referenced image exists locally.
    manifest = ROOT / "flickr-photos.json"
    temporary = manifest.with_suffix(".tmp")
    temporary.write_text(json.dumps(photos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(manifest)
    print(f"Synced {len(photos)} photos from {ALBUM_URL}")


if __name__ == "__main__":
    main()
