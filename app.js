/* Supabase seam: work.metadata maps to Database rows; work.files maps to original files in Storage. */
const defaultWorks = [
  {id:'83e7b1fa-6c14-450b-afa9-500854317af5',title:'シュリンプアクアリウム',model:'Grok4.5',ai:'Grok',date:'2026.08.30',prompt:'3D シュリンプアクアリウム',memo:'アクアリウムシミュレーター（エビ）AI比較企画。5回修正',kind:'WEB WORK',art:'art-a',sample:false,href:'https://pgybuocqlhltepfnubfr.supabase.co/storage/v1/object/public/ai-works/83e7b1fa-6c14-450b-afa9-500854317af5/index.html'},
  {id:'8bc53c94-1a7d-4793-98ef-eb3f5cca87de',title:'シュリンプガーデン',model:'5.6 sol',ai:'GPT',date:'2026.08.30',prompt:'淡水エビの小宇宙',memo:'',kind:'WEB WORK',art:'art-b',sample:false,href:'https://pgybuocqlhltepfnubfr.supabase.co/storage/v1/object/public/ai-works/8bc53c94-1a7d-4793-98ef-eb3f5cca87de/index.html'},
  
];

const categories = [
  {key:'GPT', label:'GPT', symbol:'G', icon:'assets/ai-category-gpt.png'},
  {key:'Claude', label:'Claude', symbol:'C', icon:'assets/ai-category-claude.png'},
  {key:'Gemini', label:'Gemini', symbol:'Gm', icon:'assets/ai-category-gemini.png'},
  {key:'Grok', label:'Grok', symbol:'X', icon:'assets/ai-category-grok.png'},
  {key:'Qwen', label:'Qwen', symbol:'Q', icon:'assets/ai-category-qwen.png'},
  {key:'Other', label:'その他', symbol:'+', icon:'assets/ai-category-other.png'}
];

const THEME_STORAGE_KEY = 'ai-works-theme';
const FAVORITES_STORAGE_KEY = 'ai-works-favorites';
const PORTABLE_SCHEMA_VERSION = 'ai-works/1.0';
const clone = (value) => JSON.parse(JSON.stringify(value));
const $ = (selector) => document.querySelector(selector);

/* Supabase Auth adapter. Session persistence is handled by supabase-js. */
const authRepository = {
  session: null,
  admin: false,
  async initialize() {
    if (!window.aiWorksBackend?.configured) return;
    try {
      this.session = await window.aiWorksBackend.auth.getSession();
      this.admin = await window.aiWorksBackend.auth.isAdmin(this.session);
    } catch (error) {
      console.error('Supabase Auth initialization failed.', error);
      this.session = null;
      this.admin = false;
    }
  },
  isAuthenticated() {
    return Boolean(this.session && this.admin);
  },
  async signIn(email, password) {
    if (!window.aiWorksBackend?.configured) throw new Error('SUPABASE_NOT_CONFIGURED');
    this.session = await window.aiWorksBackend.auth.signIn(email, password);
    this.admin = true;
    return this.session;
  },
  async signOut() {
    if (window.aiWorksBackend?.configured) await window.aiWorksBackend.auth.signOut();
    this.session = null;
    this.admin = false;
  }
};

function fileNameFromUrl(url = '') {
  return String(url).split('/').pop()?.split('?')[0] || '';
}

