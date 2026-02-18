import { cn } from '../../../lib/utils';
import type { SettingsLabels } from './labels';

type Labels = Pick<SettingsLabels,
    | 'on' | 'off' | 'saved'
> & {
    emailDesc: string;
    emailEnable: string;
    emailServer: string;
    emailPort: string;
    emailTls: string;
    emailUsername: string;
    emailPassword: string;
    emailPasswordHint: string;
    emailActionFolder: string;
    emailActionPrefix: string;
    emailWaitingFolder: string;
    emailWaitingPrefix: string;
    emailPrefixHint: string;
    emailPollInterval: string;
    emailPollIntervalHint: string;
    emailArchiveAction: string;
    emailArchiveMove: string;
    emailArchiveDelete: string;
    emailArchiveFolder: string;
    emailTagNewTasks: string;
    emailTagNewTasksHint: string;
    emailTestConnection: string;
    emailTesting: string;
    emailTestSuccess: string;
    emailFetchNow: string;
    emailFetching: string;
    emailFetchSuccess: string;
    emailLastPoll: string;
    emailLastPollNever: string;
    emailTasksCreated: string;
};

type SettingsEmailPageProps = {
    t: Labels;
    enabled: boolean;
    server: string;
    port: number;
    useTls: boolean;
    username: string;
    password: string;
    passwordLoaded: boolean;
    actionFolder: string;
    actionPrefix: string;
    waitingFolder: string;
    waitingPrefix: string;
    pollIntervalMinutes: number;
    archiveAction: string;
    archiveFolder: string;
    tagNewTasks: string;
    lastPollAt: string | null;
    lastPollError: string | null;
    lastPollTaskCount: number;
    testStatus: 'idle' | 'testing' | 'success' | 'error';
    testError: string | null;
    availableFolders: string[];
    fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
    fetchError: string | null;
    fetchCount: number;
    onUpdateEmailSettings: (next: Record<string, unknown>) => void;
    onPasswordChange: (value: string) => void;
    onTestConnection: () => void;
    onFetchNow: () => void;
};

const inputClass = "w-full text-sm px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30";

