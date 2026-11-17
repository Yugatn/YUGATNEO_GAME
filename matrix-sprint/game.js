/* YUGATNEO SPIRAL RUN · touch-first Telegram Mini App renderer.
   Pure Canvas 2D projects a 3D-style track, no external rendering dependency.
*/
(function () {
  'use strict';
  const Core = window.SpiralRunnerCore;
  if (!Core) throw new Error('Missing SpiralRunnerCore');
  const el = (name) => document.getElementById(name);
  const canvas = el('scene');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const telegram = window.Telegram && window.Telegram.WebApp;
  if (telegram) {
    try {
      telegram.ready(); telegram.expand();
      if (typeof telegram.disableVerticalSwipes === 'function') telegram.disableVerticalSwipes();
      if (typeof telegram.setHeaderColor === 'function') telegram.setHeaderColor('#050b14');
      if (typeof telegram.setBackgroundColor === 'function') telegram.setBackgroundColor('#050b14');
    } catch (_) { /* Browser fallback must remain playable. */ }
  }
  let state = Core.create();
  let W = 360, H = 700, ratio = 1;
  let cameraYaw = 0;
  let turnFlash = 0;
  let last = 0, uiAt = 0, hintUntil = 0, hintText = '';
  let best = readBest();
  let reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glyphs = '01アイウエオカキクケコサシスセソ';
  const rain = Array.from({length: 60}, (_, i) => ({
    x: (i * 0.017 + (i * 37 % 17) / 1700), offset: (i * 71) % 620,
    speed: 75 + (i * 29) % 130, length: 3 + (i % 7)
  }));
  function haptic(kind) {
    try {
      const h = telegram && telegram.HapticFeedback;
      if (h && typeof h.impactOccurred === 'function') h.impactOccurred(kind || 'light');
    } catch (_) {}
  }
  function readBest() {
    try {
      const n = Number(localStorage.getItem('yugatneo.spiral-run.best.v1'));
      return Number.isSafeInteger(n) && n >= 0 && n < 1e9 ? n : 0;
    } catch (_) { return 0; }
  }
  function saveBest() {
    if (state.score <= best) return;
    best = state.score;
    try { localStorage.setItem('yugatneo.spiral-run.best.v1', String(best)); }
    catch (_) {}
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(280, r.width || window.innerWidth);
    H = Math.max(420, r.height || window.innerHeight);
    ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, {passive:true});
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize, {passive:true});
  function hint(text, duration) {
    hintText = text;
    hintUntil = performance.now() + (duration || 1400);
  }
  function showOverlay(name) {
    for (const id of ['intro','paused','end']) el(id).hidden = id !== name;
  }
  function reset() {
    state = Core.create((Date.now() ^ Math.floor(Math.random()*1e9))>>>0);
    cameraYaw = 0; turnFlash = 0; last = performance.now();
    Core.start(state);
    showOverlay(null);
    hint('Края: полоса • Центр: прыжок', 2100);
    canvas.focus({preventScroll:true});
    updateHUD();
    haptic('light');
  }
  function toIntro() {
    state = Core.create(); cameraYaw = 0;
    showOverlay('intro');
    el('blast').classList.remove('visible');
    el('mode').style.display = 'none';
  }
  function finish() {
    saveBest();
    el('reason').textContent = state.reason || 'Путь завершился. Попробуй ещё раз.';
    el('scoreline').textContent = state.score + ' очков · ' +
      Math.floor(state.distance) + ' м · ' + state.passed + ' препятствий · ' +
      state.defeated + ' агентов';
    showOverlay('end');
    haptic('heavy');
  }
  function pause() {
    if (Core.pause(state)) {
      showOverlay('paused');
      updateHUD();
    }
  }
  function resume() {
    if (Core.start(state)) {
      showOverlay(null); last = performance.now();
    }
  }
  function action(type) {
    if (state.phase !== 'running') return;
    if (type === 'jump') {
      if (Core.jump(state)) { hint('ПРЫЖОК', 350); haptic('light'); }
    } else if (type === 'left' || type === 'right') {
      const result = Core.steer(state,type);
      if (result === 'corner') { hint('ПОВОРОТ ПОДТВЕРЖДЁН',800); haptic('medium'); }
      else if (result) haptic('light');
    } else if (type === 'blast') {
      const result = Core.fire(state);
      if (result === 'hit') { hint('АГЕНТ НЕЙТРАЛИЗОВАН +90',850); haptic('medium'); }
      else if (result) { hint('ЭНЕРГЕТИЧЕСКИЙ ИМПУЛЬС',480); haptic('light'); }
    }
    updateHUD();
  }
  function bind(id, fn) {
    const button=el(id);
    button.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
    button.addEventListener('click',(e) => { if (e.detail === 0) fn(); });
  }
  bind('start',reset);
  bind('restart',reset);
  bind('backIntro',toIntro);
  bind('pauseIntro',toIntro);
  bind('resume',resume);
  bind('left',()=>action('left'));
  bind('right',()=>action('right'));
  bind('jump',()=>action('jump'));
  bind('blast',()=>action('blast'));
  bind('pause',()=> state.phase === 'paused' ? resume() : pause());
  bind('view',()=>{
    Core.setView(state,state.view === 'top' ? 'rear' : 'top');
    updateHUD(); haptic('light');
    hint(state.view === 'top' ? 'КАМЕРА: ВИД СВЕРХУ' : 'КАМЕРА: ВИД СЗАДИ',900);
  });
  canvas.addEventListener('pointerdown',(e)=>{
    e.preventDefault();
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width;
    action(x<0.30?'left':x>0.70?'right':'jump');
  });
  window.addEventListener('keydown',(e)=>{
    if (['Space','ArrowUp','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyF',
      'KeyV','KeyP','Escape'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') action('jump');
    else if (e.code==='ArrowLeft'||e.code==='KeyA') action('left');
    else if (e.code==='ArrowRight'||e.code==='KeyD') action('right');
    else if (e.code==='KeyF') action('blast');
    else if (e.code==='KeyV') el('view').click();
    else if (e.code==='Escape'||e.code==='KeyP') state.phase==='paused'?resume():pause();
    else if (e.code==='Enter'&&state.phase==='ready') reset();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('blur',()=>{if(state.phase==='running')pause();});
  function updateHUD() {
    const pad = (n) => String(Math.floor(n)).padStart(5,'0');
    el('score').textContent = pad(state.score);
    el('distance').textContent = Math.floor(state.distance) + ' м';
    el('best').textContent = pad(best);
    el('view').textContent = state.view==='top'?'ВИД: СВЕРХУ':'ВИД: СЗАДИ';
    el('ammo').textContent = Math.floor(state.charges);
    el('charges').textContent = Math.floor(state.charges);
    el('mode').style.display = state.matrix && state.phase==='running'?'block':'none';
    el('blast').classList.toggle('visible',state.matrix && state.phase==='running');
    el('blast').disabled = state.charges < 1 || state.shotCooldown > 0;
    if (state.phase==='running') {
      const seg=state.segments[state.segmentIndex];
      const remaining=seg.start+seg.length-state.distance;
      if(seg.turnAfter && remaining<37 && remaining>0) {
        const label=seg.turnAfter==='left'?'↶ ПОВОРОТ НАЛЕВО':'ПОВОРОТ НАПРАВО ↷';
        el('hint').textContent=state.turnArmed?'✓ '+label:label;
        el('hint').classList.add('show');
        return;
      }
    }
    const visible=performance.now()<hintUntil && state.phase==='running';
    el('hint').textContent=visible?hintText:'';
    el('hint').classList.toggle('show',visible);
  }
  function eventsHandler(events) {
    for(const event of events) {
      if(event==='portal') {hint('ПРОБУЖДЕНИЕ · МАТРИЧНЫЙ КОД · ИМПУЛЬС ОТКРЫТ',2300);haptic('heavy');}
      if(event==='level') {hint('НОВЫЙ УРОВЕНЬ СПИРАЛИ +130',1600);haptic('medium');}
      if(event==='turn') {turnFlash=1;haptic('medium');}
      if(event==='agent') hint('ВНИМАНИЕ: АГЕНТЫ ВПЕРЕДИ',1150);
      if(event==='dodge') hint('УКЛОНИЛСЯ ОТ АГЕНТА +26',850);
      if(event==='hit') {finish();break;}
    }
  }
  function project(point,camera) {
    const dx=point.x-camera.position.x, dz=point.z-camera.position.z;
    const cos=Math.cos(camera.yaw),sin=Math.sin(camera.yaw);
    const across=dx*cos-dz*sin;
    const depth=dx*sin+dz*cos;
    if(state.view==='top') {
      const scale=Math.max(5.4,Math.min(10.3,W/43));
      return {x:W/2+across*scale,y:H*.75-depth*scale-(point.y-camera.position.y)*scale*.9,
        scale,depth};
    }
    if(depth<0.3) return null;
    const factor=Math.min(100,Math.max(1,Math.min(W*2.0,H*1.25)/(depth+14)));
    return {x:W/2+across*factor,y:H*.28+(camera.position.y+8.8-point.y)*factor,
      scale:factor,depth};
  }
  function gradientBackground() {
    const g=ctx.createLinearGradient(0,0,0,H);
    if(state.matrix) {g.addColorStop(0,'#020c09');g.addColorStop(1,'#021f1b');}
    else {g.addColorStop(0,'#070d21');g.addColorStop(1,'#081b2a');}
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(state.matrix && !reducedMotion) {
      ctx.save();ctx.font='12px monospace';ctx.textAlign='center';
      for(let i=0;i<rain.length;i++){
        const strip=rain[i],x=strip.x*W;
        for(let k=0;k<strip.length;k++){
          const y=(state.time*strip.speed+strip.offset-k*19)%(H+140)-50;
          if(y<-10||y>H+10)continue;
          ctx.fillStyle='rgba(103,255,154,'+(k===0?0.46:0.12)+')';
          const at=(Math.floor(state.time*7)+i*13+k*7)%glyphs.length;
          ctx.fillText(glyphs.charAt(at),x,y);
        }
      }
      ctx.restore();
    }
    const color=state.matrix?'rgba(75,255,145,.12)':'rgba(108,177,255,.10)';
    ctx.strokeStyle=color;ctx.lineWidth=1;
    for(let i=-10;i<=10;i++){
      ctx.beginPath();ctx.moveTo(W/2,H*.24);ctx.lineTo(W/2+i*120,H);ctx.stroke();
    }
    if(turnFlash>0 && !reducedMotion){
      ctx.fillStyle='rgba(149,255,207,'+(turnFlash*.055)+')';
      ctx.fillRect(0,0,W,H);
    }
  }
  function polygon(points,fill,stroke,lw) {
    if(points.some(p=>!p))return;
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke();}
  }
  function segmentRoad(seg,at,camera) {
    const from=Math.max(0,at),to=Math.min(Core.CONFIG.LENGTH,at+12);
    const loc=(t,lane)=>{
      const p=Core.positionAt(state,seg.start+t,lane);
      return project(p,camera);
    };
    const a=loc(from,-1.65), b=loc(from,1.65);
    const c=loc(to,1.65), d=loc(to,-1.65);
    const fill=state.matrix?'#06291f':(seg.index%2?'#14283b':'#182d42');
    polygon([a,b,c,d],fill);
    const left=[a,d],right=[b,c];
    for(const edge of [left,right]) {
      if(edge.some(x=>!x))continue;
      ctx.beginPath();ctx.moveTo(edge[0].x,edge[0].y);
      ctx.lineTo(edge[1].x,edge[1].y);
      ctx.strokeStyle=state.matrix?'#61ffb6':'#61d5d5';
      ctx.lineWidth=2.1;ctx.stroke();
    }
    for(const lane of [-.5,.5]){
      const one=loc(from,lane),two=loc(to,lane);
      if(!one||!two)continue;
      ctx.beginPath();ctx.moveTo(one.x,one.y);ctx.lineTo(two.x,two.y);
      ctx.lineWidth=.8;ctx.strokeStyle=state.matrix?'#22593e':'#2b5665';ctx.stroke();
    }
  }
  function road(camera) {
    const pieces=[];
    const first=Math.max(0,Math.floor((state.distance-25)/Core.CONFIG.LENGTH));
    const last=Math.min(state.segments.length-1,Math.floor((state.distance+150)/Core.CONFIG.LENGTH));
    for(let i=first;i<=last;i++){
      const seg=state.segments[i];
      for(let t=0;t<Core.CONFIG.LENGTH;t+=12)pieces.push({seg,t});
    }
    pieces.sort((a,b)=>(b.seg.start+b.t)-(a.seg.start+a.t));
    for(const piece of pieces)segmentRoad(piece.seg,piece.t,camera);
  }
  function shadow(x,y,width) {
    ctx.save();ctx.fillStyle='#02071088';
    ctx.beginPath();ctx.ellipse(x,y,Math.max(3,width),Math.max(1.5,width*.32),0,0,2*Math.PI);
    ctx.fill();ctx.restore();
  }
  function featurePaint(f,camera) {
    const lane=f.lane==null?0:f.lane;
    const pos=Core.positionAt(state,f.distance,lane);
    const p=project(pos,camera);
    if(!p||p.x<-120||p.x>W+120||p.y<-100||p.y>H+120)return;
    const base=Math.max(6,Math.min(54,p.scale*2.3));
    ctx.save();
    if(f.type==='portal'){
      const y=p.y-base*.73;const r=base*1.1;
      ctx.shadowBlur=22;ctx.shadowColor='#61fcb6';
      ctx.lineWidth=Math.max(3,r*.11);ctx.strokeStyle='#a3ffd2';
      ctx.beginPath();ctx.ellipse(p.x,y,r*.65,r*1.25,0,0,2*Math.PI);ctx.stroke();
      ctx.lineWidth=1.5;ctx.strokeStyle='#eaffd2';
      ctx.beginPath();ctx.ellipse(p.x,y,r*.40,r*.90,0,0,2*Math.PI);ctx.stroke();
      ctx.font=Math.max(10,base*.45)+'px monospace';
      ctx.fillStyle='#c2ffd2';ctx.textAlign='center';
      ctx.fillText('01',p.x,y+4);
    } else if(f.type==='step') {
      ctx.fillStyle='#ffc27e';ctx.strokeStyle='#ffecb1';ctx.lineWidth=2;
      ctx.fillRect(p.x-base*2,p.y-base*.42,base*4,base*.65);
      ctx.strokeRect(p.x-base*2,p.y-base*.42,base*4,base*.65);
      ctx.font=Math.max(9,base*.44)+'px sans-serif';ctx.fillStyle='#141723';
      ctx.textAlign='center';ctx.fillText('↑ LEVEL',p.x,p.y+base*.09);
    } else {
      shadow(p.x,p.y+base*.2,base*.9);
      ctx.fillStyle=f.type==='bar'?'#ffb98e':'#ff897f';
      ctx.strokeStyle='#ffdcb9';ctx.lineWidth=2;
      if(f.type==='bar'){
        ctx.fillRect(p.x-base*.8,p.y-base*.9,base*1.6,base*.34);
        ctx.strokeRect(p.x-base*.8,p.y-base*.9,base*1.6,base*.34);
      }else{
        ctx.fillRect(p.x-base*.64,p.y-base*1.2,base*1.28,base*1.1);
        ctx.strokeRect(p.x-base*.64,p.y-base*1.2,base*1.28,base*1.1);
        ctx.strokeStyle='#653e4a';ctx.beginPath();
        ctx.moveTo(p.x-base*.52,p.y-base*1.07);
        ctx.lineTo(p.x+base*.52,p.y-base*.19);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function agentPaint(agent,camera) {
    const pos=Core.positionAt(state,agent.distance,agent.lane);
    const p=project({x:pos.x,y:pos.y+0.2,z:pos.z},camera);
    if(!p||p.x<0||p.x>W||p.y<-50||p.y>H+20)return;
    const unit=Math.max(7,Math.min(34,p.scale*2.0));
    ctx.save();shadow(p.x,p.y+unit*.2,unit*.8);
    ctx.shadowColor='#ff4f84';ctx.shadowBlur=12;
    ctx.fillStyle='#201a2b';
    ctx.fillRect(p.x-unit*.54,p.y-unit*1.2,unit*1.08,unit*.95);
    ctx.fillStyle='#f3c7c6';ctx.beginPath();
    ctx.arc(p.x,p.y-unit*1.4,unit*.44,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff4779';
    ctx.fillRect(p.x-unit*.28,p.y-unit*1.5,unit*.17,unit*.1);
    ctx.fillRect(p.x+unit*.12,p.y-unit*1.5,unit*.17,unit*.1);
    ctx.restore();
  }
  function runnerPaint(camera) {
    const world=Core.positionAt(state,state.distance,state.visualLane);
    const ground=project(world,camera);
    const p=project({x:world.x,y:world.y+state.jumpY+0.4,z:world.z},camera);
    if(!p)return;
    const unit=Math.max(15,Math.min(51,p.scale*2.1));
    if(ground)shadow(ground.x,ground.y,unit*(1-state.jumpY*.07));
    ctx.save();
    if(state.matrix){ctx.shadowColor='#6dffae';ctx.shadowBlur=14;}
    const swing=Math.sin(state.time*15)*(state.jumpY>0?.2:1);
    ctx.strokeStyle='#b5eaca';ctx.lineWidth=unit*.16;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(p.x-unit*.23,p.y-unit*.28);
    ctx.lineTo(p.x-unit*.45,p.y+unit*.40+swing*unit*.13);
    ctx.moveTo(p.x+unit*.23,p.y-unit*.28);
    ctx.lineTo(p.x+unit*.45,p.y+unit*.40-swing*unit*.13);ctx.stroke();
    ctx.fillStyle='#4c8e86';ctx.beginPath();
    ctx.ellipse(p.x,p.y-unit*.50,unit*.48,unit*.66,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#6dedbf';ctx.lineWidth=unit*.15;ctx.beginPath();
    ctx.moveTo(p.x-unit*.4,p.y-unit*.77);
    ctx.lineTo(p.x-unit*.66,p.y-unit*.25+swing*unit*.13);
    ctx.moveTo(p.x+unit*.4,p.y-unit*.77);
    ctx.lineTo(p.x+unit*.66,p.y-unit*.25-swing*unit*.13);ctx.stroke();
    ctx.fillStyle='#dcc6a5';ctx.beginPath();
    ctx.arc(p.x,p.y-unit*1.22,unit*.50,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#0d1c29';ctx.beginPath();
    ctx.arc(p.x,p.y-unit*1.44,unit*.45,Math.PI,Math.PI*2);ctx.fill();
    // Distinctive original round black sunglasses.
    ctx.fillStyle='#030c15';ctx.strokeStyle='#f6fff7';ctx.lineWidth=unit*.065;
    for(const ox of [-.24,.24]){
      ctx.beginPath();ctx.arc(p.x+ox*unit,p.y-unit*1.19,unit*.20,0,Math.PI*2);
      ctx.fill();ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(p.x-unit*.04,p.y-unit*1.19);
    ctx.lineTo(p.x+unit*.04,p.y-unit*1.19);ctx.stroke();
    if(state.jumpY>0){
      ctx.fillStyle='#b3ffda';ctx.font=Math.max(11,unit*.6)+'px sans-serif';
      ctx.fillText('↑',p.x+unit*.7,p.y-unit*1.0);
    }
    ctx.restore();
  }
  function render() {
    gradientBackground();
    const player=Core.positionAt(state,state.distance,state.visualLane);
    const behind=Core.positionAt(state,Math.max(0,state.distance-(state.view==='rear'?16:9)),0);
    const target=player.heading*Math.PI/2;
    let diff=((target-cameraYaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    cameraYaw+=diff*Math.min(1,reducedMotion?1:0.12);
    const camera={yaw:cameraYaw,position:{x:behind.x,y:player.y,z:behind.z}};
    road(camera);
    const visible=[];
    const start=Math.max(0,state.segmentIndex-1);
    for(let i=start;i<Math.min(state.segments.length,state.segmentIndex+3);i++){
      for(const f of state.segments[i].features){
        if(!f.consumed && f.distance>state.distance-10 && f.distance<state.distance+105){
          visible.push({feature:f,dist:f.distance});
        }
      }
    }
    visible.sort((a,b)=>b.dist-a.dist);
    for(const v of visible)featurePaint(v.feature,camera);
    for(const agent of [...state.agents].sort((a,b)=>b.distance-a.distance))agentPaint(agent,camera);
    runnerPaint(camera);
    if(state.view==='rear'){
      ctx.fillStyle=state.matrix?'#8fffbc':'#b6d6ec';
      ctx.textAlign='center';ctx.font='bold 10px monospace';
      ctx.fillText('REAR CAMERA • PERSPECTIVE',W/2,H*.17);
    }else{
      ctx.fillStyle=state.matrix?'#8fffbc':'#b6d6ec';
      ctx.textAlign='center';ctx.font='bold 10px monospace';
      ctx.fillText('TOP CAMERA • 3D TURN',W/2,H*.17);
    }
  }
  function loop(timestamp) {
    const dt=last?Math.min(.05,(timestamp-last)/1000):0;
    last=timestamp;
    if(state.phase==='running'){
      const events=Core.step(state,dt);
      eventsHandler(events);
      turnFlash=Math.max(0,turnFlash-dt*2.6);
      if(timestamp-uiAt>85){updateHUD();uiAt=timestamp;}
    }
    render();
    requestAnimationFrame(loop);
  }
  updateHUD();
  requestAnimationFrame(loop);
  if('serviceWorker' in navigator && location.protocol==='https:') {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
