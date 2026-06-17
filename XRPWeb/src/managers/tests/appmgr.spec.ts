import { describe, it, expect, beforeEach, vi } from 'vitest';
import AppMgr, { EventType } from '@managers/appmgr';

// Mock implementation for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('AppMgr', () => {
    let appMgr: AppMgr;

    beforeEach(() => {
        appMgr = AppMgr.getInstance();
        vi.clearAllMocks(); // Clear mocks before each test
    });

    it('should be a singleton', () => {
        const instance1 = AppMgr.getInstance();
        const instance2 = AppMgr.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should subscribe to events', () => {
        const handler = vi.fn();
        appMgr.on(EventType.EVENT_FILESYS, handler);
        appMgr.emit(EventType.EVENT_FILESYS, 'test data');
        expect(handler).toHaveBeenCalledWith('test data');
    });

    it('should emit events', () => {
        const handler = vi.fn();
        appMgr.on(EventType.EVENT_SHELL, handler);
        appMgr.emit(EventType.EVENT_SHELL, 'shell data');
        expect(handler).toHaveBeenCalledWith('shell data');
    });

    it('should remove all listeners', () => {
        const handler = vi.fn();
        appMgr.on(EventType.EVENT_CONNECTION_STATUS, handler);
        appMgr.off();
        appMgr.emit(EventType.EVENT_CONNECTION_STATUS, 'status data');
        expect(handler).not.toHaveBeenCalled();
    });
});
