import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env vars
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

// Create admin client bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetTransactions() {
  console.log('Starting transaction reset...')

  const tablesToClear = [
    'activity_log',
    'sale_batch_allocations',
    'inventory_movements',
    'inventory_batches',
    'sale_items',
    'sales',
    'purchase_items',
    'supplier_payments',
    'purchase_transactions',
    'air_aki_purchases',
    'cash_transactions',
    'expenses'
  ]

  for (const table of tablesToClear) {
    console.log(`Clearing ${table}...`)
    // Delete all records bypassing RLS
    const { error } = await supabase
      .from(table)
      .delete()
      .not('id', 'is', null)

    if (error) {
      console.error(`Error clearing ${table}:`, error)
      process.exit(1)
    }
  }

  console.log('Resetting product stock to 0...')
  const { error: productError } = await supabase
    .from('products')
    .update({ qty_stok: 0 })
    .not('id', 'is', null)

  if (productError) {
    console.error('Error resetting product stock:', productError)
    process.exit(1)
  }

  console.log('Reset complete successfully!')
}

resetTransactions().catch(console.error)
