# AI Works

AIが生成したWeb作品を保存・比較するための静的ギャラリーです。

## 構成

- `index.html` — Home / All Works / AIカテゴリ / Favorites / Settings / Admin UI
- `app.js` / `styles.css` — UIとクライアント側の状態管理
- `supabase-client.js` / `supabase-config.js` — Supabase Database / Storage / Auth 接続
- `supabase/schema.sql` — Database・RLS・Storage policy のセットアップSQL
- `works/shrimp-aquarium1.html` — GPTのシュリンプガーデン
- `works/grok5.html` — Grok作品

## 公開用設定

ブラウザに公開してよい Supabase Project URL と Publishable/Anon key のみを `supabase-config.js` に置きます。
Database password、管理者パスワード、Secret/Service Role key、Access token はリポジトリに置きません。

実値入りの `.env` はコミット対象外です。

## ローカル確認

このプロジェクトはビルド不要の静的サイトです。ローカルHTTPサーバーのルートをこのディレクトリにして `index.html` を開いてください。

## Supabase 管理

`supabase/schema.sql` をSupabase SQL Editorで実行し、Storageに公開バケット `ai-works` を作成します。管理操作はSupabase Authでログインした管理者だけに許可されます。
