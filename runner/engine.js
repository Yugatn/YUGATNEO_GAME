/* YUGATNEO GAME · Matrix Runner
 * Original obstacle-runner mechanics. No third-party engine or asset needed.
 * Pure game logic, independent of DOM/Telegram, testable in Node.js.
 */
(function (root) {
  'use strict';
  const CONFIG = Object.freeze({
    WIDTH: 960, HEIGHT: 480, FLOOR: 394,
    PLAYER_X: 150, PLAYER_W: 24, PLAYER_H: 54,
    GRAVITY: 1750, JUMP: -670, BOOST_JUMP: -940,
    BOOST_TIME: 8, BASE_SPEED: 330, MAX_SPEED: 580
  });

  function newGame() {
    return {
      phase: 'ready',
      player: { x: CONFIG.PLAYER_X, y: CONFIG.FLOOR - CONFIG.PLAYER_H, vy: 0, extraJumps: 0 },
      time: 0, score: 0, distance: 0, speed: CONFIG.BASE_SPEED,
      obstacleTimer: 1.45, portalTimer: 7.0,
      obstacles: [], portals: [], boost: 0, flash: 0, lastEvent: null
    };
  }

  function grounded(state) {
    return state.player.y >= CONFIG.FLOOR - CONFIG.PLAYER_H - 0.01;
  }

  function start(state) {
    if (state.phase === 'ready' || state.phase === 'paused') state.phase = 'running';
    return state.phase === 'running';
  }

  function pause(state) {
    if (state.phase === 'running') { state.phase = 'paused'; return true; }
    return false;
  }

  function jump(state) {
    if (state.phase === 'ready') start(state);
    if (state.phase !== 'running') return false;
    if (grounded(state)) {
      state.player.vy = state.boost > 0 ? CONFIG.BOOST_JUMP : CONFIG.JUMP;
      state.player.y = Math.min(state.player.y, CONFIG.FLOOR - CONFIG.PLAYER_H - 0.1);
      state.player.extraJumps = 0;
      return true;
    }
    if (state.boost > 0 && state.player.extraJumps < 1) {
      state.player.vy = CONFIG.BOOST_JUMP * 0.78;
      state.player.extraJumps++;
      return true;
    }
    return false;
  }

  function overlap(a, b, margin) {
    const m = margin || 0;
    return a.x + a.w - m > b.x + m &&
      a.x + m < b.x + b.w - m &&
      a.y + a.h - m > b.y + m &&
      a.y + m < b.y + b.h - m;
  }

  function spawnObstacle(state, random) {
    const r = Math.max(0, Math.min(0.999999, random()));
    const tall = r > 0.48;
    const h = tall ? 48 + 12 * r : 31 + 16 * r;
    const w = tall ? 31 : 46;
    state.obstacles.push({
      x: CONFIG.WIDTH + 45, w, h,
      type: tall ? 'pillar' : 'spikes'
    });
  }

  function spawnPortal(state) {
    state.portals.push({
      x: CONFIG.WIDTH + 55,
      y: CONFIG.FLOOR - 113,
      rx: 31, ry: 49
    });
  }

  function step(state, dt, random) {
    if (state.phase !== 'running') return [];
    if (!Number.isFinite(dt) || dt <= 0) return [];
    const events = [];
    const rng = typeof random === 'function' ? random : Math.random;
    // Clamp large frame gaps after Telegram's browser is backgrounded.
    dt = Math.min(dt, 1 / 30);
    state.time += dt;
    const previousBoost = state.boost;
    state.boost = Math.max(0, state.boost - dt);
    state.flash = Math.max(0, state.flash - dt);
    if (previousBoost > 0 && state.boost === 0) events.push('boost-ended');
    state.speed = Math.min(CONFIG.MAX_SPEED, CONFIG.BASE_SPEED + state.time * 5.1);
    state.distance += state.speed * dt;
    state.score = Math.max(state.score, Math.floor(state.distance / 20));

    const p = state.player;
    p.vy += CONFIG.GRAVITY * dt;
    p.y += p.vy * dt;
    const groundY = CONFIG.FLOOR - CONFIG.PLAYER_H;
    if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.extraJumps = 0; }

    state.obstacleTimer -= dt;
    state.portalTimer -= dt;
    if (state.obstacleTimer <= 0) {
      const hasNearbyPortal = state.portals.some(o => o.x > CONFIG.WIDTH - 185);
      if (hasNearbyPortal) state.obstacleTimer = 0.5;
      else {
        spawnObstacle(state, rng);
        state.obstacleTimer = Math.max(1.1, 1.45 + 0.6 * rng() - state.time * 0.005);
      }
    }
    if (state.portalTimer <= 0) {
      // Keep portals out of a fresh obstacle's immediate path.
      const obstacleNearSpawn = state.obstacles.some(o => o.x > CONFIG.WIDTH - 200);
      if (obstacleNearSpawn) state.portalTimer = 0.45;
      else {
        spawnPortal(state);
        state.portalTimer = 10 + 4 * rng();
        events.push('portal-appeared');
      }
    }
    for (const obstacle of state.obstacles) obstacle.x -= state.speed * dt;
    for (const portal of state.portals) portal.x -= state.speed * dt;
    state.obstacles = state.obstacles.filter(o => o.x + o.w >= -20);
    state.portals = state.portals.filter(o => o.x + o.rx >= -25);

    // A portal must be entered by an airborne runner. Running on the ground
    // through its lower edge does not count as collecting it.
    const body = { x: p.x - CONFIG.PLAYER_W / 2, y: p.y,
      w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H };
    state.portals = state.portals.filter(portal => {
      const dx = (p.x - portal.x) / (portal.rx + 10);
      const dy = (p.y + CONFIG.PLAYER_H * 0.5 - portal.y) / (portal.ry + 2);
      if (!grounded(state) && dx * dx + dy * dy < 1) {
        state.boost = CONFIG.BOOST_TIME;
        state.flash = 0.6;
        state.score += 175;
        state.lastEvent = 'portal';
        events.push('portal');
        return false;
      }
      return true;
    });

    for (const obstacle of state.obstacles) {
      const box = { x: obstacle.x, y: CONFIG.FLOOR - obstacle.h,
        w: obstacle.w, h: obstacle.h };
      if (overlap(body, box, 5)) {
        state.phase = 'gameover';
        state.lastEvent = 'hit';
        events.push('hit');
        break;
      }
    }
    return events;
  }

  const api = Object.freeze({ CONFIG, newGame, grounded, start, pause, jump, step, overlap,
    spawnObstacle, spawnPortal });
  root.NeoRunnerCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
