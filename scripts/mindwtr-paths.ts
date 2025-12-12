import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

const APP_ID = 'tech.dongdongbh.mindwtr';
const LEGACY_APP_NAME = 'mindwtr';

function getLinuxConfigHome() {
    return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function getLinuxDataHome() {
    return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

function getWindowsAppDataHome() {
    return process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
}

function getMacAppSupportHome() {
    return join(homedir(), 'Library', 'Application Support');
}

export function getMindwtrConfigPath(): string {
    const platform = process.platform;
    if (platform === 'win32') return join(getWindowsAppDataHome(), APP_ID, 'config.json');
    if (platform === 'darwin') return join(getMacAppSupportHome(), APP_ID, 'config.json');
    return join(getLinuxConfigHome(), APP_ID, 'config.json');
}

function getDefaultDataPath(): string {
    const platform = process.platform;
    if (platform === 'win32') return join(getWindowsAppDataHome(), APP_ID, 'data.json');
    if (platform === 'darwin') return join(getMacAppSupportHome(), APP_ID, 'data.json');
    return join(getLinuxDataHome(), APP_ID, 'data.json');
}

function getLegacyDataPath(): string {
    const platform = process.platform;
    if (platform === 'win32') return join(getWindowsAppDataHome(), LEGACY_APP_NAME, 'data.json');
    if (platform === 'darwin') return join(getMacAppSupportHome(), LEGACY_APP_NAME, 'data.json');
    return join(getLinuxConfigHome(), LEGACY_APP_NAME, 'data.json');
}

function readConfiguredDataPath(): string | null {
    const configPath = getMindwtrConfigPath();
    if (!existsSync(configPath)) return null;
    try {
        const raw = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw) as { data_file_path?: unknown };
        if (typeof parsed.data_file_path === 'string' && parsed.data_file_path.trim()) {
            return parsed.data_file_path.trim();
        }
    } catch {
        return null;
    }
    return null;
}

export function resolveMindwtrDataPath(overridePath?: string): string {
    const explicit = overridePath || process.env.MINDWTR_DATA;
    if (explicit) return resolve(explicit);

    const configured = readConfiguredDataPath();
    if (configured) return resolve(configured);

    const defaultPath = getDefaultDataPath();
    if (existsSync(defaultPath)) return defaultPath;

    const legacyPath = getLegacyDataPath();
    if (existsSync(legacyPath)) return legacyPath;

    return defaultPath;
}

