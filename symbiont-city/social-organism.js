/* Social Organism — an interactive model of interdependence and peaceful civic participation.
   Metaphor of society as CNS is explicitly the author's interpretation, NOT biology.
   No voting instruction, party alignment, violence, or forced ideological agreement. */
(function(root){'use strict';
const axes=['wellbeing','trust','participation','resources'];
const scenarios=[
{id:'water',icon:'💧',title:'Вода для всех',description:'В одном районе сломалась очистительная станция. Соседние кварталы используют общую сеть. Одни жители хотят срочно отремонтировать свою улицу, другие предлагают объединить ресурсы.',facts:['Чистая вода и здоровье связаны с общей инфраструктурой.','Любой план должен учитывать доступность для соседей и детей.'],options:[
{text:'Ремонтировать только свой участок',effect:[5,-12,-11,-6],why:'Один участок получает помощь, но общий источник проблемы и другие жители остаются без решения.'},
{text:'Собрать сведения и создать совместный план ремонта',effect:[15,12,12,-15],why:'Согласование требует времени и ресурсов, зато распределяет помощь и ответственность.'},
{text:'Попросить независимую проверку станции и временно обеспечить всех водой',effect:[13,9,8,-13],why:'Временная защита помогает снизить риск, а проверка выявляет причину поломки.'}
],question:'Кому ещё понадобится помощь, если восстановить лишь одну часть сети?'},
{id:'feedback',icon:'🏛️',title:'Когда власть не слышит',description:'Жители несколько раз сообщали о небезопасной дороге возле школы. Ответственное учреждение не отреагировало. Как организовать перемены, защищая безопасность и права людей?',facts:['Ответственные службы обязаны получать сообщения о рисках и проверять их.','Правовые и общественные способы участия различаются по условиям и результатам.'],options:[
{text:'Собрать доказательства, обратиться официально и организовать обсуждение',effect:[9,10,16,-7],why:'Документирование, обращения, независимая проверка и открытый диалог создают проверяемый путь к улучшению.'},
{text:'Организовать ненасильственную общественную инициативу с требованиями безопасности',effect:[8,6,18,-12],why:'Мирная совместная инициатива может привлечь внимание, если она соблюдает безопасность людей, права участников и действующие условия.'},
{text:'Прекратить обращаться и ждать, пока всё изменится само',effect:[-9,-12,-14,4],why:'Бездействие экономит усилия сейчас, но опасность остаётся и люди теряют возможность участвовать.'}
],question:'Что делать, если институт не исполняет свою функцию? Какие способы контроля и исправления доступны?'},
{id:'network',icon:'🌍',title:'Сеть взаимопомощи',description:'Школьная столовая, транспорт и клиника зависят от общих поставок. После сбоя каждому учреждению нужна помощь. Как распределить усилия?',facts:['Общая логистика связывает здоровье, питание, транспорт и доступ к образованию.','Дефицит лучше анализировать с учётом неотложных потребностей и прозрачного распределения.'],options:[
{text:'Передать все материалы самому заметному учреждению',effect:[-5,-9,-10,-10],why:'Другие важные услуги могут остановиться, а решение будет непрозрачным.'},
{text:'Проверить критические потребности и согласовать распределение',effect:[13,13,13,-16],why:'Приоритеты определяются потребностями и проверяемой информацией, а не громкостью требований.'},
{text:'Открыть обмен материалами между учреждениями и регулярную отчётность',effect:[10,15,15,-12],why:'Координация и прозрачность повышают способность системы помогать многим участникам.'}
],question:'Какое благо невозможно сохранить в одиночку, если рядом разрушается инфраструктура?'}
];
const BASE={wellbeing:55,trust:55,participation:55,resources:70};
function init(){return {version:1,decisions:{}};}
function restore(obj){
 if(!obj||obj.version!==1||!obj.decisions||typeof obj.decisions!=='object'||Array.isArray(obj.decisions))return init();
 const decisions={};
 for(const s of scenarios)if(Number.isInteger(obj.decisions[s.id])&&obj.decisions[s.id]>=0&&obj.decisions[s.id]<s.options.length)decisions[s.id]=obj.decisions[s.id];
 return {version:1,decisions};
}
function metrics(state){
 const m={...BASE};
 for(const s of scenarios){
 const i=state.decisions[s.id];if(!Number.isInteger(i))continue;
 for(let k=0;k<axes.length;k++)m[axes[k]]+=s.options[i].effect[k];
 }
 for(const k of axes)m[k]=Math.max(0,Math.min(100,m[k]));
 return m;
}
function choose(state,id,index){
 const s=scenarios.find(x=>x.id===id);
 if(!s||!state||!Number.isInteger(index)||index<0||index>=s.options.length)return null;
 const before=metrics(state);state.decisions[id]=index;const after=metrics(state);
 return {chosen:s.options[index],before,after,completed:Object.keys(state.decisions).length};
}
const api={axes,scenarios,BASE,init,restore,metrics,choose,interpretation:'Авторская метафора: общество как центральная нервная система. Это образ для исследования связей, не нейробиологический факт.'};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontSocialOrganism=api;
})(typeof globalThis!=='undefined'?globalThis:this);