function mediaTypeFromName(name = '', fallback = 'application/octet-stream') {
  const extension = String(name).split('.').pop()?.toLowerCase();
  return ({html:'text/html', htm:'text/html', css:'text/css', js:'text/javascript', json:'application/json', txt:'text/plain', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', gif:'image/gif'})[extension] || fallback;
}

function portableFileUrl(id, fileName) {
  return `work://${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
}

function normalizeWork(source) {
  const raw = source || {};
  const id = String(raw.id || `local-${Date.now()}`);
  const type = String(raw.type || raw.kind || 'WEB WORK');
  const legacyHtmlUrl = raw.href || raw.html_url || raw.metadata?.html_url || '';
  const htmlName = raw.files?.html?.name || raw.html_name || raw.htmlName || fileNameFromUrl(legacyHtmlUrl) || 'index.html';
  const htmlContent = raw.files?.html?.content ?? raw.htmlContent ?? null;
  const htmlDataUrl = raw.files?.html?.data_url ?? null;
  const htmlUrl = raw.files?.html?.url || legacyHtmlUrl || (htmlContent || htmlDataUrl ? portableFileUrl(id, htmlName) : '');
  const thumbnailSourceUrl = raw.thumbnail_url || raw.metadata?.thumbnail_url || '';
  const thumbnailName = raw.files?.thumbnail?.name || raw.thumbnail_name || raw.thumbnailName || fileNameFromUrl(thumbnailSourceUrl) || '';
  const thumbnailDataUrl = raw.files?.thumbnail?.data_url ?? raw.thumbnailData ?? null;
  const thumbnailUrl = raw.files?.thumbnail?.url || thumbnailSourceUrl || (thumbnailDataUrl && thumbnailName ? portableFileUrl(id, thumbnailName) : '');
  const work = {
    id,
    schema_version: PORTABLE_SCHEMA_VERSION,
    title: String(raw.title || ''),
    ai: String(raw.ai || ''),
    model: String(raw.model || ''),
    date: toDisplayDate(String(raw.date || '')),
    type,
    prompt: String(raw.prompt || ''),
    memo: String(raw.memo || ''),
    other: raw.other || raw.other_category,
    art: raw.art || 'art-a',
    infoUrl: `work/${encodeURIComponent(id)}/`,
    sample: raw.sample ?? false,
    files: {
      html: {
        name: htmlName,
        media_type: 'text/html',
        url: htmlUrl,
        path: raw.files?.html?.path || raw.html_path || null,
        content: htmlContent,
        data_url: htmlDataUrl
      },
      thumbnail: {
        name: thumbnailName,
        media_type: raw.files?.thumbnail?.media_type || raw.thumbnail_media_type || mediaTypeFromName(thumbnailName, 'image/png'),
        url: thumbnailUrl,
        path: raw.files?.thumbnail?.path || raw.thumbnail_path || null,
        data_url: thumbnailDataUrl
      },
      prompt: {
        name: 'prompt.txt',
        media_type: 'text/plain',
        url: portableFileUrl(id, 'prompt.txt'),
        content: String(raw.prompt || '')
      },
      memo: {
        name: 'memo.txt',
        media_type: 'text/plain',
        url: portableFileUrl(id, 'memo.txt'),
        content: String(raw.memo || '')
      }
    }
  };
  work.metadata = {
    title: work.title,
    ai: work.ai,
    model: work.model,
    date: work.date,
    type: work.type,
    html_url: work.files.html.url,
    thumbnail_url: work.files.thumbnail.url,
    prompt_url: work.files.prompt.url,
    memo_url: work.files.memo.url
  };
  return work;
}

const workRepository = {
  async load() {
    if (!window.aiWorksBackend?.configured) return clone(defaultWorks).map(normalizeWork);
    const records = await window.aiWorksBackend.listWorks();
    return records.map(normalizeWork);
  },
  async create(record, htmlFile, thumbnailFile) {
    if (!authRepository.isAuthenticated()) throw new Error('AUTH_REQUIRED');
    const created = normalizeWork(await window.aiWorksBackend.createWork(record, htmlFile, thumbnailFile));
    works = [created, ...works];
    return created;
  },
  async update(id, changes, htmlFile, thumbnailFile) {
    if (!authRepository.isAuthenticated()) throw new Error('AUTH_REQUIRED');
    const index = works.findIndex((work) => work.id === id);
    if (index < 0) return null;
    const updated = normalizeWork(await window.aiWorksBackend.updateWork(works[index], changes, htmlFile, thumbnailFile));
    works = works.map((work) => work.id === id ? updated : work);
    return updated;
  },
  async remove(id) {
    if (!authRepository.isAuthenticated()) throw new Error('AUTH_REQUIRED');
    const existing = works.find((work) => work.id === id);
    if (!existing) return;
    const result = await window.aiWorksBackend.removeWork(existing);
    works = works.filter((work) => work.id !== id);
    return result;
  }
};

let works = [];
let activeFilter = 'Home';
let activeView = 'home';
let otherFilter = 'all';
let themeChoice = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
const favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]'));
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(choice, save = true) {
  themeChoice = ['light', 'dark', 'system'].includes(choice) ? choice : 'system';
  const resolved = themeChoice === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themeChoice;
  document.documentElement.dataset.theme = resolved;
  if (save) localStorage.setItem(THEME_STORAGE_KEY, themeChoice);
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    const active = button.dataset.themeChoice === themeChoice;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

applyTheme(themeChoice, false);
systemTheme.addEventListener('change', () => { if (themeChoice === 'system') applyTheme('system', false); });

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
}

function categoryValue(key) {
  return key === 'Other' ? 'その他' : key;
}

function toInputDate(date = '') {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(date) ? date.replaceAll('.', '-') : date;
}

function toDisplayDate(date = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll('-', '.') : date;
}

function filteredWorks() {
  let list = [...works];
  if (activeView === 'favorites') list = list.filter((work) => favorites.has(work.id));
  if (activeView === 'category') list = list.filter((work) => work.ai === categoryValue(activeFilter));
  if (activeFilter === 'Other' && otherFilter !== 'all') list = list.filter((work) => work.other === otherFilter);
  const sort = $('#sort-select').value;
  if (sort === 'oldest') list.reverse();
  if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
  return list;
}

function card(work, index) {
  const favorite = favorites.has(work.id);
  const thumbnailData = work.files.thumbnail.data_url || (work.files.thumbnail.url && !work.files.thumbnail.url.startsWith('work://') ? work.files.thumbnail.url : '');
  const htmlFile = work.files.html;
  const art = thumbnailData
    ? `<img class="thumb-image" src="${escapeHtml(thumbnailData)}" alt="" />`
    : `<div class="thumb-art ${work.art || 'art-a'}"></div><div class="thumb-grid"></div>`;
  const storageHtml = Boolean(htmlFile.path || /^https?:\/\//.test(htmlFile.url || ''));
  const infoUrl = work.infoUrl || `work/${encodeURIComponent(work.id)}/`;
  const openAction = storageHtml
    ? `<button class="open-link open-html" data-open-html="${escapeHtml(work.id)}">作品を開く ↗</button>`
    : htmlFile.url && !htmlFile.url.startsWith('work://')
      ? `<a class="open-link" href="${escapeHtml(htmlFile.url)}" target="_blank">作品を開く ↗</a>`
    : htmlFile.content || htmlFile.data_url
      ? `<button class="open-link open-html" data-open-html="${escapeHtml(work.id)}">作品を開く ↗</button>`
      : '<span class="open-link">プレビュー準備中</span>';
  return `<article class="card">
    <div class="thumb">${art}<div class="thumb-bottom"><strong>${escapeHtml(work.ai).toUpperCase()}</strong></div></div>
    <div class="card-body"><div class="card-title-line"><h3>${escapeHtml(work.title)}</h3><span class="model-name">${escapeHtml(work.model)}</span></div><div class="card-meta"><span>${escapeHtml(work.date)}</span><span>${escapeHtml(work.type)}</span></div><p class="card-prompt">${escapeHtml(work.prompt)}</p><div class="card-footer"><div class="card-actions">${openAction}<a class="info-link" href="${escapeHtml(infoUrl)}" target="_blank" rel="noopener">AI向け情報 ↗</a></div><button class="favorite ${favorite ? 'is-favorite' : ''}" data-favorite="${escapeHtml(work.id)}" aria-label="お気に入り">${favorite ? '♥' : '♡'}</button></div></div>
  </article>`;
}

function bindCardActions() {
  document.querySelectorAll('[data-favorite]').forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.favorite;
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
      render();
    };
  });
  document.querySelectorAll('[data-open-html]').forEach((button) => {
    button.onclick = async () => {
      const work = works.find((item) => item.id === button.dataset.openHtml);
      const htmlFile = work?.files.html;
      if (!htmlFile) return;
      const popup = window.open('', '_blank');
      if (!popup) {
        window.alert('新しいタブを開けませんでした。ポップアップを許可してください。');
        return;
      }
      try {
        let html = htmlFile.content;
        if (html == null && htmlFile.url && !htmlFile.url.startsWith('work://')) {
          const response = await fetch(htmlFile.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          html = await response.text();
        }
        if (html == null && htmlFile.data_url) {
          const response = await fetch(htmlFile.data_url);
          html = await response.text();
        }
        if (html == null) throw new Error('HTML_NOT_AVAILABLE');
        const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
        popup.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch (error) {
        console.error('HTML preview failed.', error);
        popup.close();
        window.alert('HTML作品を開けませんでした。Storageの公開設定とCORSを確認してください。');
      }
    };
  });
}

function renderCategoryCards() {
  $('#category-grid').innerHTML = categories.map((category) => {
    const count = works.filter((work) => work.ai === categoryValue(category.key)).length;
    const icon = category.icon ? `<img class="category-icon" src="${category.icon}" alt="" />` : `<span class="category-symbol">${category.symbol}</span>`;
    return `<button class="category-card" data-category="${category.key}">${icon}<strong>${category.label}</strong><span class="category-count">${String(count).padStart(2, '0')}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-category]').forEach((button) => button.onclick = () => openCategory(button.dataset.category));
}

function renderHome() {
  $('#home-dashboard').hidden = false;
  $('#library-view').hidden = true;
  renderCategoryCards();
  $('#recent-gallery').innerHTML = works.slice(0, 3).map(card).join('');
  $('#favorite-summary-copy').textContent = favorites.size ? `${favorites.size}件の作品を保存しています。いつでもここから戻れます。` : '気になる作品を保存して、あとからすぐに開けます。';
  bindCardActions();
}

function renderSettings() {
  $('#settings-panel').hidden = activeView !== 'settings';
  if (activeView === 'settings') applyTheme(themeChoice, false);
}

function renderLibrary() {
  $('#home-dashboard').hidden = true;
  $('#library-view').hidden = false;
  const settings = activeView === 'settings';
  const list = settings ? [] : filteredWorks();
  $('#gallery').innerHTML = list.map(card).join('');
  $('#gallery').hidden = settings || !list.length;
  $('#empty-state').hidden = settings || Boolean(list.length);
  $('.view-controls').hidden = settings;
  $('#active-label').textContent = activeView === 'favorites' ? 'FAVORITES' : activeView === 'all' ? 'ALL WORKS' : settings ? 'SETTINGS' : activeFilter.toUpperCase();
  $('#page-title').textContent = activeView === 'favorites' ? 'お気に入り' : activeView === 'all' ? 'すべての作品' : settings ? 'Settings' : `${activeFilter === 'Other' ? 'その他' : activeFilter} の作品`;
  $('#other-filters').classList.toggle('visible', activeView === 'category' && activeFilter === 'Other');
  renderSettings();
  bindCardActions();
}

function updateSharedCounts() {
  $('#all-count').textContent = String(works.length).padStart(2, '0');
  $('#favorite-count').textContent = String(favorites.size).padStart(2, '0');
  $('#manage-count').textContent = `${works.length} works`;
  $('#public-manage-count').textContent = `${works.length} works`;
}

function setActiveNavigation(target) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  if (target) target.classList.add('active');
}

