import { useState } from 'react';
import { cn } from '../../../lib/utils';
import type { SettingsLabels } from './labels';
import type { EmailCaptureAccount } from '@mindwtr/core';
import type { AccountTransientState } from './useEmailSettings';

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
    emailAccountLabel: string;
    emailAccountLabelHint: string;
    emailAddAccount: string;
    emailRemoveAccount: string;
    emailRemoveAccountConfirm: string;
    emailMaxAccounts: string;
    emailNoAccounts: string;
};

export type SettingsEmailPageProps = {
    t: Labels;
    accounts: EmailCaptureAccount[];
    accountStates: Map<string, AccountTransientState>;
    getAccountState: (accountId: string) => AccountTransientState;
    onAddAccount: () => void;
    onRemoveAccount: (accountId: string) => void;
    onUpdateAccount: (accountId: string, next: Partial<EmailCaptureAccount>) => void;
    onPasswordChange: (accountId: string, value: string) => void;
    onTestConnection: (accountId: string) => void;
    onFetchNow: (accountId: string) => void;
};

const inputClass = "w-full text-sm px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30";

// --- Per-account form (the original SettingsEmailPage, adapted) ---

function SettingsEmailAccountForm({
    t,
    account,
    state,
    onUpdate,
    onPasswordChange,
    onTestConnection,
    onFetchNow,
    onRemove,
}: {
    t: Labels;
    account: EmailCaptureAccount;
    state: AccountTransientState;
    onUpdate: (next: Partial<EmailCaptureAccount>) => void;
    onPasswordChange: (value: string) => void;
    onTestConnection: () => void;
    onFetchNow: () => void;
    onRemove: () => void;
}) {
    const enabled = account.enabled === true;
    const server = account.server ?? '';
    const port = account.port ?? 993;
    const useTls = account.useTls !== false;
    const username = account.username ?? '';
    const actionFolder = account.actionFolder ?? '@ACTION';
    const actionPrefix = account.actionPrefix ?? 'EMAIL-TODO: ';
    const waitingFolder = account.waitingFolder ?? '@WAITINGFOR';
    const waitingPrefix = account.waitingPrefix ?? 'EMAIL-AWAIT: ';
    const pollIntervalMinutes = account.pollIntervalMinutes ?? 5;
    const archiveAction = account.archiveAction ?? 'move';
    const archiveFolder = account.archiveFolder ?? '[Gmail]/All Mail';
    const tagNewTasks = account.tagNewTasks ?? 'email';
    const lastPollAt = account.lastPollAt ?? null;
    const lastPollError = account.lastPollError ?? null;
    const lastPollTaskCount = account.lastPollTaskCount ?? 0;

    const { password, passwordLoaded, testStatus, testError, availableFolders, fetchStatus, fetchError, fetchCount } = state;
    const canTest = server.trim() && username.trim() && passwordLoaded;
    const canFetch = canTest && enabled;

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{t.emailDesc}</p>

                {/* Account label */}
                <div className="space-y-1 max-w-xs">
                    <div className="text-sm font-medium">{t.emailAccountLabel}</div>
                    <input
                        value={account.label ?? ''}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                        placeholder="Work Gmail"
                        className={inputClass}
                    />
                    <div className="text-xs text-muted-foreground">{t.emailAccountLabelHint}</div>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.emailEnable}</span>
                    <button
                        onClick={() => onUpdate({ enabled: !enabled })}
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
                            onChange={(e) => onUpdate({ server: e.target.value })}
                            placeholder="imap.example.com"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailPort}</div>
                        <input
                            type="number"
                            value={port}
                            onChange={(e) => onUpdate({ port: Number(e.target.value) || 993 })}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailUsername}</div>
                        <input
                            value={username}
                            onChange={(e) => onUpdate({ username: e.target.value })}
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
                            onUpdate({
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
                                onChange={(e) => onUpdate({ actionFolder: e.target.value })}
                                className={inputClass}
                            >
                                {availableFolders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={actionFolder}
                                onChange={(e) => onUpdate({ actionFolder: e.target.value })}
                                placeholder="@ACTION"
                                className={inputClass}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailActionPrefix}</div>
                        <input
                            value={actionPrefix}
                            onChange={(e) => onUpdate({ actionPrefix: e.target.value })}
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
                                onChange={(e) => onUpdate({ waitingFolder: e.target.value })}
                                className={inputClass}
                            >
                                {availableFolders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                value={waitingFolder}
                                onChange={(e) => onUpdate({ waitingFolder: e.target.value })}
                                placeholder="@WAITINGFOR"
                                className={inputClass}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm font-medium">{t.emailWaitingPrefix}</div>
                        <input
                            value={waitingPrefix}
                            onChange={(e) => onUpdate({ waitingPrefix: e.target.value })}
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
                            onChange={(e) => onUpdate({ pollIntervalMinutes: Math.max(1, Number(e.target.value) || 5) })}
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
                            onChange={(e) => onUpdate({ archiveAction: e.target.value as 'move' | 'delete' })}
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
                                    onChange={(e) => onUpdate({ archiveFolder: e.target.value })}
                                    className={inputClass}
                                >
                                    {availableFolders.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={archiveFolder}
                                    onChange={(e) => onUpdate({ archiveFolder: e.target.value })}
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
                        onChange={(e) => onUpdate({ tagNewTasks: e.target.value })}
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

            {/* Remove account */}
            <div className="flex justify-end">
                <button
                    onClick={() => {
                        if (window.confirm(t.emailRemoveAccountConfirm)) {
                            onRemove();
                        }
                    }}
                    className="text-sm px-3 py-2 rounded-md text-red-400 hover:bg-red-400/10 transition-colors"
                >
                    {t.emailRemoveAccount}
                </button>
            </div>
        </div>
    );
}

// --- Tab wrapper ---

function accountTabLabel(account: EmailCaptureAccount, index: number): string {
    return account.label || account.username || account.server || `Account ${index + 1}`;
}

export function SettingsEmailPage({
    t,
    accounts,
    getAccountState,
    onAddAccount,
    onRemoveAccount,
    onUpdateAccount,
    onPasswordChange,
    onTestConnection,
    onFetchNow,
}: SettingsEmailPageProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Clamp active index if accounts were removed.
    const safeIndex = accounts.length === 0 ? -1 : Math.min(activeIndex, accounts.length - 1);
    const activeAccount = safeIndex >= 0 ? accounts[safeIndex] : null;

    return (
        <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex items-center gap-1 flex-wrap">
                {accounts.map((account, i) => (
                    <button
                        key={account.id}
                        onClick={() => setActiveIndex(i)}
                        className={cn(
                            "text-sm px-3 py-1.5 rounded-md transition-colors truncate max-w-[180px]",
                            i === safeIndex
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        {accountTabLabel(account, i)}
                    </button>
                ))}
                <button
                    onClick={onAddAccount}
                    disabled={accounts.length >= 10}
                    className={cn(
                        "text-sm px-3 py-1.5 rounded-md transition-colors",
                        accounts.length >= 10
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-muted text-muted-foreground hover:bg-primary/20"
                    )}
                    title={accounts.length >= 10 ? t.emailMaxAccounts : t.emailAddAccount}
                >
                    +
                </button>
            </div>

            {/* Account form or empty state */}
            {activeAccount ? (
                <SettingsEmailAccountForm
                    t={t}
                    account={activeAccount}
                    state={getAccountState(activeAccount.id)}
                    onUpdate={(next) => onUpdateAccount(activeAccount.id, next)}
                    onPasswordChange={(value) => onPasswordChange(activeAccount.id, value)}
                    onTestConnection={() => onTestConnection(activeAccount.id)}
                    onFetchNow={() => onFetchNow(activeAccount.id)}
                    onRemove={() => {
                        onRemoveAccount(activeAccount.id);
                        // Reset to first tab after removal.
                        setActiveIndex(0);
                    }}
                />
            ) : (
                <div className="bg-card border border-border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground">{t.emailNoAccounts}</p>
                </div>
            )}
        </div>
    );
}
