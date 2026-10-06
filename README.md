# AI Works

## Production deployment (AI Works only)

The production Worker `banana-needs-no-reason` is reserved for AI Works at
https://banana-needs-no-reason.kyotomalmal25.workers.dev/. Its historical name must
stay unchanged to preserve existing links. Other sites need a separate project
directory, Worker name, config and deploy script; do not reuse this target.

```sh
npm ci
npm run deploy:ai-works:dry-run
npm run deploy:ai-works
```

`wrangler.jsonc` pins the AI Works account, entrypoint and dynamic routes.
The deploy script accepts only `--dry-run`, rejects target/environment overrides,
checks the GitHub origin and AI Works source markers, and stages only public
assets in `dist/ai-works`. Existing Worker variables/secrets are preserved.
The GitHub Pages workflow remains separate; CI checks the AI Works boundaries.
Do not upload an unrelated site's files through the Cloudflare dashboard to this
Worker: manual/API deployments bypass repository checks.

After deployment check `/`, a real `/work/<UUID>/`, its `metadata.json`,
`prompt.txt`, `memo.txt`, thumbnail and original HTML, plus `/work/grok5/` and
`/work/shrimp-garden/`. Supabase Database/Storage contents need no changes.

AIが生成したWeb作品を保存・比較するための静的ギャラリーです。

## 構成

- `index.html` — Home / All Works / AIカテゴリ / Favorites / Settings / Admin UI
- `app.js` / `styles.css` — UIとクライアント側の状態管理
- `supabase-client.js` / `supabase-config.js` — Supabase Database / Storage / Auth 接続
- `supabase/schema.sql` — Database・RLS・Storage policy のセットアップSQL
- `works/shrimp-aquarium1.html` — GPTのシュリンプガーデン
- `works/grok5.html` — Grok作品
- `work-worker.js` — SupabaseのUUIDレコードを使うAI向け公開ページと旧URL互換リダイレクト

## AI向け公開URL

- `https://banana-needs-no-reason.kyotomalmal25.workers.dev/work/shrimp-garden/`
- `https://banana-needs-no-reason.kyotomalmal25.workers.dev/work/grok5/`

各ページはJavaScriptなしでも作品情報を読め、`metadata.json`、`prompt.txt`、`memo.txt`、サムネイル、元HTMLへ直接アクセスできます。管理者がAdmin Uploadで作品を追加・更新する場合も、Supabase Storageへ`work-id/index.html`、`thumbnail.png`、`metadata.json`、`prompt.txt`、`memo.txt`を保存します。旧 `/work/grok5/` と `/work/shrimp-garden/` は、最新の対応UUIDページへリダイレクトします。

## Dynamic `/work/<id>/` pages

`work-worker.js` is the Cloudflare Worker entrypoint. It reads public rows from `public.works` and renders `/work/<uuid>/` without a redeploy after each upload. Existing non-UUID URLs such as `/work/shrimp-garden/` and `/work/grok5/` resolve the latest matching record and redirect to its UUID page.

Configure the Worker with the Supabase project URL and the same public anon key used by the browser client:

```text
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

The browser upload flow first inserts a row without an ID, receives the database-generated UUID, then uses that UUID for every Storage path and the public work URL. If a later upload/update fails, the temporary row and uploaded objects are cleaned up.

## 公開用設定

ブラウザに公開してよい Supabase Project URL と Publishable/Anon key のみを `supabase-config.js` に置きます。
Database password、管理者パスワード、Secret/Service Role key、Access token はリポジトリに置きません。

実値入りの `.env` はコミット対象外です。

## ローカル確認

このプロジェクトはビルド不要の静的サイトです。ローカルHTTPサーバーのルートをこのディレクトリにして `index.html` を開いてください。

## Supabase 管理

`supabase/schema.sql` をSupabase SQL Editorで実行し、Storageに公開バケット `ai-works` を作成します。管理操作はSupabase Authでログインした管理者だけに許可されます。
