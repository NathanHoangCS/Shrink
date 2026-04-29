'use strict';

const state = {
  files: [],
  activeIndex: 0,
  format: 'jpeg',
  quality: 82,
  maxWidth: null,
  stripExif: true,
};

const $ = id => document.getElementById(id);
const dropZone      = $('dropZone');
const fileInput     = $('fileInput');
const browseBtn     = $('browseBtn');
const thumbStrip    = $('thumbStrip');
const thumbList     = $('thumbList');
const addMoreBtn    = $('addMoreBtn');
const controls      = $('controls');
const results       = $('results');
const resultStats   = $('resultStats');
const progressBar   = $('progressBar');
const progressFill  = $('progressFill');
const actions       = $('actions');
const downloadBtn   = $('downloadBtn');
const resetBtn      = $('resetBtn');
const qualitySlider = $('qualitySlider');
const qualityVal    = $('qualityVal');
const maxWidthInput = $('maxWidth');
const exifToggle    = $('exifToggle');
const formatPills   = document.querySelectorAll('.pill');
const historyBtn    = $('historyBtn');
const historyPanel  = $('historyPanel');
const historyList   = $('historyList');
const clearHistoryBtn = $('clearHistoryBtn');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles([...e.dataTransfer.files]);
});
dropZone.addEventListener('click', () => fileInput.click());
browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));
addMoreBtn.addEventListener('click', () => fileInput.click());

const ACCEPTED = ['image/jpeg','image/png','image/webp','image/gif'];

function handleFiles(incoming) {
  const valid = incoming.filter(f => ACCEPTED.includes(f.type));
  if (!valid.length) return;
  valid.forEach(file => {
    state.files.push({
      file,
      objectUrl: URL.createObjectURL(file),
      compressed: null,
      stats: null,
    });
  });
  showLoadedUI();
  compressAll();
}

function showLoadedUI() {
  dropZone.classList.add('hidden');
  thumbStrip.classList.remove('hidden');
  controls.classList.remove('hidden');
  results.classList.remove('hidden');
  actions.classList.remove('hidden');
  renderThumbs();
}

function resetUI() {
  state.files.forEach(f => URL.revokeObjectURL(f.objectUrl));
  state.files = [];
  state.activeIndex = 0;
  dropZone.classList.remove('hidden');
  thumbStrip.classList.add('hidden');
  controls.classList.add('hidden');
  results.classList.add('hidden');
  actions.classList.add('hidden');
  progressBar.classList.add('hidden');
  resultStats.innerHTML = '';
  thumbList.innerHTML = '';
  fileInput.value = '';
}

function renderThumbs() {
  thumbList.innerHTML = '';
  state.files.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'thumb-item' + (i === state.activeIndex ? ' active' : '');
    const img = document.createElement('img');
    img.src = item.objectUrl;
    const rm = document.createElement('button');
    rm.className = 'thumb-remove';
    rm.innerHTML = '×';
    rm.addEventListener('click', e => { e.stopPropagation(); removeFile(i); });
    div.appendChild(img);
    div.appendChild(rm);
    div.addEventListener('click', () => setActive(i));
    thumbList.appendChild(div);
  });
}

function setActive(i) {
  state.activeIndex = i;
  renderThumbs();
  renderStats();
}

function removeFile(i) {
  URL.revokeObjectURL(state.files[i].objectUrl);
  state.files.splice(i, 1);
  if (!state.files.length) { resetUI(); return; }
  state.activeIndex = Math.min(state.activeIndex, state.files.length - 1);
  renderThumbs();
  renderStats();
}

async function compressAll() {
  if (!state.files.length) return;
  const isBatch = state.files.length > 1;
  if (isBatch) { progressBar.classList.remove('hidden'); setProgress(0); }
  downloadBtn.disabled = true;
  for (let i = 0; i < state.files.length; i++) {
    await compressFile(i);
    if (isBatch) setProgress(((i + 1) / state.files.length) * 100);
  }
  downloadBtn.disabled = false;
  if (isBatch) setTimeout(() => progressBar.classList.add('hidden'), 600);
  renderStats();
}

function setProgress(pct) { progressFill.style.width = pct + '%'; }

