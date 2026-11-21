import { SquareGame, SEATS, zoneAt } from './engine.mjs';

const $ = id => document.getElementById(id);
const field = $('field');
const ctx = field.getContext('2d', { alpha: false });
const tg = globalThis.Telegram?.WebApp;
const game = new SquareGame();
let target = 3; // opening diagonal from square 1
let paused = false;
let lastFrame = 0;
let lastUI = 0;
let lastNotice = '';
let lastRound = -1;
let lastHumanSeat = 0;

try {
  tg?.ready?.();
  tg?.expand?.();
  tg?.setHeaderColor?.('#0d1519');
  tg?.setBackgroundColor?.('#0d1519');
} catch (_) { /* The game also works as an ordinary web page. */ }

const colors = SEATS.map(p => p.color);
const aimChips = [];
for (let i = 0; i <= 4; i += 1) {
  const button = document.createElement('button');
  button.className = `aim-chip${i === 4 ? ' center-choice' : ''}`;
  button.textContent = i === 4 ? '×' : String(i + 1);
  button.type = 'button';
  button.title = i === 4 ? 'Штраф: центральный квадрат' : `Направить мяч в квадрат ${i + 1}`;
  button.setAttribute('aria-label', button.title);
  button.addEventListener('click', () => chooseTarget(i));
  $('aim-chips').append(button);
  aimChips.push(button);
}

function chooseTarget(n) {
  if (n === game.humanSeat && game.humanSeat !== -1) return;
  target = n;
  try { tg?.HapticFeedback?.selectionChanged?.(); } catch (_) {}
  renderUI();
}

field.addEventListener('pointerdown', e => {
  const rect = field.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const zone = zoneAt(x, y);
  if (zone >= 0) chooseTarget(zone);
});

function play(kind) {
  if (paused) return;
  const seat = game.humanSeat;
  if (seat < 0) { feedback('Ты наблюдаешь матч. Встань в очередь, чтобы вернуться.'); return; }
  const result = kind === 'serve' ? game.serve(seat) : game.strike(seat, kind, target);
  if (!result.ok) {
    feedback(result.reason || 'Сейчас нельзя выполнить удар.', true);
    if (result.foul) {
      try { tg?.HapticFeedback?.notificationOccurred?.('error'); } catch (_) {}
    }
  } else {
    feedback(kind === 'serve' ? 'Подача! Сначала центр, затем квадрат напротив.' :
      kind === 'head' ? 'Отлично! Удар головой с лёта.' : 'Удар ногой выполнен.');
    try { tg?.HapticFeedback?.impactOccurred?.('light'); } catch (_) {}
  }
  renderUI();
}

$('kick').addEventListener('click', () => play('foot'));
$('head').addEventListener('click', () => play('head'));
$('serve').addEventListener('click', () => play('serve'));
$('reenter').addEventListener('click', () => {
  if (game.requestReentry()) feedback('Заявка принята. Ты вернёшься, когда освободится место.');
  renderUI();
});
$('restart').addEventListener('click', () => {
  if (!confirm('Начать новую игру? Текущий счёт будет сброшен.')) return;
  game.reset(); target = 3; paused = false; lastNotice = ''; lastRound = -1;
  $('pause').textContent = 'Ⅱ Пауза';
  feedback('Новая игра. Ты подаёшь первым по диагонали!');
  renderUI();
});
$('pause').addEventListener('click', () => {
  paused = !paused;
  $('pause').textContent = paused ? '▶ Продолжить' : 'Ⅱ Пауза';
  feedback(paused ? 'Игра приостановлена.' : 'Матч продолжается.');
  renderUI();
});

$('share').addEventListener('click', async () => {
  const share = { title: 'КВАДРАТ — футбольная игра', text: 'Футбол в квадрате: 4 сектора, 5 голов и удар головой с лёта!', url: location.href.split('?')[0] };
  try {
    if (navigator.share) await navigator.share(share);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(share.url); feedback('Ссылка скопирована.'); }
    else feedback('Скопируй адрес страницы из браузера.');
  } catch (_) { /* User cancelled the share sheet. */ }
});

function feedback(text, error = false) {
  $('feedback').textContent = text;
  $('feedback').style.color = error ? '#ff9ea1' : '#a9c4c7';
}

function phaseLabel() {
  if (paused) return 'ПАУЗА';
  if (game.humanSeat < 0) return 'НАБЛЮДЕНИЕ';
  if (game.phase === 'serve') return game.server === game.humanSeat ? 'ТВОЯ ПОДАЧА' : 'ПОДАЧА СОПЕРНИКА';
  if (game.phase === 'pause') return 'ПРОПУЩЕННЫЙ ГОЛ';
  if (game.isAwaiting(game.humanSeat)) return game.canKick(game.humanSeat) ? 'ОТБЕЙ МЯЧ!' : 'ЖДИ ОТСКОКА';
  return 'МЯЧ В ИГРЕ';
}

