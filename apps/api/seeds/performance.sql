-- PostgreSQL performance data seed for Uploady.
--
-- This file contains two independent transactions:
--   1. Folder seed: adds 8 folders for the application's temporary user.
--   2. File seed: adds 40 files, each with one file_version and one completed
--      SINGLE upload_session. Exactly 60% of each batch is put in a randomly
--      selected existing folder; the rest is placed at the vault root.
--
-- Both transactions are intentionally repeatable: every execution creates new
-- UUIDs, names, timestamps, sizes, checksums, and fake object keys. To generate
-- a larger file batch, change the file_count setting in the file transaction.

-- ============================================================================
-- FOLDER SEED (can be run independently)
-- ============================================================================

BEGIN;

-- This is the temporary user ID currently used by the API services.
INSERT INTO users (id, email)
VALUES (
  '9e9a548c-dced-4f30-958d-19d423b53028',
  'performance-seed@uploady.local'
)
ON CONFLICT (id) DO NOTHING;

WITH generated_folders AS MATERIALIZED (
  SELECT
    folder_number,
    gen_random_uuid() AS id,
    (
      ARRAY[
        'Archive', 'Assets', 'Backups', 'Designs', 'Documents', 'Exports',
        'Invoices', 'Media', 'Projects', 'Reports', 'Research', 'Shared'
      ]
    )[1 + floor(random() * 12)::integer]
      || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)
      AS name,
    clock_timestamp() - random() * interval '730 days' AS created_at
  FROM generate_series(1, 8) AS series(folder_number)
)
INSERT INTO folders (
  id,
  user_id,
  parent_folder_id,
  name,
  created_at,
  updated_at
)
SELECT
  child.id,
  '9e9a548c-dced-4f30-958d-19d423b53028'::uuid,
  CASE
    -- Five root folders and three folders nested under random root folders.
    WHEN child.folder_number <= 5 THEN NULL
    ELSE (
      SELECT parent.id
      FROM generated_folders AS parent
      WHERE parent.folder_number <= 5
      ORDER BY md5(
        random()::text || child.id::text || parent.id::text
      )
      LIMIT 1
    )
  END,
  child.name,
  child.created_at,
  child.created_at + random() * (clock_timestamp() - child.created_at)
FROM generated_folders AS child;

COMMIT;

-- ============================================================================
-- FILE + FILE VERSION + SINGLE UPLOAD SESSION SEED (can be run independently)
-- Requires at least one existing folder for the temporary user so that 60% of
-- the generated files can be nested. It does not depend on the folder names or
-- IDs created by the folder transaction above.
-- ============================================================================

BEGIN;

INSERT INTO users (id, email)
VALUES (
  '9e9a548c-dced-4f30-958d-19d423b53028',
  'performance-seed@uploady.local'
)
ON CONFLICT (id) DO NOTHING;

DO $seed_validation$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM folders
    WHERE user_id = '9e9a548c-dced-4f30-958d-19d423b53028'::uuid
  ) THEN
    RAISE EXCEPTION
      'File seed needs at least one folder for user 9e9a548c-dced-4f30-958d-19d423b53028; run the folder seed first';
  END IF;
END
$seed_validation$;

CREATE TEMPORARY TABLE seed_file_payload ON COMMIT DROP AS
WITH
settings AS (
  -- Change this value to create more records per execution.
  SELECT 40::integer AS file_count
),
available_folders AS (
  SELECT array_agg(id ORDER BY id) AS ids
  FROM folders
  WHERE user_id = '9e9a548c-dced-4f30-958d-19d423b53028'::uuid
),
generated AS (
  SELECT series.file_number, settings.file_count
  FROM settings
  CROSS JOIN LATERAL generate_series(1, settings.file_count)
    AS series(file_number)
)
SELECT
  gen_random_uuid() AS file_id,
  gen_random_uuid() AS version_id,
  gen_random_uuid() AS session_id,
  '9e9a548c-dced-4f30-958d-19d423b53028'::uuid AS user_id,
  CASE
    -- File numbers 1..60% are nested; the selected folder varies per row.
    WHEN generated.file_number <= floor(generated.file_count * 0.60)
      THEN available_folders.ids[
        1 + floor(random() * cardinality(available_folders.ids))::integer
      ]
    ELSE NULL
  END AS parent_folder_id,
  random_name.adjective || '-' || random_name.subject || '-'
    || to_char(created.created_at, 'YYYYMMDD-HH24MISS') || '-'
    || substr(md5(random()::text || generated.file_number::text), 1, 8)
    || '.' || selected_type.extension AS file_name,
  selected_type.mime_type AS content_type,
  floor(
    selected_type.minimum_size
      + random() * (selected_type.maximum_size - selected_type.minimum_size + 1)
  )::bigint AS size_bytes,
  created.created_at,
  gen_random_uuid() AS object_token,
  md5(
    random()::text || clock_timestamp()::text || generated.file_number::text
  ) AS checksum
