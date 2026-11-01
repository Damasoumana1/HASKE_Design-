'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const storageKey = 'haske-design-brief-v1';
  const form = $('#brief-form');
  let step = 1;
  let selected = '';
  let cached = {};
  let saved = false;
  let dialogService = '';
  const services = {
    graphique: { title: 'Conception graphique', icon: '✳', short: 'Une identité à votre image.', fields: [
      { name: 'creation', label: 'Création souhaitée', options: ['Logo / identité visuelle', 'Affiche / flyer', 'Visuel pour réseaux sociaux', 'Carte de visite / papeterie', 'Autre création graphique'], required: true },
      { name: 'usage', label: 'Utilisation prévue', options: ['Numérique', 'Imprimée', 'Numérique et imprimée', 'À définir'], required: true },
      { name: 'format', label: 'Formats et nombre de déclinaisons', placeholder: 'Ex. : 1 affiche A3 + 2 formats pour réseaux sociaux', wide: true },
      { name: 'existing', label: 'Éléments déjà disponibles', options: ['Tout est à créer', 'Logo disponible', 'Textes et images disponibles', 'Charte graphique disponible', 'À préciser ensemble'], required: true }
    ]},
    impression: { title: 'Impression publicitaire', icon: '▤', short: 'Production par des partenaires.', fields: [
      { name: 'support', label: 'Support à imprimer', options: ['Bâche', 'Kakémono', 'Flyer', 'Carte de visite', 'Autocollant / étiquette', 'Autre support'], required: true },
      { name: 'quantity', label: 'Quantité', type: 'number', min: 1, max: 1000000, required: true, placeholder: 'Ex. : 100' },
      { name: 'format', label: 'Dimensions / format', placeholder: 'Ex. : A5 ou largeur 100 × hauteur 200 cm', help: 'Précisez l’unité. Vous pouvez écrire « À définir ».', required: true, wide: true },
      { name: 'existing', label: 'État du visuel', options: ['Visuel prêt à imprimer', 'Visuel à adapter', 'Visuel à créer', 'À définir'], required: true },
      { name: 'finish', label: 'Matière / finition souhaitée', placeholder: 'Ex. : papier mat, adhésif transparent, à définir' },
      { name: 'location', label: 'Ville / lieu de remise souhaité', placeholder: 'Ex. : Ouagadougou', wide: true, help: 'Modalités et éventuels frais à confirmer.' }
    ]},
    textile: { title: 'Personnalisation textile', icon: '◇', short: 'Des pièces à votre image.', fields: [
      { name: 'support', label: 'Type de textile', options: ['T-shirt', 'Polo', 'Autre textile', 'À définir'], required: true },
      { name: 'quantity', label: 'Nombre de pièces', type: 'number', min: 1, max: 1000000, required: true, placeholder: 'Ex. : 20' },
      { name: 'sizes', label: 'Tailles et couleurs', placeholder: 'Ex. : 5 S, 10 M, 5 L ; blanc et bleu marine', required: true, help: 'Écrivez « À définir » si vous hésitez.', wide: true },
      { name: 'placement', label: 'Emplacement du marquage', options: ['Devant', 'Dos', 'Devant et dos', 'Manche(s)', 'Plusieurs emplacements, à préciser', 'À définir'], required: true },
      { name: 'supply', label: 'Fourniture des textiles', options: ['Je fournis les textiles', 'Je souhaite être accompagné(e)', 'À définir'], required: true },
      { name: 'existing', label: 'État du visuel', options: ['Visuel disponible', 'Visuel à adapter', 'Visuel à créer', 'À définir'], required: true },
      { name: 'material', label: 'Matière et taille du marquage', placeholder: 'Ex. : coton, logo de 10 cm sur la poitrine', help: 'La technique sera confirmée selon la matière et le visuel.' }
    ]},
    toile: { title: 'Créations sur toile', icon: '▧', short: 'Une création pour votre décor.', fields: [
      { name: 'creation', label: 'Type de création', options: ['Tableau personnalisé', 'Peinture sur toile', 'À définir ensemble'], required: true },
      { name: 'quantity', label: 'Nombre de pièces', type: 'number', min: 1, max: 1000000, required: true, placeholder: 'Ex. : 1' },
      { name: 'format', label: 'Dimensions souhaitées', placeholder: 'Ex. : 40 × 60 cm ou « À définir »', required: true },
      { name: 'ambience', label: 'Style / ambiance', placeholder: 'Ex. : abstrait, portrait, citation, couleurs douces', required: true },
      { name: 'occasion', label: 'Destination / occasion', placeholder: 'Ex. : salon, bureau, anniversaire, cadeau' },
      { name: 'frame', label: 'Encadrement', options: ['Souhaité, à étudier', 'Sans encadrement', 'À définir'] }
    ]}
  };
  const projects = {
    graphique: { title: 'Une signature, partout.', text: 'Une mise en situation de l’identité HASKE Design sur des cartes de visite. Logo, couleurs et mise en page créent un ensemble cohérent, à décliner sur vos propres supports.' },
    impression: { title: 'Faites-vous remarquer.', text: 'Une visualisation de l’identité HASKE Design dans l’espace. Pour votre projet d’impression, précisez le support, les dimensions et les quantités. La production est confiée à des partenaires et les possibilités techniques sont à confirmer.' },
    textile: { title: 'Portez vos couleurs.', text: 'Une maquette de polo et de casquette aux couleurs de HASKE Design. Votre projet de personnalisation dépendra du textile, du visuel et de l’emplacement du marquage ; la faisabilité sera vérifiée avant réalisation.' },
    toile: { title: 'Un intérieur à votre image.', text: 'Une composition abstraite illustrative, imaginée dans les couleurs de la marque. Elle présente une intention de décoration : votre création sur toile sera définie selon le style, le format et l’occasion souhaités.' }
  };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = message => { $('#config-status').textContent = message; };
  const markChanged = () => {
    $('#draft-state').textContent = saved ? 'Modifications non enregistrées' : 'Brouillon non enregistré';
    status('');
  };
  function captureFields() {
    if (!selected) return;
    cached[selected] = Object.fromEntries($$('input, select, textarea', $('#dynamic-fields')).map(el => [el.name, el.value]));
  }
  function renderFields() {
    const container = $('#dynamic-fields');
    if (!services[selected]) { container.replaceChildren(); return; }
    container.innerHTML = services[selected].fields.map(f => {
      const id = 'detail-' + f.name;
      const required = f.required ? ' required' : '';
      const described = f.help ? ' aria-describedby="' + id + '-help"' : '';
      let control;
      if (f.options) control = '<select id="'+id+'" name="'+f.name+'"'+required+described+'><option value="">Choisir…</option>'+f.options.map(v => '<option>'+escape(v)+'</option>').join('')+'</select>';
      else control = '<input id="'+id+'" name="'+f.name+'" type="'+(f.type || 'text')+'"'+required+described+' maxlength="350"'+(f.type === 'number' ? ' min="'+f.min+'" max="'+f.max+'" step="1"' : '')+' placeholder="'+escape(f.placeholder || '')+'">';
      return '<div class="field'+(f.wide ? ' field-wide' : '')+'"><label for="'+id+'">'+escape(f.label)+(f.required ? ' <span class="required">*</span>' : '')+'</label>'+control+(f.help ? '<small id="'+id+'-help">'+escape(f.help)+'</small>' : '')+'</div>';
    }).join('');
    for (const el of $$('input, select', container)) el.value = cached[selected]?.[el.name] || '';
  }
  function updateSide() {
    const s = services[selected];
    $('#side-icon').textContent = s?.icon || '✳';
    $('#side-title').textContent = s?.title || 'Tout commence par une idée.';
    $('#side-detail').textContent = s?.short || 'Choisissez votre savoir-faire.';
  }
  function setStep(value, focus = true) {
    step = value;
    $$('.form-step').forEach((el, i) => { el.hidden = i !== value - 1; });
    $$('.steps li').forEach((el, i) => {
      el.classList.toggle('current', i === value - 1);
      el.classList.toggle('done', i < value - 1);
      if (i === value - 1) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
    });
    $('#step-count').textContent = 'ÉTAPE 0' + value + ' / 03';
    status('');
    if (value === 3) renderRecap();
    if (focus) {
      const h = $('#step-' + value + ' h3');
      h.focus({preventScroll:true});
      h.scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  function chooseService(id, advance = false) {
    if (!services[id]) return;
    captureFields();
    selected = id;
    $('input[name="service"][value="'+id+'"]').checked = true;
    $('#service-error').hidden = true;
    renderFields(); updateSide(); markChanged();
    if (advance) {
      setStep(2,false);
      $('#configurateur').scrollIntoView({block:'start'});
      $('#step-2 h3').focus({preventScroll:true});
    }
  }
  function validateDetails() {
    let valid = true;
    let first;
    for (const el of $$('input, select, textarea', $('#step-2'))) {
      const emptyRequired = el.required && !el.value.trim();
      const bad = emptyRequired || !el.checkValidity();
      el.classList.toggle('invalid',bad);
      if (bad) { el.setAttribute('aria-invalid','true'); first ||= el; valid = false; }
      else el.removeAttribute('aria-invalid');
    }
    $('#details-error').hidden = valid;
    if (first) { first.focus(); first.reportValidity(); }
    return valid;
  }
  function getRows() {
    captureFields();
    const rows = services[selected].fields.map(f => [f.label, (cached[selected]?.[f.name] || '').trim()]);
    rows.push(['Votre idée', $('#description').value.trim()]);
    if ($('#deadline').value) rows.push(['Date souhaitée', new Date($('#deadline').value + 'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})]);
    if ($('#budget').value) rows.push(['Budget indicatif', Number($('#budget').value).toLocaleString('fr-FR')+' FCFA']);
    rows.push(['Nom / organisation',$('#client').value.trim()],['Téléphone ou e-mail',$('#contact').value.trim()],['Références',$('#references').value.trim()]);
    return rows.filter(([,value]) => value);
  }
  function renderRecap() {
    const root = $('#recap'); root.replaceChildren();
    const head = document.createElement('div'); head.className = 'recap-head';
    const title = document.createElement('strong'); title.textContent = services[selected].title;
    const tag = document.createElement('span'); tag.textContent = 'HASKE DESIGN · BRIEF DE PROJET';
    head.append(title,tag);
    const dl = document.createElement('dl');
    for (const [label,value] of getRows()) { const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);dl.append(row); }
    root.append(head,dl); $('#copy-fallback').hidden = true;
  }
  function briefText() {
    return 'HASKE DESIGN — BRIEF DE PROJET\nPersonnalisez votre univers.\n\nPRESTATION : '+services[selected].title+'\n\n'+getRows().map(([label,value]) => label+' :\n'+value).join('\n\n')+'\n\n---\nBrief préparatoire. Faisabilité, tarifs et délais à confirmer avec HASKE Design.\n'+(selected === 'impression' ? 'L’impression est réalisée en sous-traitance par des prestataires partenaires.\n' : '')+'Ce fichier est un brief préparatoire ; il ne constitue pas une preuve d’envoi, de paiement ou de commande.\n';
  }
  $$('input[name="service"]').forEach(el => el.addEventListener('change',() => chooseService(el.value)));
  $$('.service-start').forEach(el => el.addEventListener('click',() => chooseService(el.dataset.service,true)));
  $('#next-1').addEventListener('click',() => {
    if (!selected) { $('#service-error').hidden=false; $('input[name="service"]').focus(); return; }
    setStep(2);
  });
  $('#next-2').addEventListener('click',() => { if (validateDetails()) setStep(3); });
  $('#back-2').addEventListener('click',() => {captureFields();setStep(1);});
  $('#back-3').addEventListener('click',() => setStep(2));
  form.addEventListener('submit',e => {e.preventDefault(); if(step===1) $('#next-1').click(); else if(step===2) $('#next-2').click();});
  form.addEventListener('input',e => { if(e.target.matches('input, select, textarea')) {e.target.classList.remove('invalid');e.target.removeAttribute('aria-invalid');markChanged();} });
  form.addEventListener('change',markChanged);
  $('#copy-brief').addEventListener('click',async () => {
    const content = briefText();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      status('Brief copié. Vous choisissez où et quand le partager.');
    } catch {
      $('#copy-fallback').hidden = false; $('#copy-text').value = content; $('#copy-text').focus(); $('#copy-text').select();
      status('La copie automatique est indisponible. Votre brief est sélectionné ci-dessous pour une copie manuelle.');
    }
  });
  $('#download-brief').addEventListener('click',() => {
    const url=URL.createObjectURL(new Blob(['\ufeff'+briefText()],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='HASKE_Design_Brief_'+selected+'.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status('Fichier texte préparé pour le téléchargement. Aucun envoi n’a été effectué.');
  });
  function draftData() {
    captureFields();
    return {version:1,service:selected,details:cached,common:Object.fromEntries(['description','deadline','budget','client','contact','references'].map(id=>[id,$('#'+id).value]))};
  }
  $('#save-draft').addEventListener('click',() => {
    if (!selected) {status('Choisissez d’abord une prestation pour enregistrer un brouillon.');return;}
    try {localStorage.setItem(storageKey,JSON.stringify(draftData()));saved=true;$('#draft-state').textContent='Brouillon enregistré sur cet appareil';$('#delete-draft').hidden=false;status('Brouillon enregistré dans ce navigateur. Pensez à l’effacer sur un appareil partagé.');}
    catch {status('L’enregistrement local est indisponible. Vous pouvez continuer et télécharger votre brief.');}
  });
  $('#delete-draft').addEventListener('click',() => {
    try {localStorage.removeItem(storageKey);saved=false;$('#delete-draft').hidden=true;$('#draft-state').textContent='Brouillon non enregistré';status('Brouillon enregistré effacé. Le formulaire actuel reste disponible jusqu’à sa fermeture.');}
    catch {status('Ce navigateur ne permet pas d’effacer le brouillon.');}
  });
  $('#reset').addEventListener('click',() => $('#reset-dialog').showModal());
  $('#cancel-reset').addEventListener('click',() => $('#reset-dialog').close());
  $('#confirm-reset').addEventListener('click',() => {
    try {localStorage.removeItem(storageKey);} catch {}
    form.reset();selected='';cached={};saved=false;renderFields();updateSide();
    $('#service-error').hidden=true;$('#details-error').hidden=true;$('#delete-draft').hidden=true;$('#draft-state').textContent='Brouillon non enregistré';
    $$('.invalid',form).forEach(el=>{el.classList.remove('invalid');el.removeAttribute('aria-invalid');});
    $('#reset-dialog').close();setStep(1);status('Un nouveau brief peut commencer.');
  });
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored?.version===1 && Object.hasOwn(services,stored.service)) {
      cached=stored.details && typeof stored.details==='object' ? stored.details : {};
      chooseService(stored.service);
      for(const id of ['description','deadline','budget','client','contact','references']) if(typeof stored.common?.[id]==='string') $('#'+id).value=stored.common[id];
      saved=true;$('#delete-draft').hidden=false;$('#draft-state').textContent='Brouillon enregistré retrouvé';status('Votre brouillon enregistré sur cet appareil a été restauré.');
    }
  } catch {}
  const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());$('#deadline').min=today.toISOString().slice(0,10);
  $('#year').textContent=new Date().getFullYear();
  $$('.filter').forEach(el => el.addEventListener('click',() => {
    $$('.filter').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $$('.project-card').forEach(card=>card.hidden=el.dataset.filter!=='all'&&card.dataset.category!==el.dataset.filter);
  }));
  const dialog=$('#project-dialog');
  $$('.project-card').forEach(card=>card.addEventListener('click',()=>{
    dialogService=card.dataset.project;const p=projects[dialogService];
    $('#dialog-title').textContent=p.title;$('#dialog-description').textContent=p.text;
    const visual=$('.project-image',card).cloneNode(true);$('span',visual)?.remove();visual.classList.remove('project-image');
    $('#dialog-visual').replaceChildren(visual);
    if(visual.tagName==='DIV'&&!visual.classList.contains('canvas-scene')){const img=$('img',visual);$('#dialog-visual').replaceChildren(img);}
    dialog.showModal();
  }));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  $('#dialog-start').addEventListener('click',()=>{dialog.close();chooseService(dialogService,true);});
  $$('dialog').forEach(el=>el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}}));
  const toggle=$('.menu-toggle'),menu=$('#mobile-nav');
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'Ouvrir le menu':'Fermer le menu');menu.hidden=open;});
  $$('a',menu).forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir le menu');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Ouvrir le menu');toggle.focus();}});
})();
