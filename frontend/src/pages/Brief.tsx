import { t } from '../i18n';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorText, services } from '../data';
import type { Payload, ServiceId } from '../data';
import { PageIntro } from './Public';
import { isShowcase } from '../siteMode';
import { useContact, whatsappUrl } from '../contact';
const empty: Payload = { service: 'graphique', details: {}, description: '', client: '', email: '', phone: '', references: '', deadline: '', budget: '', consent: false, files: [], website: '' };
const draftKey = 'haske-react-brief-v1';
export default function Brief() {
    const contact = useContact();
    const [params] = useSearchParams();
    const initial = params.get('service');
    const [data, setData] = useState<Payload>({ ...empty, service: services.some(s => s.id === initial) ? initial as ServiceId : 'graphique' });
    const [step, setStep] = useState(1);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [success, setSuccess] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [fallback, setFallback] = useState('');
    const [draftAvailable, setDraftAvailable] = useState(() => { try {
        return !!localStorage.getItem(draftKey);
    }
    catch {
        return false;
    } });
    const attempt = useRef<{
        snapshot: string;
        key: string;
    } | null>(null);
    const lock = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);
    const resetDialog = useRef<HTMLDialogElement>(null);
    const service = services.find(s => s.id === data.service)!;
    function update<K extends keyof Payload>(key: K, value: Payload[K]) { setData(d => ({ ...d, [key]: value })); setMessage(''); attempt.current = null; }
    function changeStep(n: number) { setStep(n); setMessage(''); requestAnimationFrame(() => document.getElementById('brief-step-title')?.focus()); }
    function recap() { return t("HASKE DESIGN — BRIEF DE PROJET\n\n") + t(service.title) + '\n\n' + [...service.fields.map(f => [t(f.label), (f.options ? t(data.details[f.name] || '') : data.details[f.name]) || t("Non précisé")]), [t("Votre idée"), data.description], [t("Nom / organisation"), data.client], ['E-mail', data.email], [t("Téléphone"), data.phone], [t("Références"), data.references], [t("Date souhaitée"), data.deadline], [t("Budget indicatif (FCFA)"), data.budget]].filter(([, v]) => v).map(([k, v]) => k + ' : ' + v).join('\n\n') + t("\n\nBrief préparatoire. Faisabilité, tarifs et délais à confirmer. Ce document ne constitue pas une commande ni une preuve d’envoi."); }
    function save() { try {
        localStorage.setItem(draftKey, JSON.stringify({ ...data, files: [], consent: false }));
        setDraftAvailable(true);
        setMessage("Brouillon enregistré sur cet appareil, sans les fichiers. Pensez à l’effacer sur un appareil partagé.");
    }
    catch {
        setMessage("Le stockage local est indisponible. Vous pouvez exporter votre brief.");
    } }
    function restore() { try {
        const d = JSON.parse(localStorage.getItem(draftKey) || 'null');
        if (!d || !services.some(s => s.id === d.service) || typeof d.details !== 'object' || d.details === null)
            throw new Error();
        const strings = ['description', 'client', 'email', 'phone', 'references', 'deadline', 'budget'] as const;
        const restored = { ...empty, service: d.service as ServiceId, details: Object.fromEntries(Object.entries(d.details).filter(([, v]) => typeof v === 'string')) as Record<string, string> };
        for (const k of strings)
            if (typeof d[k] === 'string')
                restored[k] = d[k];
        setData(restored);
        setFiles([]);
        attempt.current = null;
        setStep(1);
        setMessage("Brouillon restauré. Ajoutez à nouveau vos pièces jointes.");
    }
    catch {
        setMessage("Ce brouillon est illisible. Vous pouvez le supprimer et recommencer.");
    } }
    function remove() { try {
        localStorage.removeItem(draftKey);
        setDraftAvailable(false);
        setMessage("Brouillon local supprimé.");
    }
    catch {
        setMessage("Impossible de supprimer le brouillon dans ce navigateur.");
    } }
    function pickFiles(list: FileList | null) { const picked = Array.from(list || []); if (picked.length > 3 || picked.some(f => f.size === 0 || f.size > 3 * 1024 * 1024 || f.name.length > 150 || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(f.type))) {
        setFiles([]);
        attempt.current = null;
        setMessage("Sélection refusée. Les pièces jointes ont été retirées. Choisissez au maximum 3 fichiers PDF, PNG, JPEG ou WebP non vides de 3 Mio chacun, avec un nom de 150 caractères maximum.");
        return false;
    } setFiles(picked); attempt.current = null; setMessage(''); return true; }
    async function submit(e: FormEvent) { e.preventDefault(); if (busy || lock.current)
        return; if (step === 2 && (!data.description.trim() || !data.client.trim() || service.fields.some(f => f.required && !data.details[f.name]?.trim()))) {
        setMessage("Complétez les champs obligatoires avec un contenu valide.");
        return;
    } if (step < 3) {
        changeStep(step + 1);
        return;
    } if (isShowcase) {
        window.open(whatsappUrl(contact.whatsapp, recap()), '_blank', 'noopener,noreferrer');
        setMessage("Votre brief est ouvert dans WhatsApp. Relisez-le puis envoyez-le dans la conversation. Aucun envoi automatique n’a été effectué.");
        return;
    } lock.current = true; setBusy(true); setMessage(''); try {
        const encoded = await Promise.all(files.map(file => new Promise<{
            name: string;
            data: string;
        }>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(',')[1] }); reader.onerror = () => reject(new Error(t("Impossible de lire le fichier ") + file.name)); reader.readAsDataURL(file); })));
        const payload = { ...data, details: { ...data.details, ...(data.details.quantity ? { quantity: String(Number(data.details.quantity)) } : {}) }, budget: data.budget ? String(Number(data.budget)) : '', files: encoded };
        const snapshot = JSON.stringify(payload);
        if (!attempt.current || attempt.current.snapshot !== snapshot)
            attempt.current = { snapshot, key: crypto.randomUUID() };
        const result = await api<{
            id: string;
        }>('/requests', 'POST', payload, attempt.current.key);
        setSuccess(result.id);
        try {
            localStorage.removeItem(draftKey);
        }
        catch { /* no persistence needed */ }
    }
    catch (e) {
        setMessage(errorText(e));
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    async function copy() { try {
        await navigator.clipboard.writeText(recap());
        setMessage("Brief copié.");
    }
    catch {
        setFallback(recap());
        setMessage("Copie automatique indisponible : sélectionnez le texte ci-dessous.");
    } }
    function download() { const url = URL.createObjectURL(new Blob(['\ufeff' + recap()], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'HASKE_Design_Brief.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    if (success)
        return <><PageIntro eyebrow={t("Demande enregistrée")} title={t("Votre idée est entre de bonnes mains.")} text={t("Votre brief a été enregistré. Conservez sa référence pour vos prochains échanges avec l’atelier.")}/><section className="wrap section"><div className="success-panel" role="status"><span className="eyebrow">{t("Référence de votre demande")}</span><h2>{success}</h2><p>{t("La prise en compte de votre demande ne constitue pas une confirmation de commande. Faisabilité, tarifs et délais restent à valider ensemble.")}</p><Link to="/" className="button">{t("Retour à l’accueil ↗")}</Link></div></section></>;
    return <><PageIntro eyebrow={t("Commençons ensemble")} title={t("Votre idée, notre point de départ.")} text={t("Trois étapes pour poser les bases de votre projet. Cette demande est sans engagement.")}/><section className="wrap brief-layout section"><aside className="brief-side"><p className="eyebrow">{t("Votre parcours")}</p><ol className="steps">{[t("Le savoir-faire"), t("Votre projet"), t("Vérifier et envoyer")].map((s, i) => <li key={s} aria-current={step === i + 1 ? 'step' : undefined}><span>0{i + 1}</span>{s}</li>)}</ol><div className="brief-side-note"><span aria-hidden="true">✳</span><h3>{t("Tout commence")}<br />{t("par une idée.")}</h3><p>{t("Pas besoin d’avoir toutes les réponses. Écrivez « À définir » lorsque vous hésitez.")}</p></div></aside><div><div className="draft-tools"><button type="button" disabled={busy} onClick={save}>{t("Enregistrer un brouillon")}</button>{draftAvailable && <><button type="button" disabled={busy} onClick={restore}>{t("Restaurer")}</button><button type="button" disabled={busy} onClick={remove}>{t("Supprimer le brouillon")}</button></>}<button type="button" disabled={busy} onClick={() => resetDialog.current?.showModal()}>{t("Recommencer")}</button></div><form ref={formRef} onSubmit={submit}><fieldset key={step} className="brief-stage" disabled={busy}><legend className="sr-only">{t("Brief de projet")}</legend><p className="eyebrow">{t("Étape 0")}{step} / 03</p><h2 id="brief-step-title" tabIndex={-1}>{step === 1 ? t("Quel univers explorons-nous ?") : step === 2 ? t("Racontez-nous votre projet.") : t("Tout est prêt ?")}</h2>{step === 1 && <div className="service-choices">{services.map((s, i) => <label key={s.id} className={data.service === s.id ? 'service-choice selected' : 'service-choice'}><input type="radio" name="service" value={s.id} checked={data.service === s.id} onChange={() => { attempt.current = null; setData(d => ({ ...d, service: s.id, details: {} })); }}/><span className="service-number">0{i + 1}</span><span><strong>{t(s.title)}</strong><small>{t(s.short)}</small></span><span aria-hidden="true">↗</span></label>)}</div>}{step === 2 && <><p className="text-grey">{t("Les champs marqués * sont obligatoires.")}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">{service.fields.map(f => <label className="field" key={f.name}>{t(f.label)}{f.required ? ' *' : ''}{f.options ? <select required={f.required} value={data.details[f.name] || ''} onChange={e => update('details', { ...data.details, [f.name]: e.target.value })}><option value="">{t("Choisir…")}</option>{f.options.map(o => <option key={o} value={o}>{t(o)}</option>)}</select> : <input type={f.type || 'text'} min={f.type === 'number' ? 1 : undefined} max={f.type === 'number' ? 1000000 : undefined} step={f.type === 'number' ? 1 : undefined} maxLength={350} required={f.required} placeholder={(f.placeholder ? t(f.placeholder) : undefined)} value={data.details[f.name] || ''} onChange={e => update('details', { ...data.details, [f.name]: e.target.value })}/>}</label>)}</div><label className="field">{t("Décrivez votre idée *")}<textarea required maxLength={3000} rows={5} value={data.description} onChange={e => update('description', e.target.value)} placeholder={t("Votre activité, le message à faire passer, vos envies…")}/></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5"><label className="field">{t("Date souhaitée")}<input type="date" value={data.deadline} onChange={e => update('deadline', e.target.value)}/></label><label className="field">{t("Budget indicatif (FCFA)")}<input type="number" min="0" max="1000000000" value={data.budget} onChange={e => update('budget', e.target.value)}/></label></div><label className="field">{t("Références / inspirations")}<textarea maxLength={1500} rows={3} value={data.references} onChange={e => update('references', e.target.value)}/></label><h3>{t("Comment vous recontacter ?")}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5"><label className="field">{t("Nom / organisation *")}<input required autoComplete="name" maxLength={150} value={data.client} onChange={e => update('client', e.target.value)}/></label><label className="field">E-mail *<input required type="email" autoComplete="email" maxLength={254} value={data.email} onChange={e => update('email', e.target.value)}/></label><label className="field">{t("Téléphone")}<input type="tel" autoComplete="tel" maxLength={60} value={data.phone} onChange={e => update('phone', e.target.value)}/></label></div>{!isShowcase && <><label className="field">{t("Pièces jointes facultatives")}<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => { if (!pickFiles(e.target.files))
        e.target.value = ''; }}/><small>{t("3 fichiers maximum · 3 Mio chacun · PDF, PNG, JPEG, WebP. Les fichiers ne sont pas sauvegardés dans le brouillon.")}</small></label>{files.length > 0 && <ul className="file-list">{files.map(f => <li key={f.name + f.size}>{f.name} <button type="button" onClick={() => { setFiles(fs => fs.filter(x => x !== f)); attempt.current = null; }}>{t("Retirer")}</button></li>)}</ul>}</>}</>}{step === 3 && <><div className="recap"><p className="eyebrow">{t("HASKE Design · Brief préparatoire")}</p><h3>{t(service.title)}</h3><dl>{[...service.fields.map(f => [t(f.label), f.options ? t(data.details[f.name] || '') : data.details[f.name]]), [t("Votre idée"), data.description], [t("Nom / organisation"), data.client], ['E-mail', data.email], [t("Téléphone"), data.phone], [t("Date souhaitée"), data.deadline], [t("Budget indicatif (FCFA)"), data.budget], [t("Références"), data.references], [t("Fichiers"), files.map(f => f.name).join(', ')]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div><div className="draft-tools"><button type="button" onClick={copy}>{t("Copier le brief")}</button><button type="button" onClick={download}>{t("Télécharger en .txt")}</button></div>{fallback && <label className="field">{t("Copie manuelle")}<textarea readOnly rows={8} value={fallback} onFocus={e => e.target.select()}/></label>}<label className="consent"><input required type="checkbox" checked={data.consent} onChange={e => update('consent', e.target.checked)}/><span>{isShowcase ? t("J’ai relu les informations que je souhaite partager sur WhatsApp. * ") : t("J’accepte que mes informations et fichiers soient utilisés pour étudier ma demande et me recontacter. * ")}<Link to="/confidentialite" target="_blank" rel="noopener noreferrer">{t("Confidentialité (nouvel onglet)")}</Link></span></label><p className="text-grey">{isShowcase ? t("Votre brief reste dans ce navigateur jusqu’au partage sur WhatsApp. Vous validerez vous-même son envoi dans la conversation.") : t("L’envoi enregistre votre demande auprès de l’atelier. Il ne confirme ni commande, ni prix, ni délai.")}</p></>}<div className="form-actions">{step > 1 && <button type="button" className="button outline" onClick={() => changeStep(step - 1)}>{t("← Retour")}</button>}<button className="button" type="submit">{busy ? t("Enregistrement…") : step === 3 ? (isShowcase ? t("Partager sur WhatsApp ↗") : t("Envoyer ma demande ↗")) : t("Continuer →")}</button></div></fieldset></form>{message && <p className="status-message" role="status">{t(message)}</p>}</div></section><dialog ref={resetDialog} aria-labelledby="reset-dialog-title" className="confirm-dialog"><h2 id="reset-dialog-title">{t("Recommencer le brief ?")}</h2><p>{t("Les informations saisies et le brouillon enregistré seront effacés.")}</p><div className="form-actions"><button className="button outline" onClick={() => resetDialog.current?.close()}>{t("Annuler")}</button><button className="button" onClick={() => { remove(); setData({ ...empty }); setFiles([]); setStep(1); setFallback(''); attempt.current = null; setMessage("Nouveau brief."); resetDialog.current?.close(); }}>{t("Recommencer")}</button></div></dialog></>;
}
