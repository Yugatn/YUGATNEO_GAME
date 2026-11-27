"""Planet X layout regression in real Chromium and WebKit (desktop/mobile emulation).
Run: pip install playwright && python -m playwright install chromium webkit
     python ideas-x/tests/browser-layout.py
Tests use the checked-out HTML and deterministic offline atlas fallback.
"""
from pathlib import Path
import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "ideas-x" / "test-artifacts"
SIZES = [(320, 568), (375, 667), (390, 844), (430, 932), (768, 1024), (844, 390), (1440, 900)]

def layout(page):
    return page.evaluate("""() => {
      const el = id => document.getElementById(id);
      const box = id => el(id).getBoundingClientRect().toJSON();
      return {w: innerWidth, h: innerHeight,
              docWidth: document.documentElement.scrollWidth,
              docHeight: document.documentElement.scrollHeight,
              map: box('world'), deck: box('deckScroll'), nav: box('deckNav'),
              mapbar: box('mapwrap'), scroll: el('deckScroll').scrollTop,
              scrollHeight: el('deckScroll').scrollHeight,
              visible: [...document.querySelectorAll('.deckpage')].filter(x => !x.hidden).map(x => x.id)};
    }""")

def bounds(m, label):
    assert m["docWidth"] <= m["w"] + 1, (label, "horizontal overflow", m)
    assert m["docHeight"] <= m["h"] + 1, (label, "document scroll", m)
    assert m["deck"]["height"] >= 85, (label, "insufficient command space", m)
    assert m["deck"]["bottom"] <= m["h"] + 1, (label, "deck outside viewport", m)
    assert m["map"]["bottom"] <= m["h"] + 1, (label, "map outside viewport", m)
    assert len(m["visible"]) == 1, (label, "multiple visible pages", m)

def check(browser, name, url, width, height):
    mobile = width <= 760 or height <= 500
    context = browser.new_context(viewport={"width": width, "height": height},
                                  is_mobile=mobile, has_touch=mobile,
                                  reduced_motion="reduce")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://cdn.jsdelivr.net/**", lambda route: route.abort())
    page.goto(url, wait_until="domcontentloaded")
    expect(page.locator("#start")).to_be_visible()
    expect(page.locator("#start")).to_be_disabled()
    page.select_option("#mode", "sandbox")
    page.select_option("#regionSelect", "eu")
    page.locator("#start").click()
    expect(page.locator("#controls")).to_be_visible()
    page.locator("[data-tab=system]").click()
    expect(page.locator("#system")).to_be_visible()
    base = layout(page)
    bounds(base, "normal")
    # Scroll only the active command panel; map must remain fixed.
    page.locator("#deckScroll").evaluate("(e) => { e.scrollTop = e.scrollHeight; }")
    after = layout(page)
    assert after["scroll"] > 0, ("economy must be scrollable", after)
    assert abs(after["map"]["top"] - base["map"]["top"]) < 1
    assert abs(after["map"]["bottom"] - base["map"]["bottom"]) < 1
    assert page.evaluate("window.scrollY") == 0
    page.locator("[data-tab=society]").click()
    page.locator("[data-tab=system]").click()
    assert abs(layout(page)["scroll"] - after["scroll"]) < 2
    page.locator("#mapSize").click() # normal -> large
    expect(page.locator("#gameShell")).to_have_attribute("data-map-size", "large")
    bounds(layout(page), "large")
    page.locator("#mapSize").click() # large -> compact
    expect(page.locator("#gameShell")).to_have_attribute("data-map-size", "compact")
    compact = layout(page)
    bounds(compact, "compact")
    assert compact["deck"]["height"] >= base["deck"]["height"] if width <= 760 and height > width else True
    page.locator("#mapZoom").click()
    expect(page.locator("#mapwrap")).to_have_class("mapwrap zoomed")
    expect(page.locator("#zoomLevel")).to_have_text("3×")
    def camera():
        return [float(x) for x in page.locator("#atlas").get_attribute("viewBox").split()]
    initial = camera()
    page.locator("#zoomIn").click()
    assert camera()[2] < initial[2], "camera zoom in"
    page.locator("#zoomOut").click()
    assert abs(camera()[2] - initial[2]) < .01, "camera zoom out"
    page.locator("#atlas").focus()
    page.keyboard.press("ArrowRight")
    assert camera()[0] > initial[0], "keyboard pan"
    page.locator("#mapHome").click()
    assert camera() == [0, 0, 1000, 440], "world camera reset"
    page.locator("#mapFocus").click()
    expect(page.locator("#zoomLevel")).to_have_text("3×")
    page.locator("#mapZoom").click()
    assert camera() == [0, 0, 1000, 440]
    page.select_option("#layer", "resource:food")
    expect(page.locator("#mapnote")).to_contain_text("Продовольствие")
    assert page.locator("#markers .supplier").count() > 0
    assert page.locator("#edges .resourceRoute").count() > 0
    page.select_option("#layer", "ecology")
    page.locator("[data-step='7']").click()
    expect(page.locator("#day")).to_have_text("7")
    page.select_option("#moreTabs", "chronicle")
    expect(page.locator("#historyChart svg")).to_be_visible()
    expect(page.locator("#historyStats")).to_contain_text("Изменение")
    page.select_option("#historyMetric", "ecology")
    expect(page.locator("#historyChart svg")).to_have_attribute("aria-label", "Экология — история мира и региона Западная Европа")
    page.select_option("#logFilter", "crisis")
    expect(page.locator("#log")).to_contain_text("Нет событий выбранного типа")
    page.select_option("#logFilter", "all")
    expect(page.locator("#log")).to_contain_text("Первые участники")
    page.select_option("#moreTabs", "settings")
    expect(page.locator("#eventSound")).to_have_attribute("aria-pressed", "false")
    page.locator("#eventSound").click()
    expect(page.locator("#eventSound")).to_have_attribute("aria-pressed", "true")
    page.locator("#eventSound").click()
    page.locator("#mapMotion").click()
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("#gameShell")).to_have_attribute("data-map-size", "compact")
    expect(page.locator("#layer")).to_have_value("ecology")
    expect(page.locator("#day")).to_have_text("7")
    expect(page.locator("#regionSelect")).to_have_value("eu")
    page.select_option("#moreTabs", "chronicle")
    expect(page.locator("#historyHint")).to_contain_text("2 сохранённых срезов")
    page.select_option("#moreTabs", "settings")
    expect(page.locator("#mapMotion")).to_have_attribute("aria-pressed", "false")
    page.locator("[data-tab=system]").click()
    bounds(layout(page), "reloaded")
    OUT.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(OUT / f"{name}-{width}x{height}.png"))
    assert not errors, errors
    context.close()
    print(f"PASS {name} {width}x{height}")

def main():
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/ideas-x/"
    try:
        with sync_playwright() as p:
            for name in ("chromium", "webkit"):
                browser = getattr(p, name).launch()
                try:
                    for width, height in SIZES:
                        check(browser, name, url, width, height)
                finally:
                    browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    main()
