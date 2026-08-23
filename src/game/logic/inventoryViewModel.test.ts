import {describe,expect,it} from "vitest";
import {RESOURCE_IDS,emptyResourceAmounts} from "../config/resourceDefinitions";
import {createGameState} from "../state/GameState";
import {LEDGER_LOCATIONS,compactResourceRows,createInventoryLedger,formatCompactRows,validateInventoryLedger} from "./inventoryViewModel";

describe("authoritative inventory ledger",()=>{
  it("creates exactly one stable row for every resource, including zero rows",()=>{
    const vm=createInventoryLedger(createGameState());
    expect(vm.rows.map(row=>row.resource)).toEqual(RESOURCE_IDS);
    expect(vm.rows).toHaveLength(11);
    expect(vm.totalOnFarm).toBe(0);
  });
  it("matches authoritative carried, warehouse, market, and contract-available values",()=>{
    const state=createGameState();RESOURCE_IDS.forEach((id,index)=>{state.cargo.amounts[id]=index+1;state.barn[id]=index+2;state.market[id]=index+3;});state.cargo.capacity=100;
    const vm=createInventoryLedger(state);
    expect(vm.carriedTotal).toBe(66);expect(vm.barnTotal).toBe(77);expect(vm.marketTotal).toBe(88);
    vm.rows.forEach((row,index)=>expect(row.availableForContract).toBe(index*2+3));
    expect(validateInventoryLedger(vm,state)).toEqual([]);
  });
  it("accounts for every location once and keeps input, reservations, output, and transit separate",()=>{
    const state=createGameState();state.inventory.fieldCrate=1;state.automation.cornFieldCrate=2;state.livestock.eggs=3;
    state.collectionNetwork.boxes.wheat.amounts.wheat=4;state.collectionNetwork.courier.carried.wheat=5;state.collectionNetwork.processingIntake.amounts.wheat=6;
    state.processing.mill.input.amounts.wheat=7;state.processing.mill.activeCycle={recipeId:"mill-flour",remainingMs:10,durationMs:3500,reservedInputs:{...emptyResourceAmounts(),wheat:8}};state.processing.mill.output.amounts.flour=9;
    state.dairy.workshopInput=10;state.dairy.cycle={recipe:"butter",remainingMs:10,durationMs:5000,reservedMilk:11};state.dairy.workshopOutput.butter=12;
    const vm=createInventoryLedger(state),wheat=vm.rows[0],milk=vm.rows.find(row=>row.resource==="milk")!,butter=vm.rows.find(row=>row.resource==="butter")!;
    expect(wheat).toMatchObject({wheatFieldCrate:1,collectionBoxes:4,courierCargo:5,processingIntake:6,machineInput:7,machineReserved:8});
    expect(milk).toMatchObject({dairyInput:10,dairyReserved:11});expect(butter.dairyOutput).toBe(12);
    expect(vm.totalOnFarm).toBe(vm.rows.reduce((total,row)=>total+LEDGER_LOCATIONS.reduce((n,key)=>n+row[key],0),0));
  });
  it("reports hidden type and hidden unit counts for compact all-nonzero inventory",()=>{
    const state=createGameState();RESOURCE_IDS.forEach((id,index)=>state.cargo.amounts[id]=index+1);const vm=createInventoryLedger(state),compact=compactResourceRows(vm.rows,2);
    expect(compact).toMatchObject({overflow:9,hiddenUnits:63,displayedSum:66});expect(formatCompactRows(vm.rows,2).at(-1)).toBe("ほか 9種類・63個");
  });
});
