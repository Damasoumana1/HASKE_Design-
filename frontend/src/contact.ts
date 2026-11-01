import { useEffect, useState } from 'react';
import { api } from './data';
import { isShowcase } from './siteMode';

export type SocialLink = { label: string; url: string };
export type ContactDetails = {
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  mapsUrl: string;
  socials: SocialLink[];
};

export const defaultContact: ContactDetails = {
  email: '',
  phone: '+226 74 03 35 29',
  whatsapp: '22674033529',
  location: 'Ouagadougou, Karpala',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Karpala%2C%20Ouagadougou%2C%20Burkina%20Faso',
  socials: [
    { label: 'Facebook', url: 'https://www.facebook.com/share/19f3hLtCKi/?mibextid=wwXIfr' },
    { label: 'TikTok', url: 'https://www.tiktok.com/' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],
};

export function externalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function whatsappUrl(number: string, message?: string): string {
  const digits = number.replace(/\D/g, '');
  const international = digits.length === 8 ? '226' + digits : digits;
  return 'https://wa.me/' + international + (message ? '?text=' + encodeURIComponent(message) : '');
}

export function useContact() {
  const [contact, setContact] = useState(defaultContact);
  useEffect(() => {
    if (isShowcase) return;
    let mounted = true;
    api<Partial<ContactDetails>>('/contact').then(data => {
      if (!mounted) return;
      setContact({
        email: data.email || '',
        phone: data.phone || defaultContact.phone,
        whatsapp: data.whatsapp || defaultContact.whatsapp,
        location: data.location || defaultContact.location,
        mapsUrl: externalUrl(data.mapsUrl || defaultContact.mapsUrl) || defaultContact.mapsUrl,
        socials: (data.socials?.length ? data.socials : defaultContact.socials).filter(s => s.label && externalUrl(s.url)),
      });
    }).catch(() => { /* Public contact remains available when the API is offline. */ });
    return () => { mounted = false; };
  }, []);
  return contact;
}
