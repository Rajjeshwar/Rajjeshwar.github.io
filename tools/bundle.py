#!/usr/bin/env python3
"""Bundle the site into one self-contained HTML file.

The site itself needs no build step: GitHub Pages serves index.html, css/ and js/ as they
are. This script is only for the times a single file is handier, for example to preview the
page without a local server or to send it to someone.

    python3 tools/bundle.py                 # writes dist/site.html
    python3 tools/bundle.py --embed         # writes dist/embed.html, a fragment without
                                            # <html>/<head>/<body>, for pasting into a host
                                            # page; the hosted-only extras are left out

It inlines the stylesheet and flattens the JavaScript modules into one script, in dependency
order. That flattening is deliberately simple: it relies on every module using one-line
`import ... from '...';` statements and on top-level names being unique across modules.
"""
import argparse
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMPORT = re.compile(r"^import\s+(?:[^'\"\n]+?\s+from\s+)?['\"]([^'\"]+)['\"];[ \t]*\n", re.M)
EXPORT = re.compile(r"^export\s+(?:default\s+)?(?=(?:const|let|function|class)\b)", re.M)
TOP_LEVEL = re.compile(r"^(?:export\s+(?:default\s+)?)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)", re.M)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


def load_order(entry, seen, order):
    """Depth-first walk of the import graph, so each module comes after what it imports."""
    entry = os.path.normpath(entry)
    if entry in seen:
        return
    seen.add(entry)
    for dep in IMPORT.findall(read(entry)):
        load_order(os.path.join(os.path.dirname(entry), dep), seen, order)
    order.append(entry)


def flatten(entry):
    order, owners, parts = [], {}, []
    load_order(entry, set(), order)
    for rel in order:
        code = read(rel)
        for name in TOP_LEVEL.findall(code):
            if name in owners:
                raise SystemExit("'%s' is declared in both %s and %s; rename one to bundle." % (name, owners[name], rel))
            owners[name] = rel
        code = EXPORT.sub("", IMPORT.sub("", code))
        parts.append("// ---- %s ----\n%s" % (rel.replace(os.sep, "/"), code.strip()))
    return "(() => {\n'use strict';\n" + "\n\n".join(parts) + "\n})();"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--embed", action="store_true", help="write a fragment without the document wrapper or hosted-only extras")
    ap.add_argument("-o", "--output", help="output path (default: dist/site.html, or dist/embed.html with --embed)")
    args = ap.parse_args()

    html = read("index.html")
    html = html.replace('<link rel="stylesheet" href="css/styles.css">', "<style>\n" + read("css/styles.css") + "</style>")
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>\n" + read(m.group(1)) + "</script>", html)

    def module(m):
        if args.embed and "data-hosted-only" in m.group(0):
            return ""
        return "<script>\n" + flatten(m.group(1)) + "\n</script>"

    html = re.sub(r'<script type="module" src="([^"]+)"[^>]*></script>\n?', module, html)

    if args.embed:
        html = re.sub(r"<!doctype html>\s*", "", html, flags=re.I)
        html = re.sub(r"</?(?:html|head|body)\b[^>]*>\s*", "", html, flags=re.I)
        html = re.sub(r'<meta (?:charset|name="viewport")[^>]*>\s*', "", html)
        html = re.sub(r'<link rel="(?:icon|preconnect)"[^>]*>\s*', "", html)

    out = args.output or os.path.join(ROOT, "dist", "embed.html" if args.embed else "site.html")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html.rstrip("\n") + "\n")
    print("wrote %s (%d KB)" % (os.path.relpath(out), len(html.encode("utf-8")) // 1024))


if __name__ == "__main__":
    main()
