import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { logActivity, setActivityListener, type ActivityEntry } from '../../services/activityLog';

let received: ActivityEntry[] = [];

beforeEach(() => {
  received = [];
  setActivityListener(entry => received.push(entry));
});

afterEach(() => {
  setActivityListener(null);
  received = [];
  vi.clearAllMocks();
});

describe('logActivity', () => {
  it('calls listener with the new entry', () => {
    logActivity({ message: 'Doing something', status: 'pending' });
    expect(received).toHaveLength(1);
    expect(received[0].message).toBe('Doing something');
    expect(received[0].status).toBe('pending');
  });

  it('returns the generated id', () => {
    const id = logActivity({ message: 'Test', status: 'success' });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('uses the provided id when given', () => {
    const id = logActivity({ message: 'Update', status: 'success' }, 'my-custom-id');
    expect(id).toBe('my-custom-id');
    expect(received[0].id).toBe('my-custom-id');
  });

  it('preserves the same id across status updates', () => {
    const id = logActivity({ message: 'Start', status: 'pending' });
    logActivity({ message: 'Done', status: 'success' }, id);
    expect(received[0].id).toBe(received[1].id);
    expect(received[1].status).toBe('success');
  });

  it('includes a valid ISO timestamp', () => {
    logActivity({ message: 'x', status: 'pending' });
    const ts = received[0].timestamp;
    expect(new Date(ts).toString()).not.toBe('Invalid Date');
  });

  it('sets optional detail field when provided', () => {
    logActivity({ message: 'Fail', status: 'error', detail: 'Network error' });
    expect(received[0].detail).toBe('Network error');
  });

  it('does not call listener after setActivityListener(null)', () => {
    setActivityListener(null);
    logActivity({ message: 'Silent', status: 'pending' });
    expect(received).toHaveLength(0);
  });

  it('all three statuses are valid', () => {
    logActivity({ message: 'a', status: 'pending' });
    logActivity({ message: 'b', status: 'success' });
    logActivity({ message: 'c', status: 'error' });
    expect(received.map(e => e.status)).toEqual(['pending', 'success', 'error']);
  });

  it('generates unique ids for each call', () => {
    const id1 = logActivity({ message: '1', status: 'pending' });
    const id2 = logActivity({ message: '2', status: 'pending' });
    expect(id1).not.toBe(id2);
  });
});
