/* YUGATNEO Matrix Runner: canvas renderer and browser controls. */
(function () {
  'use strict';
  const Core = window.NeoRunnerCore;
  if (!Core) throw new Error('Runner game engine is unavailable');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    document.getElementById('status').textContent = 'Этому браузеру необходим Canvas 2D.';
    return;
  }
  const C = Core.CONFIG;
  const $ = (id) => document.getElementById(id);
  let state = Core.newGame();
  let lastTime = 0;
  let best = readBest();
  let lastPhase = '';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rain = Array.from({length: 47}, (_, i) => ({
    x: 9 + i * 21,
    offset: Math.random() * 760,
    rate: 100 + Math.random() * 165,
    length: 5 + Math.floor(Math.random() * 10)
  }));
  const alphabet = '01アイウエオカキクケコサシスセソ';
  const digits = (n) => String(n).padStart(5, '0');

  function readBest() {
    try {
      const value = Number(window.localStorage.getItem('yugatneo.runner.best.v1'));
      return Number.isSafeInteger(value) && value > 0 && value < 1e9 ? value : 0;
    } catch (_) { return 0; }
  }
  function saveBest(score) {
    if (!Number.isSafeInteger(score) || score < best) return;
    best = score;
    try { window.localStorage.setItem('yugatneo.runner.best.v1', String(best)); }
    catch (_) { /* private browsing: game remains usable */ }
  }
  function resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(C.WIDTH * ratio);
    canvas.height = Math.round(C.HEIGHT * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, {passive: true});

  function line(x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function drawMatrixRain(t) {
    ctx.save();
    ctx.font = '17px monospace';
    ctx.textAlign = 'center';
    for (const stream of rain) {
      const yHead = (t * stream.rate + stream.offset) % (C.HEIGHT + 290);
      for (let j = 0; j < stream.length; j++) {
        const y = yHead - j * 24;
        if (y < -20 || y > C.HEIGHT + 16) continue;
        const alpha = j === 0 ? 0.79 : Math.max(0, 0.59 - j / stream.length * 0.56);
        ctx.fillStyle = j === 0 ? 'rgba(211,255,220,' + alpha + ')' :
          'rgba(90,245,133,' + alpha + ')';
        const n = Math.floor(t * 9 + stream.x * 7 + j * 3) % alphabet.length;
        ctx.fillText(alphabet.charAt(n), stream.x, y);
      }
    }
    ctx.restore();
  }
  function background() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    if (state.boost > 0 && !reduceMotion) drawMatrixRain(state.time);
    if (state.boost > 0 && reduceMotion) {
      ctx.strokeStyle = 'rgba(110,255,150,.16)';
      ctx.lineWidth = 1;
      for (let x = 20; x < C.WIDTH; x += 44) line(x, 12, x, C.FLOOR - 12);
    }

    ctx.strokeStyle = state.boost > 0 ? 'rgba(178,255,195,.8)' : '#fff';
    ctx.lineWidth = 2.2;
    line(0, C.FLOOR, C.WIDTH, C.FLOOR);
    ctx.lineWidth = 1;
    ctx.strokeStyle = state.boost > 0 ? 'rgba(125,230,155,.5)' : 'rgba(255,255,255,.22)';
    const offset = state.distance % 70;
    for (let x = -70 - offset; x < C.WIDTH; x += 70) {
      line(x, C.FLOOR + 19, x + 27, C.FLOOR + 19);
    }
    if (state.boost > 0) {
      ctx.fillStyle = 'rgba(147,255,169,.08)';
      ctx.fillRect(0, 0, C.WIDTH, C.FLOOR);
    }
  }
  function obstacleDraw(o) {
    ctx.save();
    ctx.strokeStyle = state.boost > 0 ? '#b0ffd0' : '#fff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'miter';
    if (o.type === 'spikes') {
      const count = 3;
      const section = o.w / count;
      for (let i = 0; i < count; i++) {
        const x = o.x + i * section;
        ctx.beginPath();
        ctx.moveTo(x, C.FLOOR);
        ctx.lineTo(x + section / 2, C.FLOOR - o.h);
        ctx.lineTo(x + section, C.FLOOR);
        ctx.stroke();
      }
    } else {
      ctx.strokeRect(o.x, C.FLOOR - o.h, o.w, o.h);
      line(o.x + 5, C.FLOOR - o.h + 6, o.x + o.w - 5, C.FLOOR - 7);
      line(o.x + 5, C.FLOOR - 6, o.x + o.w - 5, C.FLOOR - o.h + 7);
    }
    ctx.restore();
  }
  function portalDraw(portal) {
    ctx.save();
    const green = state.boost > 0;
    ctx.strokeStyle = green ? '#aaffbe' : '#fff';
    ctx.shadowColor = green ? '#6cff8b' : '#bdbdbd';
    ctx.shadowBlur = reduceMotion ? 3 : 12;
    ctx.lineWidth = 3.5;
    ctx.setLineDash([14, 11]);
    ctx.lineDashOffset = reduceMotion ? 0 : -(state.time * 35);
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, portal.rx, portal.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = green ? 'rgba(130,255,160,.45)' : 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.ellipse(portal.x, portal.y, portal.rx - 10, portal.ry - 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawRunner() {
    const p = state.player;
    const x = p.x, y = p.y;
    const jumping = !Core.grounded(state);
    const phase = Math.sin(state.time * 19);
    const stride = jumping ? 5 : phase * 11;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.shadowColor = state.boost > 0 ? '#70ffa1' : '#fff';
    ctx.shadowBlur = state.boost > 0 ? 13 : 0;
    ctx.beginPath(); ctx.arc(x, y + 10, 8, 0, Math.PI * 2); ctx.stroke();
    line(x, y + 18, x, y + 35);
    if (jumping) {
      line(x, y + 23, x - 13, y + 18);
      line(x, y + 23, x + 13, y + 12);
      line(x, y + 35, x - 10, y + 43);
      line(x - 10, y + 43, x - 2, y + 50);
      line(x, y + 35, x + 11, y + 43);
      line(x + 11, y + 43, x + 16, y + 50);
    } else {
      line(x, y + 22, x - 10 - stride * .5, y + 30);
      line(x, y + 22, x + 10 + stride * .5, y + 29);
      line(x, y + 35, x - 7 + stride, y + 45);
      line(x - 7 + stride, y + 45, x - 13 + stride, y + 52);
      line(x, y + 35, x + 7 - stride, y + 45);
      line(x + 7 - stride, y + 45, x + 13 - stride, y + 52);
    }
    ctx.restore();
    ctx.save();
    ctx.fillStyle = state.boost > 0 ? 'rgba(104,255,145,.42)' : 'rgba(255,255,255,.19)';
    ctx.beginPath();
    ctx.ellipse(x, C.FLOOR + 2, 16, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function draw() {
    background();
    for (const portal of state.portals) portalDraw(portal);
    for (const obstacle of state.obstacles) obstacleDraw(obstacle);
    drawRunner();
    ctx.fillStyle = state.boost > 0 ? '#baffcb' : '#aaa';
    ctx.textAlign = 'left'; ctx.font = '15px monospace';
    ctx.fillText('YUGATNEO // MATRIX RUNNER', 20, 30);
    if (state.boost > 0) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('MATRIX MODE  ' + state.boost.toFixed(1) + 's', C.WIDTH - 21, 30);
    }
    if (state.flash > 0 && !reduceMotion) {
      ctx.fillStyle = 'rgba(125,255,160,' + Math.min(.13, state.flash * .18) + ')';
      ctx.fillRect(0, 0, C.WIDTH, C.FLOOR);
    }
  }
  function message(text) { $('status').textContent = text; }
  function updatePrompt() {
    if (state.phase === lastPhase) return;
    lastPhase = state.phase;
    $('prompt').hidden = state.phase === 'running';
    const titles = {
      ready: ['НАЧАТЬ ВЫХОД', 'Коснись игрового поля или нажми «Прыжок».'],
      paused: ['ПАУЗА', 'Нажми «Пауза», чтобы продолжить.'],
      gameover: ['СБОЙ СИСТЕМЫ', 'Коснись экрана или нажми «Заново» для нового забега.']
    };
    const info = titles[state.phase];
    if (info) {
      $('prompt-title').textContent = info[0];
      $('prompt-detail').textContent = info[1];
    }
    $('pause').textContent = state.phase === 'paused' ? '▶ ДАЛЬШЕ' : 'Ⅱ ПАУЗА';
  }
  function updateHud() {
    $('score').textContent = digits(state.score);
    $('best').textContent = digits(Math.max(best, state.score));
    $('power').textContent = state.boost > 0 ? 'МАТРИЦА · ' + state.boost.toFixed(1) + 'с' : 'РЕАЛЬНОСТЬ';
  }
  function startJump() {
    if (state.phase === 'gameover') {
      saveBest(state.score);
      state = Core.newGame();
      lastPhase = '';
    }
    if (state.phase === 'paused') Core.start(state);
    if (Core.jump(state)) {
      if (state.time === 0) message('Вперёд! Перепрыгивай преграды и лови воздушные порталы.');
    }
    updatePrompt();
  }
  function restart() {
    saveBest(state.score);
    state = Core.newGame();
    Core.start(state);
    lastPhase = '';
    message('Новый забег! Прыгай через препятствия.');
    updatePrompt();
  }
  function togglePause() {
    if (state.phase === 'running') {
      Core.pause(state);
      message('Пауза. Нажми «Пауза» для продолжения.');
    } else if (state.phase === 'paused') {
      Core.start(state);
      lastTime = performance.now();
      message('Игра продолжается.');
    } else if (state.phase === 'ready') {
      Core.start(state);
      message('Игра началась. Нажми «Прыжок» перед преградой.');
    }
    updatePrompt();
  }
  $('jump').addEventListener('click', startJump);
  $('restart').addEventListener('click', restart);
  $('pause').addEventListener('click', togglePause);
  canvas.addEventListener('pointerdown', (event) => {
    if (event.cancelable) event.preventDefault();
    startJump();
  });
  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
      if (event.repeat) return;
      event.preventDefault();
      startJump();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault(); togglePause();
    } else if (event.code === 'KeyR') {
      event.preventDefault(); restart();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'running') {
      Core.pause(state);
      message('Игра приостановлена при переключении вкладки.');
      updatePrompt();
    }
    lastTime = 0;
  });
  function frame(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(.032, (now - lastTime) / 1000);
    lastTime = now;
    const events = Core.step(state, dt);
    if (events.includes('portal')) message('ПОРТАЛ! Матричный код: высокий и двойной прыжок на 8 секунд.');
    if (events.includes('boost-ended')) message('Бонус завершён. Прыжок снова обычный.');
    if (events.includes('hit')) {
      saveBest(state.score);
      message('Столкновение. Очки: ' + state.score + '. Коснись поля или начни заново.');
    }
    updatePrompt();
    updateHud();
    draw();
    requestAnimationFrame(frame);
  }
  updatePrompt();
  updateHud();
  requestAnimationFrame(frame);
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  } catch (_) { /* Telegram integration is optional. */ }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {});
  }
})();
