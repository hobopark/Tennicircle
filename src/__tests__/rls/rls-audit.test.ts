// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('RLS Audit — all tables must have RLS enabled with policies', () => {
  const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations')
  const sqlFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
  const allSql = sqlFiles
    .map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf-8'))
    .join('\n')

  // Extract all CREATE TABLE statements (public schema)
  const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi
  const tables: string[] = []
  let match: RegExpExecArray | null
  while ((match = tableRegex.exec(allSql)) !== null) {
    tables.push(match[1])
  }

  it('should find at least 10 tables in migrations', () => {
    expect(tables.length).toBeGreaterThanOrEqual(10)
  })

  for (const table of tables) {
    describe(`Table: ${table}`, () => {
      it('has ROW LEVEL SECURITY enabled', () => {
        const rlsPattern = new RegExp(
          `enable\\s+row\\s+level\\s+security.*${table}|${table}.*enable\\s+row\\s+level\\s+security|alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`,
          'i'
        )
        // Also check the simpler pattern where ALTER TABLE and ENABLE RLS are on the same line
        const simplePattern = new RegExp(
          `${table}[\\s\\S]{0,50}enable\\s+row\\s+level\\s+security`,
          'i'
        )
        const hasRls = rlsPattern.test(allSql) || simplePattern.test(allSql)
        expect(hasRls, `Table "${table}" is missing ENABLE ROW LEVEL SECURITY — LAUNCH BLOCKER per D-08`).toBe(true)
      })

      it('has at least one RLS policy', () => {
        const policyPattern = new RegExp(
          `create\\s+policy\\s+[\\s\\S]*?on\\s+(?:public\\.)?${table}\\b`,
          'i'
        )
        const hasPolicy = policyPattern.test(allSql)
        expect(hasPolicy, `Table "${table}" has RLS enabled but NO POLICIES defined — LAUNCH BLOCKER per D-08`).toBe(true)
      })
    })
  }
})
