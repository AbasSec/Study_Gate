# Course Offering Cleanup Plan

**Generated**: 2026-05-24T13:25:25.419Z

## Summary
- **Non-course rows found**: 1
- **Recommended action**: MARK_INACTIVE (safe, preserves references)

## Non-Course Rows to Clean Up


### 1. UniKL RCMP - Royal College of Medicine Perak

- **Offering ID**: `1fkl57osXdY1jVHxhb9r`
- **Reason**: Institute/campus/faculty name, not a course
- **Recommended Action**: MARK_INACTIVE
- **Risk Level**: LOW (no course-related data to preserve)



## Implementation

To mark these rows as inactive:

```bash
node scripts/audit-course-offerings.js --university "Universiti Kuala Lumpur" --execute-cleanup-plan
```

⚠️ **IMPORTANT**: This command requires explicit confirmation before executing.

## Why MARK_INACTIVE Instead of DELETE?

1. **Preserves references**: Applications may reference these offering IDs
2. **Audit trail**: Keeps history of what was cleaned up
3. **Reversible**: Can reactivate if needed
4. **Database integrity**: Avoids foreign key issues

## Verification

After cleanup, run enrichment again:

```bash
node scripts/enrich-course-offerings.js --dry-run --university "Universiti Kuala Lumpur"
```

Expected result: 0 non-course blockers
