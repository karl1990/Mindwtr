/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ANALYTICS_HEARTBEAT_URL?: string;
    readonly VITE_DISABLE_HEARTBEAT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
