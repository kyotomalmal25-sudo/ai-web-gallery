# AI Works / Supabase setup

## 1. Database and RLS

Supabase Dashboard の **SQL Editor** で `supabase/schema.sql` を実行します。

このSQLは次を作成します。

- `public.works`: 作品メタデータ
- `public.ai_works_admins`: 書き込みを許可するAuthユーザーID
- 公開読み取り、管理者限定の追加・更新・削除ポリシー
- Storageの管理者限定書き込みポリシー

## 2. Storage

Storageで次のbucketを作成します。

- bucket名: `ai-works`
- Public bucket: ON
- Allowed MIME types: `text/html,image/png,image/jpeg,image/webp,image/gif`
- File size limit: 作品に合わせて設定（例: 20 MB）

公開bucketにすることで、一般ユーザーは作品表示とダウンロードができます。アップロード・更新・削除はSQLのRLSで管理者だけに限定されます。

## 3. Auth管理者

Authentication > Users で管理者ユーザーを作成します。公開サイトにSign Up画面はありません。

Authentication > Providers > Email で一般ユーザーの新規登録を無効にしてください（`Allow new users to sign up` をOFF）。管理者ユーザーはDashboardから手動作成します。

ユーザー作成後、そのユーザーのUUIDを次のSQLへ入れて実行します。

```sql
insert into public.ai_works_admins (user_id)
values ('AUTH_USER_UUID');
```

既存の希望値を使う場合は、メールを `maladmin@aiworks.local`、パスワードを `aiworksmal` としてDashboard側で作成します。本番前には十分に長い固有パスワードへ変更してください。

## 4. Frontend connection

`supabase-config.js` の2項目だけ設定します。

```js
window.AI_WORKS_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_KEY',
  table: 'works',
  bucket: 'ai-works'
};
```

値は Project Settings > API から取得します。フロントエンドにはURLとAnon Keyだけを置き、Service Role Keyは置きません。

ビルド環境へ移行する場合の環境変数名は `.env.example` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を使用し、公開設定へ変換してください。

## 5. Existing samples

接続情報が空の間は、現在のローカルサンプルが表示されます。接続後はDatabaseが唯一の作品一覧になります。`grok5.html` と `shrimp-aquarium1.html` を本番データとして残す場合は、Admin Uploadから元HTMLを登録してください。
