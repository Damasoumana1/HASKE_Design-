import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError, errorText, services } from '../data';
import type { Payload } from '../data';
import { PageIntro } from './Public';
type Request = {
    id: string;
    created: string;
    status: string;
    payload: Payload & {
        consent_at?: string;
    };
    files: {
        id: string;
        name: string;
    }[];
};
type Dashboard = {
    requests: Request[];
    statuses: string[];
    pendingEmails: number;
    smtpConfigured: boolean;
};
export default function Admin() {
    const [logged, setLogged] = useState(false);
    const [password, setPassword] = useState('');
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [selected, setSelected] = useState('');
    const [page, setPage] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const current = dashboard?.requests.find(r => r.id === selected);
    const loadSequence = useRef(0);
    async function load(p = page, silentAuth = false) { const sequence = ++loadSequence.current; setBusy(true); setError(''); try {
        const d = await api<Dashboard>('/admin/requests?page=' + p);
        if (sequence !== loadSequence.current)
            return;
        setDashboard(d);
        setLogged(true);
        setSelected(s => d.requests.some(r => r.id === s) ? s : d.requests[0]?.id || '');
    }
    catch (e) {
        if (sequence === loadSequence.current) {
            if (e instanceof ApiError && e.status === 401) {
                setLogged(false);
                setDashboard(null);
                setSelected('');
            }
            setError(silentAuth && e instanceof ApiError && e.status === 401 ? '' : errorText(e));
        }
    }
    finally {
        if (sequence === loadSequence.current)
            setBusy(false);
    } }
    useEffect(() => { void load(0, true); }, []);
    async function login(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try {
        await api('/admin/login', 'POST', { password });
        setPassword('');
        setPage(0);
        await load(0);
    }
    catch (e) {
        setError(errorText(e));
        setBusy(false);
    } }
    async function logout() { setBusy(true); try {
        await api('/admin/logout', 'POST', {});
        loadSequence.current++;
        setLogged(false);
        setDashboard(null);
        setSelected('');
        setError('');
    }
    catch (e) {
        if (e instanceof ApiError && e.status === 401) {
            setLogged(false);
            setDashboard(null);
            setSelected('');
        }
        setError(errorText(e));
    }
    finally {
        setBusy(false);
    } }
    async function status(value: string) { if (!current)
        return; setBusy(true); setError(''); try {
        await api('/admin/requests/' + encodeURIComponent(current.id), 'PATCH', { status: value });
        setDashboard(d => d ? { ...d, requests: d.requests.map(r => r.id === current.id ? { ...r, status: value } : r) } : d);
    }
    catch (e) {
        if (e instanceof ApiError && e.status === 401) {
            setLogged(false);
            setDashboard(null);
            setSelected('');
        }
        setError(errorText(e));
    }
    finally {
        setBusy(false);
    } }
    if (!logged)
        return <><PageIntro eyebrow="Espace privé" title="L’atelier, côté gestion." text="Connectez-vous pour consulter et suivre les demandes de projets."/><section className="wrap section"><form onSubmit={login} className="login-panel"><h2>Connexion</h2><label className="field">Mot de passe administrateur<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label><button className="button" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter →'}</button>{error && <p role="alert">{error}</p>}</form></section></>;
    return <section className="wrap admin section"><div className="section-heading"><div><p className="eyebrow">Administration sécurisée</p><h1>Les projets.</h1></div><div className="admin-actions flex flex-wrap gap-4"><button className="button outline" disabled={busy} onClick={() => load()}>Actualiser</button><button className="button" disabled={busy} onClick={logout}>Déconnexion</button></div></div>{error && <p role="alert" className="status-message">{error}</p>}{busy && <p role="status">Chargement en cours…</p>}{dashboard && <><div className="admin-metrics"><p><strong>{dashboard.requests.length}</strong> demandes sur cette page</p><p><strong>{dashboard.pendingEmails}</strong> notifications e-mail en attente</p><p>Service e-mail <strong>{dashboard.smtpConfigured ? 'configuré' : 'non configuré'}</strong></p></div><div className="admin-layout"><aside className="request-list" aria-label="Demandes de la page">{dashboard.requests.length === 0 ? <p>Aucune demande sur cette page.</p> : dashboard.requests.map(r => <button disabled={busy} className={selected === r.id ? 'request selected' : 'request'} key={r.id} onClick={() => setSelected(r.id)}><span>{r.id}</span><strong>{r.payload.client}</strong><span>{services.find(s => s.id === r.payload.service)?.title || r.payload.service}</span><small>{r.status} · {new Date(r.created).toLocaleDateString('fr-FR')}</small></button>)}<div className="pagination"><button className="button outline small" disabled={page === 0 || busy} onClick={() => { const p = page - 1; setPage(p); void load(p); }}>← Précédent</button><span>Page {page + 1}</span><button className="button outline small" disabled={dashboard.requests.length < 20 || busy} onClick={() => { const p = page + 1; setPage(p); void load(p); }}>Suivant →</button></div></aside><article className="request-detail">{current ? <><div className="request-header"><div><p className="eyebrow">{current.id}</p><h2>{current.payload.client}</h2><p>{new Date(current.created).toLocaleString('fr-FR')}</p></div><label className="field">Statut<select value={current.status} disabled={busy} onChange={e => status(e.target.value)}>{dashboard.statuses.map(s => <option key={s}>{s}</option>)}</select></label></div><h3>{services.find(s => s.id === current.payload.service)?.title || current.payload.service}</h3><dl className="admin-dl">{[['Description', current.payload.description], ['E-mail', current.payload.email], ['Téléphone', current.payload.phone], ['Date souhaitée', current.payload.deadline], ['Budget indicatif (FCFA)', current.payload.budget], ['Références', current.payload.references], ...Object.entries(current.payload.details).map(([k, v]) => [services.find(s => s.id === current.payload.service)?.fields.find(f => f.name === k)?.label || k, v]), ['Consentement', current.payload.consent_at ? 'Accepté le ' + new Date(current.payload.consent_at).toLocaleString('fr-FR') : 'Non renseigné']].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><h3>Pièces jointes</h3>{current.files.length ? <ul className="file-list">{current.files.map(f => <li key={f.id}><a href={'/api/admin/files/' + encodeURIComponent(f.id)} download>{f.name} ↓</a></li>)}</ul> : <p>Aucun fichier joint.</p>}</> : <div className="empty-state"><h2>Aucune demande sélectionnée.</h2><p>Les projets reçus apparaîtront ici.</p></div>}</article></div></>}</section>;
}
