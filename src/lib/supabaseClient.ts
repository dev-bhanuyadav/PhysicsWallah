import { createClient } from '@supabase/supabase-js';

// Unified Supabase Project (wokvqlueeuxwqkzjwdgq) - Verified by User feedback
const supabaseUrl = 'https://wokvqlueeuxwqkzjwdgq.supabase.co';
const supabaseAnonKey = 'sb_publishable_Jxd-JJ87Vz6Fk5bFc1mQ6w_lK29j27y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
