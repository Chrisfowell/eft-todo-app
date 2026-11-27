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

`supabase/functions/todo-mcp/index.ts` is a small server that lets Claude add, find, update and tick off tasks, save contacts, and put meetings and surveys in the person's Outlook calendar (through their own Microsoft 365 connector in Claude).

Each person uses their own key, so tasks go on their own account.

**Set up once (admin):**
1. Supabase → **SQL Editor**: run `supabase/3-connector-keys.sql`.
2. Supabase → **Edge Functions → Secrets**: add `SERVICE_KEY` = the secret key from **Project Settings → API Keys → Secret keys**.
3. Supabase → **Edge Functions → todo-mcp → Code**: paste in `index.ts` and deploy. Under **Details**, keep **Verify JWT** off.

**Each person:**
1. In the app, tap the EFT logo → **Connect to Claude** → **Make my key**, and copy it.
2. claude.ai → **Customize → Connectors → + Add → Add custom connector**. Name `EFT To-Do`, URL `https://vjebblfgvkrhafpgltha.supabase.co/functions/v1/todo-mcp`, **No sign in**, request header `Authorization` = the copied key (it starts `Bearer eft_`).
3. Set the EFT To-Do tools to **Always allow**.

The older shared `MCP_TOKEN` secret still works and acts as the first account created. Remove it once you've switched to your personal key.

## Automatic updates

From version 1.2.0 the app updates itself. Every change pushed to `main` is published by Expo
(`.eas/workflows/publish-update.yml`) and installed apps download it the next time they're opened;
it takes effect after the app is closed and opened again.

- Keep `version` in `app.json` the same (1.2.0) for these updates: they only reach apps built with the same version.
- Changes that add a new native feature (for example a new permission or native library) need a full Android build,
  a new `version`, and everyone installing the new build once.

## iPhone (TestFlight)

Needs an Apple Developer Program membership (developer.apple.com/programs). iPhone builds are made on Expo's servers, so no Mac is needed.

First build, once, from a Windows or Mac computer with Node.js installed:

```
npm install -g eas-cli
git clone https://github.com/Chrisfowell/eft-todo-app.git
cd eft-todo-app
eas login
eas build --platform ios --profile production --auto-submit
```

Sign in with your Apple ID when asked and let Expo create the certificates. The build is uploaded to App Store Connect, then appears in TestFlight. After this, iPhone builds can also be started from the Expo dashboard, and everyday changes reach iPhones through the same automatic updates as Android.
