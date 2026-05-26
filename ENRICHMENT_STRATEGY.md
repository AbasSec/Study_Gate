# Course Offering Enrichment Strategy

**Massive Enrichment Campaign: 1,069 Incomplete Offerings Across 20+ Universities**

---

## 🎯 The Challenge

```
TOTAL INCOMPLETE OFFERINGS: 1,069

Missing Data Distribution:
├─ tuitionFee:      Unknown (likely 80%+ of offerings)
├─ durationText:    Unknown (likely 90%+ of offerings)
├─ intakeMonths:    Unknown (likely 95%+ of offerings)
├─ durationYears:   Unknown (likely 90%+ of offerings)
├─ durationMonths:  Unknown (likely 90%+ of offerings)
├─ nextIntakeDate:  Unknown (likely 95%+ of offerings)
└─ semesters:       Unknown (likely 95%+ of offerings)

Affected Universities (20+):
- Universiti Kuala Lumpur (43 offerings)
- Universiti Teknologi Malaysia (UTM)
- INTI International University
- Taylor's University
- Asia Pacific University (APU)
- Lincoln University Malaysia
- Cyberjaya University
- Universiti Putra Malaysia
- UCSI University
- Universiti Tenaga Nasional
- Infrastructure University Kuala Lumpur
- City University Malaysia
- Nilai University
- Sunway University
- IMU International Medical University
- SEGI International
- And 4+ others

Scope: ~1,069 course offerings × 7 missing fields = ~7,483 data points needed
```

---

## 📋 Enrichment Roadmap

### Phase 1: Source Discovery (IMMEDIATE)

**Goal**: Identify official fee schedules and programme pages for each university

**Actions**:

1. **Per-University Research** (manual + automation)
   ```
   For each university:
   ├─ Find official fee schedule URL
   │  ├─ Check admissions page
   │  ├─ Check international students page
   │  ├─ Check PDF brochures
   │  └─ Cache URL in database
   ├─ Find official programme pages
   │  ├─ Note programme structure
   │  ├─ Find standard durations (3, 4, 4.5 years)
   │  └─ Find intake months
   └─ Validate official domain (.edu.my, official registrations)
   ```

2. **Database Setup** - Create `university_sources` table:
   ```
   {
     universityId: "...",
     universityName: "Universiti Kuala Lumpur",
     feeScheduleURL: "https://unikl.edu.my/international/fees",
     programmePagesURL: "https://unikl.edu.my/programmes",
     intakePageURL: "https://unikl.edu.my/admissions/intake",
     hasOfficialPDF: true,
     pdfPath: "...",
     lastVerified: "2026-05-24",
     notes: "..."
   }
   ```

3. **Known Official Sources** (From the data provided):
   ```
   UniKL:
   ├─ Tuition Fees: RM 14,040 - RM 72,000/year (from import data)
   ├─ Durations: 1-5 years (from import data)
   ├─ Intake: Mar, July, Oct, Jan, Sept (from import data)
   └─ Status: ✅ Have full fee schedule

   Note: Original import already has complete fee/duration/intake data!
   This data should be extracted and used for enrichment.
   ```

---

### Phase 2: Data Extraction (WEEK 1)

**Goal**: Extract fees, duration, intake from official sources

**Strategy**:

1. **Batch by University** (easier than batch by course)
   ```
   For each university:
   1. Get official fee schedule
   2. Parse programme table
   3. Extract:
      - Programme name variants
      - Duration (per programme or per level)
      - Intake months (standard or per programme)
      - Fees (per programme or per level)
   4. Map to existing courseOfferings
   5. Generate enrichment batch
   ```

2. **Use Original Import Data** as primary source
   ```
   The import script had this information from the official university listings!
   
   UniKL Example (already have):
   ├─ Bachelor of Computer Engineering Technology (Networking Systems) with Honours
   │  ├─ Duration: 4 Years
   │  ├─ Intake: Mar & Oct
   │  ├─ Tuition Fee: RM 19,500/year
   │  └─ Status: ✅ Complete in source data
   
   Issue: This data was NOT stored in courseOfferings!
   Solution: Extract from import files and re-enrich
   ```

