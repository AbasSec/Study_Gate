# Enrichment Reports Guide

**Generated Reports Location**: `data/imports/generated/`

This guide explains each report generated during the enrichment campaign and how to interpret the results.

---

## 📊 Report Index

### Generated from Extract/Enrichment Scripts

#### 1. **unikl-recovery-report.md** (45 KB)
**Generated**: When running `extract-unikl-import-data.js`  
**Frequency**: Per-university (UniKL only so far)  
**Purpose**: Document data recovery from original import files

**Contents**:
- Summary of extracted vs. matched courses
- Data recovered (fees, duration, intake)
- Table of all enriched courses
- Confidence levels
- Source attribution

**How to Read**:
```markdown
# UniKL Data Recovery Report

## Summary
- Total courses in import file: 49
- Successfully matched and enriched: 377
- No match found: 1

## Data Recovered
| Course Name | Duration | Intake | Fee (RM) |
| ... detailed table showing all recovered data ...

## Data Recovered Summary
- tuitionFee: RM 5,000 - RM 72,000/year
- durationYears: 1-5 years
- intakeMonths: Jan, Mar, July, Sept, Oct
- Confidence: HIGH (direct from official source)
```

**When to check this report**:
- ✅ After extracting data from import file
- ✅ To verify what data was recovered
- ✅ To confirm fee/duration/intake values
- ✅ To track how many courses matched

---

#### 2. **enrichment-report.md** (760 KB - Large!)
**Generated**: When running `enrich-course-offerings.js`  
**Frequency**: Each dry-run or commit  
**Purpose**: Comprehensive audit of enrichment attempt

**Sections**:
1. **Metadata**
   - Generation timestamp
   - Mode (DRY-RUN or COMMIT)
   - University filter (if applied)

2. **Summary Statistics**
   ```
   Total scanned: 1,069
   Sources found: 0
   HIGH confidence: 0
   MEDIUM confidence: 0
   Blockers detected: 1,069
   Warnings detected: 1,069
   ```

3. **Confidence Distribution** (Table)
   - HIGH: Exact match from official source
   - MEDIUM: Close match, reasonable assumptions
   - LOW: Partial match or inferred
   - NO_SOURCE: No official evidence found

4. **Blockers Summary**
   - "no_official_source_found": Main blocker (no web access in test)
   - Other blockers: Conflicts, currency issues, etc.

5. **Per-Record Details** (VERY detailed)
   ```
   ## [1/1069] SEGI International - Intensive English Programme
   
   **University**: SEGI International  
   **Course**: Intensive English Programme  
   **Missing Fields**: tuitionFee, durationYears, intakeMonths, nextIntakeDate
   **Sources Searched**: 3 official sources
   **Found**: 0 matches
   **Blocker**: no_official_source_found
   **Recommendation**: Requires web search or manual entry
   ```

**When to check this report**:
- ✅ Before running `--commit` to verify dry-run results
- ✅ To understand why courses aren't enriched
- ✅ To see all blockers preventing updates
- ✅ To track enrichment progress across universities

**Interpreting Common Blockers**:
- `no_official_source_found`: Normal in test (needs web access)
- `confidence_too_low`: Source found but LOW confidence
- `currency_conflict`: Different currencies detected
- `fee_seems_wrong`: Fee value outside expected range
- `conflicting_sources`: Multiple different values found

---

#### 3. **enrichment-updates.generated.json** (2 bytes currently, empty in test)
**Generated**: When running `enrich-course-offerings.js`  
**Frequency**: Each enrichment run  
**Purpose**: Structured list of proposed Firestore updates

**Format**:
```json
[
  {
    "offeringId": "offering-123",
    "courseName": "Bachelor of Computer Science",
    "updates": {
      "tuitionFee": 19500,
      "tuitionCurrency": "MYR",
      "durationYears": 4,
      "durationMonths": 48,
      "intakeMonths": ["March", "October"],
      "nextIntakeDate": "2026-07-01"
    },
    "sources": [
      {
        "name": "Official Import Data",
        "url": "data/imports/unikl-courses.txt",
        "type": "official_import",
        "confidence": "HIGH",
        "extractedValue": "RM 19,500/year"
      }
    ],
    "overallConfidence": "HIGH"
  },
  ...
]
```

**When to check this file**:
- ✅ Machine parsing for automated follow-up
- ✅ Data warehouse export
- ✅ Validation scripts
- ✅ Integration with other systems

---

#### 4. **enrichment-sources.generated.json** (2 bytes currently, empty in test)
**Generated**: When running `enrich-course-offerings.js`  
**Frequency**: Each enrichment run  
**Purpose**: Audit trail of all sources and extracted values

