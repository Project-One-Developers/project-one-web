import { getTableColumns, sql, SQL } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"
import { z } from "zod"

export const identity = <T>(value: T): T => value

export const newUUID = (): string => crypto.randomUUID()

// https://orm.drizzle.team/docs/guides/upsert#postgresql-and-sqlite
export const buildConflictUpdateColumns = <
    T extends PgTable,
    Q extends keyof T["_"]["columns"],
>(
    table: T,
    columns: Q[]
): Record<Q, SQL> => {
    const cls = getTableColumns(table)

    return columns.reduce(
        (acc, column) => {
            const col = cls[column]
            if (col) {
                acc[column] = sql.raw(`excluded.${col.name}`)
            }
            return acc
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Generic record builder
        {} as Record<Q, SQL>
    )
}

// Build conflict update set for all columns except the specified ones
export const conflictUpdateAllExcept = <T extends PgTable>(
    table: T,
    excludeColumns: (keyof T["_"]["columns"])[]
): Record<string, SQL> => {
    const cls = getTableColumns(table)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Generic column keys to string
    const excludeSet = new Set(excludeColumns as string[])

    return Object.keys(cls).reduce<Record<string, SQL>>((acc, column) => {
        if (!excludeSet.has(column)) {
            const col = cls[column]
            if (col) {
                acc[column] = sql.raw(`excluded.${col.name}`)
            }
        }
        return acc
    }, {})
}

/**
 * Maps database results to domain models with Zod validation.
 * Ensures type safety at the boundary between database and application layers.
 */
export function mapAndParse<TDb, TModel>(
    dbResult: TDb | TDb[],
    mapper: (row: TDb) => TModel,
    schema: z.ZodType<TModel>
): TModel | TModel[] {
    if (Array.isArray(dbResult)) {
        return schema.array().parse(dbResult.map(mapper))
    }
    return schema.parse(mapper(dbResult))
}