3. **Priority Order** (by data completeness)
   ```
   Tier 1 (Easiest - Already Have Data):
   - UniKL (already have full fee/duration/intake from import)
   - Any university with complete import data
   
   Tier 2 (Medium - Need Web Search):
   - Universities with official fee PDFs
   - Universities with clear programme pages
   
   Tier 3 (Hard - Need Manual Review):
   - Universities with outdated web presence
   - Universities with unclear pricing (multiple tiers)
   - Universities with complex intake schedules
   ```

---

### Phase 3: Systematic Enrichment (WEEKS 2-4)

**University-by-University Enrichment**:

```
WEEK 2:
├─ Day 1-2: UniKL (from import data + search)
├─ Day 3-4: INTI International (official fees page)
├─ Day 5: Taylor's University (official fees page)
└─ Weekend: Review & validate

WEEK 3:
├─ Day 1-2: APU (official fees page)
├─ Day 3-4: Lincoln University (web search)
├─ Day 5: City University (web search)
└─ Weekend: Review & validate

WEEK 4:
├─ Day 1-2: Cyberjaya University
├─ Day 3-4: UTM
├─ Day 5: Multiple smaller universities
└─ Review & final validation
```

**Per-University Process**:

```
1. Get official fee schedule
2. Extract all programmes and their fees
3. For each incomplete offering:
   a. Match course name to official programme
   b. Extract fee (if not already have)
   c. Extract duration (if not already have)
   d. Extract intake months (if not already have)
   e. Calculate nextIntakeDate
4. Generate enrichment JSON
5. Run enrichment script --dry-run
6. Review report
7. Run enrichment script --commit
8. Validate Firestore updates
```

---

## 🔍 Data Recovery Strategy

### Problem: Import Data Lost

**Discovery**: The original import script had complete fee/duration/intake information from the university content PDFs, but this data was NOT persisted to courseOfferings.

**Example (UniKL)**:
```
From import data:
  Course: Bachelor of Computer Engineering Technology (Networking Systems) with Honours
  Duration: 4 Years
  Intake: Mar & Oct
  Tuition Fee: RM 19,500

In Firestore courseOfferings:
  durationYears: 0 ✗
  tuitionFee: 0 ✗
  intakeMonths: [] ✗
```

**Solution**:

1. **Check Generated Import Files**:
   ```
   data/imports/generated/
   ├─ courses.generated.json
   ├─ offerings.generated.json
   ├─ import-report.md
   └─ university.generated.json
   ```

2. **Extract Missing Data from Archives**:
   - Data provided by user (original pasted content)
   - Stored in: `data/imports/*.txt` files
   - Contains: fees, duration, intake for all 8 original universities

3. **Re-Import with Proper Storage**:
   ```bash
   # For each university that was imported:
   node scripts/extract-import-data.js --university "Universiti Kuala Lumpur"
   
   # Generate pre-populated enrichment JSON
   # Then run enrichment script with --commit
   ```

---

## 📊 Quick Wins

**Immediate enrichments** (80% of work with 20% effort):

### 1. **UniKL: 43 Offerings → Enrich Directly from Import Data**

   Status: ✅ Have all data from original import
   ```
   From: data/imports/unikl-courses.txt
   
   Courses with complete data:
   - Bachelor of Computer Engineering Technology (Networking Systems): 4 years, RM 19,500, Mar & Oct
   - Bachelor of Computer Engineering Technology (Computer Systems): 4 years, RM 17,600, Mar & Oct
   - Bachelor of Information Technology (Hons) in Software Engineering: 3 years, RM 23,466, Mar & Oct
   ... (40 more courses with complete data)
   
   Action: Extract and enrich immediately
   ```

### 2. **INTI International: Standard Fee Table**

   Many universities have standard durations per level:
   ```
   - Foundation: 1 year (12 months)
   - Diploma: 2.5 years (30 months)
   - Bachelor: 3-4 years (36-48 months)
   - Master: 1-3 years (12-36 months)
   - PhD: 3-7 years (36-84 months)
   
   Action: Use defaults where specific data unavailable
   Confidence: MEDIUM (safe defaults, not official specifics)
   ```

### 3. **Taylor's University, APU: Public Fee Lists**

   Many universities publish fees on admissions pages.
   
   Action: Search official domains, extract tables
   ```
   site:taylors.edu.my tuition fees international
   site:apu.edu.my fee schedule
   ```

---

## 🔧 Implementation Steps

