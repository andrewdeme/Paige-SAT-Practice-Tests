// Question schema (SPEC §6). The zod schema is the single source of truth:
// the app gets its `Question` type from it, and scripts/validate-bank.ts uses
// it to fail the build on any malformed item.
import { z } from 'zod'

export const SECTIONS = ['rw', 'math'] as const
export type Section = (typeof SECTIONS)[number]

export const DIFFICULTIES = ['E', 'M', 'H'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

// Official College Board domain and skill names. `code` is the id segment.
export const DOMAINS = {
  rw: {
    'Information and Ideas': {
      code: 'ii',
      skills: [
        'Central Ideas and Details',
        'Command of Evidence: Textual',
        'Command of Evidence: Quantitative',
        'Inferences',
      ],
    },
    'Craft and Structure': {
      code: 'cs',
      skills: ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections'],
    },
    'Expression of Ideas': {
      code: 'ei',
      skills: ['Rhetorical Synthesis', 'Transitions'],
    },
    'Standard English Conventions': {
      code: 'sec',
      skills: ['Boundaries', 'Form, Structure, and Sense'],
    },
  },
  math: {
    Algebra: {
      code: 'alg',
      skills: [
        'Linear equations in one variable',
        'Linear functions',
        'Linear equations in two variables',
        'Systems of two linear equations in two variables',
        'Linear inequalities in one or two variables',
      ],
    },
    'Advanced Math': {
      code: 'am',
      skills: [
        'Nonlinear functions',
        'Nonlinear equations in one variable and systems of equations in two variables',
        'Equivalent expressions',
      ],
    },
    'Problem-Solving and Data Analysis': {
      code: 'psda',
      skills: [
        'Ratios, rates, proportional relationships, and units',
        'Percentages',
        'One-variable data: Distributions and measures of center and spread',
        'Two-variable data: Models and scatterplots',
        'Probability and conditional probability',
        'Inference from sample statistics and margin of error',
        'Evaluating statistical claims: Observational studies and experiments',
      ],
    },
    'Geometry and Trigonometry': {
      code: 'gt',
      skills: [
        'Area and volume',
        'Lines, angles, and triangles',
        'Right triangles and trigonometry',
        'Circles',
      ],
    },
  },
} as const satisfies Record<Section, Record<string, { code: string; skills: readonly string[] }>>

// Bluebook SPR entry: digits, one optional leading minus, one '.' or one '/'.
// At most 5 characters for a positive answer, 6 for a negative one.
const SPR_VALUE = /^-?(\d+(\.\d+)?|\.\d+|\d+\/\d+)$/
export function isEnterableSpr(value: string): boolean {
  const max = value.startsWith('-') ? 6 : 5
  return value.length <= max && SPR_VALUE.test(value)
}

// SPR answers list every accepted entry, separated by '|': "3/2|1.5".
export function acceptedSprValues(answer: string): string[] {
  return answer.split('|')
}

const text = z.string().trim().min(1)

const base = {
  id: z.string().regex(/^(rw|math)-[a-z]+-[emh]-\d{3}$/, 'id must look like rw-cs-m-014'),
  section: z.enum(SECTIONS),
  domain: text,
  skill: text,
  difficulty: z.enum(DIFFICULTIES),
  stimulus: text.optional(),
  figure: z
    .string()
    .refine((f) => f.trimStart().startsWith('<svg') || f.startsWith('data:image/'), {
      message: 'figure must be inline <svg> or a data:image/ URI',
    })
    .optional(),
  stem: text,
  rationale: text,
  source: z.enum(['original', 'eqb']),
}

const multipleChoice = z.strictObject({
  ...base,
  type: z.literal('mc'),
  choices: z.tuple([text, text, text, text]),
  answer: z.int().min(0).max(3),
})

const studentProduced = z.strictObject({
  ...base,
  type: z.literal('spr'),
  answer: z
    .string()
    .refine((a) => acceptedSprValues(a).every(isEnterableSpr), {
      message: 'each accepted SPR value must be Bluebook-enterable (e.g. "3/2|1.5", "-12", ".75")',
    }),
})

export const QuestionSchema = z
  .discriminatedUnion('type', [multipleChoice, studentProduced])
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    const domains: Record<string, { code: string; skills: readonly string[] }> =
      DOMAINS[q.section]
    const domain = domains[q.domain]
    if (!domain) {
      issue('domain', `"${q.domain}" is not a ${q.section} domain`)
    } else {
      if (!domain.skills.includes(q.skill)) {
        issue('skill', `"${q.skill}" is not a skill in ${q.domain}`)
      }
      const expectedPrefix = `${q.section}-${domain.code}-${q.difficulty.toLowerCase()}-`
      if (!q.id.startsWith(expectedPrefix)) {
        issue('id', `id must start with "${expectedPrefix}" to match section/domain/difficulty`)
      }
    }

    if (q.section === 'rw') {
      if (q.type !== 'mc') issue('type', 'Reading & Writing questions are always multiple choice')
      if (!q.stimulus) issue('stimulus', 'Reading & Writing questions need a passage')
    }

    if (q.type === 'mc' && new Set(q.choices.map((c) => c.trim())).size !== 4) {
      issue('choices', 'choices must be distinct')
    }
  })

export type Question = z.infer<typeof QuestionSchema>
