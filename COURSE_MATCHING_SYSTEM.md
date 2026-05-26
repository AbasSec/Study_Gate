# Canonical Course Matching System

## Overview

The Canonical Course Matching System improves course connection quality across different universities by intelligently identifying courses that should share a common global course record, even when their names differ slightly.

**Problem**: Multiple universities offer the same real course but with slightly different names:
- Bachelor of Computer Science
- Bachelor of Computer Science (Hons)
- BSc (Hons) Computer Science
- Bachelor of Science in Computer Science

**Solution**: A multi-tier matching system that treats these as equivalent, connecting them to a single global course with multiple university-specific offerings.

## Files Created

### 1. `scripts/lib/course-matching.js`
Core matching engine with five tiers of course matching logic.

**Functions**:
- `normalizeCourseName(name)` - Basic text normalization
- `extractCanonicalName(name)` - Remove non-identity modifiers
- `generateCanonicalKey(name, level)` - Create matching key
- `loadCourseAliases()` - Load alias config
- `findAliasMatch(courseName, level, aliases)` - Check alias matches
- `calculateSimilarity(name1, name2)` - Token-based similarity (Jaccard)
- `hasConflictingSpecializations(name1, name2)` - Detect incompatible specializations
- `matchCourse(importedCourse, existingCourses, options)` - Main matching function

### 2. `data/imports/course-aliases.json`
Curated configuration file mapping course name variants to canonical courses.

**Format**:
```json
{
  "Level|canonical-key": [
    "Variant Name 1",
    "Variant Name 2",
    "..."
  ]
}
```

**Examples**:
```json
{
  "bachelor|computer science": [
    "Bachelor of Computer Science",
    "Bachelor of Computer Science (Hons)",
    "BSc (Hons) Computer Science",
    "Bachelor of Science in Computer Science"
  ],
  
  "master|business administration": [
    "Master of Business Administration",
    "MBA",
    "Master in Business Administration"
  ]
}
```

### 3. `scripts/audit-course-connections.js`
Audit script to scan existing Firestore courses for duplicates and near-duplicates.

**Usage**:
```bash
# Run audit (read-only)
node scripts/audit-course-connections.js

# Show all matches (verbose)
node scripts/audit-course-connections.js --verbose

# Generate merge plan (future)
node scripts/audit-course-connections.js --plan-merges
```

**Output**: `data/imports/generated/course-connection-audit.md`

## Matching Tiers (in order)

### Tier 1: Exact courseId Match
- Matches if courseIds are identical
- Confidence: 1.0
- Decision: AUTO_REUSE

### Tier 2: Exact Normalized Name + Level
- Matches if normalized names are identical and levels match
- Example: "Bachelor of Computer Science" == "bachelor of computer science"
- Confidence: 1.0
- Decision: AUTO_REUSE

### Tier 3: Canonical Key Match
- Matches if canonical names are equivalent (removes non-identity modifiers)
- Removes: (Hons), Honours, with Honours, 3+0, 4+0, by Research, Online, FT, PT, etc.
- Preserves: Meaningful specializations (Data Science, Cyber Security, Finance, Marketing, etc.)
- Confidence: 0.97
- Decision: AUTO_REUSE
- Example: "Bachelor of Computer Science (Hons)" matches "Bachelor of Computer Science"

### Tier 4: Alias Dictionary Match
- Looks up configured aliases from course-aliases.json
- Only matches if both courses are in the same alias group
- Confidence: 0.96
- Decision: AUTO_REUSE
- Example: MBA, Master of Business Administration, Master in Business Administration

### Tier 5: Fuzzy Similarity Match
- Uses token-based Jaccard similarity on remaining candidates
- Only matches if levels are identical and no specialization conflict
- Confidence threshold options:
  - >= 0.90: AUTO_REUSE (high confidence)
  - 0.75-0.89: REVIEW_REQUIRED (medium confidence)
  - < 0.75: CREATE_NEW (low confidence)

## Normalization & Removal Rules