function openHome() { activeFilter = 'Home'; activeView = 'home'; setActiveNavigation(document.querySelector('.primary-nav [data-filter="Home"]')); render(); }
function openAll() { activeFilter = 'all'; activeView = 'all'; setActiveNavigation(document.querySelector('[data-view="all"]')); render(); }
function openFavorites() { activeFilter = 'all'; activeView = 'favorites'; setActiveNavigation(document.querySelector('[data-view="favorites"]')); render(); }
function openCategory(category) { activeFilter = category; activeView = 'category'; setActiveNavigation(document.querySelector(`.primary-nav [data-filter="${category}"]`)); render(); }
function render() { updateSharedCounts(); activeView === 'home' ? renderHome() : renderLibrary(); }

function triggerDownload(url, fileName) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadText(fileName, content, mediaType = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], {type:`${mediaType};charset=utf-8`}));
  triggerDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function metadataDocument(work) {
  return {
    schema_version: work.schema_version,
    id: work.id,
    title: work.title,
    ai: work.ai,
    model: work.model,
    date: work.date,
    type: work.type,
    prompt: work.prompt,
    memo: work.memo,
    html_url: work.files.html.url,
    thumbnail_url: work.files.thumbnail.url,
    prompt_url: work.files.prompt.url,
    memo_url: work.files.memo.url,
    files: {
      html: {name:work.files.html.name, media_type:work.files.html.media_type, url:work.files.html.url},
      thumbnail: {name:work.files.thumbnail.name, media_type:work.files.thumbnail.media_type, url:work.files.thumbnail.url},
      prompt: {name:'prompt.txt', media_type:'text/plain', url:work.files.prompt.url},
      memo: {name:'memo.txt', media_type:'text/plain', url:work.files.memo.url}
    }
  };
}

