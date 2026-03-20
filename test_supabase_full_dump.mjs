import { createClient } from '@supabase/supabase-js';

const projects = [
  { name: 'P1 (vmtvghkicidatwyzttic)', url: 'https://vmtvghkicidatwyzttic.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZl9pZCI6InZtdHZnaGtpY2lkYXR3eXp0dGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTY3MTAsImV4cCI6MjA1ODAzMjcxMH0.tXm4h4m5M-f3hG4W-6J7W3A7wFOnqYUPA1cuGeQ' },
  { name: 'P2 (wokvqlueeuxwqkzjwdgq)', url: 'https://wokvqlueeuxwqkzjwdgq.supabase.co', key: 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y' }
];

async function check() {
  for (const p of projects) {
    console.log(`\n--- Checking ${p.name} ---`);
    const client = createClient(p.url, p.key);
    
    // 1. Try public.batches
    const { data: bData, error: bError } = await client.from('batches').select('*');
    if (bError) console.log(`[batches] Error: ${bError.message}`);
    else console.log(`[batches] Success: ${bData.length} rows.`);

    // 2. Try list all tables (using common names if possible)
    const tables = ['batches', 'courses', 'products', 'users', 'settings'];
    for(const t of tables) {
        if(t === 'batches') continue;
        const { data, error } = await client.from(t).select('count', { count: 'exact', head: true });
        if(!error) console.log(`Found table: ${t}`);
    }
  }
}

check();
