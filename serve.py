#!/usr/bin/env python3
"""Serve the production build locally with SPA route fallback."""

from __future__ import annotations

import argparse
import http.server
import socketserver
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"


class SpaRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        request_path = DIST / urlparse(self.path).path.lstrip("/")
        if not request_path.exists() and "." not in request_path.name:
            self.path = "/index.html"
        super().do_GET()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    if not (DIST / "index.html").exists():
        raise SystemExit("dist/ is missing. Run `npm install && npm run build` first.")

    with socketserver.TCPServer(("127.0.0.1", args.port), SpaRequestHandler) as server:
        print(f"Serving {DIST} at http://127.0.0.1:{args.port}/")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
