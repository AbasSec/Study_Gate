# Enrichment Warnings & Blockers

Generated: 2026-05-24T13:18:31.291Z

## 🚫 Blockers (Must resolve before commit)

1. Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: no_official_source_found

## ⚠️  Warnings (Review carefully)

1. Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: No official source found
2. Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: Could not enrich: tuitionFee, durationText, durationYears, durationMonths, semesters, intakeMonths, nextIntakeDate

## Resolution Steps

1. Review data/imports/generated/enrichment-sources.generated.json
2. For blockers: Either fix the issue or find better official sources
3. For warnings: Decide if acceptable or if manual correction needed
4. Rerun with appropriate flags:
   - `--allow-medium-confidence` if MEDIUM confidence is acceptable
   - `--overwrite-existing` if overwriting is needed (rarely)
