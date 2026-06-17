const flowbiteReact = require("flowbite-react/plugin/tailwindcss");

/** @type {import('tailwindcss').Config} */
export default {
    // Add or update the darkMode property to 'class'
    darkMode: 'class',    
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './node_modules/flowbite-react/**/*.{js,ts,jsx,tsx}',
        ".flowbite-react/class-list.json",
        ".flowbite-react\\class-list.json"
    ],
    theme: {
        colors: {
            'curious-blue': {
                50: '#f0f7ff',
                100: '#e0effe',
                200: '#bae0fd',
                300: '#7cc8fb',
                400: '#36aaf5',
                500: '#0c8ee3',
                600: '#0070c1',
                700: '#005a9e',
                800: '#004c83',
                900: '#00416d',
                950: '#002a47',
            },
            matisse: {
                50: '#f0f8ff',
                100: '#dff0ff',
                200: '#b9e1fe',
                300: '#7bcafe',
                400: '#34affc',
                500: '#0a96ed',
                600: '#0076cb',
                700: '#0066b3',
                800: '#055087',
                900: '#0a4270',
                950: '#072a4a',
            },
            cinnabar: {
                50: '#fff1f2',
                100: '#ffdfe0',
                200: '#ffc5c7',
                300: '#ff9da1',
                400: '#ff656b',
                500: '#fe353d',
                600: '#ed1c24',
                700: '#c70e15',
                800: '#a41016',
                900: '#881418',
                950: '#4a0508',
            },
            shark: {
                50: '#f8f7f8',
                100: '#f0eeee',
                200: '#ded9da',
                300: '#c1b8bb',
                400: '#9f9196',
                500: '#847379',
                600: '#6c5d62',
                700: '#584c50',
                800: '#4b4144',
                900: '#41393b',
                950: '#231f20',
            },
            'mountain-mist': {
                50: '#f6f6f7',
                100: '#e3e3e5',
                200: '#c6c6ca',
                300: '#a2a2a8',
                400: '#7e7e86',
                500: '#63636a',
                600: '#4f4f55',
                700: '#414145',
                800: '#38383b',
                900: '#313133',
                950: '#1a1a1b',
            },
            ecstasy: {
                50: '#fff7ed',
                100: '#feeed6',
                200: '#fcd8ac',
                300: '#fabc77',
                400: '#f79540',
                500: '#f57e25',
                600: '#e65d10',
                700: '#be4610',
                800: '#973715',
                900: '#7a3014',
                950: '#421608',
            },
            'chateau-green': {
                50: '#edfff5',
                100: '#d6ffea',
                200: '#afffd5',
                300: '#71ffb6',
                400: '#2dfb90',
                500: '#02e570',
                600: '#00bf59',
                700: '#00a651',
                800: '#06753d',
                900: '#085f34',
                950: '#00361b',
            },
        },
        fontFamily: {},
        extend: {
            typography: {
                DEFAULT: {
                    css: {
                        color: '#313133',
                        maxWidth: 'none',
                        a: {
                            color: '#0c8ee3',
                            textDecoration: 'none',
                            fontWeight: '500',
                            '&:hover': {
                                color: '#0070c1',
                                textDecoration: 'underline',
                            },
                        },
                        h1: {
                            color: '#0c8ee3',
                            fontWeight: '700',
                            fontSize: '2.25rem',
                            marginTop: '0',
                            marginBottom: '1rem',
                        },
                        h2: {
                            color: '#0070c1',
                            fontWeight: '600',
                            fontSize: '1.875rem',
                            marginTop: '2rem',
                            marginBottom: '1rem',
                        },
                        h3: {
                            color: '#005a9e',
                            fontWeight: '600',
                            fontSize: '1.5rem',
                            marginTop: '1.5rem',
                            marginBottom: '0.75rem',
                        },
                        h4: {
                            color: '#004c83',
                            fontWeight: '600',
                            fontSize: '1.25rem',
                            marginTop: '1.25rem',
                            marginBottom: '0.5rem',
                        },
                        p: {
                            color: '#313133',
                            lineHeight: '1.75',
                            marginTop: '1rem',
                            marginBottom: '1rem',
                        },
                        code: {
                            backgroundColor: '#f0f7ff',
                            color: '#0070c1',
                            borderRadius: '0.375rem',
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.875em',
                            fontWeight: '600',
                            border: '1px solid #bae0fd',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        },
                        'code::before': {
                            content: '""',
                        },
                        'code::after': {
                            content: '""',
                        },
                        pre: {
                            backgroundColor: '#f6f6f7',
                            color: '#313133',
                            borderRadius: '0.75rem',
                            padding: '1.25rem',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #c6c6ca',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                            overflow: 'auto',
                        },
                        'pre code': {
                            backgroundColor: 'transparent',
                            color: '#313133',
                            padding: '0',
                            border: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            lineHeight: '1.5',
                        },
                        'pre code .comment': {
                            color: '#7e7e86',
                            fontStyle: 'italic',
                        },
                        'pre code .keyword': {
                            color: '#0070c1',
                            fontWeight: '600',
                        },
                        'pre code .string': {
                            color: '#00416d',
                        },
                        'pre code .function': {
                            color: '#005a9e',
                        },
                        blockquote: {
                            borderLeftColor: '#bae0fd',
                            borderLeftWidth: '4px',
                            backgroundColor: '#f0f7ff',
                            padding: '1rem 1.5rem',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            borderRadius: '0.5rem',
                            fontStyle: 'italic',
                            color: '#004c83',
                        },
                        'blockquote p:first-of-type::before': {
                            content: '""',
                        },
                        'blockquote p:last-of-type::after': {
                            content: '""',
                        },
                        table: {
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem',
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            border: '1px solid #c6c6ca',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        },
                        th: {
                            backgroundColor: '#e0effe',
                            color: '#0070c1',
                            fontWeight: '600',
                            padding: '0.75rem',
                            textAlign: 'left',
                            borderBottom: '2px solid #bae0fd',
                        },
                        td: {
                            backgroundColor: '#ffffff',
                            color: '#313133',
                            padding: '0.75rem',
                            borderBottom: '1px solid #c6c6ca',
                        },
                        'tbody tr:hover td': {
                            backgroundColor: '#f0f7ff',
                        },
                        ul: {
                            listStyleType: 'none',
                            paddingLeft: '1.5rem',
                        },
                        'ul > li': {
                            position: 'relative',
                            paddingLeft: '0.5rem',
                        },
                        'ul > li::before': {
                            content: '"•"',
                            color: '#0c8ee3',
                            fontWeight: 'bold',
                            position: 'absolute',
                            left: '-1rem',
                        },
                        ol: {
                            paddingLeft: '1.5rem',
                        },
                        'ol > li': {
                            paddingLeft: '0.5rem',
                        },
                        'ol > li::marker': {
                            color: '#0c8ee3',
                            fontWeight: '600',
                        },
                        hr: {
                            borderColor: '#c6c6ca',
                            marginTop: '2rem',
                            marginBottom: '2rem',
                        },
                        strong: {
                            color: '#004c83',
                            fontWeight: '600',
                        },
                        em: {
                            color: '#005a9e',
                            fontStyle: 'italic',
                        },
                    },
                },
                invert: {
                    css: {
                        color: '#e3e3e5',
                        a: {
                            color: '#36aaf5',
                            '&:hover': {
                                color: '#7cc8fb',
                            },
                        },
                        h1: { color: '#36aaf5' },
                        h2: { color: '#7cc8fb' },
                        h3: { color: '#bae0fd' },
                        h4: { color: '#e0effe' },
                        p: { color: '#e3e3e5' },
                        code: {
                            backgroundColor: '#313133',
                            color: '#7cc8fb',
                            border: '1px solid #4f4f55',
                        },
                        pre: {
                            backgroundColor: '#1a1a1b',
                            color: '#e3e3e5',
                            border: '1px solid #4f4f55',
                        },
                        'pre code': {
                            color: '#e3e3e5',
                        },
                        'pre code .comment': {
                            color: '#a2a2a8',
                        },
                        'pre code .keyword': {
                            color: '#36aaf5',
                        },
                        'pre code .string': {
                            color: '#7cc8fb',
                        },
                        'pre code .function': {
                            color: '#bae0fd',
                        },
                        blockquote: {
                            borderLeftColor: '#36aaf5',
                            backgroundColor: '#1a1a1b',
                            color: '#bae0fd',
                        },
                        th: {
                            backgroundColor: '#313133',
                            color: '#36aaf5',
                            borderBottom: '2px solid #4f4f55',
                        },
                        td: {
                            backgroundColor: '#1a1a1b',
                            color: '#e3e3e5',
                            borderBottom: '1px solid #4f4f55',
                        },
                        'tbody tr:hover td': {
                            backgroundColor: '#313133',
                        },
                        'ul > li::before': {
                            color: '#36aaf5',
                        },
                        'ol > li::marker': {
                            color: '#36aaf5',
                        },
                        hr: {
                            borderColor: '#4f4f55',
                        },
                        strong: {
                            color: '#bae0fd',
                        },
                        em: {
                            color: '#7cc8fb',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        require('tailwindcss-debug-screens'),
        require('@tailwindcss/typography'),
        flowbiteReact
    ],
};