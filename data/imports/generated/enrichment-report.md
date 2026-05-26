# Course Offering Enrichment Report

Generated: 2026-05-24T13:18:31.289Z

## Summary

- **Total offerings scanned**: 1
- **Offerings with data found**: 0
- **HIGH confidence updates**: 0
- **MEDIUM confidence updates**: 0
- **LOW confidence (skipped)**: 0
- **No source found**: 1
- **Blockers**: 1
- **Warnings**: 2

## 🚫 Blockers (Commit will be refused)

- Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: no_official_source_found

## ⚠️ Warnings (Review required)

- Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: No official source found
- Universiti Kuala Lumpur/UniKL RCMP - Royal College of Medicine Perak: Could not enrich: tuitionFee, durationText, durationYears, durationMonths, semesters, intakeMonths, nextIntakeDate

## Detailed Records

| University | Course | Missing Fields | Sources Found | Confidence | Action |
|---|---|---|---|---|---|
| Universiti Kuala Lumpur | UniKL RCMP - Royal College of Medicine Perak | tuitionFee, durationText, durationYears, durationMonths, semesters, intakeMonths, nextIntakeDate | 0 | NO_SOURCE | 🚫 BLOCKED |

## ❌ No Official Source Found

**Universiti Kuala Lumpur - UniKL RCMP - Royal College of Medicine Perak**
- Missing: tuitionFee, durationText, durationYears, durationMonths, semesters, intakeMonths, nextIntakeDate


## Next Steps

### If dry-run:
1. Review this report
2. Check enrichment-sources.generated.json for evidence
3. Review enrichment-warnings.md for issues
4. Run: `node scripts/enrich-course-offerings.js --commit`

### If issues found:
1. Fix issues in enrichment-sources.generated.json manually
2. Add missing official sources
3. Rerun with --allow-medium-confidence if appropriate
4. Or run: `node scripts/enrich-course-offerings.js --commit --allow-medium-confidence`