**Structure**:
```json
{
  "byUniversity": {
    "Universiti Kuala Lumpur": {
      "sourcesFound": 11,
      "sources": [
        {
          "name": "Original Import Data (unikl-courses.txt)",
          "url": "data/imports/unikl-courses.txt",
          "type": "official_import",
          "extractedValues": {
            "tuitionFee": [19500, 17600, 23466, ...],
            "durationYears": [4, 3, 3.5, ...],
            "intakeMonths": [["March", "October"], ...],
            "nextIntakeDate": ["2026-07-01", ...]
          },
          "confidence": "HIGH",
          "verified": true,
          "verifiedDate": "2026-05-24T13:00:00Z"
        }
      ]
    }
  }
}
```

**When to check this file**:
- ✅ For compliance/audit purposes
- ✅ To verify source attribution
- ✅ To trace data provenance
- ✅ For reports to stakeholders

---

#### 5. **enrichment-warnings.md** (392 KB - Large!)
**Generated**: When running `enrich-course-offerings.js`  
**Frequency**: Each enrichment run  
**Purpose**: Consolidated warnings and blockers with resolution steps

**Sections**:
1. **Blockers Summary**
   - List of all blockers found
   - Count per type
   - Percentage of offerings affected

2. **Detailed Blockers**
   ```
   ### Blocker: no_official_source_found
   **Affected Offerings**: 1,069
   **Percentage**: 100%
   
   **Description**:
   Could not find any official sources for this course.
   Script searched official university websites but found no matches.
   
   **Resolution Steps**:
   1. Manual web search of university website
   2. Contact university admissions office
   3. Use industry standard defaults
   
   **Resolution Status**: PENDING
   **Expected Resolution Date**: 2026-05-31
   ```

3. **Warnings Summary**
   - Non-blocking issues
   - Data quality concerns
   - Suggestions for improvement

4. **Remediation Action Items**
   - What to do next
   - Who should do it
   - Timeline

**When to check this file**:
- ✅ Before committing to understand risks
- ✅ To plan Phase 2 and Phase 3 work
- ✅ To track blockers being resolved
- ✅ To communicate status to stakeholders

---

### Legacy/Reference Reports

#### 6. **course-connection-audit.md** (49 KB)
**Generated**: By `audit-course-connections.js` (from previous session)  
**Frequency**: Periodic (not part of current campaign)  
**Purpose**: Identifies duplicate/near-duplicate courses

**Contents**:
- Exact duplicates: 0 found
- Canonical duplicates: 59 found
- High confidence matches (≥85%): 26 found
- Medium confidence matches (70-84%): 200 found

**When to check this report**:
- ✅ For course deduplication planning
- ✅ To understand data quality issues
- ✅ To prioritize course matching work

---

#### 7. **import-report.md** (2.6 KB)
**Generated**: By original import script (from previous session)  
**Frequency**: One-time  
**Purpose**: Summary of data import results

**Contents**:
- Universities imported: 8
- Courses created: 1,069
- Offerings created: 1,069
- Errors: 0
- Warnings: Some fields missing

---

#### 8. **courses.generated.json** (21 KB)
**Generated**: By import script (from previous session)  
**Frequency**: One-time  
**Purpose**: Structure of courses collection

**Structure**:
```json
[
  {
    "id": "course-123",
    "name": "Bachelor of Computer Science",
    "universityIds": ["uni-1", "uni-2"],
    "level": "Bachelor",
    "category": "Engineering & Technology",
    ...
  }
]
```

---

#### 9. **offerings.generated.json** (22 KB)
**Generated**: By import script (from previous session)  
**Frequency**: One-time  
**Purpose**: Structure of initial courseOfferings

**Note**: This represents the INITIAL state before enrichment. Actual Firestore has been updated by enrichment scripts.

---

#### 10. **university.generated.json** (1.8 KB)
**Generated**: By import script (from previous session)  
**Frequency**: One-time  
**Purpose**: List of universities in system

**Contents**:
```json
[
  {
    "id": "uni-1",
    "name": "Universiti Kuala Lumpur",
    "domain": "unikl.edu.my",
    "country": "Malaysia",
    ...
  }
]
```

---

## 🔍 How to Interpret Results

### For Phase 1 (Data Recovery - COMPLETE ✅)

**Expected Signature in Reports**:
- ✅ unikl-recovery-report.md shows: "377 enrichments applied"
- ✅ enrichment-report.md shows: 1,027 incomplete (down from 1,069)
- ✅ No new enrichment-warnings (all HIGH confidence)

