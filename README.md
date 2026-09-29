# SAT Rehearsal Trainer

Timed practice environment focused on condition tolerance. See [SPEC.md](SPEC.md).

## Develop

```sh
npm install
npm run dev
```

## Deploy

Vercel, static. Import the GitHub repo, framework preset **Vite**, no other settings.

## Question bank

- Schema: `src/questions/schema.ts` (zod; the `Question` type is inferred from it)
- Items: `src/questions/bank/*.json`, all `source: "original"`
- `npm run validate` checks every item and exits non-zero on the first malformed
  one. `npm run build` runs it first, so a bad item fails the Vercel deploy.

Educator Question Bank imports (`source: "eqb"`) are on-device only and never
committed (SPEC §10); the validator rejects them.
