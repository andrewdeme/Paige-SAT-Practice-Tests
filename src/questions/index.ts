// The shipped bank: every JSON file in ./bank, validated at build time by
// scripts/validate-bank.ts. The parse below is a belt-and-braces check that
// also gives the app a properly typed array.
import { QuestionSchema, type Question } from './schema.ts'

const files = import.meta.glob('./bank/*.json', { eager: true, import: 'default' }) as Record<
  string,
  unknown[]
>

export const BANK: readonly Question[] = Object.keys(files)
  .sort()
  .flatMap((k) => files[k]!)
  .map((q) => QuestionSchema.parse(q))

export * from './schema.ts'
