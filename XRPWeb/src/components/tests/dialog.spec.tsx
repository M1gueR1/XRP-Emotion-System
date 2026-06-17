import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dialog from '@/components/dialogs/dialog';
import '@testing-library/jest-dom';

describe('Dialog Component', () => {
    it('should render the dialog with title and content', () => {
        const cancelDialog = vi.fn();
        render(
            <Dialog
                toggleDialog={cancelDialog}
                children="This is a test dialog"
                isOpen={false}
            />,
        );

        expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
    });
});
