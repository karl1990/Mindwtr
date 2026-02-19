type StorageLike = {
    getItem: (key: string) => string | null | Promise<string | null>;
    setItem: (key: string, value: string) => void | Promise<void>;
};

type HeartbeatFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type SendDailyHeartbeatOptions = {
    endpointUrl?: string | null;
    distinctId?: string | null;
    platform?: string | null;
    channel?: string | null;
    appVersion?: string | null;
    storage: StorageLike;
    storageKey?: string;
    enabled?: boolean;
    timeoutMs?: number;
    fetcher?: HeartbeatFetch;
    now?: () => Date;
};

export const HEARTBEAT_LAST_SENT_DAY_KEY = 'mindwtr-analytics-last-heartbeat-day';

const trimValue = (value: string | null | undefined): string => String(value ?? '').trim();

const getIsoDay = (now: Date): string => now.toISOString().slice(0, 10);

const parseEndpoint = (value: string): string | null => {
    if (!value) return null;
    try {
        const parsed = new URL(value);
        if (!parsed.protocol || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

export async function sendDailyHeartbeat(options: SendDailyHeartbeatOptions): Promise<boolean> {
    if (options.enabled === false) return false;

    const endpoint = parseEndpoint(trimValue(options.endpointUrl));
    const distinctId = trimValue(options.distinctId);
    const platform = trimValue(options.platform);
    const channel = trimValue(options.channel);
    const appVersion = trimValue(options.appVersion);

    if (!endpoint || !distinctId || !platform || !channel || !appVersion) {
        return false;
    }

    const storageKey = trimValue(options.storageKey) || HEARTBEAT_LAST_SENT_DAY_KEY;
    const now = options.now ? options.now() : new Date();
    const today = getIsoDay(now);
    const lastSentDay = await options.storage.getItem(storageKey);
    if (lastSentDay === today) return false;

    const fetcher: HeartbeatFetch = options.fetcher ?? (globalThis.fetch as HeartbeatFetch);
    if (typeof fetcher !== 'function') return false;

    const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(500, options.timeoutMs as number) : 5_000;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
        const response = await fetcher(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                distinct_id: distinctId,
                platform,
                channel,
                app_version: appVersion,
            }),
            ...(controller ? { signal: controller.signal } : {}),
        });
        if (!response.ok) return false;
        await options.storage.setItem(storageKey, today);
        return true;
    } catch {
        return false;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