async function downloadWorkPart(id, part) {
  const work = works.find((item) => item.id === id);
  if (!work) return;
  if (part === 'metadata') return downloadText('metadata.json', JSON.stringify(metadataDocument(work), null, 2), 'application/json');
  if (part === 'prompt') return downloadText('prompt.txt', work.prompt);
  if (part === 'memo') return downloadText('memo.txt', work.memo);
  const file = work.files[part];
  if (!file) return;
  if (file.data_url) return triggerDownload(file.data_url, file.name || (part === 'html' ? 'index.html' : 'thumbnail.png'));
  if (file.content != null) return downloadText(file.name || 'index.html', file.content, file.media_type);
  if (file.url && !file.url.startsWith('work://')) {
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const url = URL.createObjectURL(await response.blob());
      triggerDownload(url, file.name || fileNameFromUrl(file.url));
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    } catch (error) {
      console.error('Download failed.', error);
      window.alert('ファイルを取得できませんでした。');
      return;
    }
  }
  window.alert('このファイルはまだ登録されていません。');
}

function renderManageList(containerSelector = '#manage-list', canManage = false) {
  const container = $(containerSelector);
  const actions = (work) => canManage ? `<div class="manage-item-actions"><button class="manage-edit" data-edit-work="${escapeHtml(work.id)}">編集</button><button class="manage-delete" data-delete-work="${escapeHtml(work.id)}">削除</button></div>` : '';
  container.innerHTML = works.map((work) => `<div class="manage-item"><div class="manage-item-copy"><strong>${escapeHtml(work.title)}</strong><span>${escapeHtml(work.ai)} / ${escapeHtml(work.model)} / ${escapeHtml(work.date)}</span><div class="manage-exports" aria-label="作品ファイルを個別取得"><button data-download-work="${escapeHtml(work.id)}" data-download-part="html">HTML</button><button data-download-work="${escapeHtml(work.id)}" data-download-part="metadata">JSON</button><button data-download-work="${escapeHtml(work.id)}" data-download-part="prompt">Prompt</button><button data-download-work="${escapeHtml(work.id)}" data-download-part="memo">Memo</button><button data-download-work="${escapeHtml(work.id)}" data-download-part="thumbnail">画像</button></div></div>${actions(work)}</div>`).join('');
  container.querySelectorAll('[data-download-work]').forEach((button) => button.onclick = () => downloadWorkPart(button.dataset.downloadWork, button.dataset.downloadPart));
  if (!canManage || !authRepository.isAuthenticated()) return;
  container.querySelectorAll('[data-edit-work]').forEach((button) => button.onclick = () => startEditing(button.dataset.editWork));
  container.querySelectorAll('[data-delete-work]').forEach((button) => button.onclick = async () => {
    if (!authRepository.isAuthenticated()) return showAdminView('login');
    if (!window.confirm('この作品を削除しますか？')) return;
    const id = button.dataset.deleteWork;
    try {
      button.disabled = true;
      const deleteResult = await workRepository.remove(id);
      favorites.delete(id);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
      renderManageList('#manage-list', true);
      render();
      if (deleteResult?.storageCleanupFailed) window.alert('作品情報は削除されましたが、Storageファイルの削除に失敗しました。Supabase Storageを確認してください。');
    } catch (error) {
      console.error('Delete failed.', error);
      button.disabled = false;
      window.alert('作品を削除できませんでした。');
    }
  });
}

