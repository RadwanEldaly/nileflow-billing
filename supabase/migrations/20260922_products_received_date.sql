/*
  # Add shipment/received date to products

  1. Changes
    - `products.received_date` (date, nullable): the date a shipment/batch of
      sheets was actually received into the warehouse — separate from
      `created_at`, which is just when the row was created in the system.
      Shown as "تاريخ الحمولة" in the Wood Sheets ("الألواح الخشبية") page.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS received_date date;
