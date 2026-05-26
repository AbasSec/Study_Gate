# University Content Importer for Horizons

A powerful Node.js script that imports university content from pasted PDF text into the Horizons Firebase platform. The importer automatically detects and creates universities, courses, and course offerings with intelligent duplicate prevention.

---

## Quick Start

### 1. Prepare Your Content

Paste your university fee schedule or programme listing into:

```
data/imports/raw-university-content.txt
```

Optional: Add metadata at the top of the file:

```
UNIVERSITY_NAME: INTI International University
SHORT_CODE: INTI
LOCATION: Malaysia
MODE: SINGLE_UNIVERSITY_MERGE_CAMPUSES
CURRENCY: MYR
OFFER_LETTER_FREE: false

RAW_CONTENT_START
[paste your extracted PDF text here]
RAW_CONTENT_END
```

### 2. Dry-Run (Review Before Importing)

```bash
npm run import:university-content:dry-run
```

This generates three JSON files in `data/imports/generated/`:

- `university.generated.json` — The university document to be created/updated
- `courses.generated.json` — All unique global courses
- `offerings.generated.json` — University-specific course offerings
- `import-report.md` — Human-readable import summary

**Always review these files before committing.**

### 3. Commit (Write to Firebase)

After reviewing, run:

```bash
npm run import:university-content:commit
```

This writes the university, courses, and offerings to Firestore.

---

## Data Model

### Universities Collection

Each university document contains:

