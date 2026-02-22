import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { generateUUID, parseIcs, type ExternalCalendarEvent, type ExternalCalendarSubscription } from '@mindwtr/core';

export const EXTERNAL_CALENDARS_KEY = 'mindwtr-external-calendars';
export const SYSTEM_CALENDAR_SETTINGS_KEY = 'mindwtr-system-calendar-settings';

const SYSTEM_CALENDAR_SOURCE_PREFIX = 'system';

export type SystemCalendarPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface SystemCalendarSettings {
    enabled: boolean;
    selectAll: boolean;
    selectedCalendarIds: string[];
}

export interface SystemCalendarInfo {
    id: string;
    name: string;
    color?: string;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function normalizeSystemCalendarSettings(raw: Partial<SystemCalendarSettings> | null): SystemCalendarSettings {
    const enabled = raw?.enabled === true;
    const selectAll = raw?.selectAll !== false;
    const selectedCalendarIds = Array.isArray(raw?.selectedCalendarIds)
        ? Array.from(
            new Set(
                raw.selectedCalendarIds
                    .filter((id): id is string => typeof id === 'string')
                    .map((id) => id.trim())
                    .filter((id) => id.length > 0)
            )
        )
        : [];

    return {
        enabled,
        selectAll,
        selectedCalendarIds: selectAll ? [] : selectedCalendarIds,
    };
}

function normalizePermissionStatus(status: unknown): SystemCalendarPermissionStatus {
    if (status === 'granted' || status === 'denied' || status === 'undetermined') {
        return status;
    }
    return 'denied';
}

function getCalendarDisplayName(calendar: Calendar.Calendar): string {
    const rawTitle = calendar.title;
    const legacyName = (calendar as Calendar.Calendar & { name?: string }).name;
    const preferred = typeof rawTitle === 'string' && rawTitle.trim().length > 0
        ? rawTitle
        : typeof legacyName === 'string' && legacyName.trim().length > 0
            ? legacyName
            : 'Calendar';
    return preferred.trim() || 'Calendar';
}

function getSystemCalendarSourceId(calendarId: string): string {
    return `${SYSTEM_CALENDAR_SOURCE_PREFIX}:${calendarId}`;
}

function toDateSafe(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isFinite(date.getTime())) return null;
    return date;
}

export async function getExternalCalendars(): Promise<ExternalCalendarSubscription[]> {
    const raw = await AsyncStorage.getItem(EXTERNAL_CALENDARS_KEY);
    const parsed = safeJsonParse<ExternalCalendarSubscription[]>(raw, []);
    return parsed
        .filter((c) => c && typeof c.url === 'string')
        .map((c) => ({
            id: c.id || generateUUID(),
            name: (c.name || 'Calendar').trim() || 'Calendar',
            url: c.url.trim(),
            enabled: c.enabled !== false,
        }))
        .filter((c) => c.url.length > 0);
}

export async function saveExternalCalendars(calendars: ExternalCalendarSubscription[]): Promise<void> {
    const sanitized = calendars
        .map((c) => ({
            id: c.id || generateUUID(),
            name: (c.name || 'Calendar').trim() || 'Calendar',
            url: (c.url || '').trim(),
            enabled: c.enabled !== false,
        }))
        .filter((c) => c.url.length > 0);
    await AsyncStorage.setItem(EXTERNAL_CALENDARS_KEY, JSON.stringify(sanitized));
}

export async function getSystemCalendarSettings(): Promise<SystemCalendarSettings> {
    const raw = await AsyncStorage.getItem(SYSTEM_CALENDAR_SETTINGS_KEY);
    const parsed = safeJsonParse<Partial<SystemCalendarSettings> | null>(raw, null);
    return normalizeSystemCalendarSettings(parsed);
}

export async function saveSystemCalendarSettings(settings: SystemCalendarSettings): Promise<void> {
    const sanitized = normalizeSystemCalendarSettings(settings);
    await AsyncStorage.setItem(SYSTEM_CALENDAR_SETTINGS_KEY, JSON.stringify(sanitized));
}

export async function getSystemCalendarPermissionStatus(): Promise<SystemCalendarPermissionStatus> {
    if (Platform.OS === 'web') return 'denied';
    try {
        const result = await Calendar.getCalendarPermissionsAsync();
        return normalizePermissionStatus(result.status);
    } catch {
        return 'denied';
    }
}

export async function requestSystemCalendarPermission(): Promise<SystemCalendarPermissionStatus> {
    if (Platform.OS === 'web') return 'denied';
    try {
        const result = await Calendar.requestCalendarPermissionsAsync();
        return normalizePermissionStatus(result.status);
    } catch {
        return 'denied';
    }
}

