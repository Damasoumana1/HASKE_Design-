import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isShowcase } from '../siteMode';
import { defaultContact, useContact, whatsappUrl } from '../contact';

export default function Contact() {
  const contact = useContact();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#localisation') requestAnimationFrame(() => document.getElementById('localisation')?.scrollIntoView());
  }, [hash]);
  return <>
    <section className="page-intro wrap"><p className="eyebrow">Faisons connaissance</p><h1>Votre prochaine idée commence ici.</h1><p className="intro-text">Un projet précis, une envie à explorer ou une question sur un support ? Échangeons et donnons forme à votre idée.</p></section>
    <section className="contact-layout wrap section">
      <div className="contact-panel"><p className="eyebrow">Le meilleur point de départ</p><h2>Quelques informations.<br />Une vraie direction.</h2><p>{isShowcase ? 'Préparez votre projet en trois étapes puis partagez le brief sur WhatsApp avec l’atelier.' : 'Notre brief vous guide en trois étapes. Choisissez un savoir-faire, décrivez votre idée et transmettez vos coordonnées.'}</p><Link className="button" to="/brief">Préparer mon brief <span className="button-arrow" aria-hidden="true">↗</span></Link><p className="text-grey">La demande est sans engagement. Faisabilité, tarifs et délais seront à confirmer.</p></div>
      <div><p className="eyebrow">En direct avec l’atelier</p><h2>Parlons de votre projet.</h2><dl className="contact-list">
        <div><dt>WhatsApp</dt><dd><a className="contact-number" href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer">{contact.phone} <span className="button-arrow" aria-hidden="true">↗</span></a><p className="contact-hint">Un message, une question, une première idée.</p></dd></div>
        <div><dt>Téléphone</dt><dd><a href={'tel:' + contact.phone.replace(/[^+\d]/g, '')}>{contact.phone}</a></dd></div>
        {contact.email && <div><dt>E-mail</dt><dd><a href={'mailto:' + contact.email}>{contact.email}</a></dd></div>}
      </dl><a className="button outline" href={whatsappUrl(contact.whatsapp, 'Bonjour HASKE Design, je souhaite échanger sur mon projet.')} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp <span className="button-arrow" aria-hidden="true">↗</span></a></div>
    </section>
    <section id="localisation" className="location-section wrap section" aria-labelledby="location-title">
      <div className="location-visual" aria-hidden="true"><div className="location-orbit"><svg viewBox="0 0 64 80" fill="none"><path d="M32 75S6 45 6 29a26 26 0 0 1 52 0C58 45 32 75 32 75Z" stroke="currentColor" strokeWidth="3"/><circle cx="32" cy="29" r="9" fill="currentColor"/></svg></div><span>HASKE DESIGN · BURKINA FASO</span></div>
      <div><p className="eyebrow">À votre rencontre</p><h2 id="location-title">Où nous retrouver ?</h2><p className="location-address">{contact.location}</p><p>Retrouvez-nous à Karpala, à Ouagadougou. Contactez-nous pour convenir d’un échange et recevoir le point de rendez-vous exact. Les modalités de remise ou de livraison sont étudiées selon votre projet.</p><div className="hero-actions">{contact.mapsUrl && <a className="button" href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">{contact.mapsUrl === defaultContact.mapsUrl ? 'Voir le quartier sur Google Maps ↗' : 'Voir sur Google Maps ↗'}</a>}<a className={contact.mapsUrl ? 'text-link' : 'button'} href={whatsappUrl(contact.whatsapp, 'Bonjour HASKE Design, pouvez-vous m’envoyer votre localisation exacte à Karpala ?')} target="_blank" rel="noopener noreferrer">Recevoir la localisation exacte <span className="button-arrow" aria-hidden="true">↗</span></a></div></div>
    </section>
  </>;
}
