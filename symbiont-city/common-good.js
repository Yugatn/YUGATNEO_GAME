/* SYMBIONT CITY · Shared City / social interdependence lab.
 * Fictional systems model. Political options are descriptive, not endorsements.
 * No personal, political or health beliefs are collected or stored.
 */
(function(root){
'use strict';
const INFRA=Object.freeze([
 {id:'water',name:'Вода',icon:'💧',links:['clinic','homes','food']},
 {id:'clinic',name:'Здоровье',icon:'✚',links:['water','transport','homes']},
 {id:'school',name:'Обучение',icon:'📚',links:['transport','homes','signal']},
 {id:'transport',name:'Транспорт',icon:'🚆',links:['clinic','school','food']},
 {id:'food',name:'Питание',icon:'🌱',links:['water','transport','homes']},
 {id:'homes',name:'Дома',icon:'🏠',links:['water','clinic','school','food','signal']},
 {id:'signal',name:'Связь',icon:'📡',links:['school','homes']}
]);
const SCENES=Object.freeze([
 {id:'water',title:'Перебои воды',description:'В городе ограниченные ресурсы. Если слаб водопровод, проблемы появляются и у больницы, и у семей.',
  base:[28,66,72,66,62,67,71]},
 {id:'transport',title:'Разорванные дороги',description:'Если транспорт замедляется, труднее доставлять еду, приезжать к врачам и добираться до школы.',
  base:[67,68,66,24,59,66,66]},
 {id:'signal',title:'Никто не слышит соседей',description:'Связь работает плохо. Обращения жителей доходят с задержкой, а нуждающиеся в помощи остаются незамеченными.',
  base:[67,62,61,65,67,55,22]}
]);
const clamp=x=>Math.max(0,Math.min(100,Math.round(x)));
function scene(id){return SCENES.find(s=>s.id===id)||null;}
function ageBand(age){const n=Number(age);return !Number.isInteger(n)||n<0||n>110?null:n<=2?'caregiver':n<=8?'young':n<=12?'school':n<=17?'teen':'adult';}
function make(id='water',age=10){
 const template=scene(id),band=ageBand(age);
 if(!template||!band)return null;
 return {version:1,scene:id,band,phase:band==='caregiver'?'caregiver':'playing',
  funds:band==='young'?4:3,repairs:{},moves:0};
}
function value(game,id){
 if(!game||!scene(game.scene))return null;
 const i=INFRA.findIndex(n=>n.id===id);if(i<0)return null;
 const base=scene(game.scene).base[i];
 return clamp(base+(game.repairs[id]||0)*20);
}
function metrics(game){
 if(!game||game.phase==='caregiver'||!scene(game.scene))return null;
 const values=Object.fromEntries(INFRA.map(n=>[n.id,value(game,n.id)]));
 const effective=Object.fromEntries(INFRA.map(n=>{
  const neighbor=n.links.reduce((t,k)=>t+values[k],0)/n.links.length;
  return [n.id,clamp(values[n.id]*.70+neighbor*.30)];
 }));
 const keys=Object.values(effective);
 const minimum=Math.min(...keys),average=Math.round(keys.reduce((a,b)=>a+b,0)/keys.length);
 return {values,effective,minimum,average,allSupported:minimum>=55,
  commentary:minimum<45?'Некоторые районы всё ещё в уязвимом положении.':minimum<55?
   'Средний показатель вырос, но часть жителей по-прежнему нуждается в поддержке.':
   'Больше жителей получили доступ к поддержке. В реальной жизни ситуация была бы сложнее.'};
}
function repair(game,id){
 if(!game||game.phase!=='playing'||!INFRA.some(n=>n.id===id)||game.funds<=0)return null;
 if(value(game,id)>=100)return null;
 const before=metrics(game);
 game.repairs[id]=(game.repairs[id]||0)+1;game.funds--;game.moves++;
 const after=metrics(game);
 return {id,delta:after.average-before.average,before,after,remaining:game.funds};
}
function finish(game){
 if(!game||game.phase!=='playing')return null;
 game.phase='complete';
 return metrics(game);
}
const CIVIC=[
 {id:'feedback',title:'Обратная связь города',icon:'📣',
  child:'Жители сообщили о проблеме, но ответ администрации задерживается. Как можно мирно добиться рассмотрения вопроса?',
  adult:'Городская администрация долго не реагирует на обращения о ремонте. Как разные способы общественного участия могут помочь выявить проблему?',
  approaches:[
   {text:'Собрать проверяемые сведения и направить официальное обращение.',
    plus:'Создаёт документированное обращение и возможность проверки ответственности.',limit:'Процедуры могут занимать время, а обращения не всегда дают быстрый результат.'},
   {text:'Создать добровольную группу жителей для публичного обсуждения и мирного коллективного обращения.',
    plus:'Помогает объединить сведения и показать масштаб потребностей.',limit:'Необходимо учитывать права участников, безопасность, законы и мнения несогласных.'},
   {text:'Организовать взаимопомощь, одновременно выясняя полномочия и обязанности учреждений.',
    plus:'Может закрыть часть срочных потребностей и укрепить сотрудничество.',limit:'Не заменяет долгосрочной ответственности органов управления.'}
  ],
  question:'Какая информация поможет понять, что выбранный способ действительно улучшил положение всех затронутых жителей?'},
 {id:'rights',title:'Разные голоса',icon:'⚖️',
  child:'Два района спорят, как использовать общую площадь. Как услышать обе стороны?',
  adult:'Жители не согласны относительно бюджета. Одни хотят расширить транспорт, другие — поддержать здравоохранение.',
  approaches:[
   {text:'Провести открытое обсуждение с представителями разных групп.',
    plus:'Позволяет услышать потребности тех, кого иначе могли бы забыть.',limit:'Обсуждение должно быть доступным, а аргументы проверяемыми.'},
   {text:'Сравнить данные о пользе, рисках и потребностях, затем обсудить компромисс.',
    plus:'Делает спор конкретнее и позволяет искать альтернативы.',limit:'Данные могут быть неполными; приоритеты остаются предметом общественного выбора.'},
   {text:'Обеспечить обратную связь, прозрачность решений и возможность мирно выразить несогласие.',
    plus:'Укрепляет подотчётность и создаёт механизмы исправления ошибок.',limit:'Требует защиты прав и безопасности участников.'}
  ],question:'Как сохранить права людей, которые не согласны с большинством?'},
 {id:'metaphor',title:'Социальный организм',icon:'🧠',
  child:'Представь, что город — единый организм. Что происходит, если сообщения о проблемах не доходят от жителей до управляющих?',
  adult:'Автор «Амбивалентного Солипсизма» сравнивает общество с организмом, а управление — с центральной нервной системой. Как исследовать эту метафору?',
  approaches:[
   {text:'Найти, какие сигналы от людей не доходят до принимающих решения.',
    plus:'Метафора помогает искать проблемы обратной связи и согласования.',limit:'Общество не является буквально одним биологическим организмом.'},
   {text:'Сравнить несколько способов мирного исправления институтов и критерии их результата.',
    plus:'Позволяет обсуждать реформы и общественные изменения, не объявляя заранее единственно верный путь.',limit:'Любой способ должен оцениваться по последствиям для прав, здоровья и безопасности.'},
   {text:'Проверить контрпримеры: когда коллективная реакция способна навредить отдельным людям.',
    plus:'Помогает увидеть границы метафоры и риск ошибочных аналогий.',limit:'Любая интерпретация требует фактов, сравнения и критики.'}
  ],
  question:'Что метафора объясняет хорошо, а в чём она перестаёт работать?'}
];
function civicView(id,age){
 const band=ageBand(age),s=CIVIC.find(x=>x.id===id);
 if(!s||!band)return null;
 return {id:s.id,title:s.title,icon:s.icon,caregiver:band==='caregiver',
  prompt:band==='adult'?s.adult:s.child,approaches:band==='caregiver'?[]:s.approaches.map(x=>({...x})),
  question:s.question,
  note:s.id==='metaphor'?'Это авторская метафора, а не научное доказательство или обязательная политическая позиция.':
   'Способы общественного участия показаны для сравнения, а не для политической агитации.'};
}
function consider(id,age,index){
 const v=civicView(id,age);
 if(!v||v.caregiver||!Number.isInteger(index)||index<0||index>=v.approaches.length)return null;
 return {text:v.approaches[index].text,plus:v.approaches[index].plus,limit:v.approaches[index].limit,
  question:v.question,note:v.note};
}
function initial(){return {version:1,best:0,played:0};}
function restore(raw){
 if(!raw||raw.version!==1||!Number.isInteger(raw.best)||!Number.isInteger(raw.played)||
 raw.best<0||raw.best>100||raw.played<0||raw.played>999999)return initial();
 return {version:1,best:raw.best,played:raw.played};
}
function record(saved,game){
 if(!saved||!game||game.phase!=='complete'||game.recorded)return false;
 const m=metrics(game);if(!m)return false;
 saved.best=Math.max(saved.best,m.average);saved.played=Math.min(999999,saved.played+1);
 game.recorded=true;return true;
}
const api={INFRA,SCENES,CIVIC,ageBand,scene,make,value,metrics,repair,finish,civicView,consider,initial,restore,record};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontCommonGood=api;
})(typeof globalThis!=='undefined'?globalThis:this);
