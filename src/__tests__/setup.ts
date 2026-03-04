import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Stub Web Audio API (used by ActivityLog audio chime)
const audioCtxMock = {
  createOscillator: vi.fn(() => ({
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  destination: {},
  currentTime: 0,
};

vi.stubGlobal('AudioContext', vi.fn(() => audioCtxMock));
vi.stubGlobal('webkitAudioContext', vi.fn(() => audioCtxMock));

// Stub scrollIntoView (not available in jsdom)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Stub navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});
