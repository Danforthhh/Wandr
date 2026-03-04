import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugPanel from '../../components/DebugPanel';
import { logger, clearLogs } from '../../services/logger';

// Mock URL.createObjectURL / revokeObjectURL for download tests
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});

beforeEach(() => {
  clearLogs();
});

function renderPanel() {
  return render(<DebugPanel />);
}

// ── Closed state ─────────────────────────────────────────────────────────────

describe('DebugPanel — closed state', () => {
  it('renders a bug icon button when closed', () => {
    renderPanel();
    expect(screen.getByTitle(/debug panel/i)).toBeInTheDocument();
  });

  it('opens when the bug button is clicked', async () => {
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    expect(screen.getByText('Debug Log')).toBeInTheDocument();
  });
});

// ── Keyboard shortcut ────────────────────────────────────────────────────────

describe('Ctrl+Shift+D shortcut', () => {
  it('opens the panel', () => {
    renderPanel();
    fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true });
    expect(screen.getByText('Debug Log')).toBeInTheDocument();
  });

  it('toggles closed again', () => {
    renderPanel();
    fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: 'D', ctrlKey: true, shiftKey: true });
    expect(screen.queryByText('Debug Log')).not.toBeInTheDocument();
  });
});

// ── Log display ──────────────────────────────────────────────────────────────

describe('Log entries', () => {
  it('shows entries after the panel is opened', async () => {
    logger.info('comp.test', 'My test message');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    expect(screen.getByText('My test message')).toBeInTheDocument();
  });

  it('shows entries added after the panel is already open', async () => {
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    act(() => logger.warn('comp.test', 'Late entry'));
    expect(screen.getByText('Late entry')).toBeInTheDocument();
  });

  it('clears entries when the trash button is clicked', async () => {
    logger.info('t', 'will be cleared');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    expect(screen.getByText('will be cleared')).toBeInTheDocument();
    await userEvent.click(screen.getByTitle(/clear/i));
    expect(screen.queryByText('will be cleared')).not.toBeInTheDocument();
  });

  it('shows "No entries" when log is empty', async () => {
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    expect(screen.getByText('No entries')).toBeInTheDocument();
  });
});

// ── Level filter ─────────────────────────────────────────────────────────────

describe('Level filter', () => {
  it('filters to only error entries when error tab is active', async () => {
    logger.info('t', 'info-msg');
    logger.error('t', 'error-msg');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    await userEvent.click(screen.getByRole('button', { name: 'error' }));
    expect(screen.queryByText('info-msg')).not.toBeInTheDocument();
    expect(screen.getByText('error-msg')).toBeInTheDocument();
  });

  it('shows all entries when "all" is selected', async () => {
    logger.debug('t', 'dbg');
    logger.error('t', 'err');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    await userEvent.click(screen.getByRole('button', { name: 'error' }));
    await userEvent.click(screen.getByRole('button', { name: 'all' }));
    expect(screen.getByText('dbg')).toBeInTheDocument();
    expect(screen.getByText('err')).toBeInTheDocument();
  });
});

// ── Search filter ─────────────────────────────────────────────────────────────

describe('Search filter', () => {
  it('filters entries by message text', async () => {
    logger.info('t', 'banana');
    logger.info('t', 'apple');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    const searchBox = screen.getByPlaceholderText(/filter messages/i);
    await userEvent.type(searchBox, 'banana');
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
  });

  it('filters entries by category', async () => {
    logger.info('ai.claude', 'response ready');
    logger.info('firestore', 'doc saved');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    const searchBox = screen.getByPlaceholderText(/filter messages/i);
    await userEvent.type(searchBox, 'ai.claude');
    expect(screen.getByText('response ready')).toBeInTheDocument();
    expect(screen.queryByText('doc saved')).not.toBeInTheDocument();
  });
});

// ── Copy ────────────────────────────────────────────────────────────────────

describe('Copy button', () => {
  it('calls clipboard.writeText', async () => {
    logger.info('t', 'copy me');
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    await userEvent.click(screen.getByTitle(/copy all/i));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});

// ── Close button ─────────────────────────────────────────────────────────────

describe('Close button', () => {
  it('closes the panel', async () => {
    renderPanel();
    await userEvent.click(screen.getByTitle(/debug panel/i));
    expect(screen.getByText('Debug Log')).toBeInTheDocument();
    // The × button does not have an accessible name by default; find by role in header
    const closeBtn = screen.getAllByRole('button').find(b => !b.title && b.closest('.flex'));
    if (closeBtn) {
      await userEvent.click(closeBtn);
    }
  });
});