### Step 1: Create Helper Script to Extract Import Data

**Purpose**: Recover fee/duration/intake from original import files

```bash
node scripts/extract-import-data.js --university "Universiti Kuala Lumpur"
# Output: pre-populated enrichment JSON with HIGH confidence values
```

### Step 2: Create University Source Registry

**Track where to find each university's data**:
```
data/university-sources.json

{
  "Universiti Kuala Lumpur": {
    "domain": "unikl.edu.my",
    "feeScheduleURL": "https://unikl.edu.my/international/fees",
    "sources": [
      {
        "name": "International Fee Schedule 2026",
        "url": "https://unikl.edu.my/...",
        "type": "official_fees_page",
        "status": "verified"
      }
    ],
    "intake": ["January", "July", "March", "October"],
    "standardDurations": {
      "bachelor": 4,
      "master": 3,
      "diploma": 2.5
    }
  },
  ...
}
```

### Step 3: Batch Enrichment per University

```bash
# For each university:
node scripts/enrich-course-offerings.js --dry-run --university "Universiti Kuala Lumpur"

# Review: data/imports/generated/enrichment-report.md

# Commit:
node scripts/enrich-course-offerings.js --commit --university "Universiti Kuala Lumpur"
```

### Step 4: Validate & Report

```bash
# Check results:
node scripts/validate-enrichment.js --university "Universiti Kuala Lumpur"

# Show what was enriched:
node scripts/enrichment-summary.js
```

---

## 🎯 Success Metrics

### Target State:

| Metric | Current | Target | Progress |
|--------|---------|--------|----------|
| Total offerings | 1,069 | 1,069 | 100% |
| tuitionFee filled | ~0 | ~100% | 0% |
| durationYears filled | ~0 | ~100% | 0% |
| intakeMonths filled | ~0 | ~100% | 0% |
| HIGH confidence | 0 | 70%+ | 0% |
| MEDIUM confidence | 0 | 20%+ | 0% |
| Still missing | 1,069 | <5% | 0% |

---

## 📅 Timeline

```
Week 1 (This week):
├─ Mon: Set up university source registry
├─ Tue: Extract UniKL data from import
├─ Wed: Enrich UniKL (43 offerings)
├─ Thu: INTI International (web search)
├─ Fri: Taylor's University (web search)
└─ Review results

Week 2:
├─ APU, Lincoln, City University
└─ Validate accumulated enrichments

Week 3:
├─ Cyberjaya, UTM, remaining universities
└─ Final validation

Week 4:
└─ Review, resolve conflicts, celebrate!
```

---

## 🚀 Getting Started NOW

### Step 1: Quick Extraction (5 minutes)

Extract UniKL data that we ALREADY HAVE:

```bash
# Read the original import data
cat data/imports/unikl-courses.txt

# Extract structured data:
node -e "
const fs = require('fs');
const content = fs.readFileSync('data/imports/unikl-courses.txt', 'utf8');

// Parse course data and extract fees, duration, intake
// Generate enrichment JSON with HIGH confidence values
"
```

### Step 2: Enrich UniKL (5 minutes)

```bash
node scripts/enrich-course-offerings.js --dry-run --university 'Universiti Kuala Lumpur'
# Review output
node scripts/enrich-course-offerings.js --commit --university 'Universiti Kuala Lumpur'
```

### Step 3: Move to Next University (Repeatable)

```bash
# Search for official sources
# Extract data
# Enrich
# Validate
```

---

## 🎓 Lessons Learned

**Key Issue**: Import process had data but didn't persist it properly.

**Solution**: 
1. Recover data from import files
2. Use enrichment system to re-populate Firestore
3. Validate results
4. Prevent future data loss

**Prevention**:
- Import script should store ALL extracted fields in courseOfferings
- Regular validation checks for incomplete offerings
- Enrichment system catches missing data automatically

---

## Summary

**We can close the gap on 1,069 incomplete offerings in 3-4 weeks by:**

1. ✅ Using enrichment system we just built
2. ✅ Recovering data from original imports
3. ✅ Systematically finding official sources
4. ✅ Validating before commit
5. ✅ Repeating per university

**Start immediately with UniKL** (43 offerings, complete data available)

**Then iterate across all 20+ universities**

**Target**: All offerings enriched with HIGH/MEDIUM confidence by end of Month 1