export async function getSystemCalendars(): Promise<SystemCalendarInfo[]> {
    if (Platform.OS === 'web') return [];
    const permission = await getSystemCalendarPermissionStatus();
    if (permission !== 'granted') return [];

    try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        return calendars
            .filter((calendar) => typeof calendar.id === 'string' && calendar.id.trim().length > 0)
            .map((calendar) => ({
                id: calendar.id,
                name: getCalendarDisplayName(calendar),
                color: typeof calendar.color === 'string' && calendar.color.trim().length > 0 ? calendar.color : undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
        const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.text();
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

async function fetchIcsCalendarEvents(rangeStart: Date, rangeEnd: Date): Promise<{
    calendars: ExternalCalendarSubscription[];
    events: ExternalCalendarEvent[];
}> {
    const calendars = await getExternalCalendars();
    const enabled = calendars.filter((c) => c.enabled);

    const results = await Promise.allSettled(
        enabled.map(async (calendar) => {
            const text = await fetchTextWithTimeout(calendar.url, 15_000);
            return parseIcs(text, { sourceId: calendar.id, rangeStart, rangeEnd });
        })
    );

    const events: ExternalCalendarEvent[] = [];
    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        events.push(...result.value);
    }

    return { calendars, events };
}

async function fetchSystemCalendarEvents(rangeStart: Date, rangeEnd: Date): Promise<{
    calendars: ExternalCalendarSubscription[];
    events: ExternalCalendarEvent[];
}> {
    if (Platform.OS === 'web') {
        return { calendars: [], events: [] };
    }

    const settings = await getSystemCalendarSettings();
    if (!settings.enabled) {
        return { calendars: [], events: [] };
    }

    const permission = await getSystemCalendarPermissionStatus();
    if (permission !== 'granted') {
        return { calendars: [], events: [] };
    }

    const rawCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const availableCalendars = rawCalendars.filter((calendar) => typeof calendar.id === 'string' && calendar.id.trim().length > 0);
    if (availableCalendars.length === 0) {
        return { calendars: [], events: [] };
    }

    const selectedCalendarIds = settings.selectAll
        ? availableCalendars.map((calendar) => calendar.id)
        : settings.selectedCalendarIds;
    if (selectedCalendarIds.length === 0) {
        return { calendars: [], events: [] };
    }

    const availableById = new Map(availableCalendars.map((calendar) => [calendar.id, calendar]));
    const selectedCalendars = selectedCalendarIds
        .map((id) => availableById.get(id))
        .filter((calendar): calendar is Calendar.Calendar => Boolean(calendar));
    if (selectedCalendars.length === 0) {
        return { calendars: [], events: [] };
    }

    const selectedIds = selectedCalendars.map((calendar) => calendar.id);
    const rawEvents = await Calendar.getEventsAsync(selectedIds, rangeStart, rangeEnd);

    const calendars: ExternalCalendarSubscription[] = selectedCalendars.map((calendar) => ({
        id: getSystemCalendarSourceId(calendar.id),
        name: getCalendarDisplayName(calendar),
        url: `system://${encodeURIComponent(calendar.id)}`,
        enabled: true,
    }));

    const events: ExternalCalendarEvent[] = [];
    for (const event of rawEvents) {
        const eventCalendarId = typeof event.calendarId === 'string' && event.calendarId.trim().length > 0
            ? event.calendarId
            : selectedIds[0];
        const sourceId = getSystemCalendarSourceId(eventCalendarId);
        const start = toDateSafe(event.startDate);
        if (!start) continue;

        const endCandidate = toDateSafe(event.endDate);
        const end = endCandidate && endCandidate.getTime() > start.getTime()
            ? endCandidate
            : new Date(start.getTime() + (event.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const rawTitle = typeof event.title === 'string' ? event.title.trim() : '';
        const eventId = typeof event.id === 'string' && event.id.trim().length > 0 ? event.id : generateUUID();

        events.push({
            id: `${sourceId}:${eventId}:${startIso}`,
            sourceId,
            title: rawTitle || 'Event',
            start: startIso,
            end: endIso,
            allDay: event.allDay === true,
            description: typeof event.notes === 'string' && event.notes.trim().length > 0 ? event.notes : undefined,
            location: typeof event.location === 'string' && event.location.trim().length > 0 ? event.location : undefined,
        });
    }

    return { calendars, events };
}

export async function fetchExternalCalendarEvents(rangeStart: Date, rangeEnd: Date): Promise<{
    calendars: ExternalCalendarSubscription[];
    events: ExternalCalendarEvent[];
}> {
    const [icsData, systemData] = await Promise.all([
        fetchIcsCalendarEvents(rangeStart, rangeEnd),
        fetchSystemCalendarEvents(rangeStart, rangeEnd),
    ]);

    const calendarsById = new Map<string, ExternalCalendarSubscription>();
    for (const calendar of [...icsData.calendars, ...systemData.calendars]) {
        calendarsById.set(calendar.id, calendar);
    }

    const events = [...icsData.events, ...systemData.events].sort((a, b) => {
        if (a.start === b.start) return a.title.localeCompare(b.title);
        return a.start.localeCompare(b.start);
    });

    return {
        calendars: Array.from(calendarsById.values()),
        events,
    };
}
