'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Product, Supplier, Employee, ExpenseCategory } from '@/types/database'

// ============================================================
// PRODUCTS
// ============================================================

const ProductSchema = z.object({
  kode_produk: z.string().optional(),
  merk: z.string().min(1, 'Merk wajib diisi'),
  kategori: z.string().min(1, 'Kategori wajib diisi'),
  type: z.string().optional(),
  kode_baterai: z.string().optional(),
  kapasitas_ah: z.number().min(0, 'Kapasitas tidak boleh negatif'),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  status: z.boolean().default(true),
})

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const raw = {
    kode_produk: `PRD-${Math.floor(10000 + Math.random() * 90000)}`,
    merk: formData.get('merk') as string,
    kategori: formData.get('kategori') as string,
    type: formData.get('type') as string || undefined,
    kode_baterai: formData.get('kode_baterai') as string || undefined,
    kapasitas_ah: Number(formData.get('kapasitas_ah')),
    harga_jual: Number(formData.get('harga_jual')),
    status: formData.get('status') === 'true',
  }

  const parsed = ProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('products').insert({
    ...parsed.data,
    type: parsed.data.type || null,
    kode_baterai: parsed.data.kode_baterai || null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  return { success: true, message: 'Produk berhasil ditambahkan' }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const raw = {
    merk: formData.get('merk') as string,
    kategori: formData.get('kategori') as string,
    type: formData.get('type') as string || undefined,
    kode_baterai: formData.get('kode_baterai') as string || undefined,
    kapasitas_ah: Number(formData.get('kapasitas_ah')),
    harga_jual: Number(formData.get('harga_jual')),
    status: formData.get('status') === 'true',
  }

  const parsed = ProductSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('products')
    .update({
      ...parsed.data,
      type: parsed.data.type || null,
      kode_baterai: parsed.data.kode_baterai || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  return { success: true, message: 'Produk berhasil diperbarui' }
}

export async function toggleProductStatus(id: string, status: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ status })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/produk')
  return { success: true }
}



// ============================================================
// SUPPLIERS
// ============================================================

const SupplierSchema = z.object({
  kode_supplier: z.string().optional(),
  nama_supplier: z.string().min(1, 'Nama supplier wajib diisi'),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  status: z.boolean().default(true),
})

export async function createSupplier(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const raw = {
    kode_supplier: `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
    nama_supplier: formData.get('nama_supplier') as string,
    alamat: formData.get('alamat') as string || undefined,
    telepon: formData.get('telepon') as string || undefined,
    email: formData.get('email') as string || undefined,
    status: true,
  }

  const parsed = SupplierSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('suppliers').insert({
    ...parsed.data,
    email: parsed.data.email || null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/supplier')
  return { success: true, message: 'Supplier berhasil ditambahkan' }
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient()

  const raw = {
    nama_supplier: formData.get('nama_supplier') as string,
    alamat: formData.get('alamat') as string || undefined,
    telepon: formData.get('telepon') as string || undefined,
    email: formData.get('email') as string || undefined,
    status: formData.get('status') === 'true',
  }

  const parsed = SupplierSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('suppliers')
    .update({ ...parsed.data, email: parsed.data.email || null })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/supplier')
  return { success: true, message: 'Supplier berhasil diperbarui' }
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) {
    if (error.message.includes('foreign key') || error.code === '23503') {
      return { success: false, error: 'Supplier tidak bisa dihapus karena masih digunakan di transaksi' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/supplier')
  return { success: true, message: 'Supplier berhasil dihapus' }
}



// ============================================================
// EMPLOYEES
// ============================================================

const EmployeeSchema = z.object({
  kode_karyawan: z.string().optional(),
  nama_karyawan: z.string().min(1, 'Nama karyawan wajib diisi'),
  jabatan: z.string().optional(),
  gaji: z.number().min(0),
  status: z.boolean().default(true),
})

export async function createEmployee(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const raw = {
    kode_karyawan: `KRY-${Math.floor(10000 + Math.random() * 90000)}`,
    nama_karyawan: formData.get('nama_karyawan') as string,
    jabatan: formData.get('jabatan') as string || undefined,
    gaji: Number(formData.get('gaji')),
    status: true,
  }

  const parsed = EmployeeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('employees').insert({
    ...parsed.data,
    jabatan: parsed.data.jabatan || null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/karyawan')
  return { success: true, message: 'Karyawan berhasil ditambahkan' }
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient()

  const raw = {
    nama_karyawan: formData.get('nama_karyawan') as string,
    jabatan: formData.get('jabatan') as string || undefined,
    gaji: Number(formData.get('gaji')),
    status: formData.get('status') === 'true',
  }

  const parsed = EmployeeSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('employees')
    .update({ ...parsed.data, jabatan: parsed.data.jabatan || null })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/karyawan')
  return { success: true, message: 'Karyawan berhasil diperbarui' }
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) {
    if (error.message.includes('foreign key') || error.code === '23503') {
      return { success: false, error: 'Karyawan tidak bisa dihapus karena masih digunakan di transaksi' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/karyawan')
  return { success: true, message: 'Karyawan berhasil dihapus' }
}



// ============================================================
// EXPENSE CATEGORIES
// ============================================================

const CategorySchema = z.object({
  kode_kategori: z.string().optional(),
  nama_kategori: z.string().min(1, 'Nama kategori wajib diisi'),
  status: z.boolean().default(true),
})

export async function createExpenseCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const raw = {
    kode_kategori: `KAT-${Math.floor(10000 + Math.random() * 90000)}`,
    nama_kategori: formData.get('nama_kategori') as string,
    status: true,
  }

  const parsed = CategorySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('expense_categories').insert(parsed.data)
  if (error) return { success: false, error: error.message }

  revalidatePath('/kategori')
  return { success: true, message: 'Kategori berhasil ditambahkan' }
}

export async function updateExpenseCategory(id: string, formData: FormData) {
  const supabase = await createClient()

  const raw = {
    nama_kategori: formData.get('nama_kategori') as string,
    status: formData.get('status') === 'true',
  }

  const parsed = CategorySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('expense_categories')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kategori')
  return { success: true, message: 'Kategori berhasil diperbarui' }
}

export async function deleteExpenseCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { error } = await supabase.from('expense_categories').delete().eq('id', id)
  if (error) {
    if (error.message.includes('foreign key') || error.code === '23503') {
      return { success: false, error: 'Kategori tidak bisa dihapus karena masih digunakan di transaksi' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/kategori')
  return { success: true, message: 'Kategori berhasil dihapus' }
}
