# University Content Import Script

Comprehensive guide for importing university data (courses, offerings, fees) into Firestore.

## Overview

The `import-university-content.js` script parses university content (typically from PDF exports or text files) and intelligently imports it into the Horizons Firebase database with:

- **Smart parsing**: Extracts course names, levels, categories, fees, and intake months from raw text
- **Duplicate protection**: Prevents duplicate universities, courses, and offerings
- **Two modes**: Dry-run for preview, commit mode for actual Firebase writes
- **Full error handling**: Clear, actionable error messages and statistics

## Setup

### 1. Firebase Service Account Key

To use commit mode, you need Firebase Admin SDK credentials.

**Get your service account key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Settings → Service Accounts → Generate New Private Key
4. Save the JSON file as `serviceAccountKey.json` in the project root

**Alternative:** Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

### 2. Install Dependencies

```bash
npm install
```

The script requires:
- `firebase-admin@^12.0.0` - Already in package.json

## Input Format

Create a text file with university content. Include metadata header:

```
UNIVERSITY_NAME: INTI International University
SHORT_CODE: INTI
LOCATION: Malaysia
MODE: SINGLE_UNIVERSITY_MERGE_CAMPUSES
CURRENCY: MYR
OFFER_LETTER_FREE: false

RAW_CONTENT_START

[Paste your university content here - course listings, fees, intake info]

RAW_CONTENT_END
```

**Fields:**
- `UNIVERSITY_NAME` (required): Full university name
- `SHORT_CODE` (optional): 3-4 letter code (auto-generated if omitted)
- `LOCATION` (optional): University location
- `MODE`: Always `SINGLE_UNIVERSITY_MERGE_CAMPUSES` for now
- `CURRENCY`: Currency code (e.g., MYR, USD, GBP)
- `OFFER_LETTER_FREE`: true/false

**Raw content:** Any text containing:
- Course names and levels (Bachelor, Master, Diploma, etc.)
- Tuition fees (numbers are extracted)
- Intake months (January, February, etc. or abbreviations)
- Duration (1 year, 2.5 years, etc.)

Lines with headers, footers, and non-course information are automatically filtered.

## Usage

### Dry-Run Mode (Preview)

Preview what will be imported without writing to Firebase:

```bash
npm run import:university-content:dry-run
```

This generates JSON files in `data/imports/generated/`:
- `university.generated.json` - University document
- `courses.generated.json` - Course documents
- `offerings.generated.json` - Course offering relationships
- `import-report.md` - Human-readable import summary

**Example output:**
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

### Commit Mode (Write to Firebase)

Actually write the data to Firestore:

```bash
npm run import:university-content:commit
```

**What happens:**
1. ✅ Parses and validates input file
2. 🔗 Connects to Firebase
3. 🔍 Fetches existing universities and courses for duplicate detection
4. ✨ Creates/updates university document
5. 📚 Creates/updates global course documents
6. 🔗 Creates/updates course offering relationships
7. 📊 Prints summary statistics

**Example output:**
```
🔍 Parsing university content...

📋 Metadata detected:
  University Name: INTI International University
  Short Code: INTI
  Location: Malaysia

✅ Found 129 programme rows

📤 COMMIT MODE: Writing to Firestore...

📍 University:
  ✨ Created university: ABC123xyz

📚 Courses & Offerings:
Creating 129 new courses...
  ✓ 25/129 courses created
  ✓ 50/129 courses created
  ✓ 75/129 courses created
  ✓ 100/129 courses created
  ✓ 125/129 courses created
  ✓ All 129 courses created

Reusing 0 existing courses...
  ✓ Reused 0 courses

Creating 129 course offerings...
  ✓ 25/129 offerings processed
  ✓ 50/129 offerings processed
  ✓ 75/129 offerings processed
  ✓ 100/129 offerings processed
  ✓ 125/129 offerings processed
  ✓ Offerings complete: 129 created, 0 updated

═══════════════════════════════════════════════════════════
📊 IMPORT SUMMARY
═══════════════════════════════════════════════════════════

✨ University:
   🆕 Created: ABC123xyz

📚 Courses:
   Created: 129
   Reused/Updated: 0

🔗 Offerings:
   Created: 129
   Updated: 0

═══════════════════════════════════════════════════════════
✅ IMPORT COMPLETE
```

## Data Model

### University Document (Collection: `universities`)

