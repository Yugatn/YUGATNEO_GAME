(function () {
  'use strict';
  // Self-contained walking scene. No server, tracking, or third-party assets.
  var habitat = document.getElementById('habitat');
  var walker = document.getElementById('walker');
  var pet = document.getElementById('pet');
  if (!habitat || !walker || !pet) return;

  var state = {species:'blob', stage:0, night:false, walking:true};
  var position = {x:50,y:57};
  var lastDirection = 1;
  var awakeUntil = 0;
  var restUntil = 0;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var palette = {
    blob: 'Симбионт', cat:'Звёздный кот', fox:'Лесной лисёнок',
    dragon:'Дракончик', robot:'Робо-друг'
  };

  var definitions = '<defs><radialGradient id="bodyShade" cx="33%" cy="25%" r="88%"><stop offset="0%" stop-color="#f5fff8"/><stop offset="38%" stop-color="var(--face)"/><stop offset="100%" stop-color="var(--shadow)"/></radialGradient></defs>';
  var faces = '<ellipse class="eye" cx="85" cy="142" rx="12" ry="16" fill="#173240"/><ellipse class="eye" cx="157" cy="142" rx="12" ry="16" fill="#173240"/><circle cx="81" cy="137" r="4" fill="white"/><circle cx="153" cy="137" r="4" fill="white"/><ellipse class="cheek" cx="63" cy="166" rx="17" ry="8" fill="#f58ba9"/><ellipse class="cheek" cx="179" cy="166" rx="17" ry="8" fill="#f58ba9"/><path class="mouth" d="M105 173 Q121 190 137 173" fill="none" stroke="#1b3943" stroke-linecap="round" stroke-width="5"/>';
  var shapes = {
    blob: '<path d="M51 125Q20 96 29 72Q41 59 72 82L82 56Q82 25 110 36Q123 20 137 38Q165 17 165 55L177 84Q202 65 215 78Q218 106 194 128Q226 178 186 211Q118 243 55 210Q19 185 51 125Z" fill="url(#bodyShade)" stroke="#ddfff5" stroke-width="3"/>',
    cat: '<path d="M59 112L46 45Q43 36 54 41L95 67Q119 58 148 66L189 40Q199 36 197 49L182 114Q207 130 200 176Q194 224 122 225Q48 225 41 176Q35 129 59 112Z" fill="url(#bodyShade)" stroke="#e1fff2" stroke-width="3"/><path d="M57 53L83 74L62 96Z M185 53L159 74L181 96Z" fill="#ef9db9" opacity=".75"/><path d="M117 157L124 157L120 164Z" fill="#f6a1af"/><path d="M50 171L18 164M51 180L20 184M189 171L224 163M189 180L223 185" stroke="#f5f5ed" stroke-width="3" stroke-linecap="round"/>',
    fox: '<path d="M57 101L29 37Q27 28 40 34L91 69Q124 59 153 70L206 34Q216 28 212 42L186 104Q213 138 196 185Q175 226 122 227Q69 226 48 185Q31 137 57 101Z" fill="url(#bodyShade)" stroke="#fff4da" stroke-width="3"/><path d="M44 49L65 91L84 72Z M195 48L178 90L157 72Z" fill="#f8a8ae"/><path d="M74 171Q120 199 169 170L153 205Q121 226 90 203Z" fill="#fff9e8" opacity=".9"/><path d="M112 162Q121 172 130 162" fill="none" stroke="#703c46" stroke-width="4"/>',
    dragon: '<path d="M65 99L46 69L76 80L83 53L101 76L124 42L142 75L165 51L170 89Q205 111 199 160Q211 202 174 218Q119 239 69 214Q28 188 44 146Q48 118 65 99Z" fill="url(#bodyShade)" stroke="#d5fff2" stroke-width="3"/><path d="M48 145Q4 118 16 190Q28 213 59 188M191 145Q235 119 223 188Q211 214 180 189" stroke="var(--shadow)" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M104 195L115 201L122 195L130 201L139 194" fill="none" stroke="#e7fff5" stroke-width="4"/><path d="M86 217L77 233M155 217L163 233" stroke="var(--shadow)" stroke-width="12" stroke-linecap="round"/>',
    robot: '<path d="M120 56L120 30" stroke="#dff9ee" stroke-width="7" stroke-linecap="round"/><circle cx="120" cy="23" r="10" fill="#ffe7a7"/><rect x="37" y="73" width="166" height="143" rx="42" fill="url(#bodyShade)" stroke="#e7fff7" stroke-width="4"/><rect x="60" y="102" width="120" height="91" rx="30" fill="#edf9ff" opacity=".35"/><rect x="23" y="115" width="20" height="56" rx="9" fill="var(--shadow)"/><rect x="199" y="115" width="20" height="56" rx="9" fill="var(--shadow)"/><rect x="75" y="211" width="24" height="24" rx="10" fill="var(--shadow)"/><rect x="145" y="211" width="24" height="24" rx="10" fill="var(--shadow)"/>'
  };

  function drawSpecies(name) {
    var species = Object.prototype.hasOwnProperty.call(shapes,name) ? name : 'blob';
    pet.innerHTML = '<svg viewBox="0 0 240 250" aria-hidden="true">'+definitions+shapes[species]+faces+'</svg>';
    pet.dataset.species = species;
    pet.setAttribute('aria-label','Питомец: '+palette[species]);
  }

  function sleeping() {
    if (Date.now() < restUntil) return true;
    var h = new Date().getHours();
    return state.night && (h >= 22 || h < 7) && Date.now() >= awakeUntil;
  }

  function bounds() {
    var w = habitat.clientWidth || 300, h = habitat.clientHeight || 300;
    var size = walker.getBoundingClientRect();
    var marginX = Math.min(46, (size.width / 2 + 8) / w * 100);
    var marginY = Math.min(47, (size.height / 2 + 5) / h * 100);
    return {x1:marginX, x2:100-marginX, y1:Math.max(marginY,43), y2:Math.min(70,100-marginY)};
  }

  function place(x,y) {
    var b = bounds();
    x = Math.max(b.x1,Math.min(b.x2,x));
    y = Math.max(b.y1,Math.min(Math.max(b.y1,b.y2),y));
    walker.style.left = x.toFixed(1)+'%';
    walker.style.top = y.toFixed(1)+'%';
    if (x !== position.x) lastDirection = x < position.x ? -1 : 1;
    position = {x:x,y:y};
    walker.classList.toggle('west',lastDirection < 0);
  }

  function wander() {
    if (!state.walking || sleeping() || document.hidden || !habitat.isConnected) return;
    var b = bounds();
    var x = b.x1 + Math.random()*(b.x2-b.x1);
    var y = b.y1 + Math.random()*Math.max(0,b.y2-b.y1);
    place(x,y);
  }

  function sync(options) {
    if (!options) return;
    var species = Object.prototype.hasOwnProperty.call(shapes,options.species) ? options.species : 'blob';
    if (species !== state.species || !pet.querySelector('svg')) drawSpecies(species);
    state.species = species;
    state.stage = Number(options.stage)||0;
    state.night = !!options.night;
    state.walking = !!options.walking;
    walker.dataset.stage = String(state.stage);
    habitat.classList.toggle('night',state.night);
    var asleep = sleeping();
    pet.classList.toggle('sleeping',asleep);
    walker.classList.toggle('paused',asleep || !state.walking);
    var bubble = document.getElementById('worldState');
    if (bubble) bubble.textContent = asleep ? '💤 Спит до утра' : state.walking ? '🐾 Гуляет по миру' : '🏡 Отдыхает на месте';
    if (document.hidden) return;
    // Apply bounds again after growing or a viewport change.
    place(position.x,position.y);
  }

  function wake() {
    awakeUntil = Date.now() + 90*1000;
    restUntil = 0;
    sync(state);
  }

  function rest(seconds) {
    restUntil = Date.now()+Math.max(1,seconds||6)*1000;
    sync(state);
  }

  habitat.addEventListener('click',function(event) {
    if (!state.walking || !event.isTrusted) return;
    var rect = habitat.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    wake();
    place((event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100);
  });

  window.addEventListener('resize',function(){place(position.x,position.y);});
  window.addEventListener('focus',function(){sync(state);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)sync(state);});
  setInterval(function(){sync(state);wander();},3300);
  drawSpecies('blob');
  place(50,57);
  window.SymbiontWorld = {sync:sync,wake:wake,rest:rest,place:place};
})();