console.log(`[SMTM] Teach Mode activated on ${window.location.hostname}`);

const SMTM_LOCAL_CONFIG_KEY = 'smtmLocalConfig';
const CURRENT_VERSION = '1.0';

try {
    let localConfig = JSON.parse(window.localStorage.getItem(SMTM_LOCAL_CONFIG_KEY));

    if (!localConfig) {
        localConfig = {
            ui: {},
            data: {},
            mapping: {},
            createdAt: new Date().toISOString(),
            version: CURRENT_VERSION,
        };
        window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
        console.log(`[SMTM] Local config initialized on ${window.location.hostname}`);
    } else {
        let updated = false;
        if (!localConfig.ui) {
            localConfig.ui = {};
            updated = true;
        }
        if (!localConfig.data) {
            localConfig.data = {};
            updated = true;
        }
        if (!localConfig.mapping) {
            localConfig.mapping = {};
            updated = true;
        }
        if (!localConfig.createdAt) {
            localConfig.createdAt = new Date().toISOString();
            updated = true;
        }
        if (!localConfig.version) {
            localConfig.version = CURRENT_VERSION;
            updated = true;
        }

        if (updated) {
            window.localStorage.setItem(SMTM_LOCAL_CONFIG_KEY, JSON.stringify(localConfig));
        }
        
        console.log(`[SMTM] Existing local config found on ${window.location.hostname}`);
    }
} catch (error) {
    console.error('[SMTM] Error accessing localStorage:', error);
}
