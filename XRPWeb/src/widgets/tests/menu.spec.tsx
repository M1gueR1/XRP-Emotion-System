import { render } from '@testing-library/react';
import MenuItem from '@/widgets/menu';
import { MenuDataItem } from '@/widgets/menutypes';
import i18n from '@/utils/i18n';
import { describe, expect, it } from 'vitest';

describe('MenuItem', () => {
    const mockItem: MenuDataItem = {
        label: 'Test Label',
        link: 'https://example.com',
        iconImage: 'https://example.com/icon.png'
    };

    it('renders menu item with link', () => {
        const { getByText, getByAltText } = render(<MenuItem item={mockItem} isConnected={false} isOther={false}/>);
        const linkElement = getByText('Test Label').closest('a');
        expect(linkElement).toHaveAttribute('href', 'https://example.com');
        expect(getByAltText(i18n.t('menuicon'))).toHaveAttribute('src', 'https://example.com/icon.png');
    });

    it('renders menu item without link', () => {
        const itemWithoutLink = { ...mockItem, link: undefined };
        const { getByText, getByAltText } = render(<MenuItem item={itemWithoutLink} isConnected={false} isOther={false}/>);
        const divElement = getByText('Test Label').closest('div');
        expect(divElement).toBeInTheDocument();
        expect(getByAltText(i18n.t('menuicon'))).toHaveAttribute('src', 'https://example.com/icon.png');
    });

    it('renders menu item without icon', () => {
        const itemWithoutIcon = { ...mockItem, iconImage: undefined };
        const { getByText, queryByAltText } = render(<MenuItem item={itemWithoutIcon} isConnected={false} isOther={false}/>);
        expect(getByText('Test Label')).toBeInTheDocument();
        expect(queryByAltText(i18n.t('menuicon'))).toBeNull();
    });
});