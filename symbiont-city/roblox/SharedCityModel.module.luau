--!strict
-- SYMBIONT CITY v7: Shared City / example pure Roblox Luau ModuleScript.
-- Does not create Roblox places, DataStores, RemoteEvents or a published experience.
-- All values are fictional game scores; no political or health profile is stored.
local Model = {}
local SERVICES = {
  {id="water", title="Вода", links={"clinic", "homes", "food"}},
  {id="clinic", title="Здоровье", links={"water", "transport", "homes"}},
  {id="school", title="Обучение", links={"transport", "homes", "signal"}},
  {id="transport", title="Транспорт", links={"clinic", "school", "food"}},
  {id="food", title="Питание", links={"water", "transport", "homes"}},
  {id="homes", title="Дома", links={"water", "clinic", "school", "food", "signal"}},
  {id="signal", title="Связь", links={"school", "homes"}}
}
local BASE = {
  water={28,66,72,66,62,67,71},
  transport={67,68,66,24,59,66,66},
  signal={67,62,61,65,67,55,22}
}
local function clamp(v: number): number
  return math.clamp(math.floor(v + .5),0,100)
end
local function getService(id: string)
  for i,node in ipairs(SERVICES) do
    if node.id==id then return i,node end
  end
  return nil,nil
end
function Model.scenes()
  return {"water","transport","signal"}
end
function Model.services()
  local list={}
  for _,node in ipairs(SERVICES) do
    table.insert(list,{id=node.id,title=node.title})
  end
  return list
end
function Model.new(sceneId: string, funding: number?)
  if BASE[sceneId]==nil then return nil end
  return {scene=sceneId,remaining=math.clamp(funding or 3,0,10),repairs={},completed=false}
end
function Model.metrics(game)
  local base=BASE[game.scene]
  if base==nil then return nil end
  local raw={}
  for i,node in ipairs(SERVICES) do
    raw[node.id]=clamp(base[i]+(game.repairs[node.id] or 0)*20)
  end
  local effective={}
  local minValue=100
  local total=0
  for _,node in ipairs(SERVICES) do
    local neighbors=0
    for _,neighborId in ipairs(node.links) do
      neighbors+=raw[neighborId]
    end
    local value=clamp(raw[node.id]*.70+neighbors/#node.links*.30)
    effective[node.id]=value
    total+=value
    minValue=math.min(minValue,value)
  end
  return {effective=effective,average=clamp(total/#SERVICES),minimum=minValue,remaining=game.remaining}
end
function Model.repair(game,nodeId: string)
  if game.completed or game.remaining<=0 then return nil end
  local i,node=getService(nodeId)
  if i==nil or node==nil then return nil end
  local before=Model.metrics(game)
  if before==nil then return nil end
  local base=BASE[game.scene]
  if base[i]+(game.repairs[nodeId] or 0)*20>=100 then return nil end
  game.repairs[nodeId]=(game.repairs[nodeId] or 0)+1
  game.remaining-=1
  return Model.metrics(game)
end
function Model.finish(game)
  if game.completed then return Model.metrics(game) end
  game.completed=true
  return Model.metrics(game)
end
return Model
