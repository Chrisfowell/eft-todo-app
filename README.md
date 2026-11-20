# EFT To-Do

Android app for EFT Group jobs, quotes and follow-ups. Built with Expo (React Native) and Supabase.

## What it does

- Work and Personal lists. Work tasks are shared with everyone signed in; Personal tasks are private.
- Job types (Quote, C&E, Fault, Install, Service, Survey, Meeting, Other), job/site, due date and time, priority, notes.
- Priority rises one level for every 7 days a task stays open; overdue tasks go straight to high.
- Daily briefing at the top of the list: due today, moved up, oldest jobs.
- Contacts book; a task shows a contact's details when you pick them or mention their full name.
- Tag colleagues on work tasks; "Everyone's tasks" shows the whole team's list.
- Today / Open / This week / Done tabs, search, group by job, swipe to tick off or delete, undo, confetti when the list is clear.
- Live updates between phones.

## One-time setup

### 1. Database (Supabase)

1. In Supabase, open **SQL Editor → New query**.
2. Paste in everything from `supabase/1-setup.sql` and press **Run**.
3. Optional, for testing: **Authentication → Sign In / Providers → Email**, turn off **Confirm email** so new accounts work straight away.

### 2. Build the Android app (Expo)

1. Sign in at expo.dev and create a project called **eft-todo-app**.
2. Copy its **Project ID** into `app.json` under `expo.extra.eas.projectId` (Claude can do this for you).
3. In the project's **GitHub** settings, connect this repository.
4. Go to **Builds → Build from GitHub**, choose platform **Android**, profile **preview**, then start the build.
5. When it finishes, open the build page on the Android phone, download the APK, and install it (allow "Install unknown apps" when asked).

### 3. Move existing tasks

After you have signed up in the app for the first time, run `supabase/2-move-my-tasks.sql` in the SQL Editor once.

## Settings

- `src/config.ts` holds the Supabase address and publishable key, and how many days it takes a task to move up a priority level.
- After everyone who needs the app has signed up, you can stop new sign-ups in Supabase under **Authentication → Sign In / Providers → Allow new users to sign up**.

## Claude connector (add tasks by talking to Claude)

`supabase/functions/todo-mcp/index.ts` is a small server that lets Claude add, find, update and tick off tasks, and save contacts.

1. Supabase → **Edge Functions → Secrets**: add `MCP_TOKEN` with a long random value.
2. Supabase → **Edge Functions → Deploy a new function → Via editor**: name it `todo-mcp`, paste in `index.ts`, deploy.
3. Open the function's **Details/Settings** and turn **off** "Verify JWT" / "Enforce JWT verification".
4. claude.ai → **Customize → Connectors → + Add → Add custom connector**:
   - Name: `EFT To-Do`
   - URL: `https://vjebblfgvkrhafpgltha.supabase.co/functions/v1/todo-mcp`
   - Authentication: no sign-in, with a request header `Authorization` = `Bearer <your MCP_TOKEN>`
