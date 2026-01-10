import type { AIProviderId } from '@mindwtr/core';
import { buildAIConfig, buildCopilotConfig, getAIKeyStorageKey } from '@mindwtr/core';
import { isTauriRuntime } from './runtime';

const AI_SECRET_KEY = 'mindwtr-ai-key-secret';

const getSessionSecret = (): Uint8Array | null => {
    if (typeof sessionStorage === 'undefined') return null;
    const existing = sessionStorage.getItem(AI_SECRET_KEY);
    if (existing) {
        try {
            return base64ToBytes(existing);
        } catch {
            sessionStorage.removeItem(AI_SECRET_KEY);
        }
    }
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) return null;
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    sessionStorage.setItem(AI_SECRET_KEY, bytesToBase64(bytes));
    return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const xorBytes = (data: Uint8Array, key: Uint8Array): Uint8Array => {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) {
        out[i] = data[i] ^ key[i % key.length];
    }
    return out;
};

const loadLocalKey = (provider: AIProviderId): string => {
    if (typeof localStorage === 'undefined') return '';
    const stored = localStorage.getItem(getAIKeyStorageKey(provider));
    if (!stored) return '';
    const secret = getSessionSecret();
    if (!secret) return '';
    try {
        const bytes = xorBytes(base64ToBytes(stored), secret);
        return new TextDecoder().decode(bytes);
    } catch {
        return '';
    }
};

const saveLocalKey = (provider: AIProviderId, value: string): void => {
    if (typeof localStorage === 'undefined') return;
    const key = getAIKeyStorageKey(provider);
    if (!value) {
        localStorage.removeItem(key);
        return;
    }
    const secret = getSessionSecret();
    if (!secret) {
        localStorage.removeItem(key);
        return;
    }
    const bytes = new TextEncoder().encode(value);
    const encrypted = xorBytes(bytes, secret);
    localStorage.setItem(key, bytesToBase64(encrypted));
};

export async function loadAIKey(provider: AIProviderId): Promise<string> {
    if (isTauriRuntime()) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const value = await invoke<string | null>('get_ai_key', { provider });
            if (typeof value === 'string') return value;
        } catch (error) {
            console.error('Failed to load AI key from secure storage:', error);
            return '';
        }
    }
    return loadLocalKey(provider);
}

export async function saveAIKey(provider: AIProviderId, value: string): Promise<void> {
    if (isTauriRuntime()) {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('set_ai_key', { provider, value: value || null });
            return;
        } catch (error) {
            console.error('Failed to save AI key to secure storage:', error);
            return;
        }
    }
    saveLocalKey(provider, value);
}

export { buildAIConfig, buildCopilotConfig };
