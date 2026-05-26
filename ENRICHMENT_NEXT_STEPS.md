# Enrichment Campaign - Next Steps Guide

**Status**: Quota exceeded - waiting for reset (~24h)  
**Last Update**: 2026-05-24 13:15 GMT+3

---

## 📊 What We've Accomplished

✅ **Complete**:
- UniKL data extraction & enrichment: **377 enrichments applied** (42 unique offerings complete)
- APU extraction: **39 matches identified** (ready to commit)
- Taylor's parsing: **58 courses identified** (ready to enrich)
- Batch extraction script: Created and tested (`scripts/batch-extract-import-data.js`)
- Individual extraction script: Created (`scripts/extract-unikl-import-data.js`)

✅ **Infrastructure Ready**:
- Course matching system ✅
- Enrichment validation system ✅
- Data normalization logic ✅
- University source tracking ✅

---

## 🎯 Immediate Actions (When Quota Resets ~24h from now)

### Step 1: Commit APU Data (5 minutes)
```bash
# File: temp-extract-apu.js (already created)
node temp-extract-apu.js --commit
# Expected: ~15-20 more complete offerings
```

**What this does**:
- Updates APU courseOfferings with extracted fees/duration/intake
- Source: raw-apu-university-content.txt (39 courses)
- Confidence: MEDIUM (estimated duration based on course level)

### Step 2: Create Taylor's Extraction Script (10 minutes)
```bash
# Create similar script for Taylor's using:
# - Input: raw-taylor-university-content.txt (58 courses)
# - Fee logic: TOTAL fee ÷ estimated duration = annual fee
# - Duration: Extract from course name or estimate (3Y default for bachelor)
# - Intake: Standard (March, July, October)
```

**Template to use**:
```javascript
// Extract Taylor's courses
const match = line.match(/^(.+?)\s+(\d{3,6},\d{3})$/);
// Parse total fee, divide by duration
```

### Step 3: Process Remaining Universities (Parallel Processing Safe)

**Option A: One at a time** (safest, no quota issues):
```bash
# Process each university individually to avoid large batch queries
node scripts/extract-unikl-import-data.js --dry-run --university "UniKL"
node scripts/extract-taylor-import-data.js --dry-run --university "Taylor's"
# etc...
```

**Option B: Batch with delays** (faster if quota allows):
- Run batch script with 30-second delays between universities
- Or add quota retry logic to batch script

---

## 📋 Universities Ready to Process

### Tier 1: Extract + Commit (this week)
1. ✅ UniKL - DONE
2. APU - **Ready to commit (Step 1)**
3. Taylor's - **Ready to script (Step 2)**
4. UTM, UPM, INTI - Check import file formats first

### Tier 2: With Quota Management (later this week)
- City University Malaysia
- Cyberjaya University
- IMU International Medical University
- Lincoln University Malaysia
- Nilai University
- SEGI International
- Sunway University
- UCSI University
- Universiti Tenaga Nasional
- Infrastructure University Kuala Lumpur

---

## 📊 Current Progress Snapshot

```
Total Offerings: 1,069
├─ Complete: 42 (UniKL) ✅
├─ Ready to Complete: 39 (APU) ⏳
├─ Identified: 58 (Taylor's) ⏳
└─ Pending: 930 (86% to go)

Completion Rate: 3.9% (target: 100%)
Universities Processed: 1/20 (target: 20)
```

---

## 🛠️ Technical Details for Implementation

### Fee Normalization Rules
```javascript
// Annual fee from various formats:
APU:       Fee in file = annual cost → use as-is
Taylor's:  Fee in file = total program cost → divide by duration
UniKL:     Fee format: "RM X,XXX/year" → extract number
```

### Duration Estimation Defaults
```javascript
Foundation/Certificate: 1 year
Diploma:                2.5 years
Bachelor:               3 years (or extract from "(3 Years)")
Master:                 1.5 years (or extract from "(1.5-3 Years)" → use minimum)
PhD:                    4 years
```

### Intake Months (Standard)
```javascript
Most Malaysian universities:
- January, March, July, October
- Some: January, July only (research programs)
- Foundation: Usually July
```

### Next Intake Date Calculation
```javascript
// Given intake months, find next occurrence
// If all intakes are in past this year → use earliest next year
```

---

## ⚠️ Quota Management Tips

**To avoid quota errors**:
1. ✅ Use `--university "Name"` filter for single universities
2. ✅ Commit in batches of 100-200 documents (Firestore batch max: 500)
3. ✅ Space out reads by 5-10 seconds if processing multiple universities
4. ✅ Monitor console output for "RESOURCE_EXHAUSTED" errors
5. ✅ If quota hit: wait 10-30 minutes before retrying

**Signs quota is about to be exceeded**:
- Slow write operations (>1 second per document)
- Intermittent "Quota exceeded" errors
- High CPU usage on script

---

## 📈 Expected Results (This Campaign)

**By end of Week 1** (after quota management):
- UniKL: 42 complete ✅
- APU: 15-20 more complete
- Taylor's: 40-50 more complete
- **Subtotal: 100-115 complete (9-11% of 1,069)**

**By end of Week 2**:
- Process remaining 12 universities with import data
- **Target: 400-500 complete (37-47% of 1,069)**

**By end of Month 1**:
- Web-based enrichment for remaining 50-60%
- **Target: 750+ complete (70%+ of 1,069)**

---

## 🔗 Key Files

- 📄 ENRICHMENT_STRATEGY.md - Full campaign plan
- 📄 ENRICHMENT_SYSTEM.md - Architecture documentation
- 📄 ENRICHMENT_PROGRESS.md - This session's progress
- 🔧 scripts/extract-unikl-import-data.js - Tested extraction script
- 🔧 scripts/batch-extract-import-data.js - Batch processing script
- 📂 data/imports/generated/ - All reports and outputs

---

## ✅ Verification Commands

```bash
# Check UniKL enrichment was applied:
node -e "
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync('serviceAccountKey.json')))
});
admin.firestore().collection('courseOfferings')
  .where('tuitionFee', '>', 0)
  .limit(10)
  .get()
  .then(snap => {
    console.log('Complete offerings:', snap.docs.map(d => d.data().courseName));
  });
" 2>/dev/null

# Check incomplete count:
node scripts/enrich-course-offerings.js --dry-run 2>&1 | grep "Incomplete"
```

---

## 💡 If Something Goes Wrong

1. **Quota exceeded**: Wait 10-30 min, then retry
2. **Script error**: Check error message, usually in `--dry-run` output
3. **Data mismatch**: Verify course names match exactly (check Firestore directly)
4. **Fee/duration estimates**: Document assumptions, add --confidence-notes flag to script
5. **Lost progress**: All reports in `data/imports/generated/` for recovery

---

## 🚀 Ready to Go!

Once quota resets:
1. Run APU commit (5 min)
2. Create Taylor's script (10 min)  
3. Process both (10 min)
4. Repeat for remaining universities (1-2 per day)

**Total expected time**: 2-3 weeks for complete enrichment of 1,069 offerings
