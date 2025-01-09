import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { sugar } from '../src';
import { create } from 'zustand';

class LocalStorageMock {
    private store: any = {};
  
    clear() {
        this.store = {};
    }
  
    getItem (key: string) {
        return this.store[key] || null;
    }
  
    setItem (key: string, value: any) {
        this.store[key] = String(value);
    }
  
    removeItem (key: string) {
        delete this.store[key];
    }
}

global.localStorage = new LocalStorageMock as any;

interface ThemeState {
    theme: 'dark' | 'light';
}

describe('sugar with effects', () => {
    const state: ThemeState = { theme: 'light' };
    const useTheme = create<ThemeState>()(
        sugar({
            state,
            actions: (set, get) => ({
                async save () {
                    localStorage.setItem('theme', get().theme);
                }
            }),
        })
    );

    beforeEach(() => {
        useTheme.actions.reset();
    });

    test('dispatch action for effects', async () => {
        expect(useTheme.actions.save).toBeDefined();

        await useTheme.actions.save();

        expect(localStorage.getItem('theme')).toBe('light');
    });
});
