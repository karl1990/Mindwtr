export interface ElectronAPI {
    getData: () => Promise<any>
    saveData: (data: any) => Promise<{ success: boolean }>
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
