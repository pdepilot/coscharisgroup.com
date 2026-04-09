"""Remove preloader block from all HTML files except index.html."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = "index.html"


def strip_preloader_balanced(content: str) -> str:
    idx = content.find('class="preloader"')
    if idx == -1:
        return content
    start = content.rfind("<div", 0, idx)
    if start == -1:
        return content
    i = start
    depth = 0
    n = len(content)
    while i < n:
        if content.startswith("<div", i):
            depth += 1
            gt = content.find(">", i)
            if gt == -1:
                break
            i = gt + 1
        elif content.startswith("</div>", i):
            depth -= 1
            i += 6
            if depth == 0:
                while i < n and content[i] in " \r\n\t":
                    i += 1
                return content[:start] + content[i:]
        else:
            i += 1
    return content


def main():
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith(".html") or fn == SKIP:
            continue
        path = os.path.join(ROOT, fn)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            orig = f.read()
        new = strip_preloader_balanced(orig)
        if new != orig:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(new)
            print("removed:", fn)
        elif "preloader" in orig:
            print("WARN still has preloader:", fn)


if __name__ == "__main__":
    main()
