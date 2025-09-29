// Central serviceType enumeration used by Accounts schema & optionally exposed to clients.
// If you change this list, also update frontend constants and any validation messages.
// NOTE: Values intentionally restricted to 2-20 chars of letters, numbers, space or '-'.
// Legacy values previously included '/', '(' and ')' (e.g. "MSP/Service provider",
// "Systems Integrator (SI)"). If backward compatibility / migration is needed,
// map legacy forms to these canonical values before persisting.
module.exports.SERVICE_TYPES = [
  'MSP Service provider',
  'Systems Integrator',
  'Value Added Reseller',
  'Telco',
  'SaaS provider',
  'testing'
];

// Helper to normalize legacy inputs (silent fallback). Exported for registration flows.
const LEGACY_MAP = {
  'MSP/Service provider': 'MSP Service provider',
  'Systems Integrator (SI)': 'Systems Integrator',
  'Value Added Reseller (VAR)': 'Value Added Reseller'
};

module.exports.normalizeServiceType = function normalizeServiceType (value) {
  if (!value) return value;
  if (LEGACY_MAP[value]) return LEGACY_MAP[value];
  return value;
};
