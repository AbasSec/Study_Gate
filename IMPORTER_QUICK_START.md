# University Importer - Quick Start Guide

## One-Minute Setup

### 1. Check the Sample Input
```bash
cat data/imports/raw-university-content.txt | head -50
```

INTI International University content is already there.

### 2. Run Dry-Run
```bash
npm run import:university-content:dry-run
```

### 3. Review Generated Files
```bash
# View the university document
cat data/imports/generated/university.generated.json

# View first 10 courses
head -100 data/imports/generated/courses.generated.json

# Read the report
cat data/imports/generated/import-report.md
```

### 4. (Future) Commit to Firebase
```bash
npm run import:university-content:commit
```

---

## Input File Format

**Location:** `data/imports/raw-university-content.txt`

**Required Format:**
```
UNIVERSITY_NAME: [Your University Name]
SHORT_CODE: [CODE]
LOCATION: [City, Country]
MODE: SINGLE_UNIVERSITY_MERGE_CAMPUSES
CURRENCY: MYR
OFFER_LETTER_FREE: false

RAW_CONTENT_START
[Paste your entire PDF fee schedule text here]
RAW_CONTENT_END
```

**Metadata Notes:**
- UNIVERSITY_NAME: Required
- SHORT_CODE: Optional (auto-generated if missing)
- LOCATION: Optional
- MODE: Always use `SINGLE_UNIVERSITY_MERGE_CAMPUSES`
- CURRENCY: Default is MYR
- OFFER_LETTER_FREE: Default is false

---

## Output Files

After dry-run, check these three files in `data/imports/generated/`:

| File | Purpose | What to Check |
|------|---------|---|
| `university.generated.json` | The university document | Name, location, intake months, FAQs |
| `courses.generated.json` | All 129 courses | Course names, levels, categories |
| `offerings.generated.json` | University + course mapping | Fees, durations, intake months |
| `import-report.md` | Summary & warnings | Action (CREATE/UPDATE), course count |

---

## What Gets Auto-Generated

### For Universities:
- ✅ Intro (one-liner based on categories)
- ✅ About Content (3-paragraph description)
- ✅ FAQs (5 standard questions)
- ✅ Intake Months (extracted and sorted)
- ✅ Next Intake Date (nearest upcoming month)
- ✅ Logo Path: `assets/logos/{code}-logo.png`
- ✅ Image Path: `assets/universities/{code}-campus.jpg`

### For Courses:
- ✅ Level (Foundation/Diploma/Bachelor/Master/PhD/etc.)
- ✅ Category (Business/Engineering/Computing/etc.)
- ✅ Image Path: `assets/courses/{course-slug}.jpg`
- ✅ Description (1-2 sentences based on level)

### For Offerings:
- ✅ Intake Months (extracted from PDF)
- ✅ Tuition Fee (extracted if available, 0 if missing)
- ✅ Currency (from metadata, default MYR)
- ✅ Duration (extracted from PDF)

---

## Duplicate Handling

| Level | Matched By | Action |
|-------|-----------|--------|
| **University** | SHORT_CODE or name | Updates existing, creates if new |
| **Course** | Course name + level | Reuses if exists, creates if new |
| **Offering** | UniversityId + CourseId | Updates if exists, creates if new |

**Result:** No duplicates, safe to run multiple times.

---

## Test the INTI Import

INTI content is already in `data/imports/raw-university-content.txt`. Test it:

```bash
npm run import:university-content:dry-run
```

Expected output:
```
✅ Found 129 programme rows
🆕 Will CREATE new university: INTI International University
✅ Generated files in: data\imports\generated
```

Check the files:
- `university.generated.json` → Should show INTI university with generated FAQs
- `courses.generated.json` → Should show 129 courses with levels/categories
- `offerings.generated.json` → Should show 129 INTI offerings
- `import-report.md` → Should show CREATE action, 129 courses total

---

## Workflow for New University

### Step 1: Prepare Content
```bash
# Edit the input file
nano data/imports/raw-university-content.txt

# Add metadata at top:
UNIVERSITY_NAME: [Your University]
SHORT_CODE: [CODE]
LOCATION: [Location]
...

RAW_CONTENT_START
[Paste PDF text here]
RAW_CONTENT_END
```

### Step 2: Preview
```bash
npm run import:university-content:dry-run
```

### Step 3: Review JSON Files
- Check if all courses look correct
- Check if levels/categories are right
- Edit JSON if needed

### Step 4: Add Assets
```bash
# Place logo
cp your-logo.png assets/logos/[code]-logo.png

# Place campus image
cp your-image.jpg assets/universities/[code]-campus.jpg
```

### Step 5: Commit (When Ready)
```bash
npm run import:university-content:commit
```

### Step 6: Verify on Website
1. Admin dashboard: Universities list
2. Public site: Universities page
3. Public site: Courses page
4. Public site: University detail page

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| **Too many/few courses imported** | Edit `courses.generated.json` before committing |
| **Wrong intake months** | Edit `offerings.generated.json` before committing |
| **Missing fees** | Default 0 is OK; adjust later in admin dashboard |
| **Logo/image missing** | Add files to `assets/` folders manually |
| **Course name has intake months mixed in** | Edit `courses.generated.json` before committing |
| **Wrong category inferred** | Edit `category` field in `courses.generated.json` |

---

## Files You Need to Know

```
scripts/
  └── import-university-content.js      ← Main importer script

data/imports/
  ├── raw-university-content.txt        ← Your input (edit this)
  └── generated/                        ← Auto-generated (review before commit)
      ├── university.generated.json
      ├── courses.generated.json
      ├── offerings.generated.json
      └── import-report.md

assets/
  ├── logos/
  │   └── inti-logo.png                 ← Add your logo files here
  └── universities/
      └── inti-campus.jpg               ← Add your campus images here

IMPORTER_README.md                      ← Full documentation
IMPORTER_IMPLEMENTATION_SUMMARY.md      ← Technical details
IMPORTER_QUICK_START.md                 ← This file
```

---

## Key Commands

```bash
# Preview import (no Firebase changes)
npm run import:university-content:dry-run

# Commit to Firebase (when ready)
npm run import:university-content:commit

# View input file
cat data/imports/raw-university-content.txt

# View generated university
cat data/imports/generated/university.generated.json

# View generated courses
cat data/imports/generated/courses.generated.json

# View import report
cat data/imports/generated/import-report.md
```

---

## Remember

- ✅ Always run dry-run first
- ✅ Always review the three generated JSON files
- ✅ Safe to run dry-run unlimited times
- ✅ OK to edit JSON files before committing
- ✅ No data is deleted, only created/updated
- ✅ Asset paths are auto-generated, you add files manually
- ✅ Test with INTI first, then import other universities

**You control everything before it goes into Firebase.**

---

## Next: Full Documentation

For complete details, see:
- `IMPORTER_README.md` — Complete usage guide
- `IMPORTER_IMPLEMENTATION_SUMMARY.md` — Technical implementation details
