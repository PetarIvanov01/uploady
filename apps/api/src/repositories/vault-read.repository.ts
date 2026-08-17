import { sql } from "drizzle-orm";
import { database, type Database } from "../database";

export interface VaultBreadcrumbRecord extends Record<string, unknown> {
  createdAt: Date | string;
  id: string;
  name: string;
  parentFolderId: string | null;
  updatedAt: Date | string;
}

export interface VaultFolderEntryRecord extends VaultBreadcrumbRecord {
  fileCount: number;
  folderCount: number;
  kind: "folder";
}

export interface VaultFileEntryRecord extends Record<string, unknown> {
  createdAt: Date | string;
  id: string;
  kind: "file";
  name: string;
  parentFolderId: string | null;
  size: number;
  status: "UPLOADING" | "READY" | "FAILED";
  type: string;
  updatedAt: Date | string;
}

export type VaultEntryRecord = VaultFolderEntryRecord | VaultFileEntryRecord;

export interface VaultFileRecord extends Record<string, unknown> {
  createdAt: Date | string;
  id: string;
  name: string;
  parentFolderId: string | null;
  size: number;
  status: "UPLOADING" | "READY" | "FAILED";
  type: string;
  updatedAt: Date | string;
}

interface VaultReadRepositoryDependencies {
  database: Database;
}

export function initVaultReadRepository({
  database,
}: VaultReadRepositoryDependencies) {
  async function findEntries(
    userId: string,
    parentFolderId: string | null,
  ): Promise<VaultEntryRecord[]> {
    const records = await database.execute<VaultEntryRecord>(sql`
      with vault_entries as (
        select
          'folder'::text as kind,
          folder.id,
          folder.name,
          folder.parent_folder_id as "parentFolderId",
          folder.created_at as "createdAt",
          folder.updated_at as "updatedAt",
          null::text as status,
          null::text as type,
          null::double precision as size,
          (
            select count(*)::integer
            from folders child_folder
            where child_folder.user_id = ${userId}
              and child_folder.parent_folder_id = folder.id
          ) as "folderCount",
          (
            select count(*)::integer
            from files child_file
            where child_file.user_id = ${userId}
              and child_file.parent_folder_id = folder.id
              and child_file.status <> 'DELETED'
              and child_file.current_version_id is not null
          ) as "fileCount"
        from folders folder
        where folder.user_id = ${userId}
          and folder.parent_folder_id is not distinct from ${parentFolderId}::uuid

        union all

        select
          'file'::text as kind,
          file.id,
          file.name,
          file.parent_folder_id as "parentFolderId",
          file.created_at as "createdAt",
          file.updated_at as "updatedAt",
          file.status::text as status,
          coalesce(version.content_type, 'application/octet-stream') as type,
          version.size_bytes::double precision as size,
          null::integer as "folderCount",
          null::integer as "fileCount"
        from files file
        inner join file_versions version
          on file.current_version_id = version.id
        where file.user_id = ${userId}
          and file.parent_folder_id is not distinct from ${parentFolderId}::uuid
          and file.status <> 'DELETED'
      )
      select *
      from vault_entries
      order by
        case when kind = 'folder' then 0 else 1 end,
        lower(name),
        id
    `);

    return [...records];
  }

  async function findFolderPath(
    userId: string,
    folderId: string,
  ): Promise<VaultBreadcrumbRecord[]> {
    const records = await database.execute<
      VaultBreadcrumbRecord & { depth: number }
    >(sql`
      with recursive folder_path as (
        select
          folder.id,
          folder.name,
          folder.parent_folder_id as "parentFolderId",
          folder.created_at as "createdAt",
          folder.updated_at as "updatedAt",
          0::integer as depth,
          array[folder.id]::uuid[] as visited_ids
        from folders folder
        where folder.id = ${folderId}
          and folder.user_id = ${userId}

        union all

        select
          parent.id,
          parent.name,
          parent.parent_folder_id as "parentFolderId",
          parent.created_at as "createdAt",
          parent.updated_at as "updatedAt",
          child.depth + 1,
          child.visited_ids || parent.id
        from folders parent
        inner join folder_path child
          on parent.id = child."parentFolderId"
        where parent.user_id = ${userId}
          and not parent.id = any(child.visited_ids)
      )
      select
        id,
        name,
        "parentFolderId",
        "createdAt",
        "updatedAt",
        depth
      from folder_path
      order by depth desc
    `);

    return records.map(({ depth: _depth, ...folder }) => folder);
  }

  async function findFile(
    userId: string,
    fileId: string,
  ): Promise<VaultFileRecord | null> {
    const records = await database.execute<VaultFileRecord>(sql`
      select
        file.id,
        file.name,
        file.parent_folder_id as "parentFolderId",
        file.status::text as status,
        file.created_at as "createdAt",
        file.updated_at as "updatedAt",
        coalesce(version.content_type, 'application/octet-stream') as type,
        version.size_bytes::double precision as size
      from files file
      inner join file_versions version
        on file.current_version_id = version.id
      where file.id = ${fileId}
        and file.user_id = ${userId}
        and file.status <> 'DELETED'
      limit 1
    `);

    return records[0] ?? null;
  }

  return { findEntries, findFile, findFolderPath };
}

export const vaultReadRepository = initVaultReadRepository({ database });
