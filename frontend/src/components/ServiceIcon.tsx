import type { ReactNode } from 'react';
import type { ServiceId } from '../data';

const artwork: Record<ServiceId, ReactNode> = {
  graphique: <><path d="m5 17 1-5L16 2l4 4-10 10-5 1Z M13 5l4 4 M6 12l4 4"/><path className="service-icon-accent" d="M4 21h16"/></>,
  impression: <><path d="M7 8V3h10v5 M7 17H4V8h16v9h-3 M7 14h10v7H7Z"/><path className="service-icon-accent" d="M16 11h1"/></>,
  textile: <><path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0Z"/><path className="service-icon-accent" d="M9 13h6 M9 16h4"/></>,
  objets: <><path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z M16 9h2a3 3 0 0 1 0 6h-2"/><path className="service-icon-accent" d="M7 2v3 M11 1v4"/></>,
  toile: <><path d="M3 3h18v18H3Z M6 6h12v12H6Z M6 16l4-5 3 3 2-2 3 4"/><circle className="service-icon-accent" cx="14.5" cy="8.5" r=".75"/></>,
};

export default function ServiceIcon({ service }: { service: ServiceId }) {
  return <span className="service-icon"><svg data-service-icon={service} aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{artwork[service]}</svg></span>;
}
