/**
 * Blockly Locale Setup
 * 
 * To add a new language:
 * 1. Import the locale messages: import * as XxMsg from 'blockly/msg/xx';
 * 2. Add it to the localeMessages object below
 * 3. The language will automatically be supported
 */

import * as Blockly from 'blockly/core';
import * as EnMsg from 'blockly/msg/en';
import * as EsMsg from 'blockly/msg/es';

// Map of language codes to their Blockly message objects
// Add new languages here - they will automatically be supported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeMessages: Record<string, any> = {
    en: EnMsg,
    es: EsMsg,
};

/**
 * Get list of supported Blockly languages
 */
export function getSupportedLanguages(): string[] {
    return Object.keys(localeMessages);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
    return language in localeMessages;
}

/**
 * Set Blockly locale to the specified language
 * Falls back to 'en' if language is not supported
 */
export function setBlocklyLocale(language: string): void {
    // const supportedLanguages = getSupportedLanguages();
    const defaultLanguage = 'en';
    
    // Validate and fallback to default if needed
    const targetLanguage = isLanguageSupported(language) ? language : defaultLanguage;
    const messages = localeMessages[targetLanguage];
    
    try {
        // Apply the locale messages using Blockly's setLocale method
        Blockly.setLocale(messages);
    } catch (error) {
        console.warn(`Failed to set Blockly locale to ${targetLanguage}, defaulting to ${defaultLanguage}:`, error);
        // Fallback to English
        Blockly.setLocale(localeMessages[defaultLanguage]);
    }
}