function renderUI() {
  $('round').textContent = String(game.round).padStart(2, '0');
  $('total-goals').textContent = String(game.totalGoals);
  $('phase').textContent = phaseLabel();
  const msg = game.message;
  if (msg !== lastNotice) {
    lastNotice = msg;
    $('message').textContent = msg;
    $('message-title').textContent = game.phase === 'serve' ? 'Подача' :
      game.phase === 'pause' ? 'Гол и замена' : game.phase === 'play' ? 'Мяч в игре' : 'Квадрат';
    $('message-icon').textContent = game.phase === 'pause' ? '!' : game.phase === 'serve' ? '↗' : '⚽';
  }
  $('control-tip').textContent = game.humanSeat < 0 ? 'Ты в ожидании' : `Ты — игрок №${game.humanSeat + 1}`;
  const serving = game.phase === 'serve' && game.humanSeat === game.server && !paused;
  const receiving = game.isAwaiting(game.humanSeat) && !paused;
  $('serve').disabled = !serving;
  // Early kick intentionally remains possible during an incoming shot; it is a foul.
  $('kick').disabled = !receiving;
  $('head').disabled = !receiving || !game.canHead(game.humanSeat);
  $('serve').classList.toggle('ready', serving);
  $('kick').classList.toggle('ready', receiving && game.canKick(game.humanSeat));
  $('head').classList.toggle('ready', receiving && game.canHead(game.humanSeat));
  $('reenter').hidden = game.humanSeat !== -1 || game.humanQueued;
  for (const [i, button] of aimChips.entries()) {
    button.disabled = i === game.humanSeat;
    button.classList.toggle('chosen', i === target);
    button.setAttribute('aria-pressed', String(i === target));
  }
  if (lastHumanSeat !== game.humanSeat) {
    lastHumanSeat = game.humanSeat;
    if (game.humanSeat >= 0 && target === game.humanSeat) target = (game.humanSeat + 1) % 4;
  }
  $('scoreboard').replaceChildren(...game.scoreboard.map(player => {
    const el = document.createElement('div');
    el.className = `score-player${player.human ? ' human' : ''}${game.receiver === player.seat ? ' active' : ''}`;
    const jersey = document.createElement('span');
    jersey.className = 'jersey';
    jersey.style.backgroundColor = colors[player.seat];
    jersey.textContent = String(player.seat + 1);
    const meta = document.createElement('div');
    meta.className = 'player-meta';
    const name = document.createElement('strong');
    name.textContent = player.name;
    const info = document.createElement('small');
    info.textContent = player.human ? 'Твой квадрат' : 'Компьютерный соперник';
    meta.append(name, info);
    const tally = document.createElement('div');
    tally.className = 'goals';
    tally.textContent = `${player.conceded}`;
    const suffix = document.createElement('span'); suffix.textContent = '/5'; tally.append(suffix);
    el.append(jersey, meta, tally);
    return el;
  }));
  const queue = game.humanQueued ? 'Ты в очереди. На свободное место сначала выйдет резервный игрок.' :
    game.humanSeat < 0 ? 'Ты выбыл. Нажми «Встать в очередь», чтобы вернуться.' :
    'Пять пропущенных голов — вылет. Следующий участник занимает свободный квадрат.';
  $('queue').textContent = queue;
  $('events').replaceChildren(...game.history.slice(0, 5).map(evt => {
    const item = document.createElement('li');
    item.textContent = evt.text;
    item.className = evt.kind;
    return item;
  }));
}

