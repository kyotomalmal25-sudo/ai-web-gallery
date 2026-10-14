# AI Works production target

This repository owns **AI Works** at https://banana-needs-no-reason.kyotomalmal25.workers.dev/.
The historical Worker name is reserved for AI Works; never deploy another site to it.

- Deploy using `npm ci` then `npm run deploy:ai-works`. Preview with `npm run deploy:ai-works:dry-run`.
- Keep `work-worker.js`, the `ASSETS` binding and Worker-first `/` and `/work/*` routes.
- Preserve existing Supabase secrets, Auth, database rows and Storage objects. Restoration does not require schema changes or data writes.
- Other sites must use their own repository/project directory, distinct Worker name and distinct deployment config/script. Never reuse this config or pass this Worker name for them.
- Verify the deployed root, real UUID work routes, legacy redirects and asset MIME types. A successful upload alone is not verification.
- The deploy script checks repository, account, name and source markers. Direct dashboard/API uploads can bypass these checks; inspect the selected Worker before publishing there.

## 作品を開く方式（変更禁止）

- 「作品を開く」は **httpsの通常リンク** `https://banana-needs-no-reason.kyotomalmal25.workers.dev/work/<id>/index.html`（`app.js` の `workViewUrl()`）で開く。`blob:` URL（`URL.createObjectURL`）や `window.open('')` + `popup.location.href = blobUrl` に戻してはいけない。blob URLは他のAIから開けないため、これは意図的な仕様。
- `work-worker.js` の `serveWorkHtml()` は、Supabase Storageが `text/plain` で返す作品HTMLを `text/html` で配信し、CSP `sandbox` を付ける。この関数と `index.html` ルートを削除・変更しない。sandboxを外すと、作品JSが管理者のSupabaseセッションを読めてしまう。
- 作品HTMLを `app.js` でfetchして `Blob` 化する処理を新たに追加しない。`data-open-html` のblobボタンは、保存前のローカル作品（`content` / `data_url` のみでhttps URLが無い場合）専用のフォールバック。
- `app.js` を変更したら、必ずWorkerも再デプロイする（`npm run deploy:ai-works`）。Pages側のリンクはWorkerのURLを指すため、Workerが古いと作品が開けなくなる。