function openAdminTab(name) {
  if (!authRepository.isAuthenticated()) return showAdminView('login');
  document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  $('#upload-form').hidden = name !== 'upload';
  $('#manage-panel').hidden = name !== 'manage';
  if (name === 'manage') renderManageList('#manage-list', true);
}

function resetWorkForm() {
  const form = $('#upload-form');
  form.reset();
  form.elements.editId.value = '';
  $('#current-html').textContent = '';
  $('#current-thumbnail').textContent = '';
  $('#submit-work').innerHTML = '作品を追加する <span>↗</span>';
  $('#edit-cancel').hidden = true;
}

function startEditing(id) {
  if (!authRepository.isAuthenticated()) return showAdminView('login');
  const work = works.find((item) => item.id === id);
  if (!work) return;
  const form = $('#upload-form');
  form.elements.editId.value = work.id;
  form.elements.title.value = work.title || '';
  form.elements.ai.value = work.ai || 'GPT';
  form.elements.model.value = work.model || '';
  form.elements.date.value = toInputDate(work.date || '');
  form.elements.prompt.value = work.prompt || '';
  form.elements.memo.value = work.memo || '';
  $('#current-html').textContent = work.files.html.name ? `現在: ${work.files.html.name}` : '';
  $('#current-thumbnail').textContent = work.files.thumbnail.name ? `現在: ${work.files.thumbnail.name}` : '';
  $('#submit-work').innerHTML = '変更を保存する <span>↗</span>';
  $('#edit-cancel').hidden = false;
  openAdminTab('upload');
}

