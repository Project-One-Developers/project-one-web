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
): Record<Q, SQL<unknown>> => {
    const cls = getTableColumns(table)

    return columns.reduce(
        (acc, column) => {
            const colName = cls[column].name
            acc[column] = sql.raw(`excluded.${colName}`)
            return acc
        },
        {} as Record<Q, SQL>
    )
}

// Build conflict update set for all columns except the specified ones
export const conflictUpdateAllExcept = <
    T extends PgTable,
    Q extends keyof T["_"]["columns"],
>(
    table: T,
    excludeColumns: Q[]
): Record<string, SQL<unknown>> => {
    const cls = getTableColumns(table)
    const excludeSet = new Set(excludeColumns as string[])

    return Object.keys(cls).reduce(
        (acc, column) => {
            if (!excludeSet.has(column)) {
                const colName = cls[column].name
                acc[column] = sql.raw(`excluded.${colName}`)
            }
            return acc
        },
        {} as Record<string, SQL>
    )
}