**Read These**:
1. unikl-recovery-report.md (main results)
2. enrichment-report.md (verify overall status)
3. enrichment-sources.generated.json (audit trail)

**Questions to Answer**:
- ✅ How many courses were parsed? (49)
- ✅ How many matched to offerings? (48)
- ✅ How many Firestore documents enriched? (377 with duplicates, 42 unique)
- ✅ What fees/duration/intake were recovered? (See recovery report)

---

### For Phase 2 (Batch Processing - IN PROGRESS ⏳)

**Expected Signature in Reports**:
- ⏳ enrichment-report.md shows: Multiple universities processed
- ⏳ enrichment-warnings.md shows: Decreasing blocker count
- ⏳ Multiple *-recovery-report.md files for each university

**Read These**:
1. enrichment-report.md (overall status)
2. Per-university recovery reports (APU, Taylor's, etc.)
3. enrichment-warnings.md (remaining blockers)

**Questions to Answer**:
- ✅ Which universities are complete?
- ✅ How many offerings total now enriched?
- ✅ What's the blocker count trend?
- ✅ Which universities need web search (Phase 3)?

---

### For Phase 3 (Web Enrichment - PENDING ⏰)

**Expected Signature in Reports**:
- ⏰ enrichment-report.md shows: Web sources in findings
- ⏰ enrichment-sources.generated.json: URLs and extraction data
- ⏰ enrichment-confidence.json: Mixed HIGH/MEDIUM/LOW confidence

**Read These**:
1. enrichment-sources.generated.json (source verification)
2. enrichment-warnings.md (data quality issues)
3. enrichment-report.md (per-course details)

**Questions to Answer**:
- ✅ Were fees found on official websites?
- ✅ How current are the websites?
- ✅ Are there conflicting sources?
- ✅ What's the confidence level?

---

## 📈 Key Metrics to Track

### From enrichment-report.md Summary

| Metric | Interpretation |
|--------|---|
| **Total scanned** | Total courseOfferings in system |
| **Sources found** | Official sources discovered |
| **HIGH confidence** | Official source with exact match |
| **MEDIUM confidence** | Official source with estimated values |
| **LOW confidence** | Partial/inferred data (not applied) |
| **Blockers detected** | Offerings that can't be enriched safely |
| **Warnings detected** | Quality issues that need review |

### Progress Indicator

```
Blocked: ████████████████████░░░░ 80%
MEDIUM:  ████░░░░░░░░░░░░░░░░░░ 15%
HIGH:    ██░░░░░░░░░░░░░░░░░░░░░ 5%
```

---

## 🚀 Next Report to Generate

**When quota resets** (~24h from now):

```bash
# Step 1: Commit APU data
node temp-extract-apu.js --commit
# Generates: new unikl-recovery-report.md (named apu-recovery-report.md)

# Step 2: Run full enrichment to see new status
node scripts/enrich-course-offerings.js --dry-run
# Generates: Updated enrichment-report.md showing 1,000+ remaining (down from 1,027)

# Step 3: Check warnings
cat data/imports/generated/enrichment-warnings.md | head -50
# Shows: Reduced blockers, progress toward Phase 2 completion
```

---

## 💾 Report File Sizes

| Report | Size | Growth Rate | Archive? |
|--------|------|------------|----------|
| enrichment-report.md | 760 KB | ~100KB/phase | Keep latest 3 |
| enrichment-warnings.md | 392 KB | ~100KB/phase | Keep latest 3 |
| unikl-recovery-report.md | 33 KB | ~15KB/university | Keep all |
| enrichment-sources.json | 2 bytes | Growing | Keep all |
| enrichment-updates.json | 2 bytes | Growing | Keep all |

**Storage**: Total ~1.3 MB for current session. Archive old reports to `data/imports/archives/` after Phase 4 completes.

---

## 🎯 Success Criteria by Report

### Phase 1 Complete When:
✅ unikl-recovery-report.md shows 377+ enrichments  
✅ enrichment-report.md shows ~1,027 incomplete (down from 1,069)  
✅ No errors in commit logs  

### Phase 2 Complete When:
✅ enrichment-report.md shows 600+ complete  
✅ 12+ universities processed  
✅ enrichment-warnings.md shows <500 blockers  

### Phase 3 Complete When:
✅ enrichment-report.md shows 900+ complete  
✅ Web sources found for 80%+ offerings  
✅ Confidence distribution: 70% HIGH, 20% MEDIUM, 10% LOW  

### Phase 4 Complete When:
✅ enrichment-report.md shows 1,050+ complete  
✅ Blocker count <20  
✅ All conflicts resolved  
