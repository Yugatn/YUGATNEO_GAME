/* Adults-only health education: factual questions and feedback, no health profiling.
   Content references WHO, CDC and peer-reviewed research. Avoid categorical
   causality claims about parents' phone use and childhood addiction. */
(function(root){'use strict';
const lessons=[
{id:'alcohol',icon:'🚫',title:'Алкоголь и решение о родительстве',
 situation:'Взрослые планируют беременность и обсуждают, стоит ли отказаться от алкоголя. Что подтверждено исследованиями?',
 options:[
 'Беременность защищена от алкоголя, если пить только в праздники.',
 'При беременности и её планировании рекомендуют не употреблять алкоголь: безопасный уровень не установлен.',
 'Алкоголь полезен для развития плода в малых дозах.'
 ],answer:1,explanation:'CDC указывает: во время беременности и при попытках забеременеть не установлен безопасный уровень алкоголя. ВОЗ также отмечает, что алкоголь повышает риск ряда заболеваний, включая рак. Воздержание устраняет воздействие алкоголя; при зависимости безопасный план прекращения стоит обсуждать с врачом.',
 source:'https://www.cdc.gov/alcohol-pregnancy/about/',reflection:'Какие изменения в привычках семьи помогут создать более безопасную среду?'},
{id:'tobacco',icon:'🌿',title:'Табак и здоровье семьи',
 situation:'Пара хочет улучшить здоровье до планирования ребёнка. Один партнёр курит. Какой план обоснован?',
 options:[
 'Курить рядом с ребёнком, но открывать окно.',
 'Заменить сигареты обещаниями «всё под контролем».',
 'Планировать отказ от табака, защищать всех от дыма и при необходимости искать помощь специалиста.'
 ],answer:2,explanation:'Курение снижает фертильность и повышает репродуктивные риски; пассивный дым также вреден. Прекращение курения до беременности и среда без табачного дыма — полезные меры. Поддержка при отказе предпочтительнее осуждения.',
 source:'https://www.cdc.gov/tobacco/about/cigarettes-and-reproductive-health.html',reflection:'Как поддержать человека, который хочет отказаться от курения, не обвиняя его?'},
{id:'screens',icon:'📵',title:'Телефон во время общения с ребёнком',
 situation:'Родитель играет с малышом, но уведомления постоянно отвлекают его от разговора. Как сохранить качество контакта?',
 options:[
 'Поставить уведомления на паузу и выделить время для внимательного общения; по необходимости пользоваться телефоном осмысленно.',
 'Считать, что один взгляд на телефон неизбежно вызывает зависимость у ребёнка.',
 'Полностью игнорировать обращения ребёнка во время просмотра ленты.'
 ],answer:0,explanation:'Исследования обнаруживают связи между частыми цифровыми прерываниями общения родителей и некоторыми неблагоприятными исходами у детей; эффекты в метаанализе 2025 года небольшие, значительная часть данных наблюдательная. Само использование смартфона не означает, что ребёнок обязательно разовьёт зависимость.',
 source:'https://pubmed.ncbi.nlm.nih.gov/40323594/',reflection:'Как договориться о семейных периодах без отвлекающих уведомлений?'},
{id:'rolemodel',icon:'🤝',title:'Пример без стыда и обвинений',
 situation:'Взрослый хочет формировать полезные привычки у ребёнка. Как сочетать собственный пример и уважение к другим?',
 options:[
 'Придумать правила только для ребёнка, не объясняя их.',
 'Вовлекать семью в совместные привычки, объяснять причины и искать помощь там, где самому трудно.',
 'Объявить других родителей плохими и публично их осуждать.'
 ],answer:1,explanation:'Последовательные семейные правила, общение и поддерживающий пример могут помогать формированию привычек. Взрослые не обязаны быть идеальными: полезнее конкретные изменения и возможность обратиться за помощью.',
 source:'https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129',reflection:'Какую одну привычку ты готов изменить без давления на других?'}
];
function isAdult(age){const a=Number(age);return Number.isInteger(a)&&a>=18&&a<=110;}
function create(){return {version:1,completed:{}};}
function restore(raw){
 const c=create();if(!raw||raw.version!==1||!raw.completed||typeof raw.completed!=='object')return c;
 for(const l of lessons)if(raw.completed[l.id]===true)c.completed[l.id]=true;
 return c;
}
function inspect(state,id,choice,age){
 if(!isAdult(age)||!state||!state.completed)return null;
 const l=lessons.find(x=>x.id===id);
 if(!l||!Number.isInteger(choice)||choice<0||choice>=l.options.length)return null;
 const helpful=choice===l.answer;
 if(helpful)state.completed[id]=true;
 return {helpful,explanation:l.explanation,source:l.source,reflection:l.reflection,
 completed:Object.keys(state.completed).length};
}
const api={lessons,isAdult,create,restore,inspect};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontAdultHealth=api;
})(typeof globalThis!=='undefined'?globalThis:this);
