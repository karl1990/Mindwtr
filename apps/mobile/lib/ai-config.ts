import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIProviderConfig, AIProviderId, AppData } from '@mindwtr/core';
import { DEFAULT_GEMINI_THINKING_BUDGET, DEFAULT_ANTHROPIC_THINKING_BUDGET, DEFAULT_REASONING_EFFORT, getDefaultAIConfig, getDefaultCopilotModel } from '@mindwtr/core';

const AI_KEY_PREFIX = 'mindwtr-ai-key';

export function getAIKeyStorageKey(provider: AIProviderId): string {
    return `${AI_KEY_PREFIX}:${provider}`;
}

export async function loadAIKey(provider: AIProviderId): Promise<string> {
    const key = await AsyncStorage.getItem(getAIKeyStorageKey(provider));
    return key ?? '';
}

export async function saveAIKey(provider: AIProviderId, value: string): Promise<void> {
    const key = getAIKeyStorageKey(provider);
    if (!value) {
        await AsyncStorage.removeItem(key);
        return;
    }
    await AsyncStorage.setItem(key, value);
}

export function buildAIConfig(settings: AppData['settings'], apiKey: string): AIProviderConfig {
    const provider = (settings.ai?.provider ?? 'openai') as AIProviderId;
    const defaults = getDefaultAIConfig(provider);
    return {
        provider,
        apiKey,
        model: settings.ai?.model ?? defaults.model,
        reasoningEffort: settings.ai?.reasoningEffort ?? DEFAULT_REASONING_EFFORT,
        thinkingBudget: settings.ai?.thinkingBudget ?? defaults.thinkingBudget,
    };
}

export function buildCopilotConfig(settings: AppData['settings'], apiKey: string): AIProviderConfig {
    const provider = (settings.ai?.provider ?? 'openai') as AIProviderId;
    return {
        provider,
        apiKey,
        model: settings.ai?.copilotModel ?? getDefaultCopilotModel(provider),
        reasoningEffort: DEFAULT_REASONING_EFFORT,
        ...(provider === 'gemini' ? { thinkingBudget: DEFAULT_GEMINI_THINKING_BUDGET } : {}),
        ...(provider === 'anthropic' ? { thinkingBudget: DEFAULT_ANTHROPIC_THINKING_BUDGET } : {}),
    };
}
