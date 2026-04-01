-- Migration 006: Add image_url column to spells table
ALTER TABLE spells ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Set school-based representative images from 5etools PHB artwork
-- Each spell school gets an iconic spell image as visual representation
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Fireball.webp'       WHERE school = 'evocation';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Animate Dead.webp'   WHERE school = 'necromancy';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Charm Person.webp'   WHERE school = 'enchantment';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Major Image.webp'    WHERE school = 'illusion';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Detect Magic.webp'   WHERE school = 'divination';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Shield.webp'         WHERE school = 'abjuration';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Misty Step.webp'     WHERE school = 'conjuration';
UPDATE spells SET image_url = 'https://5e.tools/img/spells/PHB/Polymorph.webp'      WHERE school = 'transmutation';
