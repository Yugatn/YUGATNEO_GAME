/* YUGATNEO MATRIX CHESS · locally curated tactical exercises.
 * FEN + UCI solutions: checked at runtime with chess.js and in CI.
 * Inspired by public-domain problem categories; these short positions are
 * assembled for this app, not copied from a third-party database.
 */
(function(root){
'use strict';
const puzzles=[
{id:"back-rank-e",theme:"Мат в один",tier:1,points:40,
 title:"Последняя горизонталь",description:"Найди мат ладьёй за один ход. Обрати внимание на собственные пешки соперника.",
 fen:"6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",uci:"e1e8",mate:true},
{id:"back-rank-a",theme:"Мат в один",tier:1,points:40,
 title:"Ладья открывает восьмую",description:"Прямой ход ладьи завершает партию.",
 fen:"6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",uci:"a1a8",mate:true},
{id:"black-fools-mate",theme:"Мат в один",tier:1,points:40,
 title:"Ловушка на f2",description:"Чёрные ходят. Как воспользоваться открытой диагональю к белому королю?",
 setup:["f3","e5","g4"],uci:"d8h4",mate:true},
{id:"scholars-mate",theme:"Мат в один",tier:1,points:45,
 title:"Пункт f7",description:"Белые ходят. Найди мат ферзём при поддержке слона.",
 setup:["e4","e5","Qh5","Nc6","Bc4","Nf6"],uci:"h5f7",mate:true},
{id:"fork-knight",theme:"Вилка",tier:2,points:70,
 title:"Конь нападает на двух",description:"Поставь коня с шахом так, чтобы одновременно атаковать чёрного ферзя.",
 fen:"3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1",uci:"e5f7"},
{id:"queen-capture-rook",theme:"Выигрыш материала",tier:1,points:45,
 title:"Ферзь под ударом",description:"Выиграй ферзя соперника одним точным ходом ладьи.",
 fen:"q5k1/8/8/8/8/8/8/R5K1 w - - 0 1",uci:"a1a8"},
{id:"queen-capture-bishop",theme:"Выигрыш материала",tier:1,points:45,
 title:"Диагональ слона",description:"Слон может забрать ферзя по длинной диагонали.",
 fen:"7k/8/q7/8/8/8/8/5BK1 w - - 0 1",uci:"f1a6"},
{id:"promotion-a",theme:"Превращение пешки",tier:2,points:65,
 title:"Новый ферзь",description:"Доведи пешку до последней горизонтали и выбери превращение в ферзя.",
 fen:"4k3/P7/8/8/8/8/8/4K3 w - - 0 1",uci:"a7a8q"},
{id:"promotion-h",theme:"Превращение пешки",tier:2,points:65,
 title:"Последний шаг пешки",description:"Правильно заверши ход пешки, превратив её в ферзя.",
 fen:"k7/7P/8/8/8/8/8/4K3 w - - 0 1",uci:"h7h8q"},
{id:"fork-knight-two",theme:"Вилка",tier:2,points:75,
 title:"Развилка на f7",description:"Одним ходом конь даёт шах королю и атакует ферзя.",
 fen:"3q3k/8/8/6N1/8/8/8/6K1 w - - 0 1",uci:"g5f7"},
{id:"rook-capture-b",theme:"Выигрыш материала",tier:2,points:65,
 title:"Прямая вертикаль",description:"Используй свободную вертикаль для взятия фигуры.",
 fen:"6k1/8/8/8/8/8/4q3/4R1K1 w - - 0 1",uci:"e1e2"},
{id:"mate-rook-h",theme:"Мат в один",tier:2,points:70,
 title:"Ладья вдоль горизонтали",description:"Найди завершающий ход, чтобы ограничить королю все поля отступления.",
 fen:"6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",uci:"d1d8",mate:true}
];
function uciToMove(uci){return {from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||"q"};}
function createPosition(Chess,p){
 const g=new Chess();
 if(p.fen){if(!g.load(p.fen))throw Error("Incorrect puzzle FEN "+p.id);}
 else for(const san of p.setup){if(!g.move(san))throw Error("Illegal setup "+p.id+" "+san);}
 const solution=uciToMove(p.uci);
 const m=g.moves({verbose:true}).find(x=>x.from===solution.from&&x.to===solution.to&&
   (!x.flags.includes("p") || x.promotion===solution.promotion));
 if(!m)throw Error("Illegal puzzle solution "+p.id);
 const before=g.fen();
 const after=g.move(solution);
 if(!after)throw Error("Rejected solution "+p.id);
 if(p.mate && !g.in_checkmate())throw Error("Wrong mate claim "+p.id);
 g.undo();
 if(g.fen()!==before)throw Error("Puzzle cannot be reversed "+p.id);
 return {fen:before,turn:g.turn(),solution:solution};
}
root.NeoChessPuzzles={puzzles,uciToMove,createPosition};
if(typeof module!=="undefined"&&module.exports)module.exports=root.NeoChessPuzzles;
})(typeof globalThis!=="undefined"?globalThis:this);
