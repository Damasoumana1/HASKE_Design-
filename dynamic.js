'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const panel = document.createElement('section');
  panel.className = 'send-panel';
  panel.innerHTML = `<h3>Transmettre mon projet</h3><p>Recevez une référence de demande. Nous étudierons votre projet avant de confirmer un devis.</p>
    <div class="field-grid"><div class="field"><label for="send-name">Votre nom / organisation *</label><input id="send-name" autocomplete="name" maxlength="150" required></div>
    <div class="field"><label for="send-email">Votre e-mail *</label><input id="send-email" type="email" autocomplete="email" maxlength="254" required></div></div>
    <div class="field"><label for="send-phone">Téléphone</label><input id="send-phone" type="tel" autocomplete="tel" maxlength="100"></div>
    <div class="field"><label for="send-files">Pièces jointes (facultatif)</label><input id="send-files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp"><small>3 fichiers maximum, 3 Mo par fichier : PDF, PNG, JPEG ou WebP. Ils ne sont pas inclus dans le brouillon local.</small></div>
    <div class="honeypot" aria-hidden="true"><label for="send-website">Site internet</label><input id="send-website" tabindex="-1" autocomplete="off"></div>
    <label class="consent"><input id="send-consent" type="checkbox"> <span>J’accepte que mes coordonnées, mon brief et mes fichiers soient utilisés pour traiter ma demande. <a href="/confidentialite" target="_blank" rel="noopener">Confidentialité</a></span></label>
    <button class="button" id="send-request" type="button">Envoyer ma demande ↗</button><p id="send-result" role="status" aria-live="polite"></p>`;
  $('#step-3').append(panel);
  let key = crypto.randomUUID();
  let sending = false;
  let sent = false;
  const resetAttempt = () => {
    key = crypto.randomUUID();
    sent = false;
    $('#send-request').disabled = sending;
    $('#send-result').textContent = '';
  };
  $('#brief-form').addEventListener('input', resetAttempt);
  $('#brief-form').addEventListener('change', resetAttempt);
  document.querySelectorAll('.service-start, #dialog-start').forEach(button => button.addEventListener('click', resetAttempt));
  $('#next-2').addEventListener('click', () => {
    if (!$('#send-name').value) $('#send-name').value = $('#client').value;
    if (!$('#send-email').value && $('#contact').value.includes('@')) $('#send-email').value = $('#contact').value;
  });
  $('#confirm-reset').addEventListener('click', () => {
    ['send-name', 'send-email', 'send-phone', 'send-files', 'send-website'].forEach(id => $('#' + id).value = '');
    $('#send-consent').checked = false;
    resetAttempt();
  });
  const encodeFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({name: file.name, data: reader.result.split(',')[1]});
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
  $('#send-request').addEventListener('click', async () => {
    if (sending || sent) return;
    const result = $('#send-result');
    for (const input of [$('#send-name'), $('#send-email')]) {
      if (!input.value.trim() || !input.reportValidity()) {
        input.focus(); result.textContent = 'Complétez votre nom et votre e-mail.'; return;
      }
    }
    if (!$('#send-consent').checked) { result.textContent = 'Veuillez accepter le traitement de votre demande.'; $('#send-consent').focus(); return; }
    const files = Array.from($('#send-files').files);
    if (files.length > 3 || files.some(f => f.size > 3 * 1024 * 1024)) { result.textContent = 'Maximum 3 fichiers de 3 Mo chacun.'; return; }
    sending = true; $('#send-request').disabled = true;
    result.textContent = 'Envoi en cours…';
    // Freeze a snapshot before asynchronous file reads.
    const payload = {
      service: $('input[name="service"]:checked')?.value,
      details: Object.fromEntries(Array.from($('#dynamic-fields').querySelectorAll('input,select')).map(el => [el.name, el.value])),
      description: $('#description').value, deadline: $('#deadline').value, budget: $('#budget').value,
      references: $('#references').value, client: $('#send-name').value.trim(), email: $('#send-email').value.trim(),
      phone: $('#send-phone').value.trim(), consent: true, website: $('#send-website').value
    };
    const attemptKey = key;
    try {
      payload.files = await Promise.all(files.map(encodeFile));
      const response = await fetch('/api/requests', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Haske-Request': '1', 'Idempotency-Key': attemptKey}, body: JSON.stringify(payload)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      sent = key === attemptKey;
      result.textContent = `Votre demande ${data.id} a été reçue. Conservez cette référence. Un e-mail de confirmation sera envoyé lorsque le service de messagerie sera disponible.`;
    } catch (error) {
      result.textContent = error instanceof SyntaxError || error instanceof TypeError ? 'Connexion au serveur impossible. Votre brief reste disponible ; réessayez.' : error.message;
    } finally {
      sending = false; $('#send-request').disabled = sent;
    }
  });
  fetch('/api/contact').then(r => r.ok ? r.json() : {}).then(contact => {
    const box = document.createElement('div'); box.className = 'contact-links wrap';
    const add = (label, href) => { const a = document.createElement('a'); a.textContent = label; a.href = href; box.append(a); };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email || '')) add(contact.email, 'mailto:' + contact.email);
    if (/^\+?[\d\s()-]+$/.test(contact.phone || '')) add(contact.phone, 'tel:' + contact.phone.replace(/[^+\d]/g, ''));
    if (/^\d{8,15}$/.test(contact.whatsapp || '')) add('Nous contacter sur WhatsApp', 'https://wa.me/' + contact.whatsapp);
    add('Confidentialité', '/confidentialite');
    $('footer').append(box);
  }).catch(() => {});
})();