document.querySelectorAll('.primary-nav .nav-item').forEach((button) => button.onclick = () => button.dataset.filter === 'Home' ? openHome() : openCategory(button.dataset.filter));
document.querySelectorAll('.secondary-nav .nav-item').forEach((button) => {
  button.onclick = () => {
    if (button.dataset.view === 'all') return openAll();
    if (button.dataset.view === 'favorites') return openFavorites();
    activeFilter = 'all'; activeView = 'settings'; setActiveNavigation(button); render();
  };
});
document.querySelectorAll('.other-filter').forEach((button) => button.onclick = () => { otherFilter = button.dataset.other; document.querySelectorAll('.other-filter').forEach((item) => item.classList.remove('active')); button.classList.add('active'); render(); });
document.querySelectorAll('[data-open-all]').forEach((button) => button.onclick = openAll);
document.querySelectorAll('[data-open-favorites]').forEach((button) => button.onclick = openFavorites);
document.querySelectorAll('[data-theme-choice]').forEach((button) => button.onclick = () => applyTheme(button.dataset.themeChoice));
$('#sort-select').onchange = render;

const modal = $('#admin-modal');
let recoveryMode = false;

function showAdminView(requestedView) {
  const view = requestedView === 'workspace' && !authRepository.isAuthenticated() ? 'login' : requestedView;
  $('#admin-login-view').hidden = view !== 'login';
  $('#password-recovery-view').hidden = view !== 'recovery';
  $('#public-download-view').hidden = view !== 'public';
  $('#admin-workspace').hidden = view !== 'workspace';
  $('#login-error').hidden = true;
  $('#password-recovery-error').hidden = true;
  if (view === 'public') renderManageList('#public-manage-list', false);
  if (view === 'workspace') {
    resetWorkForm();
    openAdminTab('upload');
  }
}