```json
{
  "name": "INTI International University",
  "shortCode": "INTI",
  "location": "Malaysia",
  "intro": "Short one-sentence summary",
  "aboutContent": "Multi-paragraph description",
  "logo": "assets/logos/inti-logo.png",
  "image": "assets/universities/inti-campus.jpg",
  "youtubeVideo": "",
  "nextIntakeDate": "2026-08-01",
  "intakeMonths": ["January", "March", "May", "August"],
  "offerLetterFree": false,
  "faqs": ["array", "of", "faq", "strings"],
  "ranking": "",
  "active": true,
  "order": 1,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Courses Collection (Global)

Global courses are matched by name + level to prevent duplicates:

```json
{
  "name": "Bachelor of Computer Science",
  "courseId": "bachelor-of-computer-science-1",
  "level": "Bachelor",
  "category": "Computing & IT",
  "basePrice": 78036,
  "baseCurrency": "MYR",
  "baseDurationYears": 3,
  "duration": "3 years",
  "image": "assets/courses/bachelor-of-computer-science.jpg",
  "description": "A 3-year bachelor's programme in computer science",
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Course Offerings Collection

Stores the relationship between universities and courses:

```json
{
  "universityId": "doc_id_of_university",
  "universityName": "INTI International University",
  "courseId": "bachelor-of-computer-science-1",
  "courseName": "Bachelor of Computer Science",
  "courseLevel": "Bachelor",
  "courseCategory": "Computing & IT",
  "tuitionFee": 78036,
  "tuitionCurrency": "MYR",
  "durationYears": 3,
  "durationMonths": 36,
  "durationText": "3 years",
  "intakeMonths": ["January", "May", "August"],
  "nextIntakeDate": null,
  "semesters": null,
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Import Behavior

### University Matching & Creation

The importer matches universities by:

1. **Short Code** (if provided in metadata)
2. **Normalized University Name** (if code match fails)

If a match is found, the importer **updates** the existing university. Otherwise, it **creates** a new one.

**No universities are deleted during import.**

### Course Matching & Creation

Courses are matched globally by:

1. **Course Name** (normalized)
2. **Course Level** (Foundation, Diploma, Bachelor, Master, etc.)

If a match is found, the importer **reuses** the existing global course. Otherwise, it **creates** a new one.

This ensures that if two universities offer "Bachelor of Computer Science", the course appears only once in the global courses collection, with offerings for both universities.

### Offering Management

For each course in the import:

- If an offering already exists for this university + course, it's **updated**
- If no offering exists, a new one is **created**
- Offerings that are no longer in the import are **deleted**

**This prevents duplicate offerings.**

---

## Generated Content (Defaults & Protections)

### University Fields - Automatically Generated

- **intro**: One-sentence summary based on offered categories
- **aboutContent**: Multi-paragraph description based on programmes and categories
- **faqs**: Five standard FAQ entries
- **logo**: Predictable asset path (not uploaded, you add the file later)
- **image**: Predictable asset path (not uploaded, you add the file later)
- **intakeMonths**: Extracted and deduplicated from all courses
- **nextIntakeDate**: Calculated as the next upcoming intake month in YYYY-MM-DD format

### Content Protection

These fields are **protected** from overwrite on updates:

- `aboutContent`
- `intro`
- `faqs`
- `logo`
- `image`
- `ranking`
- `youtubeVideo`

If a university already exists with these fields filled, they are **not overwritten** during import (unless you implement `--overwrite-content` flag).

Empty fields are always filled during import.

### Course Level Normalization

The importer infers course level from course names:

```
Foundation → Foundation
Certificate → Certificate
Diploma → Diploma
Bachelor/BSc/BA/BEng → Bachelor
Master/MSc/MBA → Master
PhD/Doctor of → PhD
Intensive English/English Program → English
A-Level/Pre-U → Pre-University
```

### Course Category Inference

Categories are inferred from:

1. Section headings in the PDF (e.g., "Computing & IT", "Business")
2. Keywords in the course name

Supported categories:

- Business
- Computing & IT
- Engineering
- Health Sciences
- Biotechnology
- Mass Communication
- Art & Design
- Hospitality
- Psychology
- American Degree Transfer Program
- Pre-University
- Education
- Finance
- Data Science
- Other

### Intake Month Normalization

All month variants are normalized:

```
Jan/Jan. → January
Feb/Feb. → February
Mar/Mar. → March
[etc...]
```

Months are deduplicated and sorted in calendar order.

---

## Metadata Header Format

Optional metadata can be added to the beginning of your import file:

```
UNIVERSITY_NAME: INTI International University
SHORT_CODE: INTI
LOCATION: Malaysia
MODE: SINGLE_UNIVERSITY_MERGE_CAMPUSES
CURRENCY: MYR
OFFER_LETTER_FREE: false

RAW_CONTENT_START
[paste content here]
RAW_CONTENT_END
```

### Metadata Fields

| Field | Default | Notes |
|-------|---------|-------|
| `UNIVERSITY_NAME` | (required) | Name of the university |
| `SHORT_CODE` | (auto-generated) | 2-10 letter code, uppercase |
| `LOCATION` | (extracted or empty) | City/country |
| `MODE` | `SINGLE_UNIVERSITY_MERGE_CAMPUSES` | Only this mode is supported; merges all branches into one university |
| `CURRENCY` | `MYR` | Default currency for all offerings |
| `OFFER_LETTER_FREE` | `false` | Whether offer letters are free |

---

## Example Workflow

### Step 1: Copy PDF Content

From INTI's fee schedule PDF, copy all the programme tables into a text file:

```
data/imports/raw-university-content.txt
```

Add the header:

```
UNIVERSITY_NAME: INTI International University
SHORT_CODE: INTI
LOCATION: Malaysia
MODE: SINGLE_UNIVERSITY_MERGE_CAMPUSES
CURRENCY: MYR
OFFER_LETTER_FREE: false

RAW_CONTENT_START
2025 Fee Schedule
INTI INTERNATIONAL UNIVERSITY
...
RAW_CONTENT_END
```

### Step 2: Dry-Run

```bash
npm run import:university-content:dry-run
```

Output:

```
✅ Found 129 programme rows

🆕 Will CREATE new university: INTI International University

✅ Generated files in: data\imports\generated
  - university.generated.json
  - courses.generated.json
  - offerings.generated.json
  - import-report.md

🔍 DRY-RUN COMPLETE. Review generated files and run with --commit to import.
```

### Step 3: Review Generated Files

Open `data/imports/generated/import-report.md`:

```markdown
# Import Report

**Mode:** DRY-RUN

## University
- **Action:** CREATE
- **Name:** INTI International University
- **Code:** INTI
- **Location:** Malaysia

## Courses
- **Created:** 89
- **Reused:** 0
- **Total:** 89

## Offerings
- **Total:** 129

## Warnings
(none)

## Errors
(none)
```

### Step 4: Commit to Firebase

```bash
npm run import:university-content:commit
```

The importer will:

1. Write the university to `universities` collection
2. Write new courses to `courses` collection
3. Write offerings to `courseOfferings` collection
4. Set timestamps automatically

### Step 5: Upload Assets

The importer generates predictable asset paths. You now add the actual files:

```
assets/logos/inti-logo.png          ← Place your logo here
assets/universities/inti-campus.jpg ← Place your campus photo here
```

Once files are in place, they'll display on the public website.

---

## Troubleshooting

### Issue: Too Many Courses Imported

The importer is picking up non-course lines from the PDF.

**Solution:** Review `data/imports/generated/courses.generated.json` for entries that don't look like real courses, and manually delete them before committing.

### Issue: Missing Fees

Some programmes don't have fees extracted.

**Solution:** This is expected for programmes where fees weren't listed in the PDF. The importer uses a default of `0` for missing fees. You can manually edit `offerings.generated.json` before committing if you want to set correct fees.

### Issue: Course Name Contains Intake Months

Example: "Diploma in Business Jan, Mar, May, Aug, Oct FT-"

**Solution:** This happens when intake months are on the same line as the course name in the PDF. You can manually clean up course names in `courses.generated.json` before committing.

### Issue: Wrong Intake Month Detected

The importer might pick up month names from other text.

**Solution:** The import will work correctly anyway—the courses will be imported with detected intake months. You can manually adjust in the admin panel afterward.

---

## Asset Paths

The importer generates these predictable asset paths:

```
assets/logos/{shortCode-lowercase}-logo.png
assets/universities/{shortCode-lowercase}-campus.jpg
assets/courses/{normalized-course-slug}.jpg
```

Examples:

```
assets/logos/inti-logo.png
assets/universities/inti-campus.jpg
assets/courses/bachelor-of-computer-science.jpg
```

You manually add image files to these paths. If files don't exist, paths are stored but images won't display (broken links). You can add files anytime via the admin dashboard.

---

## Multi-University Workflow

Currently, the importer supports **one university per import file**.

To import multiple universities:

1. Create separate import files for each university
2. Run the importer once for each file
3. Each run creates/updates one university

Future: Multi-university mode could be implemented to parse a single file with multiple institution sections.

---

## Implementation Notes

### No Firebase Storage

The importer does **not** upload files to Firebase Storage. It only stores predictable asset paths as strings in Firestore. This keeps the project compatible with Firebase's Spark Plan (which doesn't include Storage).

### Idempotent Updates

Running the importer multiple times with the same content is safe:

- Universities are matched and updated (not duplicated)
- Courses are matched and reused (not duplicated)
- Offerings are matched and updated (not duplicated)

### Dry-Run Safety

The dry-run mode performs the full parsing and validation but **never writes to Firebase**. It's completely safe to run multiple times.

---

## Next Steps

1. **Paste INTI content** into `data/imports/raw-university-content.txt`
2. **Run dry-run**: `npm run import:university-content:dry-run`
3. **Review**: Check all three generated JSON files
4. **Fix issues**: Edit JSON files if needed
5. **Commit**: `npm run import:university-content:commit`
6. **Test**: Verify university appears in admin dashboard and public website
7. **Add assets**: Place logo and campus image files in `assets/` folders

---

## Questions?

The importer is designed to be safe and non-destructive. If something goes wrong:

- Generated files are never committed automatically
- You can always review and edit before committing
- No data is deleted—only created or updated
- Run dry-run as many times as needed to refine your input

Start with a single university and test the full workflow before bulk importing multiple institutions.