const D = 760;
const PAD = 22;
const SIDE = D - PAD * 2;
const posX = x => PAD + SIDE * x;
const posY = y => PAD + SIDE * y;
function box(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); }
function text(str, x, y, options = {}) {
  ctx.fillStyle = options.color || '#fff';
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = options.baseline || 'middle';
  ctx.font = `${options.weight || 700} ${options.size || 19}px system-ui,-apple-system,sans-serif`;
  ctx.fillText(str, x, y, options.max || 220);
}
function roundrect(x,y,w,h,r,fill) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill;ctx.fill();
}
function drawField(now) {
  const dpr = Math.min(2.25, devicePixelRatio || 1);
  const display = field.getBoundingClientRect().width;
  const required = Math.max(250, Math.round(display * dpr));
  if (field.width !== required || field.height !== required) field.width = field.height = required;
  ctx.setTransform(field.width / D, 0, 0, field.height / D, 0, 0);
  // Asphalt with calm gradients and subtle grain: no external images needed.
  const gradient = ctx.createLinearGradient(0,0,D,D);
  gradient.addColorStop(0,'#3b4346');gradient.addColorStop(1,'#30393c');
  box(0,0,D,D,gradient);
  const tints=['#31516a','#69513a','#345c4f','#574a69'];
  for(let i=0;i<4;i++) {
    const x = posX(i%2*.5), y = posY(Math.floor(i/2)*.5);
    box(x,y,SIDE/2,SIDE/2,tints[i]);
    box(x,y,SIDE/2,SIDE/2,'#13232970');
  }
  // Static vector asphalt grain, stable between frames.
  ctx.globalAlpha=.13;
  for(let i=0;i<85;i++) {
    const x=PAD+((i*271)%712),y=PAD+((i*107)%712);
    box(x,y,2+(i%3),1.2,'#a4b4b1');
  }
  ctx.globalAlpha=1;
  if (target >= 0 && target <= 3 && game.humanSeat >= 0) {
    const x=posX((target%2)*.5), y=posY(Math.floor(target/2)*.5);
    ctx.strokeStyle='#aaf5d1';ctx.lineWidth=7;ctx.strokeRect(x+6,y+6,SIDE/2-12,SIDE/2-12);
  }
  ctx.strokeStyle='#eaf0ed';ctx.lineWidth=5;ctx.strokeRect(PAD+3,PAD+3,SIDE-6,SIDE-6);
  ctx.beginPath();ctx.moveTo(D/2,PAD);ctx.lineTo(D/2,D-PAD);
  ctx.moveTo(PAD,D/2);ctx.lineTo(D-PAD,D/2);ctx.stroke();
  const c = SIDE*.055;
  roundrect(D/2-c,D/2-c,c*2,c*2,4,'#ba4351');
  ctx.strokeStyle='#fff1e8';ctx.lineWidth=3;ctx.strokeRect(D/2-c,D/2-c,c*2,c*2);
  text('ШТРАФ',D/2,D/2,{size:13,weight:900,align:'center',color:'#fff1eb'});
  for(let i=0;i<4;i++) {
    const p=game.players[i];
    const base=SEATS[i];
    const x=posX(base.x),y=posY(base.y);
    const tint=colors[i];
    ctx.save();ctx.translate(x,y);
    ctx.shadowColor='#0b1115';ctx.shadowBlur=16;ctx.shadowOffsetY=6;
    ctx.beginPath();ctx.ellipse(0,20,37,11,0,0,Math.PI*2);ctx.fillStyle='#1321248a';ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle=tint;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e8f5f0';ctx.lineWidth=p.human?5:2;ctx.stroke();
    // Player silhouette: head and shoulders, clearly different from football ball.
    ctx.fillStyle='#172d30';ctx.beginPath();ctx.arc(0,-7,8,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(0,11,15,11,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.restore();
    const badgeY=y+46;
    roundrect(x-73,badgeY,146,55,9,'#16252bde');
    text(p.name,x,badgeY+17,{align:'center',size:17,weight:p.human?850:700,max:134});
    text(`${p.conceded} / 5 пропущено`,x,badgeY+40,{align:'center',size:13,weight:650,color:p.conceded>=4?'#ffadad':'#d9e2e4'});
    roundrect(x-145,y-143,49,41,9,tint);
    text(String(i+1),x-121,y-122,{align:'center',size:25,color:'#142c31',weight:900});
  }
  // Ball shadow, parabolic elevation, and soccer patches.
  const ball=game.ballPosition();
  const x=posX(ball.x),y=posY(ball.y);
  ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(x,y+16,17+ball.shadow*23,6+ball.shadow*8,0,0,Math.PI*2);ctx.fill();
  const visualY = y-ball.h*SIDE*.69;
  const radius=18+ball.h*20;
  ctx.save();ctx.translate(x,visualY);ctx.rotate((now/230)%6.283);
  ctx.shadowColor='#030c0d';ctx.shadowBlur=15;ctx.shadowOffsetY=5;
  ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fillStyle='#f4f5ec';ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.fillStyle='#18242d';
  ctx.beginPath();for(let k=0;k<5;k++){const a=-Math.PI/2+k*Math.PI*2/5;ctx.lineTo(Math.cos(a)*radius*.55,Math.sin(a)*radius*.55)}ctx.closePath();ctx.fill();
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*radius*.77,Math.sin(a)*radius*.77,radius*.13,0,Math.PI*2);ctx.fill()}
  ctx.restore();
  // Input hint in a narrow band on the bottom edge.
  if(game.phase==='serve') {
    roundrect(D/2-177,D-54,354,35,11,'#10282be8');
    text(`ПОДАЧА ${game.server+1} → ${([3,2,1,0])[game.server]+1}  ·  ЧЕРЕЗ ЦЕНТР`,D/2,D-36,{align:'center',size:14,weight:850,color:'#b2f3d1'});
  }
  if(paused){box(0,0,D,D,'#081115aa');roundrect(D/2-126,D/2-41,252,82,12,'#19343a');text('ПАУЗА',D/2,D/2,{align:'center',size:31});}
}

function loop(now) {
  const delta = lastFrame ? Math.min(64,now-lastFrame) : 16;
  lastFrame = now;
  if (!paused && document.visibilityState === 'visible') game.tick(delta);
  drawField(now);
  if(now-lastUI > 145) { lastUI=now; renderUI(); }
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => { lastFrame = 0; });
if('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
renderUI();
requestAnimationFrame(loop);