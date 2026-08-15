export type CustomerPhase = "entering" | "queueing" | "buying" | "leaving";
export interface QueueCustomer {
  id: number;
  phase: CustomerPhase;
  purchased: boolean;
}
export function enqueueCustomer(
  queue: readonly QueueCustomer[],
  customer: QueueCustomer,
  capacity: number,
): QueueCustomer[] {
  if (queue.length >= capacity || queue.some((item) => item.id === customer.id))
    return [...queue];
  return [
    ...queue,
    { ...customer, phase: queue.length === 0 ? "buying" : "queueing" },
  ];
}
export function removeFront(queue: readonly QueueCustomer[]): QueueCustomer[] {
  return queue
    .slice(1)
    .map((item, index) => ({
      ...item,
      phase: index === 0 ? "buying" : "queueing",
    }));
}
export function canSpawn(activeCount: number, maxActive: number): boolean {
  return activeCount < maxActive;
}
export function canFrontBuy(
  queue: readonly QueueCustomer[],
  marketStock: number,
): boolean {
  const front = queue[0];
  return Boolean(
    front && front.phase === "buying" && !front.purchased && marketStock > 0,
  );
}
