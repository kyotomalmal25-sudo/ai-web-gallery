# AI Works

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
