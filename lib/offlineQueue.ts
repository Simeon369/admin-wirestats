// lib/offlineQueue.ts
// Manages a persistent offline queue for Supabase operations.
// When a network call fails, the payload is saved to localStorage.
// When connectivity is restored, the queue is flushed in insertion order.

export type QueuedOperation =
  | { id: string; type: "insert_event"; payload: Record<string, unknown>; timestamp: string }
  | { id: string; type: "update_game"; payload: Record<string, unknown>; gameId: string; timestamp: string };

const QUEUE_KEY = "wirestats_offline_queue";

function readQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOperation[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedOperation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full or unavailable — best effort
  }
}

export function enqueue(op: Omit<QueuedOperation, "id" | "timestamp">): void {
  const queue = readQueue();
  const item = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
  } as QueuedOperation;
  queue.push(item);
  writeQueue(queue);
  console.log("[OfflineQueue] Queued:", item.type, item);
}

export function getQueueLength(): number {
  return readQueue().length;
}

export async function flushQueue(
  supabase: { from: (table: string) => unknown }
): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;

  console.log(`[OfflineQueue] Flushing ${queue.length} queued operations...`);
  let flushed = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      if (op.type === "insert_event") {
        const { error } = await (
          supabase.from("stat_events") as {
            insert: (p: unknown) => Promise<{ error: unknown }>;
          }
        ).insert(op.payload);
        if (error) throw error;
      } else if (op.type === "update_game") {
        const { error } = await (
          supabase.from("games") as {
            update: (p: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
          }
        ).update(op.payload).eq("id", op.gameId);
        if (error) throw error;
      }
      flushed++;
      console.log(`[OfflineQueue] Flushed: ${op.type}`);
    } catch (err) {
      console.warn("[OfflineQueue] Still failing, keeping in queue:", err);
      remaining.push(op);
    }
  }

  writeQueue(remaining);
  console.log(`[OfflineQueue] Done. Flushed ${flushed}, ${remaining.length} remaining.`);
  return flushed;
}
