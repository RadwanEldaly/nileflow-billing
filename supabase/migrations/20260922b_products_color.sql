/*
  # Add missing "color" column to products

  1. Background
    - The Products page UI already had a "اللون / الدرجة" (color) field, and
      `size` already existed as a column — but `color` was never added to the
      database. Saving a product with a color value would fail (or silently
      drop the value) since Postgres/PostgREST rejects unknown columns.

  2. Changes
    - `products.color` (text, nullable): the color/decor code of the sheet,
      e.g. "BEYAZ MAT 1001".
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS color text;
