/* PROCOM Service Desk staff app — settings
 * API_BASE: your live server's API address (no trailing slash).
 * PUSH_ENABLED: set to true by the GitHub workflow when the GOOGLE_SERVICES_JSON secret exists. */
window.APP_CONFIG = {
  API_BASE: 'http://10.0.10.132/procom-service/api/index.php',
  WEB_ADMIN: 'http://10.0.10.132/procom-service/admin/',
  PUSH_ENABLED: false,
  VERSION: '1.0.0'
};
