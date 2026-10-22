/* One preset source in inert HTML templates; all visible and shared values derive from state. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = Object.fromEntries(['coffee', 'water', 'ice', 'ratio', 'ice-ratio', 'temperature'].map(key => [key, $('brew-' + key)]));
  const picker = $('brew-preset');
  let source, defaults, state;
  let pictureFile = null;
  let pictureVersion = 0;
  let pictureTimer;
  let downloadUrl;
  let sharing = false;
  let copyFeedbackTimer;
  const format = value => String(Math.round(value * 10) / 10);
  const value = key => source.querySelector(`[data-recipe-spec="${key}"] [data-recipe-value]`)?.dataset.recipeValue || '';
  const hasIce = () => state.iceRatio !== null;
  const dirty = () => Object.keys(defaults).some(key => state[key] !== defaults[key]);
  const masses = () => ({coffee: state.coffee, water: state.coffee * state.ratio, ice: state.coffee * (state.iceRatio || 0)});

  function loadPreset() {
    source = $('preset-' + picker.value).content;
    const iceRatio = source.querySelector('[data-recipe-ice-value]')?.dataset.recipeIceValue;
    defaults = {coffee: 15, ratio: Number(value('ratio')), iceRatio: iceRatio ? Number(iceRatio) : null, temperature: value('temperature')};
    state = {...defaults};
    $('preset-description').textContent = source.querySelector('.tagline')?.textContent.trim() || 'a timed, inverted brew';
    $('brew-equipment').textContent = value('brewer');
    $('brew-grind').textContent = value('grind');
    $('grind-row').hidden = !value('grind');
    const note = source.querySelector('.recipe-note')?.textContent.trim().replace(/^note\s*/, '') || '';
    $('brew-note').textContent = note;
    $('brew-note').hidden = !note;
    $('ice-field').hidden = $('ice-ratio-field').hidden = !hasIce();
    fields.ice.disabled = fields['ice-ratio'].disabled = !hasIce();
    clearErrors();
    render();
  }

  function clearErrors() {
    Object.values(fields).forEach(input => input.removeAttribute('aria-invalid'));
    $('brew-error').textContent = '';
    syncShareControls();
  }

  function render(skip) {
    const amounts = masses();
    const bloom = Math.min(amounts.water, amounts.coffee * 2.5);
    const calculations = {
      bloom: `${format(bloom)}g`,
      'remaining-half': `${format((amounts.water - bloom) / 2)}g`
    };
    const values = {...amounts, ratio: state.ratio, 'ice-ratio': state.iceRatio ?? 8, temperature: state.temperature};
    Object.entries(fields).forEach(([key, input]) => {
      if (input !== skip) input.value = key === 'temperature' ? values[key] : format(values[key]);
    });
    $('reset-brew').disabled = !dirty() && !Object.values(fields).some(field => field.hasAttribute('aria-invalid'));
    $('brew-summary').textContent = `${format(amounts.coffee)}g coffee · ${format(amounts.water)}g water${hasIce() ? ` · ${format(amounts.ice)}g ice` : ''} · ${state.temperature}°c`;
    // Replace original quantities in a single pass, preventing cascading replacements.
    const replacements = {[value('coffee') + 'g']: format(amounts.coffee) + 'g', [value('water') + 'g']: format(amounts.water) + 'g', [value('temperature') + '℃']: state.temperature + '°c'};
    const steps = [...source.querySelectorAll('.recipe-method > li')].map(step => {
      const clone = step.cloneNode(true);
      clone.querySelectorAll('[data-recipe-calculation]').forEach(slot => {
        slot.textContent = calculations[slot.dataset.recipeCalculation] || '';
      });
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) node.textContent = node.textContent.replace(/\d+(?:\.\d+)?(?:[–-]\d+(?:\.\d+)?)?(?:g|℃)/g, match => replacements[match] || match);
      return clone;
    });
    $('brew-method').replaceChildren(...steps);
    preparePicture();
    $('share-feedback').textContent = '';
    clearDownload();
  }

  function validTemperature(text) {
    if (!/^\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?$/.test(text)) return false;
    const parts = text.split(/[–-]/).map(Number);
    return parts.every(n => n >= 0 && n <= 100) && (parts.length === 1 || parts[0] <= parts[1]);
  }

  function update(key, input) {
    const text = input.value.trim();
    const number = Number(text);
    const zeroRatioConflict = (key === 'water' && state.ratio === 0 && number !== 0) ||
      (key === 'ice' && state.iceRatio === 0 && number !== 0);
    const valid = key === 'temperature' ? validTemperature(text) :
      text !== '' && Number.isFinite(number) && number >= 0 && number <= Number(input.max) && !zeroRatioConflict;
    if (!valid) {
      input.setAttribute('aria-invalid', 'true');
      $('brew-error').textContent = key === 'temperature' ? '' : zeroRatioConflict ?
        `${key} must be 0 when its ratio is 0.` : `enter a value from 0 to ${input.max}.`;
      syncShareControls();
      $('reset-brew').disabled = false;
      return;
    }
    input.removeAttribute('aria-invalid');
    if (!Object.values(fields).some(field => field.hasAttribute('aria-invalid'))) clearErrors();
    if (key === 'coffee') state.coffee = number;
    if (key === 'water') state.coffee = state.ratio === 0 ? 0 : number / state.ratio;
    if (key === 'ice') state.coffee = state.iceRatio === 0 ? 0 : number / state.iceRatio;
    if (key === 'ratio') state.ratio = number;
    if (key === 'ice-ratio') state.iceRatio = number;
    if (key === 'temperature') state.temperature = text.replace(/\s*[–-]\s*/, '–');
    // Keep a different field's unfinished input intact until it is corrected.
    const invalidValues = Object.values(fields).filter(field => field.hasAttribute('aria-invalid')).map(field => [field, field.value]);
    render(input);
    invalidValues.forEach(([field, val]) => { field.value = val; });
  }

  function recipeText() {
    const amounts = masses();
    const lines = [source.querySelector('.heading').textContent.trim(), '', `brewer: ${value('brewer')}`, `coffee: ${format(amounts.coffee)}g`, `water: ${format(amounts.water)}g`];
    if (hasIce()) lines.push(`ice: ${format(amounts.ice)}g`);
    lines.push(`ratio: 1:${format(state.ratio)}${hasIce() ? ':' + format(state.iceRatio) : ''}`, `water temperature: ${state.temperature}°c`);
    if (value('grind')) lines.push(`grind: ${value('grind')}`);
    lines.push('', 'method');
    $('brew-method').querySelectorAll('li').forEach((step, i) => {
      const clone = step.cloneNode(true);
      const time = clone.querySelector('.recipe-time');
      if (time) time.append(' ');
      lines.push(`${i + 1}. ${clone.textContent.trim()}`);
    });
    if ($('brew-note').textContent) lines.push('', 'note: ' + $('brew-note').textContent);
    lines.push('', 'from: alex-markin.com/coffee');
    return lines.join('\n') + '\n';
  }

  function syncShareControls() {
    const invalid = Object.values(fields).some(field => field.hasAttribute('aria-invalid'));
    $('copy-text').disabled = invalid || sharing;
    // Keep the invoking element active while the native share sheet is open so
    // browsers can retain it as the popover anchor instead of falling back.
    $('share-picture').disabled = invalid || !pictureFile;
  }

  function clearDownload() {
    $('save-share').hidden = true;
    $('save-share').removeAttribute('href');
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }

  // Prepare the PNG before the choice is clicked. Native share must be called
  // directly from that click, without waiting for fonts or canvas encoding.
  function preparePicture() {
    pictureFile = null;
    const version = ++pictureVersion;
    clearTimeout(pictureTimer);
    syncShareControls();
    pictureTimer = setTimeout(async () => {
      try {
        await document.fonts.ready;
        if (version !== pictureVersion) return;
        const text = recipeText();
        const key = picker.value;
        const blob = await recipePicture(text);
        if (version !== pictureVersion) return;
        pictureFile = new File([blob], `coffee-${key}.png`, {type: 'image/png'});
        syncShareControls();
      } catch (_) {
        if (version === pictureVersion) {
          $('share-feedback').textContent = 'picture unavailable. you can still copy as text.';
        }
      }
    }, 120);
  }

  function recipePicture(text) {
    const style = getComputedStyle(document.body);
    const token = name => style.getPropertyValue(name).trim();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('canvas unavailable'));
    const width = 1080, padding = 72;
    const mono = token('--mono'), serif = token('--serif');
    // A 2x rendering of the site's type scale, laid out independently of viewport.
    const font = (role, family, weight = 400) => `${weight} ${parseFloat(token(role)) * (token(role).endsWith('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1) * 2}px ${family}`;
    const bodyFont = font('--fs-body', serif);
    const titleFont = font('--fs-body', mono, 500);
    const metaFont = font('--fs-heading', mono, 500);
    const bodySize = parseFloat(bodyFont.split(' ')[1]);
    const lineHeight = bodySize * 1.55;
    const layout = [];
    let y = padding;
    function addWrapped(line, face, color, gap = 0) {
      ctx.font = face;
      let current = '';
      for (const word of line.split(/\s+/)) {
        const candidate = current ? current + ' ' + word : word;
        if (current && ctx.measureText(candidate).width > width - padding * 2) {
          layout.push({text: current, y, face, color});
          y += lineHeight;
          current = word;
        } else current = candidate;
      }
      if (current) { layout.push({text: current, y, face, color}); y += lineHeight; }
      y += gap;
    }
    addWrapped('coffee calculator', metaFont, token('--accent'), 16);
    const lines = text.trim().split('\n');
    lines.forEach((line, index) => {
      if (!line) { y += 24; return; }
      const annotation = line === 'method' || line.startsWith('from:');
      addWrapped(line.replace(/^from: /, ''), index === 0 ? titleFont : annotation ? metaFont : bodyFont,
        index === 0 ? token('--ink-bright') : annotation ? token('--accent') : token('--ink'), /^\d+\./.test(line) ? 10 : 0);
    });
    canvas.width = width;
    canvas.height = Math.ceil(y + padding);
    ctx.fillStyle = token('--bg');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    layout.forEach(line => {
      ctx.font = line.face;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, padding, line.y);
    });
    // Drop the uncompressed backing store as soon as encoding completes,
    // including failures. Only the small PNG/File needs to stay share-ready.
    return new Promise((resolve, reject) => {
      const release = () => { canvas.width = canvas.height = 0; };
      try {
        canvas.toBlob(blob => {
          release();
          if (blob) resolve(blob);
          else reject(new Error('image encoding failed'));
        }, 'image/png');
      } catch (error) {
        release();
        reject(error);
      }
    });
  }

  function offerDownload(file, message, startDownload = false) {
    clearDownload();
    downloadUrl = URL.createObjectURL(file);
    const link = $('save-share');
    link.href = downloadUrl;
    link.download = file.name;
    link.textContent = 'save picture';
    link.hidden = false;
    $('share-feedback').textContent = message;
    if (startDownload) link.click();
  }

  async function copyRecipeText() {
    if ($('copy-text').disabled) return;
    const text = recipeText();
    clearDownload();
    $('share-feedback').textContent = '';
    sharing = true;
    syncShareControls();
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); copied = true; }
        catch (_) { /* try the browser's legacy clipboard path below */ }
      }
      if (!copied) {
        const area = document.createElement('textarea');
        area.value = text;
        area.className = 'sr-only';
        document.body.append(area);
        try {
          area.focus({preventScroll: true});
          area.select();
          copied = document.execCommand('copy');
        } finally { area.remove(); }
      }
      if (copied) {
        const button = $('copy-text');
        clearTimeout(copyFeedbackTimer);
        $('copy-text-label').textContent = 'copied!';
        copyFeedbackTimer = setTimeout(() => { $('copy-text-label').textContent = 'copy as text'; }, 1000);
      } else {
        $('share-feedback').textContent = 'copy unavailable. select and copy the recipe text on this page.';
      }
    } catch (_) {
      $('share-feedback').textContent = 'copy unavailable. select and copy the recipe text on this page.';
    } finally {
      sharing = false;
      syncShareControls();
      $('copy-text').focus({preventScroll: true});
    }
  }

  async function shareRecipePicture() {
    if (sharing || $('share-picture').disabled || !pictureFile) return;
    const title = source.querySelector('.heading').textContent.trim();
    const file = pictureFile;
    const data = {title, files: [file]};
    const supported = typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' && navigator.canShare({files: [file]});
    clearDownload();
    $('share-feedback').textContent = '';
    if (!supported) {
      offerDownload(file, 'native sharing is unavailable here. your recipe is ready to save.', true);
      return;
    }
    sharing = true;
    try {
      syncShareControls();
      await navigator.share(data);
    } catch (error) {
      if (error.name !== 'AbortError') offerDownload(file, 'sharing could not open. try again or save your recipe.');
    } finally {
      sharing = false;
      syncShareControls();
      $('share-picture').focus({preventScroll: true});
    }
  }

  Object.entries(fields).forEach(([key, input]) => {
    input.addEventListener('input', () => update(key, input));
    if (key === 'temperature') return;
    input.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const increment = {coffee: 1, water: 25, ice: 25, ratio: 0.5, 'ice-ratio': 0.5}[key];
      const next = Number(input.value) + (event.key === 'ArrowUp' ? increment : -increment);
      if (next >= 0 && next <= Number(input.max)) {
        input.value = format(next);
        update(key, input);
      }
    });
  });
  picker.addEventListener('change', loadPreset);
  $('reset-brew').addEventListener('click', () => {
    loadPreset();
    $('brew-feedback').textContent = 'preset restored';
  });
  $('copy-text').addEventListener('click', copyRecipeText);
  $('share-picture').addEventListener('click', shareRecipePicture);
  window.addEventListener('pagehide', () => {
    clearDownload();
    clearTimeout(pictureTimer);
    clearTimeout(copyFeedbackTimer);
    ++pictureVersion; // An encoder finishing after departure cannot publish stale state.
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    $('copy-text-label').textContent = 'copy as text';
    if (!pictureFile) preparePicture();
  });
  loadPreset();
  $('coffee-app').hidden = false;
})();