### Always Removed (Non-Identity Modifiers)
- Hons, Honours, with Honours
- 3+0, 4+0 (intake patterns)
- Dual Award
- Online Learning
- Full Time, Part Time, FT, PT
- by Coursework, by Research
- ODL (Open Distance Learning)
- Partner collaboration suffixes

### Always Preserved (Meaningful Specializations)
- Data Science, Cyber Security, Software Engineering
- Finance, Marketing, Accounting, International Business
- Mechanical, Civil, Electrical Engineering
- Physiotherapy, Nursing, Pharmacy
- Hotel Management, Culinary Arts
- Graphic Design, Fashion Design, Animation
- Information Technology, Information Systems
- Human Resource Management
- Logistics, Supply Chain Management

### Example Normalizations
```
"Bachelor of Computer Science (Hons)"
→ "bachelor of computer science"

"BSc (Hons) Computer Science"
→ "bsc computer science"
→ canonical key: "bachelor|computer science"

"Master of Business Administration (Online)"
→ "master of business administration"

"Bachelor of Business (Hons) - Finance"
→ "bachelor of business finance"
→ canonical key: "bachelor|business finance"
```

## Safety Constraints

The system will **NOT** auto-merge if:
- **Level mismatch**: Bachelor != Master != PhD
- **Category mismatch**: Computing != Health Sciences
- **Specialization conflict**: Finance != Marketing (within Business)
- **Computer Science != Information Technology** (unless explicitly aliased)
- **Data Science != Computer Science** (unless explicitly aliased)
- **One is generic, other is specialized**: "Business" != "Business - Finance"

## Current Integration Status

### ✅ Implemented
- Core matching engine (`course-matching.js`)
- Alias configuration system (`course-aliases.json`)
- Audit script (`audit-course-connections.js`)
- Updated import script class method (basic integration)

### ⏳ Partial Integration
- Import script updated to use canonical matching for course lookup
- Existing import continues to work

### 📋 TODO - Full Integration
- Course-match-review.md generation during import
- Review-required blocker in commit validation
- Unsafe merge blocker
- Historical offering preservation when reusing courses
- Full import script flow with match reporting

## Quick Start

### Step 1: Run Audit on Existing Courses
```bash
node scripts/audit-course-connections.js
```

This generates `data/imports/generated/course-connection-audit.md` showing:
- Exact duplicates (likely same course, should merge)
- Canonical duplicates (differ only in modifiers like Hons)
- High-confidence matches (85%+ similar)
- Medium-confidence matches (75-84% similar)

### Step 2: Review Audit Results
Open the generated report and verify you agree with the classifications.

### Step 3: Add Aliases if Needed
Edit `data/imports/course-aliases.json` to add any specific course groupings your universities use.

### Step 4: Test Matching
The import script will use the matching system when finding existing courses.

## Customization

### Add New Aliases
Edit `data/imports/course-aliases.json`:

```json
{
  "diploma|business administration": [
    "Diploma in Business Administration",
    "Diploma of Business Administration",
    "Diploma in Business Admin"
  ]
}
```

### Adjust Matching Thresholds
In `course-matching.js` matchCourse function:

```javascript
matchCourse(importedCourse, existingCourses, {
  allowAliases: true,           // Use alias dictionary
  allowFuzzy: true,             // Use fuzzy matching
  fuzzyThreshold: 0.90,         // Auto-reuse threshold (0-1)
  reviewThreshold: 0.75         // Review-required threshold (0-1)
})
```

### Add Specialization Tokens
In `course-matching.js` hasConflictingSpecializations:

```javascript
const specializations = [
  'finance', 'accounting', 'marketing',  // existing
  'supply chain', 'operations',          // add new
  'advanced manufacturing',              // add new
  // ...
];
```

## Example: Course Connection Workflow

### Scenario
Three universities offer variations of the same computer science course:
1. University A: "Bachelor of Computer Science (Hons)"
2. University B: "BSc (Hons) Computer Science"
3. University C: "Bachelor of Science in Computer Science"

