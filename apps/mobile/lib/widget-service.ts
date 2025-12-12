import { Platform } from 'react-native';

export function isAndroidWidgetSupported(): boolean {
    return Platform.OS === 'android' && false;
}

export async function requestPinAndroidWidget(): Promise<boolean> {
    return false;
}

