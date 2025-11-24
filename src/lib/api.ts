import { AppData } from '../types';



export const api = {
    async getData(): Promise<AppData> {
        return window.electronAPI.getData();
    },

    async saveData(data: AppData): Promise<void> {
        await window.electronAPI.saveData(data);
    },
};
