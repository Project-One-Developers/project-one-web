import { getTableColumns, sql, SQL } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"

export const isPresent = <T>(value: T | null | undefined): value is T =>
    value !== null && value !== undefined

export const newUUID = (): string => crypto.randomUUID()

export const takeFirstResult = <T>(results: T[]): T | null =>
    results.length > 0 && isPresent(results[0]) ? results[0] : null

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