function compressFile(i) {
  return new Promise(resolve => {
    const { file } = state.files[i];
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (state.maxWidth && w > state.maxWidth) {
        h = Math.round((h * state.maxWidth) / w);
        w = state.maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (state.format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      const mime = `image/${state.format}`;
      const q = state.format === 'png' ? undefined : state.quality / 100;
      canvas.toBlob(blob => {
        if (!blob) { resolve(); return; }
        state.files[i].compressed = blob;
        state.files[i].stats = {
          originalSize:   file.size,
          compressedSize: blob.size,
          saving: Math.round((1 - blob.size / file.size) * 100),
        };
        resolve();
      }, mime, q);
    };
    img.src = URL.createObjectURL(file);
  });
}

function renderStats() {
  resultStats.innerHTML = '';
  state.files.forEach(item => {
    if (!item.stats) return;
    const { originalSize, compressedSize, saving } = item.stats;
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <div class="stat-filename" title="${item.file.name}">${item.file.name}</div>
      <div class="stat-sizes">
        <span class="stat-original">${formatBytes(originalSize)}</span>
        <span class="stat-arrow">→</span>
        <span class="stat-compressed">${formatBytes(compressedSize)}</span>
        <span class="badge ${badgeClass(saving)}">${saving > 0 ? '-' : '+'}${Math.abs(saving)}%</span>
      </div>`;
    resultStats.appendChild(row);
  });
}

function badgeClass(s) {
  return s > 20 ? 'badge-green' : s >= 5 ? 'badge-yellow' : 'badge-grey';
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/(1024*1024)).toFixed(2) + ' MB';
}

formatPills.forEach(pill => {
  pill.addEventListener('click', () => {
    formatPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.format = pill.dataset.format;
    const qr = $('qualityRow');
    qr.style.opacity = state.format === 'png' ? '0.4' : '1';
    qr.style.pointerEvents = state.format === 'png' ? 'none' : '';
    compressAll();
  });
});

qualitySlider.addEventListener('input', () => {
  state.quality = parseInt(qualitySlider.value);
  qualityVal.textContent = state.quality + '%';
});
qualitySlider.addEventListener('change', () => compressAll());

maxWidthInput.addEventListener('change', () => {
  const v = parseInt(maxWidthInput.value);
  state.maxWidth = isNaN(v) || v <= 0 ? null : v;
  compressAll();
});

exifToggle.addEventListener('change', () => {
  state.stripExif = exifToggle.checked;
});

downloadBtn.addEventListener('click', async () => {
  const ready = state.files.filter(f => f.compressed);
  if (!ready.length) return;
  if (ready.length === 1) {
    downloadSingle(ready[0]);
  } else {
    await downloadZip(ready);
  }
  saveToHistory(ready);
});

function downloadSingle(item) {
  const ext = state.format === 'jpeg' ? 'jpg' : state.format;
  const base = item.file.name.replace(/\.[^.]+$/, '');
  triggerDownload(item.compressed, `${base}-shrink.${ext}`);
}

async function downloadZip(items) {
  downloadBtn.textContent = 'Zipping...';
  downloadBtn.disabled = true;
  const zip = new JSZip();
  const ext = state.format === 'jpeg' ? 'jpg' : state.format;
  items.forEach(item => {
    const base = item.file.name.replace(/\.[^.]+$/, '');
    zip.file(`${base}-shrink.${ext}`, item.compressed);
  });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, 'shrink-batch.zip');
  downloadBtn.textContent = 'Download';
  downloadBtn.disabled = false;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

resetBtn.addEventListener('click', resetUI);

historyBtn.addEventListener('click', () => {
  historyPanel.classList.remove('hidden');
  renderHistory();
});

clearHistoryBtn.addEventListener('click', () => {
  chrome.storage.local.set({ shrinkHistory: [] }, renderHistory);
});

function saveToHistory(items) {
  const entry = {
    date: Date.now(),
    files: items.map(item => ({
      name:           item.file.name,
      originalSize:   item.stats.originalSize,
      compressedSize: item.stats.compressedSize,
      saving:         item.stats.saving,
    })),
  };
  chrome.storage.local.get('shrinkHistory', data => {
    const history = data.shrinkHistory || [];
    history.unshift(entry);
    chrome.storage.local.set({ shrinkHistory: history.slice(0, 5) });
  });
}

function renderHistory() {
  chrome.storage.local.get('shrinkHistory', data => {
    const history = data.shrinkHistory || [];
    historyList.innerHTML = '';
    if (!history.length) {
      historyList.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:24px 0">No compressions yet</p>';
    } else {
      history.forEach(entry => {
        entry.files.forEach(f => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div>
              <div class="history-name">${f.name}</div>
              <div class="history-meta">${formatBytes(f.originalSize)} → ${formatBytes(f.compressedSize)} · ${new Date(entry.date).toLocaleDateString()}</div>
            </div>
            <span class="badge ${badgeClass(f.saving)}">${f.saving > 0 ? '-' : '+'}${Math.abs(f.saving)}%</span>`;
          historyList.appendChild(item);
        });
      });
    }
    const back = document.createElement('button');
    back.className = 'history-back-btn';
    back.textContent = '← Back';
    back.addEventListener('click', () => historyPanel.classList.add('hidden'));
    historyList.appendChild(back);
  });
}