/**
 * КВАДРАТ — offline four-square football referee and arcade ball simulation.
 * No networking or Telegram identity is used here. Separate backend is required
 * for authenticated remote multiplayer (see README).
 */
export const SEATS = Object.freeze([
  { x: .25, y: .25, color: '#62b2e6' },
  { x: .75, y: .25, color: '#f7b35c' },
  { x: .25, y: .75, color: '#74d3ad' },
  { x: .75, y: .75, color: '#c7a0ff' },
]);
export const CENTER = Object.freeze({ x: .5, y: .5 });
const DIAGONAL = [3, 2, 1, 0];
const bound = (v, a, b) => Math.max(a, Math.min(b, v));
const botName = n => `Бот ${n}`;
const point = (p) => ({ x: p.x, y: p.y });

export function zoneAt(x, y, centerHalf = .055) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return -1;
  if (Math.abs(x - .5) <= centerHalf && Math.abs(y - .5) <= centerHalf) return 4;
  return (x < .5 ? 0 : 1) + (y < .5 ? 0 : 2);
}

export class SquareGame {
  constructor({ random = Math.random, speed = 1, humanName = 'Ты' } = {}) {
    this.random = random;
    this.speed = bound(Number(speed) || 1, .65, 1.8);
    this.humanName = String(humanName).slice(0, 24) || 'Ты';
    this.reset();
  }

  reset() {
    this.serial = 4;
    this.players = SEATS.map((_, seat) => ({
      id: seat === 0 ? 'human' : `bot-${seat + 1}`,
      name: seat === 0 ? this.humanName : botName(seat + 1),
      human: seat === 0,
      conceded: 0,
    }));
    this.queue = [];
    this.humanQueued = false;
    this.phase = 'serve';
    this.server = 0;
    this.shot = null;
    this.clock = 0;
    this.nextServeDelay = 900;
    this.round = 1;
    this.totalGoals = 0;
    this.history = [];
    this.notice('Матч начался. Игрок 1 подаёт по диагонали.');
  }

  get humanSeat() { return this.players.findIndex(p => p.human); }
  get receiver() { return this.shot ? this.shot.target : DIAGONAL[this.server]; }
  get scoreboard() { return this.players.map((p, seat) => ({ ...p, seat })); }

  notice(text, kind = 'info') {
    this.message = text;
    this.history.unshift({ text, kind, round: this.round });
    this.history.length = Math.min(this.history.length, 12);
  }

  seatCenter(seat, spread = 0) {
    const c = SEATS[seat];
    return { x: bound(c.x + spread * (this.random() - .5), seat % 2 === 0 ? .07 : .57, seat % 2 === 0 ? .43 : .93),
      y: bound(c.y + spread * (this.random() - .5), seat < 2 ? .07 : .57, seat < 2 ? .43 : .93) };
  }

  nextServer(preferred) {
    // All seats have a current player; replacement occurs immediately at five.
    return (preferred + 4) % 4;
  }

  beginServe(seat = this.server) {
    this.phase = 'serve';
    this.server = this.nextServer(seat);
    this.shot = null;
    this.clock = 0;
    this.nextServeDelay = this.players[this.server].human ? 0 : 650;
    const diagonal = DIAGONAL[this.server];
    this.notice(`Подача: ${this.players[this.server].name} → ${this.players[diagonal].name} по диагонали. Сначала центр, затем квадрат.`, 'serve');
  }

  createShot({ from, shooter, target, kind }) {
    const to = target === 4 ? point(CENTER) : this.seatCenter(target, .19);
    const steps = kind === 'serve'
      ? [{ to: point(CENTER), duration: 610, type: 'center' }, { to, duration: 690, type: 'square' },
          { to: this.seatCenter(target, .10), duration: 880, type: 'miss' }]
      : [{ to, duration: 810, type: target === 4 ? 'fault' : 'square' },
          ...(target === 4 ? [] : [{ to: this.seatCenter(target, .10), duration: 940, type: 'miss' }])];
    this.shot = {
      kind, shooter, target,
      from: point(from), segment: 0, elapsed: 0, steps,
      bouncesInSquare: 0,
      botPlan: { choice: this.random(), delay: .21 + this.random() * .34 },
      botHasActed: false,
    };
    this.phase = 'play';
  }

