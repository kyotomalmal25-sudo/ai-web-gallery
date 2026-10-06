# AI Works production target

This repository owns **AI Works** at https://banana-needs-no-reason.kyotomalmal25.workers.dev/.
The historical Worker name is reserved for AI Works; never deploy another site to it.

- Deploy using `npm ci` then `npm run deploy:ai-works`. Preview with `npm run deploy:ai-works:dry-run`.
- Keep `work-worker.js`, the `ASSETS` binding and Worker-first `/` and `/work/*` routes.
- Preserve existing Supabase secrets, Auth, database rows and Storage objects. Restoration does not require schema changes or data writes.
- Other sites must use their own repository/project directory, distinct Worker name and distinct deployment config/script. Never reuse this config or pass this Worker name for them.
- Verify the deployed root, real UUID work routes, legacy redirects and asset MIME types. A successful upload alone is not verification.
- The deploy script checks repository, account, name and source markers. Direct dashboard/API uploads can bypass these checks; inspect the selected Worker before publishing there.
