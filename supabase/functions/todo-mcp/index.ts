// EFT To-Do connector for Claude (remote MCP server, Streamable HTTP, JSON responses).
// Runs as a Supabase Edge Function. Claude calls it to add, find, update and complete tasks.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   MCP_TOKEN  - required. Claude sends it as "Authorization: Bearer <MCP_TOKEN>".
//   SERVICE_KEY - recommended. The project's secret key, so the connector can read and write tasks.
//   OWNER_ID   - optional. The account tasks are created for. Defaults to the first account created.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
// JWT verification must be OFF for this function (Claude does not send a Supabase login).

import { createClient } from 'npm:@supabase/supabase-js@2';

// SERVICE_KEY: your project's secret key (Project Settings > API Keys > Secret keys).
// Falls back to the legacy service role key Supabase provides automatically.
const KEY = Deno.env.get('SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TYPES = ['quote', 'ce', 'fault', 'install', 'service', 'survey', 'meeting', 'other'];
const ESCALATE_DAYS = 7;

function londonToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
}

let ownerCache: string | null = null;
async function ownerId(): Promise<string> {
  if (ownerCache) return ownerCache;
  const fromEnv = Deno.env.get('OWNER_ID');
  if (fromEnv) return (ownerCache = fromEnv);
  if (!KEY) throw new Error('Setup problem: add the SERVICE_KEY secret to this Edge Function.');
  const { data, error } = await db.from('profiles').select('id').order('created_at').limit(1);
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data?.length)
    throw new Error(
      'No account visible. Either no one has signed up in the app yet, or the SERVICE_KEY secret is missing or wrong.',
    );
  return (ownerCache = data[0].id as string);
}

function effPri(t: any, today: string): string {
  const base = t.priority || 'normal';
  if (t.done) return base;
  if (t.due && t.due < today) return 'high';
  const rank: Record<string, number> = { high: 0, normal: 1, low: 2 };
  const age = Math.floor((Date.now() - Date.parse(t.created_at)) / 86400000);
  return ['high', 'normal', 'low'][Math.max(0, rank[base] - Math.floor(age / ESCALATE_DAYS))];
}

function summarise(t: any, today: string) {
  const age = Math.max(0, Math.floor((Date.now() - Date.parse(t.created_at)) / 86400000));
  return {
    id: t.id,
    section: t.section,
    title: t.title,
    type: t.type,
    job: t.job || undefined,
    due: t.due || undefined,
    due_time: t.due_time || undefined,
    priority_set: t.priority,
    priority_now: effPri(t, today),
    days_open: age,
    notes: t.notes || undefined,
    done: t.done,
  };
}

