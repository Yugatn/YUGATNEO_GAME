/* Retro Station shared fullscreen controller, no dependencies. */
(function(global){
"use strict";
function desktop(){return typeof matchMedia==="function"?matchMedia("(pointer: fine) and (hover: hover) and (min-width: 800px)").matches:innerWidth>=800}
function getPreference(){try{const v=localStorage.getItem("retro.fullscreen.auto");return v===null?desktop():v==="1"}catch{return desktop()}}
function setPreference(v){try{localStorage.setItem("retro.fullscreen.auto",v?"1":"0")}catch{}}
function create(target,options={}){
 if(!target)throw Error("Fullscreen target missing");
 let expanded=false,nativeSeen=false,wanted=false;
 const doc=target.ownerDocument||document,root=doc.documentElement;
 const bar=doc.createElement("div");bar.className="retro-display-bar";bar.hidden=true;
 const note=doc.createElement("span");note.className="retro-display-note";note.setAttribute("role","status");note.hidden=true;
 const native=doc.createElement("button");native.type="button";native.textContent="Во весь экран";native.title="Настоящий полноэкранный режим";
 const exit=doc.createElement("button");exit.type="button";exit.textContent="Выйти ✕";exit.title="Esc или F2";
 bar.append(note,native,exit);target.append(bar);
 const fullscreenElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement||null;
 function refresh(){bar.hidden=!expanded;native.hidden=!!fullscreenElement();if(options.onChange)options.onChange(expanded,!!fullscreenElement())}
 function setExpanded(v){expanded=v;target.classList.toggle("retro-expanded",v);root.classList.toggle("retro-display-lock",v);refresh()}
 function enter(real=true){
  wanted=true;setExpanded(true);
  if(!real||fullscreenElement())return Promise.resolve(false);
  const request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(!request)return Promise.resolve(false);
  try{return Promise.resolve(request.call(target)).then(()=>{if(fullscreenElement()===target){nativeSeen=true;if(!wanted)leave();else refresh()}return !!fullscreenElement()}).catch(()=>{refresh();return false})}catch{refresh();return Promise.resolve(false)}
 }
 function leave(){wanted=false;nativeSeen=false;setExpanded(false);const el=fullscreenElement();if(el&&(el===target||target.contains(el))){try{const end=doc.exitFullscreen||doc.webkitExitFullscreen;return Promise.resolve(end?.call(doc)).catch(()=>{})}catch{}}return Promise.resolve()}
 function changed(){const el=fullscreenElement();if(el&&(el===target||target.contains(el))){nativeSeen=true;if(!wanted){leave();return}setExpanded(true)}else if(nativeSeen){nativeSeen=false;wanted=false;setExpanded(false)}else refresh()}
 function toggle(){return expanded?leave():enter(true)}
 function auto(real=true){if(getPreference())return enter(real);return Promise.resolve(false)}
 function key(e){if(e.key==="F2"){e.preventDefault();toggle()}else if(e.key==="Escape"&&expanded&&!fullscreenElement()){e.preventDefault();leave()}}
 native.onclick=()=>enter(true);exit.onclick=leave;
 doc.addEventListener("fullscreenchange",changed);doc.addEventListener("webkitfullscreenchange",changed);doc.addEventListener("keydown",key);
 return {enter,leave,toggle,auto,isExpanded:()=>expanded,notice(t){note.textContent=t||"";note.hidden=!t}};
}
global.RetroDisplay={create,getPreference,setPreference,desktop};
})(globalThis);