### What Happens

**Tier 2 check**: None match exactly.

**Tier 3 check**: Canonical keys all generate `bachelor|computer science` → **MATCH!**

**Result**:
- One global course: "Bachelor of Computer Science" (canonical name)
- Three courseOfferings:
  - University A's offering links to this global course
  - University B's offering links to this global course
  - University C's offering links to this global course

**Public Impact**:
- Courses page shows one "Bachelor of Computer Science" course
- Details page lists all three universities as offering this course
- Apply page allows student to select any university's offering

## Example: Conflict Prevention

### Scenario
Three courses with different specializations:
1. "Bachelor of Business (Hons) - Finance"
2. "Bachelor of Business (Hons) - Marketing"
3. "Bachelor of Business Administration"

### What Happens
1. Finance vs Marketing: Different specialization tokens → **NO MATCH** (correctly stays separate)
2. Finance vs Business Admin: Specialization conflict → **NO MATCH**
3. Marketing vs Business Admin: Specialization conflict → **NO MATCH**

**Result**: Three separate global courses (correct)

## API Reference

### matchCourse(importedCourse, existingCourses, options)

**Parameters**:
- `importedCourse`: `{ name: string, level: string }`
- `existingCourses`: Array of `{ id, name, level, category, ... }`
- `options`: Matching configuration (optional)

**Returns**:
```javascript
{
  decision: 'AUTO_REUSE' | 'CREATE_NEW' | 'REVIEW_REQUIRED',
  confidence: number,           // 0.0-1.0
  reason: string,               // Why this decision
  matchedCourse: object | null  // The matched course if found
}
```

### normalizeCourseName(name)
Lowercase, trim, normalize whitespace and punctuation.

### extractCanonicalName(name)
Remove non-identity modifiers, preserve specializations.

### generateCanonicalKey(name, level)
Create a token-based key for fuzzy matching.

### calculateSimilarity(name1, name2)
Returns Jaccard coefficient (0-1) of token sets.

### hasConflictingSpecializations(name1, name2)
Returns true if specializations appear incompatible.

## Testing

Test cases in `course-matching.js`:

**Should match**:
```javascript
const c1 = { name: "Bachelor of Computer Science", level: "Bachelor" };
const c2 = { name: "Bachelor of Computer Science (Hons)", level: "Bachelor" };
// matchCourse(c1, [c2]) → AUTO_REUSE
```

**Should NOT match**:
```javascript
const c1 = { name: "Bachelor of Computer Science", level: "Bachelor" };
const c2 = { name: "Bachelor of Information Technology", level: "Bachelor" };
// matchCourse(c1, [c2]) → CREATE_NEW
```

**Should NOT match**:
```javascript
const c1 = { name: "Bachelor of Business - Finance", level: "Bachelor" };
const c2 = { name: "Bachelor of Business - Marketing", level: "Bachelor" };
// matchCourse(c1, [c2]) → CREATE_NEW (specialization conflict)
```

## Performance

- Matching is O(n) per course lookup (n = existing courses)
- Similarity calculation is O(m log m) per pair (m = tokens)
- Canonical key generation is O(m) (m = tokens)
- For typical usage (100-300 existing courses), matching completes in <100ms

## Future Enhancements

1. **Machine Learning**: Train on manually confirmed matches to improve fuzzy matching
2. **Caching**: Cache canonical keys and similarity scores
3. **Merge Execution**: Safe merge tool to consolidate duplicate global courses
4. **Offering Migration**: Migrate existing offerings when courses are merged
5. **Diff Reporting**: Show exactly what changed when reusing vs creating courses
6. **Batch Audit**: Audit entire import before dry-run
7. **Historical Tracking**: Preserve course version history when merging

## Support

For issues or questions about the canonical course matching system:
1. Check existing aliases in `course-aliases.json`
2. Run audit: `node scripts/audit-course-connections.js --verbose`
3. Review matching tiers in `scripts/lib/course-matching.js`
4. Check course categories - ensure compatible specializations
