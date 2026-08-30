const FIELD_MAP = Object.freeze({
  table: 'works',
  id: 'id',
  title: 'title',
  ai: 'ai',
  model: 'model',
  date: 'date',
  type: 'type',
  prompt: 'prompt',
  memo: 'memo',
  htmlUrl: 'html_url',
  htmlPath: 'html_path',
  thumbnailUrl: 'thumbnail_url',
  thumbnailPath: 'thumbnail_path',
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = 'ai-works';
const SIDECAR_TYPES = {
  'metadata.json': 'application/json; charset=utf-8',
  'prompt.txt': 'text/plain; charset=utf-8',
  'memo.txt': 'text/plain; charset=utf-8',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function response(body, status = 200, headers = {}) {
  return new Response(body, {status, headers: {'cache-control': 'public, max-age=60', ...headers}});
}

function supabaseBase(env) {
  return String(env.SUPABASE_URL || '').replace(/\/$/, '');
}

async function findWork(id, env) {
  if (!UUID_RE.test(id) || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const url = new URL(`${supabaseBase(env)}/rest/v1/${FIELD_MAP.table}`);
  url.searchParams.set('select', '*');
  url.searchParams.set(`${FIELD_MAP.id}`, `eq.${id}`);
  url.searchParams.set('limit', '1');
  const result = await fetch(url, {headers: {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  }});
  if (!result.ok) throw new Error(`Supabase returned ${result.status}`);
  return (await result.json())[0] || null;
}

function storageUrl(id, fileName, env) {
  return `${supabaseBase(env)}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(id)}/${fileName}`;
}

function workFileUrl(work, id, fileName, env) {
  if (fileName === 'index.html' && work[FIELD_MAP.htmlUrl]) return work[FIELD_MAP.htmlUrl];
  if (fileName === 'thumbnail.png' && work[FIELD_MAP.thumbnailUrl]) return work[FIELD_MAP.thumbnailUrl];
  return storageUrl(id, fileName, env);
}

function metadataFor(work, id, env) {
  const origin = env.PUBLIC_ORIGIN || '';
  const base = `${origin}/work/${encodeURIComponent(id)}/`;
  return {
    schema_version: 'ai-works/1.0',
    id,
    title: work[FIELD_MAP.title], ai: work[FIELD_MAP.ai], model: work[FIELD_MAP.model],
    date: work[FIELD_MAP.date], type: work[FIELD_MAP.type] || 'WEB WORK',
    prompt: work[FIELD_MAP.prompt] || '', memo: work[FIELD_MAP.memo] || '',
    html_url: work[FIELD_MAP.htmlUrl] || workFileUrl(work, id, 'index.html', env),
    thumbnail_url: work[FIELD_MAP.thumbnailUrl] || workFileUrl(work, id, 'thumbnail.png', env),
    prompt_url: `${base}prompt.txt`, memo_url: `${base}memo.txt`,
    metadata_url: `${base}metadata.json`,
  };
}

function renderWorkPage(work, id, env) {
  const metadata = metadataFor(work, id, env);
  const link = (label, href) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(metadata.title)} — AI Works</title><style>body{font-family:system-ui,sans-serif;max-width:920px;margin:0 auto;padding:32px;color:#18202a;background:#f7f9fb}main{background:white;border:1px solid #dce4ea;border-radius:18px;padding:28px}img{display:block;max-width:100%;max-height:520px;object-fit:contain;margin:16px 0;border-radius:12px;background:#eef3f6}dl{display:grid;grid-template-columns:120px 1fr;gap:10px}dt{font-weight:700;color:#536575}dd{margin:0;white-space:pre-wrap}nav{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}a{color:#087f99}</style></head><body><main><p>AI WORKS / PUBLIC WORK PAGE</p><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.type)}</p>${metadata.thumbnail_url ? `<img src="${escapeHtml(metadata.thumbnail_url)}" alt="${escapeHtml(metadata.title)} thumbnail">` : ''}<dl><dt>Title</dt><dd>${escapeHtml(metadata.title)}</dd><dt>AI</dt><dd>${escapeHtml(metadata.ai)}</dd><dt>Model</dt><dd>${escapeHtml(metadata.model)}</dd><dt>Date</dt><dd>${escapeHtml(metadata.date)}</dd><dt>Prompt</dt><dd>${escapeHtml(metadata.prompt || '（なし）')}</dd><dt>Memo</dt><dd>${escapeHtml(metadata.memo || '（なし）')}</dd></dl><nav>${link('元HTML', metadata.html_url)}${link('metadata.json', metadata.metadata_url)}${link('prompt.txt', metadata.prompt_url)}${link('memo.txt', metadata.memo_url)}${metadata.thumbnail_url ? link('thumbnail', metadata.thumbnail_url) : ''}</nav></main></body></html>`;
  return response(html, 200, {'content-type': 'text/html; charset=utf-8'});
}

async function handleWork(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'work') return null;
  const id = decodeURIComponent(parts[1]);
  const fileName = parts[2] || '';
  let work;
  try { work = await findWork(id, env); } catch (error) { console.error(error); }
  if (!work) return env.ASSETS.fetch(request);
  if (!fileName) return renderWorkPage(work, id, env);
  if (fileName === 'metadata.json') return response(JSON.stringify(metadataFor(work, id, env), null, 2), 200, {'content-type': 'application/json; charset=utf-8'});
  if (fileName === 'prompt.txt' || fileName === 'memo.txt') {
    const key = fileName === 'prompt.txt' ? FIELD_MAP.prompt : FIELD_MAP.memo;
    return response(work[key] || '', 200, {'content-type': SIDECAR_TYPES[fileName]});
  }
  return fetch(workFileUrl(work, id, fileName, env), {method: request.method, headers: request.headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/work' || url.pathname.startsWith('/work/')) {
      const result = await handleWork(request, env, url);
      if (result) {
        if (request.method === 'HEAD' && result.body) return new Response(null, {status: result.status, headers: result.headers});
        return result;
      }
    }
    return env.ASSETS.fetch(request);
  }
};
