const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://grolnexeugpxjabnkjgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2xuZXhldWdweGphYm5ramdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY3NjQ5NSwiZXhwIjoyMTAyMjUyNDk1fQ.mcLWXRbpjPCEcWmgSLCvy4_ai77yqhboWJanN2Cms5Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("=== 1. DATA ACCOUNTS ===");
  const { data: accounts } = await supabase.from('accounts').select('*');
  console.log(accounts);

  console.log("\n=== 2. SALDO DARI CASH_TRANSACTIONS ===");
  const { data: ledger } = await supabase.from('cash_transactions').select('account_id, account_type, transaction_type, debit, credit');
  
  const balances = {};
  ledger?.forEach(l => {
    if (!l.account_id) return;
    if (!balances[l.account_id]) balances[l.account_id] = { debit: 0, credit: 0 };
    balances[l.account_id].debit += l.debit || 0;
    balances[l.account_id].credit += l.credit || 0;
  });

  for (const acc of accounts || []) {
    const b = balances[acc.id] || { debit: 0, credit: 0 };
    console.log(`${acc.name}: Debit=${b.debit}, Credit=${b.credit} => SALDO: ${b.debit - b.credit}`);
  }

  console.log("\n=== 3. PENJUALAN (SALES) KETERANGAN ===");
  const { data: sales } = await supabase.from('sales')
    .select('id, tanggal, total, payment_method, keterangan')
    .eq('status_transaksi', 'PAID')
    .in('payment_method', ['TRANSFER', 'QRIS'])
    .order('tanggal', { ascending: false });
    
  let mandiriFromSales = 0;
  let bsiFromSales = 0;
  let bniFromSales = 0;

  sales?.forEach(s => {
    let bank = 'Unknown';
    if (s.payment_method === 'QRIS') {
      bank = 'BSI'; bsiFromSales += s.total;
    } else {
      const ket = s.keterangan ? s.keterangan.toUpperCase() : '';
      if (ket.includes('BSI')) { bank = 'BSI'; bsiFromSales += s.total; }
      else if (ket.includes('MANDIRI')) { bank = 'MANDIRI'; mandiriFromSales += s.total; }
      else if (ket.includes('BNI')) { bank = 'BNI'; bniFromSales += s.total; }
      else { bank = 'Unknown (Fallback Mandiri)'; mandiriFromSales += s.total; }
    }
  });

  console.log(`Berdasarkan histori PENJUALAN saja:`);
  console.log(`- Mandiri: ${mandiriFromSales}`);
  console.log(`- BSI: ${bsiFromSales}`);
  console.log(`- BNI: ${bniFromSales}`);

  console.log("\n=== 4. PENGELUARAN YANG MEMOTONG SALDO BANK ===");
  const { data: creditLedger } = await supabase.from('cash_transactions')
    .select('reference_type, account_id, credit, description')
    .gt('credit', 0)
    .not('description', 'like', 'Backfill%');
    
  console.log("\n=== 6. KONDISI BUKU KAS SAAT INI ===");
  const { data: cleanLedger } = await supabase.from('cash_transactions')
    .select('account_id, debit, credit');

  const cleanBalances = {};
  cleanLedger?.forEach(l => {
    if (!l.account_id) return;
    if (!cleanBalances[l.account_id]) cleanBalances[l.account_id] = { debit: 0, credit: 0 };
    cleanBalances[l.account_id].debit += l.debit || 0;
    cleanBalances[l.account_id].credit += l.credit || 0;
  });

  for (const acc of accounts || []) {
    const b = cleanBalances[acc.id] || { debit: 0, credit: 0 };
    console.log(`${acc.name}: Debit=${b.debit}, Credit=${b.credit} => SALDO: ${b.debit - b.credit}`);
  }
}

checkData();
