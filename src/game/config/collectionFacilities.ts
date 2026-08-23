import type { FacilityId, InteractionId } from "../logic/facilities";
import type { CollectionSourceId } from "../logic/collectionNetwork";

export type CollectionFacilityId = "hub" | CollectionSourceId | "processing-intake";
export type CollectionPrerequisite = "processing-yard" | "collection-hub" | "east-field" | "chicken-coop";
export interface CollectionFacilityDefinition {
  id: CollectionFacilityId; source?: CollectionSourceId; facilityId: FacilityId;
  buildInteractionId?: InteractionId; depositInteractionId?: InteractionId; withdrawInteractionId?: InteractionId;
  courierPickupPoint: {x:number;y:number}; guidePoint:{x:number;y:number}; cost:number; capacity:number;
  prerequisites: readonly CollectionPrerequisite[]; publicName:string;
}
const definition=(value:CollectionFacilityDefinition):CollectionFacilityDefinition=>value;
export const COLLECTION_FACILITIES:Readonly<Record<CollectionFacilityId,CollectionFacilityDefinition>>={
  hub:definition({id:"hub",facilityId:"collection-hub",buildInteractionId:"build-collection-hub",courierPickupPoint:{x:1855,y:1525},guidePoint:{x:1855,y:1525},cost:600,capacity:0,prerequisites:["processing-yard"],publicName:"集配所"}),
  wheat:definition({id:"wheat",source:"wheat",facilityId:"wheat-collection-box",buildInteractionId:"build-wheat-collection-box",depositInteractionId:"deposit-wheat-collection-box",withdrawInteractionId:"withdraw-wheat-collection-box",courierPickupPoint:{x:730,y:790},guidePoint:{x:730,y:790},cost:180,capacity:24,prerequisites:["collection-hub"],publicName:"麦畑集配ボックス"}),
  corn:definition({id:"corn",source:"corn",facilityId:"corn-collection-box",buildInteractionId:"build-corn-collection-box",depositInteractionId:"deposit-corn-collection-box",withdrawInteractionId:"withdraw-corn-collection-box",courierPickupPoint:{x:2665,y:905},guidePoint:{x:2665,y:905},cost:260,capacity:28,prerequisites:["collection-hub","east-field"],publicName:"東農地集配ボックス"}),
  egg:definition({id:"egg",source:"egg",facilityId:"egg-collection-box",buildInteractionId:"build-egg-collection-box",depositInteractionId:"deposit-egg-collection-box",withdrawInteractionId:"withdraw-egg-collection-box",courierPickupPoint:{x:1245,y:1765},guidePoint:{x:1245,y:1765},cost:280,capacity:18,prerequisites:["collection-hub","chicken-coop"],publicName:"鶏小屋集配ボックス"}),
  "processing-intake":definition({id:"processing-intake",facilityId:"processing-intake",courierPickupPoint:{x:2055,y:1515},guidePoint:{x:2055,y:1515},cost:0,capacity:36,prerequisites:["processing-yard","collection-hub"],publicName:"加工場受入ボックス"}),
};
export const COLLECTION_BARN_POINT={x:1450,y:560} as const;
