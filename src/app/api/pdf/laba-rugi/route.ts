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

const baseStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #2563eb; padding-bottom: 12px; margin-bottom: 12px; }
  .company-name { font-size: 20px; font-weight: 700; color: #1e3a8a; }
  .company-sub { font-size: 10px; color: #64748b; margin-top: 3px; }
  .report-title { font-size: 15px; font-weight: 700; color: #1e3a8a; text-align: right; }
  .report-period { font-size: 10px; color: #475569; margin-top: 4px; text-align: right; }
  .report-date { font-size: 9px; color: #94a3b8; margin-top: 3px; text-align: right; }
  .pl-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; border: 1px solid #cbd5e1; }
  .pl-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #111; }
  .pl-table .section-head { background: #1e3a8a; color: #ffffff !important; font-weight: 700; padding: 9px 12px; font-size: 11.5px; letter-spacing: 0.3px; }
  .pl-table .section-head td { color: #ffffff !important; }
  .pl-table .subtotal { background: #eff6ff; font-weight: 700; border-top: 2px solid #3b82f6; color: #1e3a8a; }
  .pl-table .grand-total { background: #1e40af; font-weight: 700; font-size: 13px; border-top: 3px solid #1e3a8a; }
  .pl-table .grand-total td { color: #ffffff !important; padding: 10px 12px; }
  .pl-table .indent { padding-left: 28px; }
  .right { text-align: right; }
  .pos { color: #15803d !important; font-weight: 600; }
  .neg { color: #b91c1c !important; font-weight: 600; }
  .footer { margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; }
  .footer-note { font-size: 9px; color: #94a3b8; }
  .print-bar { text-align: center; padding: 16px; background: #f8fafc; border-bottom: 2px solid #2563eb; }
  .btn-print { background: #1e40af; color: #fff; border: none; padding: 10px 28px; font-size: 13px; border-radius: 6px; cursor: pointer; font-weight: 600; letter-spacing: 0.3px; }
  .btn-print:hover { background: #1e3a8a; }
  .period-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; margin: 10px 0 18px 0; }
  @media print {
    .print-bar { display: none !important; }
    .page { width: 100%; min-height: auto; padding: 10mm; margin: 0; }
    @page { size: A4 portrait; margin: 8mm; }
    body { margin: 0; padding: 0; min-height: auto; }
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

  const [{ data: sales }, { data: expenses }] = await Promise.all([
    supabase.from('sales').select(`total, discount, sale_items ( subtotal, hpp_fifo, laba_kotor )`)
      .eq('status_transaksi', 'PAID').gte('tanggal', startDate).lte('tanggal', endDate),
    supabase.from('expenses').select('nominal')
      .eq('status_transaksi', 'POSTED').gte('tanggal', startDate).lte('tanggal', endDate)
  ])

  let pendapatanKotor = 0, totalDiskon = 0, totalHPP = 0, labaKotor = 0
  sales?.forEach(s => {
    pendapatanKotor += (s.total + (s.discount || 0))
    totalDiskon += (s.discount || 0)
    s.sale_items?.forEach((it: any) => { totalHPP += (it.hpp_fifo || 0); labaKotor += (it.laba_kotor || 0) })
  })
  const pendapatanBersih = pendapatanKotor - totalDiskon
  const recalculatedLabaKotor = pendapatanBersih - totalHPP

  let bebanOperasional = 0
  expenses?.forEach(e => { bebanOperasional += e.nominal })
  const labaBersih = recalculatedLabaKotor - bebanOperasional
  const isProfit = labaBersih >= 0

  const printDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(now)
  const periodeLabel = `${BULAN[m]} ${y}`

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Laporan Laba Rugi — ${periodeLabel}</title>
<style>${baseStyle}</style></head><body>
<div class="print-bar"><button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan sebagai PDF</button></div>
<div class="page">
  <div class="header">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img src="/logo.png" alt="Logo" style="height: 45px; width: auto;" />
      <div>
        <div class="company-name">PT. PAGARUYUNG MITRA PERSADA (AKI MART)</div>
        <div class="company-sub">Distributor Aki &amp; Aksesori Kendaraan</div>
      </div>
    </div>
    <div>
      <div class="report-title">LAPORAN LABA RUGI</div>
      <div class="report-period">Periode: ${periodeLabel}</div>
      <div class="report-date">Dicetak: ${printDate}</div>
    </div>
  </div>
  <div class="period-badge">Periode: ${periodeLabel}</div>
  <table class="pl-table">
    <tr><td colspan="2" class="section-head">I. PENDAPATAN</td></tr>
    <tr><td class="indent">Pendapatan Kotor (Penjualan Bruto)</td><td class="right">${formatRp(pendapatanKotor)}</td></tr>
    <tr><td class="indent">Potongan / Diskon</td><td class="right red">(${formatRp(totalDiskon)})</td></tr>
    <tr class="subtotal"><td style="padding-left:10px;font-weight:700">Total Pendapatan Bersih</td><td class="right pos">${formatRp(pendapatanBersih)}</td></tr>

    <tr><td colspan="2" class="section-head" style="margin-top:8px">II. BEBAN POKOK PENJUALAN (HPP)</td></tr>
    <tr><td class="indent">Harga Pokok Penjualan (HPP)</td><td class="right neg">(${formatRp(totalHPP)})</td></tr>
    <tr class="subtotal"><td style="padding-left:10px;font-weight:700">Laba Kotor</td><td class="right ${recalculatedLabaKotor >= 0 ? 'pos' : 'neg'}">${formatRp(recalculatedLabaKotor)}</td></tr>

    <tr><td colspan="2" class="section-head">III. BEBAN OPERASIONAL</td></tr>
    <tr><td class="indent">Biaya Operasional (Pengeluaran)</td><td class="right neg">(${formatRp(bebanOperasional)})</td></tr>
    <tr class="subtotal"><td style="padding-left:10px;font-weight:700">Total Beban Operasional</td><td class="right neg">(${formatRp(bebanOperasional)})</td></tr>

    <tr class="grand-total">
      <td>LABA / RUGI BERSIH</td>
      <td class="right">${isProfit ? '' : '('}${formatRp(Math.abs(labaBersih))}${isProfit ? '' : ')'}</td>
    </tr>
  </table>

  <div style="margin-top:20px; padding:12px 16px; border:1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}; border-radius:6px; background:${isProfit ? '#f0fdf4' : '#fff1f2'};">
    <div style="font-weight:700; font-size:12px; color:${isProfit ? '#166534' : '#991b1b'}; margin-bottom:4px;">
      ${isProfit ? '✓ Usaha mengalami KEUNTUNGAN pada periode ini' : '✕ Usaha mengalami KERUGIAN pada periode ini'}
    </div>
    <div style="font-size:10px; color:#555;">
      Margin laba bersih: ${pendapatanBersih > 0 ? ((labaBersih / pendapatanBersih) * 100).toFixed(2) : '0'}%
      dari total pendapatan bersih ${formatRp(pendapatanBersih)}
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">* Laporan digenerate otomatis oleh sistem PT. Pagaruyung Mitra Persada (Aki Mart)</div>
    <div class="footer-note">Halaman 1 dari 1</div>
  </div>
</div></body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
