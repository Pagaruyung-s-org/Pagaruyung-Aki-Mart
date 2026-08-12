import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BULAN: Record<string, string> = {
  '1': 'Januari', '2': 'Februari', '3': 'Maret', '4': 'April',
  '5': 'Mei', '6': 'Juni', '7': 'Juli', '8': 'Agustus',
  '9': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}
function fmtDateTime(d: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const baseStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  .page { width: 297mm; min-height: 210mm; padding: 15mm 15mm 12mm 15mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #2563eb; padding-bottom: 12px; margin-bottom: 12px; }
  .company-name { font-size: 20px; font-weight: 700; color: #1e3a8a; }
  .company-sub { font-size: 10px; color: #64748b; margin-top: 3px; }
  .report-title { font-size: 15px; font-weight: 700; color: #1e3a8a; text-align: right; }
  .report-period { font-size: 10px; color: #475569; margin-top: 4px; text-align: right; }
  .report-date { font-size: 9px; color: #94a3b8; margin-top: 3px; text-align: right; }
  .summary { display: flex; gap: 10px; margin: 12px 0; }
  .summary-box { flex: 1; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 9px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-left-width: 4px; border-left-color: #3b82f6; }
  .summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .summary-value { font-size: 14px; font-weight: 700; color: #1e3a8a; margin-top: 3px; }
  .summary-box.green { border-left-color: #16a34a; }
  .summary-box.green .summary-value { color: #15803d; }
  .summary-box.red { border-left-color: #dc2626; }
  .summary-box.red .summary-value { color: #b91c1c; }
  .summary-box.orange { border-left-color: #d97706; }
  .summary-box.orange .summary-value { color: #92400e; }
  .section-title { font-size: 11px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #3b82f6; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #1e3a8a; color: #fff; }
  thead th { padding: 7px 9px; text-align: left; font-weight: 600; white-space: nowrap; letter-spacing: 0.2px; }
  tbody tr { background: #fff; }
  tbody tr:nth-child(even) { background: #f0f6ff; }
  tbody td { padding: 5px 9px; border-bottom: 1px solid #dde5f0; vertical-align: top; color: #111; }
  tfoot tr { background: #1e3a8a; color: #fff; font-weight: 700; }
  tfoot td { padding: 8px 9px; color: #fff !important; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .mono { font-family: monospace; font-size: 9px; color: #334155; }
  .green { color: #15803d; font-weight: 600; }
  .red { color: #b91c1c; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1px solid transparent; }
  .badge-lunas { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .badge-parsial { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .badge-hutang { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge-kas { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .badge-bank { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
  .footer { margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; }
  .footer-note { font-size: 9px; color: #94a3b8; }
  .print-bar { text-align: center; padding: 16px; background: #f8fafc; border-bottom: 2px solid #2563eb; }
  .btn-print { background: #1e40af; color: #fff; border: none; padding: 10px 28px; font-size: 13px; border-radius: 6px; cursor: pointer; font-weight: 600; letter-spacing: 0.3px; }
  .btn-print:hover { background: #1e3a8a; }
  @media print {
    .print-bar { display: none !important; }
    .page { width: 100%; padding: 10mm; margin: 0; }
    @page { size: A4 landscape; margin: 8mm; }
  }
`

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const now = new Date()
  const m = searchParams.get('m') || String(now.getMonth() + 1)
  const y = searchParams.get('y') || String(now.getFullYear())

  const startDate = new Date(Number(y), Number(m) - 1, 1).toISOString()
  const endDate = new Date(Number(y), Number(m), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()
  const { data: cashFlow } = await supabase
    .from('cash_transactions')
    .select('*')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: true })

  let totalMasuk = 0, totalKeluar = 0
  let kasDebit = 0, kasKredit = 0, bankDebit = 0, bankKredit = 0

  const rows = (cashFlow || []).map((tx, i) => {
    totalMasuk += tx.debit
    totalKeluar += tx.credit
    if (tx.account_type === 'KAS') { kasDebit += tx.debit; kasKredit += tx.credit }
    else { bankDebit += tx.debit; bankKredit += tx.credit }
    return { ...tx, no: i + 1 }
  })

  const netKas = totalMasuk - totalKeluar
  const printDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(now)
  const periodeLabel = `${BULAN[m]} ${y}`

  const tableRows = rows.map(r => {
    const badgeClass = r.account_type === 'KAS' ? 'badge-kas' : 'badge-bank'
    return `<tr>
      <td class="center">${r.no}</td>
      <td>${fmtDateTime(r.tanggal)}</td>
      <td class="center"><span class="badge ${badgeClass}">${r.account_type}</span></td>
      <td>${r.keterangan || '—'}</td>
      <td class="center">${r.reference_type || '—'}</td>
      <td class="right green bold">${r.debit > 0 ? formatRp(r.debit) : '—'}</td>
      <td class="right red bold">${r.credit > 0 ? formatRp(r.credit) : '—'}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Laporan Arus Kas — ${periodeLabel}</title>
<style>${baseStyle}</style></head><body>
<div class="print-bar"><button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan sebagai PDF</button></div>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">Pagaruyung Aki Mart</div>
      <div class="company-sub">Distributor Aki &amp; Aksesori Kendaraan</div>
    </div>
    <div>
      <div class="report-title">LAPORAN ARUS KAS</div>
      <div class="report-period">Periode: ${periodeLabel}</div>
      <div class="report-date">Dicetak: ${printDate}</div>
    </div>
  </div>
  <div class="summary">
    <div class="summary-box green"><div class="summary-label">Total Uang Masuk</div><div class="summary-value">${formatRp(totalMasuk)}</div></div>
    <div class="summary-box red"><div class="summary-label">Total Uang Keluar</div><div class="summary-value">${formatRp(totalKeluar)}</div></div>
    <div class="summary-box ${netKas >= 0 ? 'green' : 'red'}"><div class="summary-label">Net Arus Kas</div><div class="summary-value">${formatRp(netKas)}</div></div>
    <div class="summary-box"><div class="summary-label">Net KAS Tunai</div><div class="summary-value">${formatRp(kasDebit - kasKredit)}</div></div>
    <div class="summary-box"><div class="summary-label">Net Rekening Bank</div><div class="summary-value">${formatRp(bankDebit - bankKredit)}</div></div>
  </div>
  <div class="section-title">Rincian Transaksi Arus Kas — ${periodeLabel}</div>
  <table>
    <thead><tr>
      <th class="center" style="width:30px">No</th>
      <th>Tanggal &amp; Waktu</th>
      <th class="center">Akun</th>
      <th>Keterangan</th>
      <th class="center">Jenis</th>
      <th class="right">Masuk (Debit)</th>
      <th class="right">Keluar (Kredit)</th>
    </tr></thead>
    <tbody>${tableRows || '<tr><td colspan="7" class="center" style="padding:20px;color:#999">Tidak ada transaksi kas pada periode ini</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="5" style="text-align:right">TOTAL</td>
      <td class="right">${formatRp(totalMasuk)}</td>
      <td class="right">${formatRp(totalKeluar)}</td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <div class="footer-note">* Laporan digenerate otomatis oleh sistem Pagaruyung Aki Mart</div>
    <div class="footer-note">Halaman 1 dari 1</div>
  </div>
</div></body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
