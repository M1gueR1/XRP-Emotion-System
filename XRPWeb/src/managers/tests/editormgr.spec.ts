import { describe, it, expect, beforeEach } from 'vitest';
import EditorMgr, { EditorSession } from '@/managers/editormgr';
import { EditorType } from '@/utils/types';
import { Model } from 'flexlayout-react';

describe('EditorMgr', () => {
    let editorMgr: EditorMgr;
    let session: EditorSession;

    beforeEach(() => {
        editorMgr = EditorMgr.getInstance();
        session = {
            id: '1',
            name: 'Test Session',
            path: '/path/to/file',
            type: EditorType.PYTHON,
            isSubscribed: false,
            fontsize: 14,
            content: 'print("Hello, World!")',
            lastUpdated: undefined,
            isModified: false,
        };
    });

    it('should add a new editor session', () => {
        editorMgr.AddEditor(session);
        expect(editorMgr.getEditorSession(session.id)).toEqual(session);
    });

    it('should not add a duplicate editor session', () => {
        editorMgr.AddEditor(session);
        editorMgr.AddEditor(session);
        expect(editorMgr.getEditorSession(session.id)).toEqual(session);
    });

    it('should remove an editor session', () => {
        editorMgr.AddEditor(session);
        editorMgr.RemoveEditor(session.id);
        expect(editorMgr.getEditorSession(session.id)).toBeUndefined();
    });

    it('should set and get the layout model', () => {
        const model = new Model();
        editorMgr.setLayoutModel(model);
        expect(editorMgr.getLayoutModel()).toBe(model);
    });

    it('should check if an editor session exists', () => {
        editorMgr.AddEditor(session);
        expect(editorMgr.hasEditorSession(session.id)).toBe(true);
        expect(editorMgr.hasEditorSession('nonexistent')).toBe(false);
    });

    it('should check if a subscription exists', () => {
        editorMgr.AddEditor(session);
        expect(editorMgr.hasSubscription(session.id)).toBe(false);
        editorMgr.setSubscription(session.id);
        expect(editorMgr.hasSubscription(session.id)).toBe(true);
    });

    it('should get and set the fontsize of an editor session', () => {
        editorMgr.AddEditor(session);
        expect(editorMgr.getFontsize(session.id)).toBe(14);
        editorMgr.setFontsize(session.id, 16);
        expect(editorMgr.getFontsize(session.id)).toBe(16);
    });
});