// Supabase project for EFT To-Do. The publishable key is designed to be public;
// what each person can see is enforced by the database rules in supabase/1-setup.sql.
export const SUPABASE_URL = 'https://vjebblfgvkrhafpgltha.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_DewKaLZbNQjz2guZRqXT8Q_WZicAb_g';

// A task moves up one priority level for every ESCALATE_DAYS it stays open.
export const ESCALATE_DAYS = 7;