FROM generated
CROSS JOIN available_folders
CROSS JOIN LATERAL (
  SELECT file_type.*
  FROM (
    VALUES
      ('pdf',  'application/pdf',
        4096::bigint, 52428800::bigint),
      ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        8192::bigint, 26214400::bigint),
      ('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        8192::bigint, 104857600::bigint),
      ('pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        16384::bigint, 157286400::bigint),
      ('txt',  'text/plain',
        128::bigint, 5242880::bigint),
      ('csv',  'text/csv',
        256::bigint, 104857600::bigint),
      ('json', 'application/json',
        256::bigint, 52428800::bigint),
      ('zip',  'application/zip',
        65536::bigint, 2147483648::bigint),
      ('jpg',  'image/jpeg',
        32768::bigint, 26214400::bigint),
      ('png',  'image/png',
        16384::bigint, 52428800::bigint),
      ('webp', 'image/webp',
        8192::bigint, 20971520::bigint),
      ('svg',  'image/svg+xml',
        512::bigint, 2097152::bigint),
      ('mp3',  'audio/mpeg',
        1048576::bigint, 314572800::bigint),
      ('wav',  'audio/wav',
        5242880::bigint, 1073741824::bigint),
      ('mp4',  'video/mp4',
        10485760::bigint, 5368709120::bigint),
      ('webm', 'video/webm',
        10485760::bigint, 3221225472::bigint)
  ) AS file_type(extension, mime_type, minimum_size, maximum_size)
  ORDER BY md5(
    random()::text || generated.file_number::text || file_type.extension
  )
  LIMIT 1
) AS selected_type
CROSS JOIN LATERAL (
  SELECT
    (ARRAY[
      'annual', 'archived', 'client', 'confidential', 'draft', 'final',
      'internal', 'legacy', 'monthly', 'personal', 'production', 'quarterly',
      'reviewed', 'shared', 'temporary', 'weekly'
    ])[1 + floor(random() * 16)::integer] AS adjective,
    (ARRAY[
      'analysis', 'backup', 'brief', 'budget', 'contract', 'dataset',
      'design', 'export', 'invoice', 'meeting', 'notes', 'photo', 'report',
      'roadmap', 'snapshot', 'specification'
    ])[1 + floor(random() * 16)::integer] AS subject
  WHERE generated.file_number IS NOT NULL
) AS random_name
CROSS JOIN LATERAL (
  SELECT clock_timestamp() - random() * interval '730 days' AS created_at
  WHERE generated.file_number IS NOT NULL
) AS created;

INSERT INTO files (
  id,
  user_id,
  parent_folder_id,
  name,
  current_version_id,
  status,
  created_at,
  updated_at
)
SELECT
  file_id,
  user_id,
  parent_folder_id,
  file_name,
  NULL,
  'READY'::file_status,
  created_at,
  created_at + random() * (clock_timestamp() - created_at)
FROM seed_file_payload;

INSERT INTO file_versions (
  id,
  file_id,
  version,
  object_key,
  content_type,
  size_bytes,
  checksum,
  status,
  created_at
)
SELECT
  version_id,
  file_id,
  1,
  'fake-s3/users/' || user_id::text || '/objects/' || object_token::text
    || '/versions/1/' || file_name,
  content_type,
  size_bytes,
  checksum,
  'READY'::file_version_status,
  created_at
FROM seed_file_payload;

INSERT INTO upload_sessions (
  id,
  file_id,
  file_version_id,
  storage_upload_id,
  object_key,
  status,
  mode,
  total_size_bytes,
  part_size_bytes,
  expected_parts,
  expires_at,
  created_at,
  completed_at
)
SELECT
  session_id,
  file_id,
  version_id,
  'fake-single-' || session_id::text,
  'fake-s3/users/' || user_id::text || '/objects/' || object_token::text
    || '/versions/1/' || file_name,
  'COMPLETED'::upload_session_status,
  'SINGLE'::upload_mode,
  size_bytes,
  size_bytes,
  1,
  created_at + interval '24 hours',
  created_at,
  created_at + interval '1 second' + random() * interval '30 minutes'
FROM seed_file_payload;

UPDATE files AS file
SET
  current_version_id = payload.version_id,
  updated_at = GREATEST(file.updated_at, payload.created_at + interval '1 second')
FROM seed_file_payload AS payload
WHERE file.id = payload.file_id;

COMMIT;

-- Optional verification after running both transactions:
-- SELECT count(*) AS seeded_folders
-- FROM folders
-- WHERE user_id = '9e9a548c-dced-4f30-958d-19d423b53028';
--
-- SELECT
--   count(*) AS seeded_files,
--   count(*) FILTER (WHERE file.parent_folder_id IS NOT NULL) AS nested_files,
--   count(*) FILTER (WHERE file.parent_folder_id IS NULL) AS root_files
-- FROM files AS file
-- WHERE file.user_id = '9e9a548c-dced-4f30-958d-19d423b53028';
