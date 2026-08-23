import { RESOURCE_IDS, getResourceName, type ResourceId } from "../config/resourceDefinitions";
import { RECIPES, getBufferRemainingCapacity, getBufferTotal, type MachineId, type ProcessingMachineState, type RecipeDefinition, type RecipeId } from "./processing";

export interface RecipeCardViewModel { id:RecipeId; name:string; formula:string; duration:string; status:string }
export interface MachineViewModel { id:MachineId; name:string; mode:string; selectedRecipe:string; input:string[]; reserved:string[]; output:string[]; progress:number; remaining:string; primaryAction:string; recipes:RecipeCardViewModel[] }
const amountLines=(amounts:Readonly<Record<ResourceId,number>>)=>RESOURCE_IDS.filter(id=>amounts[id]>0).map(id=>`${getResourceName(id)} ${amounts[id]}個`);
const formula=(recipe:RecipeDefinition)=>`${amountLines(recipe.inputs).map(s=>s.replace("個"," ")).join(" + ")} → ${amountLines(recipe.outputs).map(s=>s.replace("個"," ")).join(" + ")}`;
function recipeStatus(machine:ProcessingMachineState,recipe:RecipeDefinition):string{
 if(machine.activeCycle?.recipeId===recipe.id)return"製造中";
 if(!machine.enabled)return"停止中";
 if(getBufferRemainingCapacity(machine.output)<RESOURCE_IDS.reduce((n,id)=>n+recipe.outputs[id],0))return"完成品置き場が満杯";
 const missing=RESOURCE_IDS.filter(id=>machine.input.amounts[id]<recipe.inputs[id]);
 return missing.length?`不足：${missing.map(getResourceName).join("・")}`:"準備完了";
}
export function getMachineNextAction(machine:ProcessingMachineState):string{
 if(!machine.built)return"先に設備を建設してください";
 if(!machine.enabled)return"停止中です";
 if(machine.activeCycle)return machine.activeCycle.remainingMs<=0?"完成品置き場が満杯です":"製造中です";
 if(getBufferRemainingCapacity(machine.output)<=0)return"完成品置き場が満杯です";
 if(getBufferTotal(machine.output)>0)return"完成品を受取口から回収できます";
 return"原料を搬入してください";
}
export function createMachineViewModel(id:MachineId,machine:ProcessingMachineState):MachineViewModel{
 const recipeIds=(Object.keys(RECIPES) as RecipeId[]).filter(r=>RECIPES[r].machine===id),active=machine.activeCycle;
 return{id,name:id==="grain-mill"?"製粉機":"ベーカリー",mode:!machine.enabled?"停止":machine.selectedMode==="auto"?"自動":RECIPES[machine.selectedMode].publicName,selectedRecipe:active?RECIPES[active.recipeId].publicName:machine.selectedMode==="auto"?"自動選択":RECIPES[machine.selectedMode].publicName,input:amountLines(machine.input.amounts),reserved:active?amountLines(active.reservedInputs):[],output:amountLines(machine.output.amounts),progress:active?Math.round((1-active.remainingMs/active.durationMs)*100):0,remaining:active?`${(active.remainingMs/1000).toFixed(1)}秒`:"—",primaryAction:getMachineNextAction(machine),recipes:recipeIds.map(recipeId=>{const recipe=RECIPES[recipeId];return{id:recipeId,name:recipe.publicName,formula:formula(recipe),duration:`${(recipe.baseDurationMs/1000).toFixed(1)}秒`,status:recipeStatus(machine,recipe)};})};
}
