import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cspryiqfeaftrzaxpwpk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcHJ5aXFmZWFmdHJ6YXhwd3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDA2MTcsImV4cCI6MjA3OTkxNjYxN30.MthAF6y-b1xg9__wE6udozyNTdEMN5yE-FDKIRMhe1s'

export const sb = createClient(supabaseUrl, supabaseAnonKey)
