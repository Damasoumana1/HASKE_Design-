import { Link } from 'react-router-dom';
import { useContact, whatsappUrl } from '../contact';

export default function Footer() {
  const contact = useContact();
  const networks = [
    { label: 'Facebook', mark: 'f' },
    { label: 'TikTok', mark: '♪' },
    { label: 'LinkedIn', mark: 'in' },
  ];
  return (
    <footer className="site-footer">
      <div className="footer-invite">
        <div><p className="eyebrow">Une idée à partager ?</p><h2>Votre univers.<br />Notre prochaine conversation.</h2></div>
        <a className="button" href={whatsappUrl(contact.whatsapp, 'Bonjour HASKE Design, je souhaite échanger sur mon projet.')} target="_blank" rel="noopener noreferrer">Discuter sur WhatsApp <span className="button-arrow" aria-hidden="true">↗</span></a>
      </div>
      <div className="footer-columns">
        <div className="footer-about">
          <Link to="/" className="footer-brand" aria-label="HASKE Design, accueil">HASKE<span>DESIGN</span></Link>
          <p>Graphisme, impression, textile, objets et toile.<br />Personnalisez votre univers.</p>
        </div>
        <nav aria-label="Navigation de pied de page">
          <h3>Explorer</h3>
          <Link to="/">Accueil</Link><Link to="/services">Nos savoir-faire</Link><Link to="/realisations">Réalisations</Link><Link to="/a-propos">L’atelier</Link><Link to="/contact">Contact</Link>
        </nav>
        <div className="footer-contact">
          <h3>Retrouvons-nous</h3>
          <p>{contact.location}</p>
          <a className="footer-phone" href={'tel:' + contact.phone.replace(/[^+\d]/g, '')}>{contact.phone}</a>
          {contact.email && <a href={'mailto:' + contact.email}>{contact.email}</a>}
          <Link to="/contact#localisation">Notre localisation <span className="button-arrow" aria-hidden="true">↗</span></Link>
        </div>
        <div className="footer-socials">
          <h3>Restons connectés</h3>
          <div className="social-links">
            <a href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer"><span className="social-mark" aria-hidden="true">↗</span><span>WhatsApp</span></a>
            {networks.map(network => {
              const social = contact.socials.find(s => s.label === network.label);
              const content = <><span className="social-mark" aria-hidden="true">{network.mark}</span><span>{network.label}</span></>;
              return social
                ? <a key={network.label} href={social.url} target="_blank" rel="noopener noreferrer">{content}<span aria-hidden="true">↗</span></a>
                : <span className="social-pending" key={network.label} title="Lien bientôt disponible">{content}<small>Bientôt</small></span>;
            })}
            {contact.socials.filter(s => !networks.some(n => n.label === s.label)).map(social => <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer"><span className="social-mark" aria-hidden="true">{social.label.slice(0, 1)}</span><span>{social.label}</span><span aria-hidden="true">↗</span></a>)}
          </div>
          {!contact.socials.length && <p>Échangeons directement sur WhatsApp pour parler de votre projet.</p>}
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} HASKE Design · Burkina Faso</span><span>Créativité. Simplicité. Proximité.</span><Link to="/confidentialite">Confidentialité</Link></div>
    </footer>
  );
}
