import { render, screen } from '@testing-library/react';
import ConnectionDlg from '../dialogs/connectiondlg';
import i18n from '@/utils/i18n';
import { describe, expect, it, vi } from 'vitest';

describe('ConnectionDlg', () => {
    it('renders Bluetooth connection option', () => {
        const cb = vi.fn();
        render(<ConnectionDlg callback={cb} />);
        const bluetoothText = i18n.t('bluetoothConnection');
        expect(screen.getByText(bluetoothText)).toBeInTheDocument();
    });

    it('renders USB connection option', () => {
        const cb = vi.fn();
        render(<ConnectionDlg callback={cb} />);
        const usbText = i18n.t('usbConnection');
        expect(screen.getByText(usbText)).toBeInTheDocument();
    });

    it('renders Bluetooth icon', () => {
        const cb = vi.fn();
        render(<ConnectionDlg callback={cb} />);
        const bluetoothIcon = screen.getByTestId(i18n.t('bluetoothConnection'));
        expect(bluetoothIcon).toBeInTheDocument();
    });

    it('renders USB icon', () => {
        const cb = vi.fn();
        render(<ConnectionDlg callback={cb} />);
        const usbIcon = screen.getByTestId(i18n.t('usbConnection'));
        expect(usbIcon).toBeInTheDocument();
    });
});
