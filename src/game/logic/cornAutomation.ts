export interface CornAutomationState { hired: boolean; crate: number; crateCapacity: number; harvesterCargo: number; transporterCargo: number; barnCorn: number }
export const collectCornWorkerOne = (s: CornAutomationState, max=5): CornAutomationState => !s.hired || s.harvesterCargo >= max ? s : {...s, harvesterCargo:s.harvesterCargo+1};
export const depositCornCrateOne = (s: CornAutomationState): CornAutomationState => s.harvesterCargo<=0 || s.crate>=s.crateCapacity ? s : {...s,harvesterCargo:s.harvesterCargo-1,crate:s.crate+1};
export const loadCornTransportOne = (s: CornAutomationState,max=8): CornAutomationState => s.crate<=0 || s.transporterCargo>=max ? s : {...s,crate:s.crate-1,transporterCargo:s.transporterCargo+1};
export const unloadCornTransportOne = (s: CornAutomationState): CornAutomationState => s.transporterCargo<=0?s:{...s,transporterCargo:s.transporterCargo-1,barnCorn:s.barnCorn+1};
export const getCornAutomationTotal = (s: CornAutomationState): number => s.crate+s.harvesterCargo+s.transporterCargo+s.barnCorn;
