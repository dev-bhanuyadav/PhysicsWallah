import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmtvghkicidatwyzttic.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZl9pZCI6InZtdHZnaGtpY2lkYXR3eXp0dGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTY3MTAsImV4cCI6MjA1ODAzMjcxMH0.tXm4h4m5M-f3hG4W-6J7W3A7wFOnqYUPA1cuGeQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

