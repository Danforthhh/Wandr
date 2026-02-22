export interface ActivityEntry {
  id: string;
  message: string;
  detail?: string;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
}

type Listener = (entry: ActivityEntry) => void;

let listener: Listener | null = null;

export function setActivityListener(fn: Listener | null) {
  listener = fn;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>, id?: string): string {
  const entryId = id ?? nanoid();
  listener?.({ ...entry, id: entryId, timestamp: new Date().toISOString() });
  return entryId;
}
