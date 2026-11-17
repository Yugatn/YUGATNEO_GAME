/* YUGATNEO / SPIRAL RUN — original deterministic arcade logic.
 * Does not access the DOM, Telegram identity, a network or an external engine.
 * CommonJS in Node, browser global in Telegram Mini App.
 */
(function (root) {
  'use strict';

  const C = Object.freeze({
    LENGTH: 120, LANE_WIDTH: 4.5, BASE_SPEED: 15, MAX_SPEED: 25,
    JUMP_VELOCITY: 11.5, GRAVITY: 27, TURN_WINDOW: 20, COLLISION: 1.5,
    PORTAL_HEIGHT: 0.8, MAX_CHARGES: 3
  });
  const DELTA = Object.freeze([[0,1],[1,0],[0,-1],[-1,0]]);
  const TURNS = ['right', null, 'left', 'right', null, 'left', 'left', 'right', null, 'right'];

  function random(state) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }
  function laneIndex(r) { return Math.floor(r * 3) - 1; }
  function generate(state) {
    const n = state.segments.length;
    const prev = n ? state.segments[n - 1] : null;
    const nextDir = !prev ? 0 : ((prev.heading +
      (prev.turnAfter === 'right' ? 1 : prev.turnAfter === 'left' ? -1 : 0)) + 4) % 4;
    const pDir = prev ? DELTA[prev.heading] : [0, 0];
    const segment = {
      index: n, start: n * C.LENGTH, length: C.LENGTH,
      x: prev ? prev.x + pDir[0] * C.LENGTH : 0,
      z: prev ? prev.z + pDir[1] * C.LENGTH : 0,
      heading: nextDir, height: prev ? prev.height + prev.rise : 0,
      rise: n > 0 && n % 3 === 2 ? 2.8 : 0,
      turnAfter: TURNS[n % TURNS.length], features: []
    };
    function add(t, lane, type) {
      segment.features.push({
        id: n + ':' + t + ':' + type, distance: segment.start + t,
        t, lane, type, counted: false, consumed: false
      });
    }
    if (n === 0) {
      add(34, 0, 'block');
      add(61, -1, 'block');
      add(87, 1, 'block');
      add(100, 0, 'portal');
    } else {
      add(31, laneIndex(random(state)), 'block');
      add(58, laneIndex(random(state)), n % 2 ? 'bar' : 'block');
      if (segment.rise) add(84, null, 'step');
      else add(89, laneIndex(random(state)), 'bar');
      if (n % 3 === 0) add(107, laneIndex(random(state)), 'portal');
    }
    state.segments.push(segment);
    return segment;
  }
  function create(seed) {
    const state = {
      phase: 'ready', seed: (Number.isInteger(seed) ? seed : 2026) >>> 0,
      segments: [], segmentIndex: 0, distance: 0, time: 0, speed: C.BASE_SPEED,
      lane: 0, visualLane: 0, turnArmed: null, jumpY: 0, jumpV: 0,
      matrix: false, matrixTime: 0, charges: 0, shotCooldown: 0,
      nextAgentAt: Infinity, agents: [], nextAgentId: 0,
      passed: 0, dodged: 0, defeated: 0, portals: 0, levels: 0, turns: 0,
      score: 0, bonus: 0, view: 'top', reason: '', lastEvent: null
    };
    for (let i = 0; i < 16; i++) generate(state);
    return state;
  }
  function start(s) {
    if (s.phase === 'ready' || s.phase === 'paused') s.phase = 'running';
    return s.phase === 'running';
  }
  function pause(s) {
    if (s.phase !== 'running') return false;
    s.phase = 'paused';
    return true;
  }
  function jump(s) {
    if (s.phase !== 'running') return false;
    if (s.jumpY > 0.001) return false;
    s.jumpV = C.JUMP_VELOCITY;
    s.jumpY = 0.03;
    return true;
  }
  function steer(s, direction) {
    if (s.phase !== 'running' || (direction !== 'left' && direction !== 'right')) return false;
    const seg = s.segments[s.segmentIndex];
    const remaining = seg.start + seg.length - s.distance;
    if (seg.turnAfter && remaining <= C.TURN_WINDOW + 1 && remaining > 0) {
      if (direction === seg.turnAfter) {
        s.turnArmed = direction;
        return 'corner';
      }
      return false;
    }
    const next = Math.max(-1, Math.min(1, s.lane + (direction === 'left' ? -1 : 1)));
    if (next === s.lane) return false;
    s.lane = next;
    return 'lane';
  }
  function setView(s, view) {
    if (view === 'top' || view === 'rear') s.view = view;
    return s.view;
  }
  function activeSegment(s, distance) {
    const n = Math.max(0, Math.floor(Math.max(0, distance) / C.LENGTH));
    while (s.segments.length <= n + 7) generate(s);
    return s.segments[n];
  }
  function terrainHeight(seg, t) {
    const f = Math.max(0, Math.min(1, (t - 78) / 20));
    return seg.height + seg.rise * (f * f * (3 - 2 * f));
  }
  function positionAt(s, distance, lane) {
    const seg = activeSegment(s, distance);
    const t = Math.max(0, Math.min(seg.length, distance - seg.start));
    const v = DELTA[seg.heading];
    const side = lane == null ? 0 : lane * C.LANE_WIDTH;
    return {
      x: seg.x + v[0] * t + v[1] * side,
      z: seg.z + v[1] * t - v[0] * side,
      y: terrainHeight(seg, t), heading: seg.heading
    };
  }
  function computeScore(s) {
    s.score = Math.floor(s.distance * 1.7) + s.passed * 42 +
      s.dodged * 26 + s.defeated * 90 + s.portals * 210 + s.levels * 130 + s.bonus;
  }
  function die(s, reason, events) {
    s.phase = 'gameover'; s.reason = reason;
    events.push('hit');
  }
  function fire(s) {
    if (s.phase !== 'running' || !s.matrix || s.shotCooldown > 0 || s.charges < 1) return false;
    s.charges -= 1;
    s.shotCooldown = 0.3;
    let nearest = null;
    let gap = 100;
    for (const a of s.agents) {
      const ahead = a.distance - s.distance;
      if (a.alive && a.lane === s.lane && ahead >= -2 && ahead <= 42 && ahead < gap) {
        nearest = a; gap = ahead;
      }
    }
    if (nearest) {
      nearest.alive = false;
      s.defeated++;
    }
    computeScore(s);
    return nearest ? 'hit' : 'empty';
  }
  function step(s, rawDt) {
    if (s.phase !== 'running' || !Number.isFinite(rawDt) || rawDt <= 0) return [];
    const dt = Math.min(rawDt, 1 / 30);
    const events = [];
    s.time += dt;
    s.speed = Math.min(C.MAX_SPEED, C.BASE_SPEED + s.time * 0.14);
    s.visualLane += (s.lane - s.visualLane) * Math.min(1, dt * 14);
    s.shotCooldown = Math.max(0, s.shotCooldown - dt);
    if (s.matrix) {
      s.matrixTime += dt;
      s.charges = Math.min(C.MAX_CHARGES, s.charges + dt / 3.5);
    }
    if (s.jumpY > 0 || s.jumpV > 0) {
      s.jumpV -= C.GRAVITY * dt;
      s.jumpY += s.jumpV * dt;
      if (s.jumpY <= 0) { s.jumpY = 0; s.jumpV = 0; }
    }
    const previous = s.distance;
    s.distance += s.speed * dt;
    let oldSeg = s.segments[s.segmentIndex];
    // A genuine 90-degree bend must be anticipated by tapping the matching edge.
    if (s.distance >= oldSeg.start + C.LENGTH) {
      if (oldSeg.turnAfter && s.turnArmed !== oldSeg.turnAfter) {
        s.distance = oldSeg.start + C.LENGTH - 0.01;
        die(s, 'Не выполнен поворот ' + (oldSeg.turnAfter === 'left' ? 'налево' : 'направо'), events);
        computeScore(s);
        return events;
      }
      s.segmentIndex++;
      s.turnArmed = null;
      s.turns++;
      if (oldSeg.rise) { s.levels++; events.push('level'); }
      events.push('turn');
      oldSeg = activeSegment(s, s.distance);
    }
    const current = s.segments[s.segmentIndex];
    for (const seg of [s.segments[Math.max(0, s.segmentIndex - 1)], current]) {
      for (const f of seg.features) {
        if (f.consumed || f.distance > s.distance || f.distance < previous - 0.001) continue;
        f.consumed = true;
        if (f.type === 'portal') {
          if (s.lane === f.lane && s.jumpY >= C.PORTAL_HEIGHT) {
            s.matrix = true;
            s.matrixTime = 0;
            s.charges = C.MAX_CHARGES;
            s.portals++;
            s.nextAgentAt = s.distance + 42;
            events.push('portal');
          }
          continue;
        }
        const collidesLane = f.lane === null || f.lane === s.lane;
        const protectedByJump = s.jumpY >= (f.type === 'step' ? 1.05 : 0.8);
        if (collidesLane && !protectedByJump) {
          die(s, f.type === 'step' ? 'Не удалось взобраться на платформу' : 'Столкновение', events);
          break;
        }
        s.passed++;
        events.push('avoided');
      }
      if (s.phase === 'gameover') break;
    }
    if (s.phase === 'running' && s.matrix) {
      if (s.distance >= s.nextAgentAt) {
        s.agents.push({
          id: ++s.nextAgentId, lane: laneIndex(random(s)),
          distance: s.distance + 34, alive: true, counted: false
        });
        s.nextAgentAt = s.distance + 58 + random(s) * 31;
        events.push('agent');
      }
      for (const a of s.agents) {
        if (!a.alive) continue;
        a.distance -= dt * 5.5;
        if (a.distance - s.distance <= 1.3) {
          if (a.lane === s.lane && s.jumpY < 1.1) {
            die(s, 'Агент догнал тебя', events);
            break;
          }
          a.alive = false;
          s.dodged++;
          events.push('dodge');
        }
      }
      s.agents = s.agents.filter(a => a.alive && a.distance > s.distance - 9);
    }
    if (s.segmentIndex + 9 >= s.segments.length) {
      for (let i = 0; i < 8; i++) generate(s);
    }
    computeScore(s);
    return events;
  }
  const api = { CONFIG: C, create, start, pause, jump, steer, fire, step,
    setView, positionAt, activeSegment, terrainHeight };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpiralRunnerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
