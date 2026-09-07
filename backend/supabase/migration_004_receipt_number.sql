-- Adds a receipt/work-order number field, extracted from the document
-- itself when visible. This is the most reliable way to detect a duplicate
-- upload of the same real-world receipt: two different photos of the same
-- physical document should carry the same printed number, whereas
-- coincidental matches on date/mileage/cost across genuinely different
-- service visits are possible but far less likely to share the same
-- document number too.

alter table service_entries add column receipt_number text;