async function findContactId(name?: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const { data } = await db.from('contacts').select('id,name').ilike('name', name.trim()).limit(1);
  return data?.[0]?.id ?? null;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;

function cleanTaskFields(a: any) {
  const out: Record<string, unknown> = {};
  if (typeof a.title === 'string' && a.title.trim()) out.title = a.title.trim();
  if (a.section === 'work' || a.section === 'personal') out.section = a.section;
  if (TYPES.includes(a.type)) out.type = a.type;
  if (typeof a.job === 'string') out.job = a.job.trim();
  if (a.due === null || a.due === '') out.due = null;
  else if (typeof a.due === 'string' && dateRe.test(a.due)) out.due = a.due;
  if (typeof a.due_time === 'string' && (a.due_time === '' || timeRe.test(a.due_time))) out.due_time = a.due_time;
  if (['high', 'normal', 'low'].includes(a.priority)) out.priority = a.priority;
  if (typeof a.notes === 'string') out.notes = a.notes.trim();
  return out;
}

// ---------- tools ----------

const taskProps = {
  title: { type: 'string', description: 'Short task title, without the date/time words.' },
  section: {
    type: 'string',
    enum: ['work', 'personal'],
    description:
      'work = EFT Group fire alarm work (jobs, sites, panels, quotes, C&E, surveys, meetings, colleagues, clients). personal = home, car, family, gifts, shopping, appointments, hobbies.',
  },
  type: {
    type: 'string',
    enum: TYPES,
    description: 'quote, ce (cause and effect), fault, install, service, survey, meeting or other.',
  },
  job: { type: 'string', description: 'Site or job name, e.g. "Royal Bolton Hospital", "H Block".' },
  due: { type: 'string', description: 'Due date as YYYY-MM-DD (work out "Tuesday", "tomorrow" etc. from today\'s date).' },
  due_time: { type: 'string', description: '24-hour time HH:MM, if a time was given.' },
  priority: {
    type: 'string',
    enum: ['high', 'normal', 'low'],
    description: 'high if urgent/ASAP/safety-related/a client is chasing; low if "whenever"; otherwise normal.',
  },
  notes: { type: 'string', description: 'Any extra detail worth keeping.' },
  contact_name: { type: 'string', description: 'Full name of a contact to link, if one is mentioned.' },
};

const TOOLS = [
  {
    name: 'add_task',
    description:
      "Add a task to Christian's EFT To-Do app. Interpret the request: pick work or personal, the job type, site, due date/time and priority. Ask only if it is genuinely unclear whether it's work or personal. For meetings and surveys with a date, the result includes a calendar step: follow it to add the event to his Outlook calendar.",
    inputSchema: { type: 'object', properties: taskProps, required: ['title', 'section'] },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'list_tasks',
    description:
      "List tasks in the EFT To-Do app, newest priorities first. Shows each task's id, current priority (which rises one level every 7 days open; overdue = high) and days open. Use before updating or completing a task to find its id.",
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['work', 'personal', 'all'], description: 'Default all.' },
        include_done: { type: 'boolean', description: 'Include finished tasks. Default false.' },
        search: { type: 'string', description: 'Optional words to match in title, job or notes.' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'update_task',
    description: 'Change a task (title, section, type, job, due, due_time, priority, notes, contact). Pass due "" to clear it.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Task id from list_tasks.' }, ...taskProps },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'complete_task',
    description: 'Tick a task off as done (or reopen it with done=false).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task id from list_tasks.' },
        done: { type: 'boolean', description: 'Default true.' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'save_contact',
    description: 'Add a contact, or update one with the same name (phone, email, company, role, notes).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        company: { type: 'string' },
        role: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['name'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'list_contacts',
    description: 'List contacts in the app.',
    inputSchema: { type: 'object', properties: { search: { type: 'string' } } },
    annotations: { readOnlyHint: true },
  },
];

