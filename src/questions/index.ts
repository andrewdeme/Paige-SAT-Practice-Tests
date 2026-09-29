// The shipped bank. Every file here is validated at build time by
// scripts/validate-bank.ts; the parse below is a belt-and-braces check
// that also gives the app a properly typed array.
import { QuestionSchema, type Question } from './schema.ts'
import rw from './bank/rw.json'
import math from './bank/math.json'

export const BANK: readonly Question[] = [...rw, ...math].map((q) => QuestionSchema.parse(q))

export * from './schema.ts'
