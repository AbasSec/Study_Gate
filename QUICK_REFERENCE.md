# Enrichment Campaign - Quick Reference Card

**Print this page or bookmark for quick lookup while working**

---

## 🚀 Common Commands

### Check Current Status
```bash
# How many offerings are complete?
node scripts/enrich-course-offerings.js --dry-run 2>&1 | grep "Incomplete"

# See what's blocked and why
cat data/imports/generated/enrichment-warnings.md | head -50

# Check progress metrics
cat ENRICHMENT_PROGRESS.md
```

### Enrich a University
```bash
# Step 1: Dry-run to see what would happen
node scripts/extract-unikl-import-data.js --dry-run

# Step 2: Review the report
cat data/imports/generated/unikl-recovery-report.md

# Step 3: Commit if good
node scripts/extract-unikl-import-data.js --commit
```

### Batch Process Multiple Universities
```bash
# Parse all available import files
node scripts/batch-extract-import-data.js --dry-run

# Review results (if quota allows)
grep "MATCH\|matched" < last_output
```

---

## 📊 Key Files

| File | Purpose | Size |
|---|---|---|
| `scripts/enrich-course-offerings.js` | Main enrichment engine | 600 lines |
| `scripts/extract-unikl-import-data.js` | UniKL data recovery | 300 lines |
| `scripts/batch-extract-import-data.js` | Multi-university batch | 400 lines |
| `data/imports/generated/` | All reports & outputs | 1.3 MB |
| `ENRICHMENT_PROGRESS.md` | Campaign progress | Current |
| `ENRICHMENT_NEXT_STEPS.md` | What to do next | ⏳ Read first |
| `ENRICHMENT_SYSTEM_STATUS.md` | System overview | Detailed |

---

## 🎯 Current Progress

```
✅ Phase 1: Data Recovery (COMPLETE)
  └─ UniKL: 42 offerings complete
  └─ 377 enrichments applied

⏳ Phase 2: Batch Processing (IN PROGRESS)
  └─ APU: 39 ready to commit
  └─ Taylor's: 58 courses identified
  └─ Others: Pending extraction

⏰ Phase 3: Web Enrichment (Ready)
  └─ Search official sources
  └─ Fill remaining 1,027 offerings

⏰ Phase 4: Validation (Planned)
  └─ Final review & sign-off
```

---

## 🔐 Safety Checklist

- [ ] Always use `--dry-run` first
- [ ] Review reports before `--commit`
- [ ] Check for blockers in warnings.md
- [ ] Verify source evidence present
- [ ] Confirm fee/duration/intake look reasonable

---

## ⚠️ If You Hit Issues

| Problem | Solution |
|---|---|
| "Quota exceeded" | Wait 10-30 min, then retry with `--university "Name"` |
| No courses parsed | Check file format matches expectations |
| No matches found | Verify course names exist in Firestore |
| Blockers prevent commit | Read enrichment-warnings.md for details |
| Script hangs | Ctrl+C, wait, retry with smaller batch |

---

## 📈 Success Metrics

| Metric | Target | Current |
|---|---|---|
| Total enriched | 1,069 | 42 (3.9%) |
| HIGH confidence | 70%+ | 100% (UniKL) |
| MEDIUM confidence | 20%+ | 0% (pending) |
| Still blocked | <5% | 96.1% (pending) |
| Completion date | Month 1 | On track ✅ |

---

## 🎓 University Extraction Status

### Ready to Process (In Order)
1. ✅ UniKL - Complete (377 enrichments)
2. ⏳ APU - Ready to commit (39 matches)
3. ⏳ Taylor's - Ready to extract (58 courses)
4. ⏳ UTM, UPM, INTI - Extract on demand
5. ⏳ Others - 12 remaining universities

---

## 📋 Reports Guide

**Main Report to Check**: `enrichment-report.md`
- Shows total scanned, sources found, blockers
- Lists each offering with missing fields
- Provides resolution recommendations

**Recovery Report**: `unikl-recovery-report.md`
- Shows what data was recovered
- Lists all fees, durations, intakes
- Confirms enrichment applied

**Warnings Report**: `enrichment-warnings.md`
- Lists all blockers preventing enrichment
- Explains why courses couldn't be enriched
- Suggests remediation steps

---

## 💾 Data Fields Being Enriched

All stored in `courseOfferings` collection:

```
tuitionFee          (integer, in MYR)
tuitionCurrency     (string, "MYR")
durationText        (string, e.g., "3 Years")
durationYears       (integer)
durationMonths      (integer, durationYears × 12)
intakeMonths        (array, ["January", "March", "July"])
nextIntakeDate      (ISO date string)
```

---

## 🔍 Inspect Firestore Data

```bash
# Check if enrichments were applied
node -e "
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync('serviceAccountKey.json')))
});
admin.firestore().collection('courseOfferings')
  .where('tuitionFee', '>', 0)
  .limit(5)
  .get()
  .then(snap => console.log('Complete:', snap.size))
  .catch(e => console.error(e.message));
" 2>/dev/null
```

---

## 📞 Quick Help

**Read These (In Order)**:
1. ENRICHMENT_NEXT_STEPS.md (immediate actions)
2. ENRICHMENT_SYSTEM_STATUS.md (architecture)
3. ENRICHMENT_REPORTS_GUIDE.md (interpreting results)

**Try This**:
```bash
# See what happens without changing anything
node scripts/enrich-course-offerings.js --dry-run 2>&1 | head -30
```

**Contact**: [To be assigned]

---

## 🚨 Important Reminders

- ✅ Use `--dry-run` by default
- ✅ Always check reports before committing
- ✅ Only apply HIGH confidence data
- ✅ Track progress daily
- ✅ Document any manual changes

---

## 📅 Timeline

- **Today**: Phase 1 complete, Phase 2 ready
- **Next 24h**: Quota reset, commit APU
- **This week**: Process 5-10 universities, 30-50% enriched
- **Next week**: Web-based enrichment Phase 3
- **Week 3-4**: Final validation & completion

---

## 🎉 Done!

You now have everything needed to continue the enrichment campaign.

Next step: **Wait for Firebase quota reset (~24h), then commit APU data.**

See ENRICHMENT_NEXT_STEPS.md for exact commands.

Good luck! 🚀