export function SettingsEmailPage({
    t,
    enabled,
    server,
    port,
    useTls,
    username,
    password,
    passwordLoaded,
    actionFolder,
    actionPrefix,
    waitingFolder,
    waitingPrefix,
    pollIntervalMinutes,
    archiveAction,
    archiveFolder,
    tagNewTasks,
    lastPollAt,
    lastPollError,
    lastPollTaskCount,
    testStatus,
    testError,
    availableFolders,
    fetchStatus,
    fetchError,
    fetchCount,
    onUpdateEmailSettings,
    onPasswordChange,
    onTestConnection,
    onFetchNow,
}: SettingsEmailPageProps) {
    const canTest = server.trim() && username.trim() && passwordLoaded;
    const canFetch = canTest && enabled;

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{t.emailDesc}</p>

                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.emailEnable}</span>
                    <button
                        onClick={() => onUpdateEmailSettings({ enabled: !enabled })}
                        className={cn(
                            "text-xs px-3 py-1 rounded-full transition-colors",
                            enabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {enabled ? t.on : t.off}
                    </button>
                </div>

                {/* Connection settings */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailServer}</div>
                        <input
                            value={server}
                            onChange={(e) => onUpdateEmailSettings({ server: e.target.value })}
                            placeholder="imap.example.com"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailPort}</div>
                        <input
                            type="number"
                            value={port}
                            onChange={(e) => onUpdateEmailSettings({ port: Number(e.target.value) || 993 })}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailUsername}</div>
                        <input
                            value={username}
                            onChange={(e) => onUpdateEmailSettings({ username: e.target.value })}
                            placeholder="user@example.com"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailPassword}</div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            placeholder={passwordLoaded ? '' : '...'}
                            className={inputClass}
                        />
                        <div className="text-xs text-muted-foreground">{t.emailPasswordHint}</div>
                    </div>
                </div>

                {/* TLS toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.emailTls}</span>
                    <button
                        onClick={() => {
                            const nextTls = !useTls;
                            onUpdateEmailSettings({
                                useTls: nextTls,
                                port: nextTls ? 993 : 143,
                            });
                        }}
                        className={cn(
                            "text-xs px-3 py-1 rounded-full transition-colors",
                            useTls
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {useTls ? t.on : t.off}
                    </button>
                </div>

                {/* Test Connection button */}
                <div className="flex items-center gap-3">
                    <button
                        disabled={!canTest || testStatus === 'testing'}
                        onClick={onTestConnection}
                        className={cn(
                            "text-sm px-3 py-2 rounded-md transition-colors",
                            canTest && testStatus !== 'testing'
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {testStatus === 'testing' ? t.emailTesting : t.emailTestConnection}
                    </button>
                    {testStatus === 'success' && (
                        <span className="text-xs text-green-500">{t.emailTestSuccess}</span>
                    )}
                    {testError && (
                        <span className="text-xs text-red-400">{testError}</span>
                    )}
                </div>
            </div>

            {/* Folder, prefix, and polling settings */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                {/* Action folder */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailActionFolder}</div>
                        {availableFolders.length > 0 ? (
                            <select
                                value={actionFolder}
                                onChange={(e) => onUpdateEmailSettings({ actionFolder: e.target.value })}
                                className={inputClass}
                            >
                                {availableFolders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={actionFolder}
                                onChange={(e) => onUpdateEmailSettings({ actionFolder: e.target.value })}
                                placeholder="@ACTION"
                                className={inputClass}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailActionPrefix}</div>
                        <input
                            value={actionPrefix}
                            onChange={(e) => onUpdateEmailSettings({ actionPrefix: e.target.value })}
                            placeholder="EMAIL-TODO: "
                            className={inputClass}
                        />
                        <div className="text-xs text-muted-foreground">{t.emailPrefixHint}</div>
                    </div>
                </div>

                {/* Waiting-for folder */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailWaitingFolder}</div>
                        {availableFolders.length > 0 ? (
                            <select
                                value={waitingFolder}
                                onChange={(e) => onUpdateEmailSettings({ waitingFolder: e.target.value })}
                                className={inputClass}
                            >
                                {availableFolders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={waitingFolder}
                                onChange={(e) => onUpdateEmailSettings({ waitingFolder: e.target.value })}
                                placeholder="@WAITINGFOR"
                                className={inputClass}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailWaitingPrefix}</div>
                        <input
                            value={waitingPrefix}
                            onChange={(e) => onUpdateEmailSettings({ waitingPrefix: e.target.value })}
                            placeholder="EMAIL-AWAIT: "
                            className={inputClass}
                        />
                        <div className="text-xs text-muted-foreground">{t.emailPrefixHint}</div>
                    </div>
                </div>

                {/* Poll interval */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailPollInterval}</div>
                        <input
                            type="number"
                            min={1}
                            max={1440}
                            value={pollIntervalMinutes}
                            onChange={(e) => onUpdateEmailSettings({ pollIntervalMinutes: Math.max(1, Number(e.target.value) || 5) })}
                            className={inputClass}
                        />
                        <div className="text-xs text-muted-foreground">{t.emailPollIntervalHint}</div>
                    </div>
                </div>

                {/* Archive action */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailArchiveAction}</div>
                        <select
                            value={archiveAction}
                            onChange={(e) => onUpdateEmailSettings({ archiveAction: e.target.value })}
                            className={inputClass}
                        >
                            <option value="move">{t.emailArchiveMove}</option>
                            <option value="delete">{t.emailArchiveDelete}</option>
                        </select>
                    </div>
                    {archiveAction === 'move' && (
                        <div className="space-y-1">
                            <div className="text-sm font-medium">{t.emailArchiveFolder}</div>
                            {availableFolders.length > 0 ? (
                                <select
                                    value={archiveFolder}
                                    onChange={(e) => onUpdateEmailSettings({ archiveFolder: e.target.value })}
                                    className={inputClass}
                                >
                                    {availableFolders.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={archiveFolder}
                                    onChange={(e) => onUpdateEmailSettings({ archiveFolder: e.target.value })}
                                    placeholder="Archive"
                                    className={inputClass}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Tag for new tasks */}
                <div className="space-y-1 max-w-xs">
                    <div className="text-sm font-medium">{t.emailTagNewTasks}</div>
                    <input
                        value={tagNewTasks}
                        onChange={(e) => onUpdateEmailSettings({ tagNewTasks: e.target.value })}
                        placeholder="email"
                        className={inputClass}
                    />
                    <div className="text-xs text-muted-foreground">{t.emailTagNewTasksHint}</div>
                </div>

                {/* Fetch Now button */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        disabled={!canFetch || fetchStatus === 'fetching'}
                        onClick={onFetchNow}
                        className={cn(
                            "text-sm px-3 py-2 rounded-md transition-colors",
                            canFetch && fetchStatus !== 'fetching'
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {fetchStatus === 'fetching' ? t.emailFetching : t.emailFetchNow}
                    </button>
                    {fetchStatus === 'success' && (
                        <span className="text-xs text-green-500">
                            {t.emailFetchSuccess} ({fetchCount} {t.emailTasksCreated})
                        </span>
                    )}
                    {fetchError && (
                        <span className="text-xs text-red-400">{fetchError}</span>
                    )}
                </div>
            </div>

            {/* Status section */}
            {lastPollAt && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-2">
                    <div className="text-sm font-medium">{t.emailLastPoll}</div>
                    <div className="text-xs text-muted-foreground">
                        {lastPollAt ? new Date(lastPollAt).toLocaleString() : t.emailLastPollNever}
                    </div>
                    {lastPollError && (
                        <div className="text-xs text-red-400">{lastPollError}</div>
                    )}
                    {!lastPollError && lastPollTaskCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                            {lastPollTaskCount} {t.emailTasksCreated}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
