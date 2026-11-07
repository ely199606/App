#!/usr/bin/env python3
"""Snapshot the public Manzanín reference in CI, including every SW offline asset."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import time
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote
from urllib.request import Request, build_opener, HTTPRedirectHandler

EXT = r'(?:png|jpe?g|webp|gif|ico|svg|ttf|otf|woff2?|css|js|webmanifest|json|txt)'
QUOTED_ASSET = re.compile(r'''["']((?:\.?\.?/)?(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_-]+\.''' + EXT + r'''(?:\?[^"'<>]*)?)["']''', re.I)
CSS_ASSET = re.compile(r'''(?<![\w$])url\(\s*["']?([^\s"')]+)["']?\s*\)''', re.I)


class HTMLAssets(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []; self.styles = []; self._in_style = False
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'style': self._in_style = True
        if values.get('style'): self.styles.append(values['style'])
        if tag in ('script', 'img', 'source', 'link', 'video', 'audio'):
            self.refs.extend(values[k] for k in ('src', 'href', 'poster') if values.get(k))
    def handle_endtag(self, tag):
        if tag == 'style': self._in_style = False
    def handle_data(self, data):
        if self._in_style: self.styles.append(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='https://soft-cocada-de54ce.netlify.app/')
    parser.add_argument('--out', type=Path, default=Path('out'))
    args = parser.parse_args()
    base = urlsplit(args.base)
    if base.scheme != 'https' or not base.hostname or base.username or base.password or base.port not in (None, 443):
        raise ValueError('Expected an HTTPS reference without credentials')
    origin = (base.scheme, base.hostname.lower(), base.port or 443)
    base_url = urlunsplit((base.scheme, base.netloc, base.path or '/', '', ''))

    def canonical(ref, parent=base_url):
        if not isinstance(ref, str) or not ref or ref.startswith(('#', 'data:', 'blob:')):
            return None
        parsed = urlsplit(urljoin(parent, ref))
        if parsed.username or parsed.password or (parsed.scheme, (parsed.hostname or '').lower(), parsed.port or 443) != origin:
            return None
        decoded = unquote(parsed.path)
        if '\\' in decoded or '\x00' in decoded or '..' in PurePosixPath(decoded).parts:
            raise ValueError('Unsafe resource path')
        path = decoded.lstrip('/') or 'index.html'
        if decoded.endswith('/'):
            path = path.rstrip('/') + '/index.html' if path != 'index.html' else path
        return path, urlunsplit((parsed.scheme, parsed.netloc, parsed.path or '/', '', ''))

    class SameOriginRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if canonical(newurl) is None:
                raise ValueError('Cross-origin redirect refused')
            return super().redirect_request(req, fp, code, msg, headers, newurl)

    opener = build_opener(SameOriginRedirect())
    out = args.out.resolve(); site = out / 'site'
    if site.exists() and any(site.iterdir()):
        raise ValueError('Refusing to overwrite an existing snapshot')
    site.mkdir(parents=True, exist_ok=True)
    inventory = {}; queue = []; queued = set()

    def enqueue(ref, parent=base_url):
        item = canonical(ref, parent)
        if item and item[0] not in queued:
            queued.add(item[0]); queue.append(item)

    def fetch(path, url):
        error = None
        for attempt in range(3):
            try:
                request = Request(url, headers={'User-Agent': 'ManzaninReferenceBuilder/1.0', 'Cache-Control': 'no-cache'})
                with opener.open(request, timeout=45) as response:
                    if canonical(response.url) is None:
                        raise ValueError('Unexpected final origin')
                    body = response.read(24 * 1024 * 1024 + 1)
                    if len(body) > 24 * 1024 * 1024:
                        raise ValueError('One resource exceeds the supported artifact size')
                    mime = response.headers.get_content_type()
                break
            except Exception as failure:
                error = failure
                if attempt == 2: raise RuntimeError('Cannot fetch required resource: ' + path) from error
                time.sleep(attempt + 1)
        suffix = Path(path).suffix.lower()
        if suffix == '.png' and not body.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('Invalid PNG response: ' + path)
        if suffix in ('.ttf', '.otf') and not body.startswith((b'\x00\x01\x00\x00', b'OTTO', b'ttcf')):
            raise ValueError('Invalid font response: ' + path)
        if suffix in ('.js', '.css', '.svg', '.txt', '.json', '.webmanifest') and re.match(br'\s*(?:<!doctype\s+html|<html)', body[:150], re.I):
            raise ValueError('HTML returned instead of an asset: ' + path)
        if suffix in ('.json', '.webmanifest'): json.loads(body.decode('utf-8-sig'))
        target = (site / path).resolve(); target.relative_to(site)
        target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(body)
        inventory[path] = {'sha256': hashlib.sha256(body).hexdigest(), 'bytes': len(body), 'content_type': mime, 'url': url}
        return body

    enqueue('./'); enqueue('sw.js')
    required_offline = set()
    while queue:
        path, url = queue.pop(0)
        body = fetch(path, url)
        suffix = Path(path).suffix.lower()
        if suffix not in ('.html', '.js', '.css', '.svg', '.webmanifest', '.json'): continue
        text = body.decode('utf-8-sig')
        if path == 'sw.js':
            match = re.search(r'\b(?:const|let|var)\s+OFFLINE\s*=\s*(\[[\s\S]*?\])\s*;', text)
            if not match: raise ValueError('OFFLINE manifest missing; refusing an incomplete mascot snapshot')
            assets = json.loads(match.group(1))
            if not isinstance(assets, list): raise ValueError('Invalid OFFLINE manifest')
            for ref in assets:
                item = canonical(ref, url)
                if item is None: raise ValueError('OFFLINE resource outside reference origin')
                required_offline.add(item[0]); enqueue(ref, url)
        if suffix == '.html':
            html = HTMLAssets(); html.feed(text)
            for ref in html.refs: enqueue(ref, url)
            for css in html.styles:
                for ref in CSS_ASSET.findall(css): enqueue(ref, url)
        elif suffix == '.css':
            for ref in CSS_ASSET.findall(text): enqueue(ref, url)
        if suffix == '.js':
            # Literal relative assets; SW remains the complete required inventory.
            for ref in QUOTED_ASSET.findall(text):
                item = canonical(ref, url)
                if item and ('/' in ref or item[0] in required_offline): enqueue(ref, url)
        if suffix == '.webmanifest':
            manifest = json.loads(text)
            for icon in manifest.get('icons', []): enqueue(icon.get('src'), url)
    if not required_offline or not required_offline.issubset(inventory):
        raise ValueError('Snapshot does not contain every offline asset')

    report = {'source_url': base_url, 'files': dict(sorted(inventory.items())), 'offline_required': sorted(required_offline), 'offline_inventory_complete': True, 'file_count': len(inventory), 'total_bytes': sum(v['bytes'] for v in inventory.values())}
    code = out / 'code'; code.mkdir(exist_ok=True)
    (code / 'inventory.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    limit = 22 * 1024 * 1024; bucket = 1; bucket_bytes = 0; code_bytes = 0
    binary_extensions = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.ttf', '.otf', '.woff', '.woff2'}
    for path, metadata in sorted(inventory.items()):
        if Path(path).suffix.lower() in binary_extensions:
            if metadata['bytes'] > limit: raise ValueError('One binary exceeds the artifact partition size')
            if bucket_bytes and bucket_bytes + metadata['bytes'] > limit: bucket += 1; bucket_bytes = 0
            destination = out / ('assets' + str(bucket)) / 'site' / path
            bucket_bytes += metadata['bytes']
        else:
            destination = code / 'site' / path; code_bytes += metadata['bytes']
        destination.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(site / path, destination)
    if code_bytes > 1024 * 1024: raise ValueError('Code-only artifact unexpectedly exceeds 1 MiB')
    print(json.dumps({'files': len(inventory), 'offline_required': len(required_offline), 'bytes': report['total_bytes'], 'code_bytes': code_bytes, 'asset_bundles': bucket, 'all_offline_assets_present': True}))


if __name__ == '__main__': main()
