/**
 * OneSignal Web Push is intentionally disabled for this 60-user tenant.
 * Source placeholder is retained so notification can be re-enabled later by configuration,
 * without affecting KPI/task business logic while disabled.
 */
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.TaskPush = Object.freeze({
  async initialize() { return { enabled: false, reason: "NOTIFICATIONS_DISABLED" }; },
  async getSubscriptionSnapshot() { return { enabled: false, subscriptionId: "", providerKey: "" }; },
  async logout() { return true; },
  async requestPermission() { return false; },
  async setEnabled() { return false; },
  async sync() { return false; }
});
