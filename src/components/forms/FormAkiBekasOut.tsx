'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { useToast } from '@/components/ui/Toast'
import { createAkiBekasSale } from '@/actions/aki-bekas'
import { toInputDate } from '@/lib/utils'

interface SaleItem {
  kapasitas_ah: number;
  qty: number;
  maxQty: number;
  hargaJual: number;
  selected: boolean;
}

export function FormAkiBekasOut({
  summary,
  categories,
  onSuccess,
  onCancel
}: {
  summary: any[]
  categories: any[]
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const [tanggal, setTanggal] = useState(toInputDate())
  const [keterangan, setKeterangan] = useState('')
  
  const [items, setItems] = useState<SaleItem[]>([])

  useEffect(() => {
    setItems(
      summary.map(s => {
        const cat = categories.find(c => String(c.kapasitas_ah) === String(s.kapasitas_ah));
        return {
          kapasitas_ah: s.kapasitas_ah,
          qty: s.qty,
          maxQty: s.qty,
          hargaJual: cat ? Number(cat.harga_jual) : 0,
          selected: false,
        };
      })
    );
  }, [summary, categories]);

  const allSelected = items.length > 0 && items.every(i => i.selected)

  const toggleAll = () => {
    setItems(items.map(i => ({
      ...i,
      selected: !allSelected,
      qty: !allSelected ? i.maxQty : i.qty
    })))
  }

  const toggleItem = (kapasitas_ah: number) => {
    setItems(items.map(i => i.kapasitas_ah === kapasitas_ah ? { ...i, selected: !i.selected } : i))
  }

  const updateItemQty = (kapasitas_ah: number, val: number) => {
    setItems(items.map(i => i.kapasitas_ah === kapasitas_ah ? { ...i, qty: val, selected: true } : i))
  }

  const updateItemHarga = (kapasitas_ah: number, val: number) => {
    setItems(items.map(i => i.kapasitas_ah === kapasitas_ah ? { ...i, hargaJual: val } : i))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedItems = items.filter(i => i.selected)
    
    if (selectedItems.length === 0) return showToast('error', 'Pilih minimal 1 aki yang akan dijual')
    
    for (const item of selectedItems) {
      if (item.qty <= 0) return showToast('error', `Qty untuk ${item.kapasitas_ah} AH harus lebih dari 0`)
      if (item.qty > item.maxQty) return showToast('error', `Qty ${item.kapasitas_ah} AH melebihi stok (Maks: ${item.maxQty})`)
      if (item.hargaJual <= 0) return showToast('error', `Harga jual untuk ${item.kapasitas_ah} AH harus lebih dari 0`)
    }

    startTransition(async () => {
      let successCount = 0;
      let errorMsg = '';
      
      for (const item of selectedItems) {
        const res = await createAkiBekasSale({
          tanggal,
          kapasitas_ah: item.kapasitas_ah,
          qty: item.qty,
          harga_jual_unit: item.hargaJual,
          keterangan
        });
        
        if (res.success) {
          successCount++;
        } else {
          errorMsg = res.error || 'Gagal menyimpan penjualan';
          break;
        }
      }

      if (successCount === selectedItems.length) {
        showToast('success', 'Berhasil menyimpan penjualan aki bekas')
        onSuccess?.()
      } else if (successCount > 0) {
        showToast('warning', `Sebagian penjualan berhasil disimpan, namun terjadi error: ${errorMsg}`)
        onSuccess?.() // still trigger success to refresh data
      } else {
        showToast('error', errorMsg)
      }
    })
  }

  const totalKeseluruhan = items.filter(i => i.selected).reduce((sum, item) => sum + (item.qty * item.hargaJual), 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Tanggal</label>
        <Input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <label className="text-sm font-medium text-gray-700">Pilih Aki Bekas</label>
          {items.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer text-gray-600 hover:text-gray-900 font-medium">Pilih Semua</label>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">Tidak ada stok aki bekas tersedia</div>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.kapasitas_ah} className={`p-3 border rounded-lg transition-colors ${item.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    id={`item-${item.kapasitas_ah}`}
                    checked={item.selected}
                    onChange={() => toggleItem(item.kapasitas_ah)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`item-${item.kapasitas_ah}`} className="font-semibold text-gray-800 cursor-pointer flex-1">
                    {item.kapasitas_ah} AH (Stok: {item.maxQty})
                  </label>
                </div>
                
                {item.selected && (
                  <div className="grid grid-cols-2 gap-3 pl-7 mt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Qty</label>
                      <Input
                        type="number"
                        min="1"
                        max={item.maxQty}
                        value={item.qty}
                        onChange={(e) => updateItemQty(item.kapasitas_ah, Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Harga Satuan</label>
                      <InputCurrency
                        value={item.hargaJual}
                        onChange={(val) => updateItemHarga(item.kapasitas_ah, Number(val) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Total Penjualan</label>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-semibold text-lg text-green-600">
          Rp {totalKeseluruhan.toLocaleString('id-ID')}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Keterangan (Opsional)</label>
        <Input
          placeholder="Misal: Dijual ke pengepul"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" loading={isPending} disabled={items.filter(i => i.selected).length === 0}>
          Simpan Penjualan
        </Button>
      </div>
    </form>
  )
}
