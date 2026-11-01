// Set only at build time. No secrets or internal service URLs go into the client.
export const isShowcase = import.meta.env.VITE_SITE_MODE === 'vitrine';
