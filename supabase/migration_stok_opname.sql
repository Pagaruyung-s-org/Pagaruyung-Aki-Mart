-- Stok Opname: Allow inventory_batches without a purchase_item_id
-- This enables creating batches from stock adjustments (opname)
ALTER TABLE inventory_batches ALTER COLUMN purchase_item_id DROP NOT NULL;