  ballPosition() {
    if (!this.shot) return { ...SEATS[this.server], h: 0, shadow: 0 };
    const sh = this.shot;
    const segment = sh.steps[sh.segment];
    if (!segment) return { ...sh.from, h: 0, shadow: 0 };
    const t = bound(sh.elapsed / (segment.duration / this.speed), 0, 1);
    const h = (sh.kind === 'head' ? .23 : .15) * Math.sin(Math.PI * t);
    return { x: sh.from.x + (segment.to.x - sh.from.x) * t,
      y: sh.from.y + (segment.to.y - sh.from.y) * t,
      h, shadow: bound(h * 2.8, 0, .55) };
  }

  isAwaiting(seat) {
    return this.phase === 'play' && this.shot && this.shot.target === seat;
  }

  canKick(seat) {
    if (!this.isAwaiting(seat)) return false;
    const sh = this.shot;
    return sh.bouncesInSquare >= 1 && sh.segment === sh.steps.length - 1;
  }

  canHead(seat) {
    if (!this.isAwaiting(seat)) return false;
    const sh = this.shot;
    const pct = sh.elapsed / (sh.steps[sh.segment].duration / this.speed);
    // The ball is near the receiving quadrant, or airborne after its first bounce.
    if (sh.kind === 'serve' && sh.segment === 0) return false;
    if (sh.segment === 0 || (sh.kind === 'serve' && sh.segment === 1)) return pct >= .50 && pct < .99;
    return pct >= .08 && pct < .98;
  }

  serve(seat) {
    if (this.phase !== 'serve' || this.server !== seat) return { ok: false, reason: 'Не твоя подача.' };
    const opposite = DIAGONAL[seat];
    this.createShot({ from: SEATS[seat], shooter: seat, target: opposite, kind: 'serve' });
    this.notice(`Мяч подан! Первый отскок — центр, второй — квадрат игрока ${opposite + 1}.`, 'serve');
    return { ok: true };
  }

  strike(seat, kind, target) {
    if (kind === 'serve') return this.serve(seat);
    if (kind !== 'foot' && kind !== 'head') return { ok: false, reason: 'Неизвестный удар.' };
    if (!this.isAwaiting(seat)) return { ok: false, reason: 'Сейчас мяч не у тебя.' };
    if (kind === 'foot' && !this.canKick(seat)) {
      this.penalty(seat, 1, 'Удар ногой до отскока в своём квадрате!');
      return { ok: false, foul: true, reason: 'Ранний удар ногой — пропущенный гол.' };
    }
    if (kind === 'head' && !this.canHead(seat)) return { ok: false, reason: 'Сейчас мяч не на высоте для удара головой.' };
    if (!Number.isInteger(target) || target < 0 || target > 4 || target === seat) {
      return { ok: false, reason: 'Выбери квадрат другого участника или центральный квадрат.' };
    }
    const origin = this.ballPosition();
    this.createShot({ from: origin, shooter: seat, target, kind });
    this.notice(`${this.players[seat].name} отбил ${kind === 'head' ? 'головой' : 'ногой'} в квадрат ${target === 4 ? 'центра' : target + 1}.`, 'hit');
    return { ok: true };
  }

