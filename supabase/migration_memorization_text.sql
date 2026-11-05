-- Memorization cards drawn from text.
--
-- The teacher types (or pastes) the Arabic once; the app paints a pastel card
-- from it in the browser and uploads that picture as image_url, so every reader
-- of image_url (student pages, live class, prep panel) keeps working unchanged.
-- arabic_text is kept so the cards can be repainted when the template changes.
--
-- Idempotent. Apply before deploying the code that writes the column.

ALTER TABLE memorization_catalog ADD COLUMN IF NOT EXISTS arabic_text text;
ALTER TABLE memorization_chunks ADD COLUMN IF NOT EXISTS arabic_text text;
