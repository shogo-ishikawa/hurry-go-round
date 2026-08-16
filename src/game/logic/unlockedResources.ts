import type { ResourceId } from "../config/resourceDefinitions";
import type { GameState } from "../state/GameState";
export function getUnlockedResourceIds(state:GameState):ResourceId[]{const ids:ResourceId[]=["wheat"];if(state.landExpansion.eastCornFieldUnlocked)ids.push("corn");if(state.landExpansion.southChickenCoopUnlocked)ids.push("egg");if(state.processing.land.millBuilt)ids.push("flour","cornmeal");if(state.processing.land.bakeryBuilt)ids.push("bread","cornbread");if(state.dairy.barnBuilt)ids.push("milk");if(state.dairy.workshopBuilt)ids.push("butter","cheese");return ids;}
