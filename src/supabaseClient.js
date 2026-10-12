import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL;
const connectionUrl = proxyUrl ? new URL(proxyUrl, window.location.origin).href.replace(/\/$/, '') : url;

// Keep the same session when switching between the direct API and our proxy.
const options = url ? { auth: { storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token` } } : {};
export const supabase = connectionUrl && key ? createClient(connectionUrl, key, options) : null;
