import remoteConfig from '@react-native-firebase/remote-config';
import DeviceInfo from 'react-native-device-info';

/**
 * Version Check Utility
 * Compares current app version with minimum required version from Firebase Remote Config
 */

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

/**
 * Check if the current app version meets the minimum required version
 * @returns true if update is required, false otherwise
 */
export async function isUpdateRequired(): Promise<boolean> {
    try {
        // Set default values
        await remoteConfig().setDefaults({
            minimum_app_version: '0.0.1', // Default to very low version so app works if config fails
        });

        // Fetch and activate remote config
        // Set cache expiration to 1 hour for production, 0 for development
        const minimumFetchInterval = __DEV__ ? 0 : 3600;
        await remoteConfig().setConfigSettings({
            minimumFetchIntervalMillis: minimumFetchInterval * 1000,
        });

        await remoteConfig().fetchAndActivate();

        // Get minimum required version from Remote Config
        const minimumVersion = remoteConfig().getValue('minimum_app_version').asString();

        // Get current app version
        const currentVersion = DeviceInfo.getVersion();

        console.log('[Version Check] Current version:', currentVersion);
        console.log('[Version Check] Minimum required version:', minimumVersion);

        // Compare versions
        const comparison = compareVersions(currentVersion, minimumVersion);
        const updateRequired = comparison < 0; // Current version is less than minimum

        console.log('[Version Check] Update required:', updateRequired);

        return updateRequired;
    } catch (error) {
        console.error('[Version Check] Error checking version:', error);
        // If there's an error, don't block the user
        return false;
    }
}
