(function initializeAiWorksBackend(global) {
  const config = global.AI_WORKS_SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && global.supabase?.createClient);
  const client = configured
    ? global.supabase.createClient(config.url, config.anonKey, {
        auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}
      })
    : null;
  const table = config.table || 'works';
  const bucket = config.bucket || 'ai-works';
  let passwordRecovery = false;

  function requireClient() {
    if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
    return client;
  }

  function throwIfError(error) {
    if (error) throw error;
  }

  function extensionOf(file, fallback) {
    const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
    return extension && extension !== file?.name ? extension.replace(/[^a-z0-9]/g, '') : fallback;
  }

  function publicUrl(path) {
    if (!path) return '';
    return requireClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function uploadFile(path, file, contentType = file.type || undefined) {
    const {error} = await requireClient().storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType,
      upsert: true
    });
    throwIfError(error);
    return publicUrl(path);
  }

  async function uploadTextFile(path, content, contentType) {
    const file = new Blob([String(content ?? '')], {type: `${contentType}; charset=utf-8`});
    return uploadFile(path, file, `${contentType}; charset=utf-8`);
  }

  async function uploadPortableFiles(id, record, htmlUrl, thumbnailUrl, uploadedPaths) {
    const base = `https://banana-needs-no-reason.kyotomalmal25.workers.dev/work/${encodeURIComponent(id)}/`;
    const files = {
      html: {name: 'index.html', media_type: 'text/html', url: htmlUrl},
      thumbnail: {name: 'thumbnail.png', media_type: 'image/png', url: thumbnailUrl},
      prompt: {name: 'prompt.txt', media_type: 'text/plain', url: `${base}prompt.txt`},
      memo: {name: 'memo.txt', media_type: 'text/plain', url: `${base}memo.txt`}
    };
    const metadata = {schema_version: 'ai-works/1.0', id, title: record.title, ai: record.ai, model: record.model, date: record.date, type: record.type || 'WEB WORK', prompt: record.prompt || '', memo: record.memo || '', html_url: htmlUrl, thumbnail_url: thumbnailUrl, prompt_url: files.prompt.url, memo_url: files.memo.url, files};
    const sidecars = [
      ['prompt.txt', record.prompt || '', 'text/plain'],
      ['memo.txt', record.memo || '', 'text/plain'],
      ['metadata.json', JSON.stringify(metadata, null, 2), 'application/json']
    ];
    for (const [name, content, contentType] of sidecars) {
      const path = `${id}/${name}`;
      await uploadTextFile(path, content, contentType);
      uploadedPaths.push(path);
    }
    return {metadata, paths: sidecars.map(([name]) => `${id}/${name}`)};
  }

  function rowFromRecord(record) {
    return {
      id: record.id,
      title: record.title,
      ai: record.ai,
      model: record.model,
      date: String(record.date || '').replaceAll('.', '-'),
      type: record.type,
      prompt: record.prompt || '',
      memo: record.memo || '',
      other_category: record.other || null,
      html_url: record.files?.html?.url || '',
      html_path: record.files?.html?.path || null,
      html_name: record.files?.html?.name || 'index.html',
      html_media_type: 'text/html',
      thumbnail_url: record.files?.thumbnail?.url || '',
      thumbnail_path: record.files?.thumbnail?.path || null,
      thumbnail_name: record.files?.thumbnail?.name || null,
      thumbnail_media_type: record.files?.thumbnail?.media_type || null
    };
  }

  async function createWork(record, htmlFile, thumbnailFile) {
    requireClient();
    if (!htmlFile) throw new Error('HTML_REQUIRED');
    const id = record.id || crypto.randomUUID();
    const htmlPath = `${id}/index.html`;
    const uploadedPaths = [];
    try {
      const htmlUrl = await uploadFile(htmlPath, htmlFile, 'text/html; charset=utf-8');
      uploadedPaths.push(htmlPath);
      let thumbnailPath = null;
      let thumbnailUrl = '';
      if (thumbnailFile) {
        thumbnailPath = `${id}/thumbnail.png`;
        thumbnailUrl = await uploadFile(thumbnailPath, thumbnailFile);
        uploadedPaths.push(thumbnailPath);
      }
      await uploadPortableFiles(id, record, htmlUrl, thumbnailUrl, uploadedPaths);
      const complete = {
        ...record,
        id,
        files: {
          html: {name:htmlFile.name, media_type:'text/html', url:htmlUrl, path:htmlPath},
          thumbnail: thumbnailFile
            ? {name:thumbnailFile.name, media_type:thumbnailFile.type || 'image/png', url:thumbnailUrl, path:thumbnailPath}
            : {name:'', media_type:'image/png', url:'', path:null}
        }
      };
      const {data, error} = await requireClient().from(table).insert(rowFromRecord(complete)).select().single();
      throwIfError(error);
      return data;
    } catch (error) {
      if (uploadedPaths.length) await requireClient().storage.from(bucket).remove(uploadedPaths);
      throw error;
    }
  }

  async function updateWork(existing, record, htmlFile, thumbnailFile) {
    requireClient();
    const id = existing.id;
    const nextFiles = {
      html: {...existing.files.html},
      thumbnail: {...existing.files.thumbnail}
    };
    const oldPaths = [];
    const uploadedPaths = [];
    try {
      if (htmlFile) {
        const path = `${id}/index.html`;
        nextFiles.html = {name:htmlFile.name, media_type:'text/html', url:await uploadFile(path, htmlFile, 'text/html; charset=utf-8'), path};
        uploadedPaths.push(path);
        if (existing.files.html.path && existing.files.html.path !== path) oldPaths.push(existing.files.html.path);
      }
      if (thumbnailFile) {
        const path = `${id}/thumbnail.png`;
        nextFiles.thumbnail = {name:thumbnailFile.name, media_type:thumbnailFile.type || 'image/png', url:await uploadFile(path, thumbnailFile), path};
        uploadedPaths.push(path);
        if (existing.files.thumbnail.path && existing.files.thumbnail.path !== path) oldPaths.push(existing.files.thumbnail.path);
      }
      const complete = {...record, id, files: nextFiles};
      await uploadPortableFiles(id, complete, nextFiles.html.url, nextFiles.thumbnail.url, uploadedPaths);
      const updateRow = rowFromRecord(complete);
      delete updateRow.id;
      const {data, error} = await requireClient().from(table).update(updateRow).eq('id', id).select().single();
      throwIfError(error);
      if (oldPaths.length) {
        const {error: cleanupError} = await requireClient().storage.from(bucket).remove(oldPaths);
        if (cleanupError) console.warn('Old Storage files could not be removed.', cleanupError);
      }
      return data;
    } catch (error) {
      if (uploadedPaths.length) await requireClient().storage.from(bucket).remove(uploadedPaths);
      throw error;
    }
  }

  async function removeWork(work) {
    const {error} = await requireClient().from(table).delete().eq('id', work.id);
    throwIfError(error);
    const paths = [work.files?.html?.path, work.files?.thumbnail?.path, `${work.id}/metadata.json`, `${work.id}/prompt.txt`, `${work.id}/memo.txt`].filter(Boolean);
    if (paths.length) {
      const {error: storageError} = await requireClient().storage.from(bucket).remove(paths);
      if (storageError) {
        console.warn('Deleted the database row, but Storage cleanup failed.', storageError);
        return {storageCleanupFailed:true};
      }
    }
    return {storageCleanupFailed:false};
  }

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') passwordRecovery = true;
      global.dispatchEvent(new CustomEvent('ai-works-auth-state', {detail:{event, session}}));
    });
  }

  function recoveryUrlPresent() {
    const query = new URLSearchParams(global.location.search);
    const hash = new URLSearchParams(String(global.location.hash || '').replace(/^#/, ''));
    return query.get('type') === 'recovery' || hash.get('type') === 'recovery';
  }

  global.aiWorksBackend = {
    configured,
    async listWorks() {
      const {data, error} = await requireClient().from(table).select('*').order('date', {ascending:false}).order('created_at', {ascending:false});
      throwIfError(error);
      return data || [];
    },
    createWork,
    updateWork,
    removeWork,
    auth: {
      async getSession() {
        const {data, error} = await requireClient().auth.getSession();
        throwIfError(error);
        return data.session;
      },
      async isAdmin(session) {
        if (!session?.user) return false;
        const {data, error} = await requireClient().rpc('is_ai_works_admin');
        throwIfError(error);
        return data === true;
      },
      async signIn(email, password) {
        const {data, error} = await requireClient().auth.signInWithPassword({email, password});
        throwIfError(error);
        if (!await this.isAdmin(data.session)) {
          await requireClient().auth.signOut();
          throw new Error('ADMIN_REQUIRED');
        }
        return data.session;
      },
      async signOut() {
        const {error} = await requireClient().auth.signOut();
        throwIfError(error);
      },
      async updatePassword(password) {
        const {data, error} = await requireClient().auth.updateUser({password});
        throwIfError(error);
        return data.user;
      },
      isRecoverySession() {
        return passwordRecovery || recoveryUrlPresent();
      }
    }
  };
})(window);
