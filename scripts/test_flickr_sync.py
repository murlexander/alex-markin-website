"""Regression checks for complete, failure-safe Flickr snapshots."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

spec = importlib.util.spec_from_file_location("sync", Path(__file__).with_name("sync-flickr-photos.py"))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def photo(number):
    return {"id": str(number), "title": f"Photo {number}", "media": "photo",
            "url_z": f"https://live.staticflickr.com/65535/{number}_test_z.jpg",
            "width_z": 640, "height_z": 427}


def response(entries, page=1, pages=1, total=None):
    return json.dumps({"stat": "ok", "photoset": {"id": sync.ALBUM,
        "owner": sync.OWNER, "page": str(page), "pages": pages,
        "total": len(entries) if total is None else total, "photo": entries}}).encode()


class FlickrSyncTests(unittest.TestCase):
    def test_fetches_every_page_beyond_500(self):
        calls = []
        def read(url):
            calls.append(url)
            if url == sync.ALBUM_URL:
                return b'root.YUI_config.flickr.api.site_key = "abcdef1234";'
            query = parse_qs(urlparse(url).query)
            self.assertEqual(query["per_page"], ["500"])
            self.assertEqual(query["extras"], ["url_z,url_m,url_n,url_s,media"])
            page = int(query["page"][0])
            entries = [photo(n) for n in range(1, 501)] if page == 1 else [photo(501)]
            return response(entries, page=page, pages=2, total=501)
        with patch.dict(sync.os.environ, {}, clear=True), patch.object(sync, "read_url", side_effect=read):
            photos = sync.album_photos()
        self.assertEqual([p["id"] for p in photos], [str(n) for n in range(1, 502)])
        self.assertEqual(len(calls), 3)

    def test_registered_key_does_not_need_html(self):
        with patch.dict(sync.os.environ, {"FLICKR_API_KEY": "registered"}), patch.object(
                sync, "read_url", return_value=response([photo(1)])) as read:
            self.assertEqual(len(sync.album_photos()), 1)
        self.assertIn("api_key=registered", read.call_args.args[0])
        self.assertEqual(read.call_count, 1)

    def test_incomplete_duplicate_changed_and_empty_albums_fail(self):
        for result in [response([photo(1)], total=2), response([photo(1), photo(1)]),
                       response([]), response([photo(1)], page=2),
                       json.dumps({"stat": "fail"}).encode()]:
            with self.subTest(result=result), patch.dict(sync.os.environ, {"FLICKR_API_KEY": "test"}), patch.object(
                    sync, "read_url", return_value=result):
                with self.assertRaises(RuntimeError):
                    sync.album_photos()
        with patch.dict(sync.os.environ, {"FLICKR_API_KEY": "test"}), patch.object(sync, "read_url", side_effect=[
                response([photo(1)], pages=2, total=2), response([photo(2)], page=2, pages=2, total=3)]):
            with self.assertRaises(RuntimeError):
                sync.album_photos()

    def test_missing_public_key_fails(self):
        with patch.dict(sync.os.environ, {}, clear=True), patch.object(sync, "read_url", return_value=b"unavailable"):
            with self.assertRaises(RuntimeError):
                sync.album_photos()

    def test_download_failure_preserves_manifest_and_does_not_cache_bad_image(self):
        for result in [OSError("offline"), b"not a JPEG", b"\xff\xd8\xfftruncated"]:
            with self.subTest(result=result), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                manifest = root / "flickr-photos.json"
                manifest.write_text("previous complete snapshot")
                def read(url):
                    if isinstance(result, Exception):
                        raise result
                    return result
                with patch.object(sync, "ROOT", root), patch.object(sync, "album_photos", return_value=[photo(1)]), patch.object(sync, "read_url", side_effect=read):
                    with self.assertRaises((OSError, ValueError)):
                        sync.main()
                self.assertEqual(manifest.read_text(), "previous complete snapshot")
                self.assertFalse((root / "flickr-photos/1.jpg").exists())

    def test_membership_titles_dimensions_and_existing_downloads(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "flickr-photos").mkdir()
            old = root / "flickr-photos/999.jpg"
            old.write_bytes(b"preserved older image")
            existing = root / "flickr-photos/1.jpg"
            existing.write_bytes(b"existing image")
            jpeg = b"\xff\xd8\xffimage\xff\xd9"
            video = {"id": "3", "media": "video"}
            with patch.object(sync, "ROOT", root), patch.object(sync, "album_photos", return_value=[photo(1), photo(2), video]), patch.object(sync, "read_url", return_value=jpeg) as read:
                sync.main()
            photos = json.loads((root / "flickr-photos.json").read_text())
            self.assertEqual([p["src"] for p in photos], ["flickr-photos/1.jpg", "flickr-photos/2.jpg"])
            self.assertEqual(photos[1]["title"], "photo 2")
            self.assertEqual((photos[1]["width"], photos[1]["height"]), (640, 427))
            self.assertIn("/2/in/set-", photos[1]["href"])
            self.assertEqual((root / "flickr-photos/2.jpg").read_bytes(), jpeg)
            self.assertEqual(existing.read_bytes(), b"existing image")
            self.assertTrue(old.exists())
            self.assertEqual(read.call_count, 1)

    def test_small_photos_use_available_display_size(self):
        small = {"id": "1", "title": "Small", "media": "photo",
                 "url_m": "https://live.staticflickr.com/65535/1_test.jpg",
                 "width_m": 500, "height_m": 300}
        with tempfile.TemporaryDirectory() as directory, patch.object(sync, "ROOT", Path(directory)), patch.object(
                sync, "album_photos", return_value=[small]), patch.object(sync, "read_url", return_value=b"\xff\xd8\xffimage\xff\xd9"):
            sync.main()
            manifest = json.loads((Path(directory) / "flickr-photos.json").read_text())
            self.assertEqual((manifest[0]["width"], manifest[0]["height"]), (500, 300))

    def test_invalid_metadata_is_rejected_before_downloads(self):
        invalid = photo(2) | {"url_z": "https://example.com/image.jpg"}
        with tempfile.TemporaryDirectory() as directory, patch.object(sync, "ROOT", Path(directory)), patch.object(
                sync, "album_photos", return_value=[photo(1), invalid]), patch.object(sync, "read_url") as read:
            with self.assertRaises(ValueError):
                sync.main()
            read.assert_not_called()


if __name__ == "__main__":
    unittest.main()
