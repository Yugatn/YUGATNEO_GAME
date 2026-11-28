"""Real-browser smoke tests, emulated viewports (not physical devices)."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}"
game = url + "/psychology/life-quest/"

def mode(page, name):
    page.locator("#modeMenu summary").click()
    page.locator("#" + name).click()
    expect(page.locator("#modeMenu")).not_to_have_attribute("open", "")

def choices(page, i, selector=".choices"):
    page.locator("#screen " + selector).first.locator("button").nth(i).click()

def button(page, name):
    page.locator("#screen").get_by_role("button", name=name, exact=True).click()

def layout(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Horizontal page overflow"

def run(browser, viewport, mobile):
    context = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile, reduced_motion="reduce")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(url + "/psychology/")
    expect(page.locator('a[href="./life-quest/"]')).to_have_count(1)
    page.goto(url + "/games/")
    expect(page.locator('a[href="../psychology/life-quest/"]')).to_have_count(0)
    page.goto(game)
    expect(page.locator("h1")).to_have_text("Тренажер Югатна")
    layout(page)
    page.locator("#science-card summary").click()
    expect(page.locator("#science-card")).to_contain_text("Авторская философская связь")
    assert page.locator("#science-card a").count() >= 1
    page.locator("#science-card summary").click()
    # First wrong answer, then correct, reload before coaching.
    first = page.evaluate("D[0][7]")
    choices(page, (first + 1) % 3)
    expect(page.locator("#xp")).to_have_text("✦ 0 XP")
    choices(page, first)
    expect(page.locator("#xp")).to_have_text("✦ 50 XP")
    page.reload()
    expect(page.locator("#screen")).to_contain_text("Раунд 2")
    choices(page, page.evaluate("D[0][14]"))
    expect(page.locator("#xp")).to_have_text("✦ 100 XP")
    button(page, "Продолжить квест")
    assert page.evaluate("data.stage === ORDER[1] && phase === 0")
    # Complete remaining main quest through real click handlers.
    for stage in page.evaluate("ORDER.slice(1)"):
        page.locator("#map button").nth(page.evaluate(f"ORDER.indexOf({stage})")).click()
        expect(page.locator("#science-card summary")).to_have_text("Научная карточка этапа")
        assert not page.locator("#science-card").evaluate("(el)=>el.open")
        choices(page, page.evaluate("D[data.stage][7]"))
        button(page, "Как Вы думаете?")
        choices(page, page.evaluate("D[data.stage][14]"))
        button(page, "Итоги этапа" if stage == page.evaluate("ORDER.at(-1)") else "Следующий уровень")
    expect(page.locator("#xp")).to_have_text("✦ 3000 XP")
    mode(page, "planner")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        for j, value in enumerate(page.evaluate("MISSIONS[missionIndex][3].map(f=>f[2][0])")):
            page.locator(f"#plan-{j}").select_option(str(value))
        button(page, "Проверить решения")
    mode(page, "story")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        choices(page, 0)
        choices(page, 0)
        choices(page, page.evaluate("STORIES[storyIndex].correct"))
    mode(page, "brain")
    for i in range(6):
        page.locator(".mission-tabs button").nth(i).click()
        for j in range(3):
            if i == 0:
                button(page, "Запомнил — скрыть числа")
            if i == 3:
                choices(page, page.evaluate("spaceTask.correct"), ".spatial-options")
            else:
                choices(page, page.evaluate("chooseRound(cogIndex,cogRound,cogVariant).correct"))
            button(page, "Далее")
    mode(page, "conflicts")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        for j in range(3):
            choices(page, page.evaluate("CONFLICTS[conflictIndex].steps[conflictStep][3]"))
            button(page, "Завершить диалог" if j == 2 else "Следующий шаг")
    expect(page.locator("#xp")).to_have_text("✦ 4800 XP")
    assert page.locator("#progress").evaluate("(el)=>el.value") == 78
    mode(page, "perspectives")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        for j in range(2):
            choices(page, page.evaluate("PERSPECTIVES[perspectiveIndex].roles[perspectiveStep].accepted[" + str(j) + "]"))
            button(page, "Поменяться ролями" if j == 0 else "Завершить сценарий")
    expect(page.locator("#xp")).to_have_text("✦ 5200 XP")
    assert page.locator("#progress").evaluate("(el)=>el.value") == 82
    mode(page, "learning")
    button(page, "Продолжить по маршруту")
    expect(page.locator("#modeLabel")).to_have_text("Рефлексия")
    mode(page, "habits")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        for j in range(2):
            choices(page, page.evaluate("HABITS[habitIndex].rounds[habitRound].ok"))
            button(page, "Следующий вопрос" if j == 0 else "Завершить сценарий")
    expect(page.locator("#xp")).to_have_text("✦ 5600 XP")
    mode(page, "thinking")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        for j in range(2):
            choices(page, page.evaluate("THINKING[thinkingIndex].rounds[thinkingRound].ok"))
            button(page, "Следующий вопрос" if j == 0 else "Завершить сценарий")
    expect(page.locator("#xp")).to_have_text("✦ 6000 XP")
    assert page.locator("#progress").evaluate("(el)=>el.value") == 90
    mode(page, "learning")
    button(page, "Продолжить по маршруту")
    expect(page.locator("#modeLabel")).to_have_text("Рефлексия")
    for i in range(4):
        page.locator(".mission-tabs button").nth(i).click()
        expect(page.locator("#reflection-finish")).to_be_disabled()
        for j in range(3):
            page.locator(f"#reflection-{j}").check()
        button(page, "Отметить практикум выполненным")
    expect(page.locator("#xp")).to_have_text("✦ 6400 XP")
    assert page.locator("#progress").evaluate("(el)=>el.value") == 94
    mode(page, "learning")
    expect(page.locator("#screen")).to_contain_text("Все направления освоены")
    mode(page, "settings")
    page.get_by_label("Крупный шрифт").check()
    page.get_by_label("Повышенный контраст").check()
    page.get_by_label("Спокойный режим без анимации").check()
    layout(page)
    button(page, "Показать код резервной копии")
    backup = page.locator("#backup-text").input_value()
    button(page, "Проверить копию")
    button(page, "Подтвердить объединение")
    expect(page.locator("#xp")).to_have_text("✦ 6400 XP")
    page.reload()
    expect(page.locator("#xp")).to_have_text("✦ 6400 XP")
    assert page.locator("body").evaluate("(el)=>el.classList.contains('pref-large')")
    layout(page)
    # Fresh browser context: transfer through text import.
    second = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile)
    other = second.new_page()
    other.goto(game)
    mode(other, "settings")
    other.locator("#backup-text").fill(backup)
    button(other, "Проверить копию")
    button(other, "Подтвердить объединение")
    expect(other.locator("#xp")).to_have_text("✦ 6400 XP")
    second.close()
    assert not errors, errors
    context.close()

try:
    with sync_playwright() as p:
        for engine, viewport, mobile in [
            (p.chromium, {"width": 360, "height": 800}, True),
            (p.webkit, {"width": 390, "height": 844}, True),
            (p.chromium, {"width": 1280, "height": 900}, False),
        ]:
            browser = engine.launch()
            try:
                run(browser, viewport, mobile)
                print(f"PASS {engine.name} {viewport}", flush=True)
            finally:
                browser.close()
finally:
    server.shutdown()
