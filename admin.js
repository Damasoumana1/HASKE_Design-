'use strict';
(() => {
  const $ = s => document.querySelector(s);
  let page = 0;
  async function api(path, options = {}) {
    const r = await fetch(path, {...options, headers: {'Content-Type': 'application/json', 'X-Haske-Request': '1'}});
    const data = await r.json();
    if (r.status === 401) { $('#login').hidden = false; $('#dashboard').hidden = true; $('#logout').hidden = true; }
    if (!r.ok) throw new Error(data.error || 'Erreur serveur.');
    return data;
  }
  const node = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  async function load() {
    try {
      const data = await api('/api/admin/requests?page=' + page);
      $('#login').hidden = true; $('#dashboard').hidden = false; $('#logout').hidden = false;
      $('#admin-status').textContent = '';
      $('#mail-status').textContent = (data.smtpConfigured ? 'Messagerie configurée.' : 'Messagerie non configurée : renseignez les variables SMTP.') + ` ${data.pendingEmails} notification(s) en attente.`;
      $('#requests').replaceChildren();
      if (!data.requests.length) $('#requests').append(node('p', 'Aucune demande sur cette page.'));
      for (const request of data.requests) {
        const card = node('article', ''); card.className = 'request-card';
        card.append(node('h2', request.id), node('p', new Date(request.created).toLocaleString('fr-FR')));
        const label = node('label', 'Statut '), select = document.createElement('select');
        for (const status of data.statuses) { const option = node('option', status); option.value = status; select.append(option); }
        select.value = request.status;
        select.addEventListener('change', async () => {
          select.disabled = true;
          try { await api('/api/admin/requests/' + request.id, {method: 'PATCH', body: JSON.stringify({status: select.value})}); request.status = select.value; $('#admin-status').textContent = 'Statut enregistré.'; }
          catch (error) { select.value = request.status; $('#admin-status').textContent = error.message; }
          finally { select.disabled = false; }
        });
        label.append(select); card.append(label);
        const labels = {service:'Prestation', client:'Client', email:'E-mail', phone:'Téléphone', description:'Description', deadline:'Date souhaitée', budget:'Budget (FCFA)', references:'Références', consent_at:'Accord enregistré le'};
        const dl = document.createElement('dl');
        for (const [key, value] of Object.entries(request.payload)) {
          if (key === 'details' || !value) continue;
          dl.append(node('dt', labels[key] || key), node('dd', value));
        }
        for (const [key, value] of Object.entries(request.payload.details)) if (value) dl.append(node('dt', key), node('dd', value));
        card.append(dl);
        for (const file of request.files) { const a = node('a', 'Télécharger : ' + file.name); a.href = '/api/admin/files/' + file.id; a.className = 'file-link'; card.append(a); }
        $('#requests').append(card);
      }
      $('#page').textContent = 'Page ' + (page + 1); $('#previous').disabled = page === 0; $('#next').disabled = data.requests.length < 20;
    } catch (error) { $('#admin-status').textContent = error.message; }
  }
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/admin/login', {method: 'POST', body: JSON.stringify({password: $('#password').value})}); $('#password').value = ''; await load(); }
    catch (error) { $('#admin-status').textContent = error.message; }
  });
  $('#logout').addEventListener('click', async () => { try { await api('/api/admin/logout', {method:'POST', body:'{}'}); location.reload(); } catch (error) { $('#admin-status').textContent = error.message; } });
  $('#refresh').addEventListener('click', load);
  $('#previous').addEventListener('click', () => { page = Math.max(0, page - 1); load(); });
  $('#next').addEventListener('click', () => { page++; load(); });
  load();
})();
