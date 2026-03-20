const p = { id: 'wokvqlueeuxwqkzjwdgq', key: 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y' };

async function dump() {
  const url = `https://${p.id}.supabase.co/rest/v1/batches?select=*`;
  const res = await fetch(url, {
    headers: { 'apikey': p.key, 'Authorization': `Bearer ${p.key}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

dump();