  penalty(seat, amount, reason) {
    if (this.phase === 'pause') return;
    const p = this.players[seat];
    p.conceded += amount;
    this.totalGoals += amount;
    this.phase = 'pause';
    this.shot = null;
    this.nextServeDelay = 1180;
    this.clock = 0;
    this.round += 1;
    if (p.conceded >= 5) {
      const eliminated = p.name;
      const replacement = this.queue.shift() ?? this.newBot();
      if (replacement.human) this.humanQueued = false;
      this.players[seat] = { ...replacement, conceded: 0 };
      this.notice(`${eliminated} получил ${amount} гол(ов) и выбыл! В квадрат ${seat + 1} входит ${replacement.name}.`, 'out');
      // The queue for an offline match consists of bots and optionally the local user.
    } else {
      this.notice(`${p.name}: ${reason} +${amount} пропущено (${p.conceded}/5).`, 'goal');
    }
    this.server = seat;
  }

  newBot() {
    this.serial += 1;
    return { id: `bot-${this.serial}`, name: botName(this.serial), human: false, conceded: 0 };
  }

  requestReentry() {
    if (this.humanSeat !== -1) return false;
    if (this.humanQueued) return false;
    // Player can wait behind a bot or two; at most 2 are queued by design.
    if (this.queue.length === 0) this.queue.push(this.newBot());
    this.queue.push({ id: 'human', name: this.humanName, human: true, conceded: 0 });
    this.humanQueued = true;
    this.notice('Ты в очереди. Когда освободится место после вылета, вернёшься на поле.', 'info');
    return true;
  }

  tick(ms) {
    const delta = bound(ms, 0, 80);
    if (this.phase === 'pause') {
      this.clock += delta;
      if (this.clock >= this.nextServeDelay) this.beginServe(this.server);
      return;
    }
    if (this.phase === 'serve') {
      this.clock += delta;
      if (this.clock >= this.nextServeDelay && !this.players[this.server].human) this.serve(this.server);
      return;
    }
    if (this.phase !== 'play' || !this.shot) return;
    const sh = this.shot;
    sh.elapsed += delta;
    const current = sh.steps[sh.segment];
    // Bot reacts at legal time or intentionally misses, simulating a challenging match.
    if (!this.players[sh.target]?.human && sh.target !== 4 && !sh.botHasActed) {
      if (sh.botPlan.choice < .16 && this.canHead(sh.target)) {
        sh.botHasActed = true;
        this.strike(sh.target, 'head', this.chooseBotTarget(sh.target));
        return;
      }
      if (sh.botPlan.choice >= .16 && sh.botPlan.choice < .82 && this.canKick(sh.target)) {
        if (sh.elapsed >= current.duration / this.speed * sh.botPlan.delay) {
          sh.botHasActed = true;
          this.strike(sh.target, 'foot', this.chooseBotTarget(sh.target));
          return;
        }
      }
    }
    if (sh.elapsed < current.duration / this.speed) return;
    sh.from = point(current.to);
    sh.segment += 1;
    sh.elapsed = 0;
    if (current.type === 'center') {
      this.notice('Подача: первый отскок в центре! Теперь мяч летит по диагонали.', 'bounce');
    } else if (current.type === 'fault') {
      this.penalty(sh.shooter, 1, 'Мяч попал в маленький центральный квадрат.');
      return;
    } else if (current.type === 'square') {
      sh.bouncesInSquare += 1;
      if (sh.kind === 'serve') this.notice('Второй отскок подачи в квадрате! Теперь можно отбивать ногой.', 'bounce');
      else this.notice(`Первый отскок у игрока ${sh.target + 1}. Второй — гол.`, 'bounce');
    } else if (current.type === 'miss') {
      this.penalty(sh.target, sh.kind === 'head' ? 5 : 1,
        sh.kind === 'serve' ? 'Не отбил подачу после двух отскоков.' : 'Два отскока в своём квадрате.');
      return;
    }
  }

  chooseBotTarget(seat) {
    if (this.random() < .035) return 4; // occasional centre mistake
    const options = [0, 1, 2, 3].filter(n => n !== seat);
    return options[Math.floor(this.random() * options.length)];
  }
}