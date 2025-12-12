export interface CloudOptions {
    token?: string;
    headers?: Record<string, string>;
}

function buildHeaders(options: CloudOptions): Record<string, string> {
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }
    return headers;
}

export async function cloudGetJson<T>(
    url: string,
    options: CloudOptions = {},
): Promise<T | null> {
    const res = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(options),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Cloud GET failed (${res.status}): ${text || res.statusText}`);
    }

    const text = await res.text();
    return JSON.parse(text) as T;
}

export async function cloudPutJson(
    url: string,
    data: unknown,
    options: CloudOptions = {},
): Promise<void> {
    const headers = buildHeaders(options);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';

    const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data, null, 2),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Cloud PUT failed (${res.status}): ${text || res.statusText}`);
    }
}