```json
{
  "name": "INTI International University",
  "shortCode": "INTI",
  "location": "Malaysia",
  "intro": "...",
  "aboutContent": "...",
  "logo": "assets/universities/inti-logo.png",
  "image": "assets/universities/inti-campus.jpg",
  "youtubeVideo": "",
  "nextIntakeDate": "2026-08-01",
  "intakeMonths": ["January", "March", "May", ...],
  "offerLetterFree": false,
  "faqs": ["...", "...", ...],
  "ranking": "",
  "active": true,
  "order": 1,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Course Document (Collection: `courses`)

```json
{
  "name": "Bachelor of Computer Science (Hons)",
  "courseId": "bachelor-computer-science-hons-1",
  "level": "Bachelor",
  "category": "Computing & IT",
  "basePrice": 78036,
  "baseCurrency": "MYR",
  "baseDurationYears": 3,
  "duration": "3 years",
  "totalSemesters": null,
  "credits": "",
  "image": "assets/courses/bachelor-computer-science.jpg",
  "description": "Bachelor Computing & IT programme. Duration: 3 years.",
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Course Offering Document (Collection: `courseOfferings`)

```json
{
  "universityId": "ABC123xyz",
  "universityName": "INTI International University",
  "courseId": "bachelor-computer-science-hons-1",
  "courseName": "Bachelor of Computer Science (Hons)",
  "courseLevel": "Bachelor",
  "courseCategory": "Computing & IT",
  "tuitionFee": 78036,
  "tuitionCurrency": "MYR",
  "durationYears": 3,
  "durationMonths": 36,
  "durationText": "3 years",
  "intakeMonths": ["January", "March", "May"],
  "nextIntakeDate": null,
  "semesters": null,
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Duplicate Protection

The script implements intelligent duplicate detection:

### University Matching
- **Primary**: Short code (exact match, case-insensitive)
- **Secondary**: Normalized university name
- If found: Updates existing university
- If not found: Creates new university

### Course Matching
- **Match on**: Normalized course name + level (both must match)
- If found: Reuses existing course in offerings
- If not found: Creates new global course

### Offering Matching
- **Match on**: universityId + courseId
- If found: Updates existing offering
- If not found: Creates new offering

## Troubleshooting

### Error: Firebase service account key not found

**Solution:**
1. Download your service account key from Firebase Console
2. Save as `serviceAccountKey.json` in project root
3. OR set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Error: No programmes could be parsed

The script couldn't find valid course lines in raw content.

**Reasons:**
- Content doesn't contain course-related keywords
- All lines were filtered as non-course content
- Formatting is very different from expected format

**Solution:**
- Ensure content includes course names (Bachelor, Master, etc.)
- Check that course names are properly capitalized
- Include full fee and duration information

### Courses show fee of 0

The script couldn't extract a fee from the raw text.

**Reasons:**
- No number found at end of course line
- Fee format is unusual (e.g., "RM78,036" vs "78036")

**Solution:**
- Ensure fees are included in the raw content
- Format should be numeric with optional separators

### Missing course duration

The script couldn't extract duration from the course line.

**Reasons:**
- Duration not specified in raw content
- Format is non-standard (e.g., "Three years" vs "3 years")

**Solution:**
- Specify durations in the raw content
- Use standard formats: "3 years", "2.5 years", "24 months", etc.

## Advanced Usage

### Custom Input File

Change the input file path in `package.json`:

```json
{
  "scripts": {
    "import:university-content:dry-run": "node scripts/import-university-content.js --input data/imports/my-custom-file.txt --dry-run",
    "import:university-content:commit": "node scripts/import-university-content.js --input data/imports/my-custom-file.txt --commit"
  }
}
```

Or run directly:

```bash
node scripts/import-university-content.js --input data/imports/my-file.txt --dry-run
node scripts/import-university-content.js --input data/imports/my-file.txt --commit
```

## Implementation Details

### Parsing Algorithm

1. **Metadata extraction**: Reads UNIVERSITY_NAME, SHORT_CODE, LOCATION, etc. from header
2. **Content parsing**: Splits raw content into lines
3. **Line filtering**: Removes headers, footers, and non-course lines
4. **Pattern matching**: Identifies category headers and intake months
5. **Course extraction**: Parses remaining lines as course definitions
6. **Data enrichment**: Infers course level and category from course name

### Database Operations

**Initialization** (`initializeFirebase`):
- Loads Firebase Admin SDK
- Attempts to find service account key from multiple locations
- Initializes connection to Firestore

**Duplicate Detection** (Firestore queries):
- `findExistingUniversity()`: Queries universities by shortCode and normalized name
- `findExistingCourse()`: Scans all courses for name+level match
- `findExistingOffering()`: Queries offerings by universityId + courseId

**Write Operations** (Firestore transactions):
- `createOrUpdateUniversity()`: Sets or updates university document
- `createOrUpdateCourse()`: Sets or updates course document
- `createOrUpdateOffering()`: Sets or updates offering document
- All operations include serverTimestamp() for createdAt/updatedAt

**Statistics Tracking**:
- coursesCreated: New global courses
- coursesReused: Existing courses used in offerings
- offeringsCreated: New offering relationships
- offeringsUpdated: Updated offering relationships
- offeringsSkipped: Offerings with errors

## Next Steps

1. ✅ Prepare your university content file with metadata header
2. ✅ Review with `npm run import:university-content:dry-run`
3. ✅ Check generated JSON files in `data/imports/generated/`
4. ✅ Set up Firebase credentials (serviceAccountKey.json)
5. ✅ Run `npm run import:university-content:commit`
6. ✅ Verify data in Firebase Console

---

For questions or issues, check the generated `import-report.md` file or review console error messages.
