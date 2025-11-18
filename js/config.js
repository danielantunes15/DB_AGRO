// js/config.js
// =================================================================
// ARQUIVO CENTRAL DE CONFIGURAÇÃO DO DB AGRO
// Este é o ÚNICO lugar que deve conter as credenciais do Supabase.
// =================================================================

const SUPABASE_URL = 'https://hrvcmfjsuecxunqlrlth.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydmNtZmpzdWVjeHVucWxybHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTk0MTgsImV4cCI6MjA3ODk5NTQxOH0.VshYpyrB-e9tyKDv7AB4YtuQeIVp41Y7pi9K2rK-2U4';

// NOVO: Inicializa o cliente Supabase em uma variável global específica
// O 'supabase' abaixo é o objeto da CDN (https://...supabase-js@2)
// Atribuímos a instância do cliente ao window.dbAgroClient
window.dbAgroClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Cliente Supabase (DB AGRO) inicializado em window.dbAgroClient.');