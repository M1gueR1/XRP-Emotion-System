import { render, screen } from '@testing-library/react';
import FolderTree from '@/components/folder-tree';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import AppMgr from '@/managers/appmgr';

// Mock the ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Stub the global ResizeObserver
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve('{ "version": "2.1.3" }'),
  } as Response;

  global.fetch = vi.fn().mockResolvedValue(mockResponse);

describe('Folder Component', () => {
  // Ensure a connection is attached after each test
  beforeEach(() => {
    ResizeObserverMock.mockClear();

    // Simulate attaching a connection
    const appMgr = AppMgr.getInstance();
    appMgr.start();
  });

  afterEach(() => {
    const appMgr = AppMgr.getInstance();
    appMgr.stop();
    vi.clearAllMocks();
  });

  const treeData = JSON.stringify([
        {
            id: '1',
            name: 'Folder 1',
            isReadOnly: false,
            path: '/',
            children: [
                {
                    id: '2',
                    name: 'File 1',
                    isReadOnly: true,
                    path: '/',
                    children: null
                },
            ],
        },
    ]);

    it('renders without crashing', () => {
        render(<FolderTree treeData={treeData} theme="light" />);
        expect(screen.getByText('Folder 1')).toBeInTheDocument();
    });

    it('renders tree nodes correctly', () => {
        render(<FolderTree treeData={treeData} theme="light" />);
        expect(screen.getByText('Folder 1')).toBeInTheDocument();
    });
});