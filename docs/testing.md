# Testing and coverage

## Test suites

Run the isolated Jest suite with:

```bash
pnpm test
```

Generate its coverage report with:

```bash
pnpm test:coverage --runInBand
```

Unit coverage is written to `coverage/unit`. The terminal report groups results by
source directory; `coverage/unit/lcov-report/index.html` provides file-level and
line-level detail.

The Postgres repository contract is an integration suite and requires Docker:

```bash
pnpm test:integration
pnpm test:integration:coverage
```

Its report is written independently to `coverage/integration`. It measures only
the Postgres repository and the serialization/database adapters exercised by that
contract. Unit and integration numbers must not be merged: they answer different
questions and have different feedback costs.

## Unit coverage scope

All production TypeScript and TSX under `src` is included by default. The narrow
exclusions are:

- type declarations and barrel-only `index.ts` modules, which contain no runtime behavior;
- unit and integration test sources;
- test fixtures and Jest setup code;
- `src/data`, which contains unreferenced static sample data rather than executable production behavior.

New production exclusions should be rare and documented here. Generated source
should be excluded at its generated location rather than by broad directory rules.

## Baseline and ratchet policy

The first corrected unit baseline, recorded on 2026-08-11, is:

| Metric | Covered / total | Coverage |
| --- | ---: | ---: |
| Statements | 751 / 2079 | 36.12% |
| Branches | 457 / 1396 | 32.73% |
| Functions | 163 / 520 | 31.34% |
| Lines | 706 / 1933 | 36.52% |

The earlier report omitted TSX production code and included test support code, so
it is not comparable to this baseline.

No global threshold is set yet. Raise coverage through behavior-focused tests,
then ratchet thresholds from observed improvements. Review branch coverage and
directory-level results alongside the global number so a well-tested layer cannot
hide an untested one.
