const projects = [
  { id: 'vmtvghkicidatwyzttic', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZl9pZCI6InZtdHZnaGtpY2lkYXR3eXp0dGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTY3MTAsImV4cCI6MjA1ODAzMjcxMH0.tXm4h4m5M-f3hG4W-6J7W3A7wFOnqYUPA1cuGeQ' },
  { id: 'wokvqlueeuxwqkzjwdgq', key: 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y' }
];

async function check(p) {
  const url = `https://${p.id}.supabase.co/rest/v1/batches?select=*`;
  console.log(`Checking ${p.id}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': p.key,
        'Authorization': `Bearer ${p.key}`
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
        console.log(`  [${p.id}] Error: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`  Body: ${text}`);
    } else {
        const data = await res.json();
        console.log(`  [${p.id}] Success: Found ${data.length} batches.`);
        if (data.length > 0) data.forEach(b => console.log(`    - ${b.title}`));
    }
  } catch (e) {
    console.log(`  [${p.id}] Failed: ${e.message}`);
  }
}

async function run() {
    await Promise.all(projects.map(check));
}

run();
