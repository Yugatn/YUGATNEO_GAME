/* SYMBIONT CITY / DECISIONS LAB v2.
 * Model of trade-offs for discussion, not an assessment or factual forecast.
 * Pure logic: safe to test without browser, storage or identity.
 */
(function(root){
'use strict';
const METRICS=Object.freeze(['safety','trust','energy','time']);
const START=Object.freeze({safety:60,trust:60,energy:60,time:60});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const scenarios=[
 {id:'generator',area:'Энергетический квартал',icon:'⚡',title:'Свет для двух районов',
  skill:'Системное мышление',
  intro:{young:'В городе один генератор. Свет нужен больнице и домам. Как помочь всем?',
   school:'В городе остался один генератор: его ждут больница и жилой квартал. Оба района сообщают о срочных потребностях.',
   adult:'В энергосети авария. Временного генератора хватит для одного узла. Больница и жилой квартал требуют непрерывного питания.'},
  evidence:[
   'В больнице есть оборудование, которому требуется стабильная мощность.',
   'В домах находятся люди, которым тоже может быть необходима неотложная помощь; есть возможность проверить резервные источники.'
  ],
  options:[
   {text:'Подключить больницу первой и сразу организовать помощь жителям',effects:[18,3,-10,-12],
    reason:'Риск для пациентов снижается, но резерв энергии расходуется быстро. Обратная связь с жителями помогает не пропустить их критические потребности.',
    follow:'Проверь наличие людей с жизненно важным оборудованием дома.'},
   {text:'Поделить генератор поровну между районами',effects:[-14,4,8,9],
    reason:'Распределение кажется равным, но обоим объектам может не хватить мощности для безопасной работы.',
    follow:'Сначала уточни технические требования и критические нагрузки.'},
   {text:'Уточнить критические нагрузки и собрать команду для резервного плана',effects:[11,14,-4,-15],
    reason:'Сбор данных и координация помогают выбрать безопасную последовательность подключения, но требуют времени.',
    follow:'Определи, кто отвечает за проверку больницы, жилых домов и резервных источников.'}
  ],
  reflect:'Какие сведения помогли бы принять решение и кого важно выслушать?'},
 {id:'rumor',area:'Библиотека сомнений',icon:'🔎',title:'Сообщение о закрытом мосте',
  skill:'Критическое мышление',
  intro:{young:'В чат прислали сообщение: «Мост закрыт». Но никто не знает, правда ли это.',
   school:'В школьном чате утверждают, что городской мост опасен, и просят переслать сообщение всем друзьям.',
   adult:'В рабочем чате распространяется неподтверждённое сообщение о неисправности моста. Участники требуют немедленного объявления.'},
  evidence:[
   'У сообщения нет времени публикации и источника.',
   'Городская служба обновляет официальные сообщения; при реальных признаках опасности важно не приближаться к мосту и сообщить ответственным.'
  ],
  options:[
   {text:'Сразу переслать сообщение всем знакомым',effects:[-12,-18,1,12],
    reason:'Быстрая пересылка может распространить ложную информацию и вызвать ненужную тревогу.',
    follow:'Уточни первоисточник, дату и признаки реальной опасности.'},
   {text:'Игнорировать сообщение, не проверяя',effects:[-6,-5,5,12],
    reason:'Это снижает число пересылок, но может привести к пропуску важного предупреждения.',
    follow:'Найди официальный канал и проверь, нужен ли ответ ответственных служб.'},
   {text:'Проверить источник, дату и официальное сообщение',effects:[13,14,-2,-8],
    reason:'Проверка уменьшает вероятность ложного вывода. При непосредственной опасности следует также соблюдать меры безопасности.',
    follow:'Сообщай только проверенные факты и ясно обозначай неопределённость.'}
  ],reflect:'Как отличить наблюдение, предположение и подтверждённое сообщение?'},
 {id:'bridge',area:'Мост доверия',icon:'🌉',title:'Мост для соседей',
  skill:'Сотрудничество',
  intro:{young:'Друзья хотят построить мост из деталей. Одному справиться трудно.',
   school:'Команда строит пешеходный мост из ограниченного набора деталей. Участники спорят о способе сборки.',
   adult:'Команда волонтёров восстанавливает временный переход. Материалов мало, а обязанности распределены неясно.'},
  evidence:[
   'Участники обладают разными полезными навыками, но ещё не согласовали задачи.',
   'Конструкция должна пройти проверку прочности до использования.'
  ],
  options:[
   {text:'Самому быстро собрать мост из доступных деталей',effects:[-14,-10,-9,18],
    reason:'Первые детали могут появиться быстро, но без проверки и совместного плана остаются существенные риски.',
    follow:'Проверь прочность и позови участников с нужными навыками.'},
   {text:'Распределить роли, выслушать предложения и испытать конструкцию',effects:[18,19,-9,-12],
    reason:'Согласование и проверка требуют времени, зато распределяют ответственность и уменьшают риск.',
    follow:'Назначь проверку качества и способ сообщать о проблемах.'},
   {text:'Отложить строительство без обсуждения',effects:[4,-8,7,-19],
    reason:'Риск немедленной ошибки уменьшается, но жители дольше остаются без перехода и не понимают причин.',
    follow:'Согласуй сроки и план следующей попытки.'}
  ],reflect:'Что меняется, когда каждый участник понимает свою роль?'},
 {id:'dialogue',area:'Площадь диалога',icon:'🤝',title:'Два предложения для одной площади',
  skill:'Переговоры',
  intro:{young:'Одна группа хочет играть, другая — спокойно читать. Всем нужна площадь.',
   school:'Одни жители предлагают спортивную площадку, другие — тихую зону для отдыха и чтения. Бюджет общий.',
   adult:'На общественных слушаниях жители спорят о распределении пространства между шумными мероприятиями и тихой зоной.'},
  evidence:[
   'У разных жителей есть обоснованные, но различающиеся потребности.',
   'Можно рассмотреть разное время использования и зонирование, но нужно проверить доступность для всех.'
  ],
  options:[
   {text:'Принять решение только самой громкой группы',effects:[-6,-20,7,14],
    reason:'Решение получается быстрым, но часть потребностей игнорируется, доверие снижается.',
    follow:'Попроси высказаться тех, кого ещё не слушали.'},
   {text:'Провести короткое обсуждение потребностей и проверить смешанный проект',effects:[8,20,-6,-12],
    reason:'Совместный план требует согласования, но может учесть разные потребности и обеспечить более устойчивую поддержку.',
    follow:'Уточни правила совместного использования и доступности.'},
   {text:'Запретить все мероприятия на площади',effects:[4,-14,14,-8],
    reason:'Расходы снижаются, но обе группы теряют пространство для развития и общения.',
    follow:'Проверь, возможны ли безопасные форматы вместо полного запрета.'}
  ],reflect:'Как проверить, что всех затронутых людей услышали?'},
 {id:'garden',area:'Сад эмоций',icon:'🌱',title:'Ссора перед праздником',
  skill:'Эмоциональная саморегуляция',
  intro:{young:'Двое друзей поссорились перед общим праздником. Они расстроены.',
   school:'Два участника команды спорят после неудачной репетиции. Разговор становится всё резче, времени мало.',
   adult:'За час до общественного мероприятия два организатора спорят о распределении обязанностей и обвиняют друг друга.'},
  evidence:[
   'Участники устали и по-разному оценивают причины ошибки.',
   'Короткая пауза и уточняющие вопросы могут уменьшить накал разговора, но не решат проблему сами по себе.'
  ],
  options:[
   {text:'Сказать, что один участник во всём виноват',effects:[-8,-22,6,12],
    reason:'Поиск виновного даёт иллюзию простого решения, но может усилить конфликт.',
    follow:'Разделяй факты, эмоции и ответственность за следующее действие.'},
   {text:'Предложить паузу, выслушать обе стороны и договориться о задачах',effects:[10,20,-5,-11],
    reason:'Уважительная беседа требует времени, но даёт шанс восстановить совместную работу.',
    follow:'Проверь, какие договорённости действительно приняты обеими сторонами.'},
   {text:'Ничего не обсуждать и оставить всё на потом',effects:[-7,-9,7,8],
    reason:'Короткий отдых может снизить напряжение, но незавершённые вопросы остаются.',
    follow:'После отдыха договорись о времени разговора и конкретном следующем шаге.'}
  ],reflect:'Что поможет признать эмоции, не обвиняя другого человека?'}
];
const IDS=scenarios.map(s=>s.id);
const AGE_LENSES={
  3:'Обсуди это с близким взрослым: кого нужно сначала выслушать?',
  4:'Покажи пальцем, кому нужна помощь, и расскажи почему.',
  5:'Назови два возможных действия, обсуди их со взрослым.',
  6:'Что произойдёт сначала и как это заметить?',
  7:'У кого какая задача и как договориться об очереди?',
  8:'Могут ли два участника видеть ситуацию по-разному?',
  9:'Какую информацию нужно проверить до решения?',
  10:'Как действия одной группы изменят жизнь другой?',
  11:'Какие аргументы говорят за и против твоего плана?',
  12:'Что случится, если первоначальная гипотеза неверна?',
  13:'Как не поддаться давлению группы?',
  14:'Какие права и границы нужно учитывать?',
  15:'Что является фактом, а что предположением?',
  16:'Какие последствия проявятся через месяц?',
  17:'Какие условия заставят тебя изменить решение?'
};
function ageLens(age){
 const n=Number(age);
 if(Number.isInteger(n)&&AGE_LENSES[n])return AGE_LENSES[n];
 if(n<=2)return 'Взрослый: разыграйте ситуацию игрушками без экрана и прислушайтесь к ребёнку.';
 if(n<40)return 'Какие данные подтвердят, что решение сработало?';
 if(n<60)return 'Как соединить опыт разных участников и проверить результат?';
 return 'Каким опытом можно поделиться и что стоит пересмотреть?';
}
const outEffects=(v)=>Object.fromEntries(METRICS.map((k,i)=>[k,v[i]]));
function ageBand(age){
 const n=Number(age);
 if(!Number.isInteger(n)||n<0||n>110)return 'school';
 return n<=2?'caregiver':n<=8?'young':n<=12?'school':n<=17?'teen':'adult';
}
function initial(){return {version:1,choices:{},read:{},revision:0};}
function isValid(raw){
 if(!raw||raw.version!==1||!raw.choices||typeof raw.choices!=='object'||Array.isArray(raw.choices))return false;
 if(Object.keys(raw.choices).some(id=>!IDS.includes(id)))return false;
 if(Object.entries(raw.choices).some(([id,v])=>!Number.isInteger(v)||v<0||v>=scenarios[IDS.indexOf(id)].options.length))return false;
 return true;
}
function restore(raw){
 if(!isValid(raw))return initial();
 return {version:1,choices:Object.fromEntries(IDS.filter(id=>Number.isInteger(raw.choices[id])).map(id=>[id,raw.choices[id]])),
  read:{},revision:0}; // No personal reflections or browsing history retained.
}
function metrics(state){
 const totals={...START};
 for(const sc of scenarios){
  const idx=state.choices[sc.id];
  if(!Number.isInteger(idx))continue;
  METRICS.forEach((k,i)=>totals[k]=clamp(totals[k]+sc.options[idx].effects[i],0,100));
 }
 return totals;
}
function progress(state){return {done:Object.keys(state.choices).filter(id=>IDS.includes(id)).length,total:scenarios.length,
 metrics:metrics(state)};}
function view(id,age){
 const sc=scenarios.find(x=>x.id===id);
 if(!sc)return null;
 const band=ageBand(age);
 return {id:sc.id,area:sc.area,icon:sc.icon,title:sc.title,skill:sc.skill,
  intro:sc.intro[band==='caregiver'?'young':band==='teen'?'school':band],
  evidence:sc.evidence.slice(0,band==='caregiver'?1:2),reflect:sc.reflect,
  lens:ageLens(age),caregiver:band==='caregiver',
  cooperative:band==='young',rounds:band==='caregiver'?0:band==='young'?2:3,
  options:(band==='young'||band==='caregiver'?
   (sc.id==='generator'||sc.id==='rumor'?[0,2]:[0,1]):[0,1,2]).map(i=>({
   index:i,text:sc.options[i].text,effects:outEffects(sc.options[i].effects),
   reason:sc.options[i].reason,follow:sc.options[i].follow
  }))};
}
function choice(state,id,index,age){
 const sc=scenarios.find(x=>x.id===id);
 if(!sc||!Number.isInteger(index)||index<0||index>=sc.options.length)return null;
 if(age!==undefined){
  const v=view(id,age);
  if(v.caregiver||!v.options.some(o=>o.index===index))return null;
 }
 const previous=state.choices[id];
 const before=metrics(state);
 // Revisions replace effects rather than stacking rewards.
 state.choices[id]=index;state.revision=(state.revision||0)+1;
 const after=metrics(state);
 const delta=Object.fromEntries(METRICS.map(k=>[k,after[k]-before[k]]));
 return {first:previous===undefined,revised:previous!==undefined&&previous!==index,
  scenario:id,option:index,reason:sc.options[index].reason,follow:sc.options[index].follow,
  delta,after,progress:progress(state)};
}
const api={METRICS,START,scenarios,AGE_LENSES,ageBand,ageLens,initial,isValid,restore,metrics,progress,view,choice};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontCityLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);