$('#admin-open').onclick = () => {
  if (recoveryMode) return;
  modal.hidden = false;
  resetWorkForm();
  showAdminView(authRepository.isAuthenticated() ? 'workspace' : 'login');
};
$('#admin-close').onclick = () => { if (recoveryMode) return; modal.hidden = true; resetWorkForm(); };
modal.onclick = (event) => { if (!recoveryMode && event.target === modal) { modal.hidden = true; resetWorkForm(); } };
$('#mobile-menu').onclick = () => $('.sidebar').classList.toggle('open');
document.querySelectorAll('.admin-tab').forEach((tab) => tab.onclick = () => { if (tab.dataset.tab === 'upload' && $('#manage-panel').hidden === false) resetWorkForm(); openAdminTab(tab.dataset.tab); });
$('#edit-cancel').onclick = () => { resetWorkForm(); openAdminTab('manage'); };
$('#public-downloads-open').onclick = () => showAdminView('public');
$('#public-login-back').onclick = () => showAdminView('login');
$('#password-reset-open').onclick = async () => {
  const emailInput = $('#admin-login-form').elements.email;
  const email = emailInput.value.trim();
  const errorMessage = $('#login-error');
  if (!email) {
    errorMessage.textContent = 'メールアドレスを入力してください。';
    errorMessage.hidden = false;
    emailInput.focus();
    return;
  }
  try {
    $('#password-reset-open').disabled = true;
    await window.aiWorksBackend.auth.requestPasswordReset(email);
    errorMessage.textContent = '再設定メールを送信しました。受信箱のリンクを開いてください。';
    errorMessage.hidden = false;
  } catch (error) {
    console.error('Password reset request failed.', error);
    errorMessage.textContent = error?.message === 'SUPABASE_NOT_CONFIGURED'
      ? 'Supabaseの接続情報がまだ設定されていません。'
      : '再設定メールを送信できませんでした。管理者メールアドレスを確認してください。';
    errorMessage.hidden = false;
  } finally {
    $('#password-reset-open').disabled = false;
  }
};
$('#admin-login-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const session = await authRepository.signIn(form.elements.email.value.trim(), form.elements.password.value);
    if (!session) throw new Error('LOGIN_FAILED');
    form.reset();
    showAdminView('workspace');
  } catch (error) {
    console.error('Login failed.', error);
    $('#login-error').textContent = error?.message === 'SUPABASE_NOT_CONFIGURED'
      ? 'Supabaseの接続情報がまだ設定されていません。'
      : 'ログインできません。管理者アカウントを確認してください。';
    $('#login-error').hidden = false;
  }
};
window.addEventListener('ai-works-auth-state', (event) => {
  if (event.detail?.event !== 'PASSWORD_RECOVERY') return;
  recoveryMode = true;
  modal.hidden = false;
  showAdminView('recovery');
});
$('#password-recovery-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.password.value;
  const passwordConfirm = form.elements.passwordConfirm.value;
  const errorMessage = $('#password-recovery-error');
  if (password !== passwordConfirm) {
    errorMessage.textContent = 'パスワードが一致していません。';
    errorMessage.hidden = false;
    return;
  }
  try {
    form.querySelector('button[type="submit"]').disabled = true;
    await window.aiWorksBackend.auth.updatePassword(password);
    await authRepository.signOut();
    recoveryMode = false;
    window.history.replaceState({}, document.title, window.location.pathname);
    form.reset();
    showAdminView('login');
  } catch (error) {
    console.error('Password recovery update failed.', error);
    errorMessage.textContent = 'パスワードを更新できませんでした。リセットリンクを再発行してください。';
    errorMessage.hidden = false;
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
};
$('#admin-logout').onclick = async () => {
  await authRepository.signOut();
  resetWorkForm();
  showAdminView('login');
};

$('#upload-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!authRepository.isAuthenticated()) return showAdminView('login');
  const form = event.currentTarget;
  const data = new FormData(form);
  const editId = data.get('editId');
  const existing = editId ? works.find((work) => work.id === editId) : null;
  const htmlFile = form.elements.html.files[0];
  const thumbnailFile = form.elements.thumbnail.files[0];
  try {
    if (!existing && !htmlFile) throw new Error('HTML_REQUIRED');
    const record = {
      ...(existing ? {id: existing.id} : {}),
      title: String(data.get('title')).trim(),
      ai: data.get('ai'),
      model: String(data.get('model')).trim(),
      date: toDisplayDate(data.get('date') || new Date().toISOString().slice(0, 10)),
      prompt: data.get('prompt') || '',
      memo: data.get('memo') || '',
      type: existing?.type || 'WEB WORK',
      art: existing?.art || 'art-a',
      sample: false,
      other: data.get('ai') === 'その他' ? existing?.other || 'Other' : undefined,
      files: existing?.files
    };
    $('#submit-work').disabled = true;
    if (existing) await workRepository.update(existing.id, record, htmlFile, thumbnailFile);
    else await workRepository.create(record, htmlFile, thumbnailFile);
    resetWorkForm();
    render();
    if (existing) openAdminTab('manage');
    else { modal.hidden = true; openHome(); }
  } catch (error) {
    console.error('Save failed.', error);
    window.alert(error?.message === 'HTML_REQUIRED' ? 'HTMLファイルを選択してください。' : '作品を保存できませんでした。Supabaseの設定と権限を確認してください。');
  } finally {
    $('#submit-work').disabled = false;
  }
};

async function initializeApp() {
  await authRepository.initialize();
  if (window.aiWorksBackend?.auth.isRecoverySession?.()) {
    recoveryMode = true;
    modal.hidden = false;
    showAdminView('recovery');
  }
  try {
    works = await workRepository.load();
  } catch (error) {
    console.error('Supabase works load failed.', error);
    works = [];
  }
  const validIds = new Set(works.map((work) => work.id));
  let favoritesChanged = false;
  [...favorites].forEach((id) => {
    if (!validIds.has(id)) {
      favorites.delete(id);
      favoritesChanged = true;
    }
  });
  if (favoritesChanged) localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  render();
}

initializeApp();
