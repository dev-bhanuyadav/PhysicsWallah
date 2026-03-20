import { createClient } from '@supabase/supabase-js';

const projects = [
  { name: 'P1 (vmtvghkicidatwyzttic)', url: 'https://vmtvghkicidatwyzttic.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZl9pZCI6InZtdHZnaGtpY2lkYXR3eXp0dGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTY3MTAsImV4cCI6MjA1ODAzMjcxMH0.tXm4h4m5M-f3hG4W-6J7W3A7wFOnqYUPA1cuGeQ' },
  { name: 'P2 (wokvqlueeuxwqkzjwdgq)', url: 'https://wokvqlueeuxwqkzjwdgq.supabase.co', key: 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y' }
];

async function check() {
  for (const p of projects) {
    console.log(`Checking ${p.name}...`);
    try {
      const client = createClient(p.url, p.key);
      const { data, error } = await client.from('batches').select('title');
      if (error) {
        console.log(`  ERROR: ${error.message}`);
      } else {
        console.log(`  SUCCESS: Found ${data.length} batches.`);
        if (data.length > 0) {
            data.forEach(b => console.log(`    - ${b.title}`));
        }
      }
    } catch (e) {
      console.log(`  CRASH: ${e.message}`);
    }
    console.log('---');
  }
}

check();