async function callTool(name: string, a: any): Promise<unknown> {
  const today = londonToday();
  const me = await ownerId();

  if (name === 'add_task') {
    const f = cleanTaskFields(a);
    if (!f.title) throw new Error('A task needs a title.');
    if (!f.section) throw new Error('Say whether the task is work or personal.');
    const contact_id = await findContactId(a.contact_name);
    const notes =
      a.contact_name && !contact_id ? [f.notes, `Contact: ${a.contact_name}`].filter(Boolean).join('\n') : f.notes;
    const { data, error } = await db
      .from('tasks')
      .insert({ type: 'other', ...f, notes: notes ?? '', contact_id, owner: me })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const added = summarise(data, today);
    const calendar =
      (data.type === 'meeting' || data.type === 'survey') && data.due
        ? {
            next_step:
              "Also put this in Christian's Outlook calendar now with the Microsoft 365 connector (outlook_create_event), " +
              'without asking first. Use the task title as the subject, the job as the location, time zone Europe/London, ' +
              'and one hour long. If no time was given, make it an all-day event. If the Microsoft 365 connector is not ' +
              'available, tell him the task was added but the calendar entry was not.',
            subject: data.title,
            location: data.job || undefined,
            date: data.due,
            time: data.due_time || undefined,
          }
        : undefined;
    return { added, today, calendar };
  }

  if (name === 'list_tasks') {
    let q = db.from('tasks').select('*');
    const sec = a.section ?? 'all';
    if (sec === 'work') q = q.eq('section', 'work');
    else if (sec === 'personal') q = q.eq('section', 'personal').eq('owner', me);
    else q = q.or(`section.eq.work,owner.eq.${me}`);
    if (!a.include_done) q = q.eq('done', false);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    let rows = (data ?? []).map((t) => summarise(t, today));
    if (a.search) {
      const s = String(a.search).toLowerCase();
      rows = rows.filter((t) => [t.title, t.job, t.notes].some((v) => v?.toLowerCase().includes(s)));
    }
    const rank: Record<string, number> = { high: 0, normal: 1, low: 2 };
    rows.sort((x, y) => rank[x.priority_now] - rank[y.priority_now] || (x.due ?? '9999').localeCompare(y.due ?? '9999'));
    return { today, count: rows.length, tasks: rows };
  }

  if (name === 'update_task') {
    const f = cleanTaskFields(a);
    if ('contact_name' in a) f.contact_id = await findContactId(a.contact_name);
    if (!Object.keys(f).length) throw new Error('Nothing to change.');
    const { data, error } = await db.from('tasks').update(f).eq('id', a.id).select().single();
    if (error) throw new Error(error.message);
    return { updated: summarise(data, today) };
  }

  if (name === 'complete_task') {
    const done = a.done !== false;
    const { data, error } = await db
      .from('tasks')
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq('id', a.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { [done ? 'completed' : 'reopened']: summarise(data, today) };
  }

  if (name === 'save_contact') {
    const name_ = String(a.name ?? '').trim();
    if (!name_) throw new Error('A contact needs a name.');
    const fields: Record<string, string> = {};
    for (const k of ['company', 'role', 'phone', 'email', 'notes']) if (typeof a[k] === 'string') fields[k] = a[k].trim();
    const existing = await findContactId(name_);
    const res = existing
      ? await db.from('contacts').update(fields).eq('id', existing).select().single()
      : await db.from('contacts').insert({ name: name_, ...fields, created_by: me }).select().single();
    if (res.error) throw new Error(res.error.message);
    return { [existing ? 'updated' : 'added']: res.data };
  }

  if (name === 'list_contacts') {
    const { data, error } = await db.from('contacts').select('name,company,role,phone,email,notes').order('name');
    if (error) throw new Error(error.message);
    const s = String(a.search ?? '').toLowerCase();
    return { contacts: (data ?? []).filter((c) => !s || JSON.stringify(c).toLowerCase().includes(s)) };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ---------- MCP plumbing ----------

const INSTRUCTIONS =
  "This is Christian's EFT To-Do app (EFT Group, fire alarm work). When he asks to add something to his to-do list, " +
  'use add_task and interpret it yourself: work vs personal, job type, site, due date/time and priority. ' +
  'Only ask if it is genuinely unclear whether it is work or personal. To tick off or change a task, find it with list_tasks first. ' +
  'Meetings and surveys with a date also go in his Outlook calendar (add_task says when): create the event with the ' +
  'Microsoft 365 connector straight away. If a meeting is moved or cancelled, update or delete its Outlook event too.';

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handle(msg: any): Promise<unknown | null> {
  const { id, method, params } = msg ?? {};
  if (id === undefined || id === null) return null; // notification: no reply
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'eft-todo', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      try {
        const out = await callTool(params?.name, params?.arguments ?? {});
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(out, null, 2) }],
          structuredContent: out,
        });
      } catch (e) {
        return rpcResult(id, {
          content: [{ type: 'text', text: (e as Error).message }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const token = Deno.env.get('MCP_TOKEN');
  if (!token || req.headers.get('authorization') !== `Bearer ${token}`) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(rpcError(null, -32700, 'Parse error'), 400);
  }
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map(handle))).filter((r) => r !== null);
    return replies.length ? json(replies) : new Response(null, { status: 202 });
  }
  const reply = await handle(body);
  return reply === null ? new Response(null, { status: 202 }) : json(reply);
});
