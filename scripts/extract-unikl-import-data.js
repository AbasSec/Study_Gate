#!/usr/bin/env node

/**
 * Extract Complete UniKL Data from Original Import File
 *
 * Recovers fee/duration/intake data from data/imports/unikl-courses.txt
 * and applies it as HIGH-confidence enrichment to Firestore courseOfferings
 *
 * Usage:
 *   node scripts/extract-unikl-import-data.js --dry-run
 *   node scripts/extract-unikl-import-data.js --commit
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const isDryRun = process.argv.includes('--dry-run');
const isCommit = process.argv.includes('--commit');

let db;

// Month abbreviation to full name mapping
const monthMap = {
  'jan': 'January', 'january': 'January',
  'feb': 'February', 'february': 'February',
  'mar': 'March', 'march': 'March',
  'apr': 'April', 'april': 'April',
  'may': 'May',
  'jun': 'June', 'june': 'June',
  'jul': 'July', 'july': 'July',
  'aug': 'August', 'august': 'August',
  'sep': 'September', 'sept': 'September', 'september': 'September',
  'oct': 'October', 'october': 'October',
  'nov': 'November', 'november': 'November',
  'dec': 'December', 'december': 'December'
};

// ============================================
// PARSE IMPORT FILE
// ============================================

function parseImportFile() {
  const filePath = path.join(__dirname, '../data/imports/unikl-courses.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim());

  const courses = [];
  let currentCourse = null;

  for (const line of lines) {
    if (!line) continue;

    // Skip metadata
    if (line.startsWith('UNIVERSITY_NAME:') ||
        line.startsWith('LOCATION:') ||
        line.startsWith('COUNTRY:')) {
      continue;
    }

    // Institute headers - skip
    if (line.includes('UniKL') && line.includes('-')) {
      continue;
    }

    // Duration line
    if (line.startsWith('Duration:')) {
      if (currentCourse) {
        const durationText = line.replace('Duration:', '').trim();
        currentCourse.durationText = durationText;
        currentCourse.durationYears = parseDuration(durationText);
        currentCourse.durationMonths = Math.round(currentCourse.durationYears * 12);
      }
      continue;
    }

    // Intake line
    if (line.startsWith('Intake:')) {
      if (currentCourse) {
        const intakeText = line.replace('Intake:', '').trim();
        currentCourse.intakeMonths = parseIntake(intakeText);
        currentCourse.nextIntakeDate = calculateNextIntakeDate(currentCourse.intakeMonths);
      }
      continue;
    }

    // Tuition Fee line
    if (line.startsWith('Tuition Fee:')) {
      if (currentCourse) {
        const feeText = line.replace('Tuition Fee:', '').trim();
        currentCourse.tuitionFee = parseFee(feeText);
        currentCourse.tuitionCurrency = 'MYR';
        courses.push(currentCourse);
        currentCourse = null;
      }
      continue;
    }

    // Course name (any other non-empty line that's not a directive)
    if (line && !line.startsWith('Doctor') && !line.startsWith('Master') &&
        !line.startsWith('Bachelor') && !line.startsWith('Diploma') &&
        !line.startsWith('Foundation') && currentCourse === null) {
      // This is an institute header, skip
      if (line.includes('Institute') || line.includes('School') || line.includes('College')) {
        continue;
      }
    }

    // Course name
    if ((line.startsWith('Bachelor') || line.startsWith('Diploma') ||
         line.startsWith('Foundation') || line.startsWith('Master') ||
         line.startsWith('Doctor')) && !line.startsWith('Duration:')) {
      currentCourse = {
        name: line,
        durationText: null,
        durationYears: null,
        durationMonths: null,
        intakeMonths: [],
        nextIntakeDate: null,
        tuitionFee: null,
        tuitionCurrency: null
      };
    }
  }

  return courses;
}

// ============================================
// NORMALIZE DATA
// ============================================

function parseDuration(text) {
  // Extract years from text like "4 Years", "3-7 Years", "1.5 Years"
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return Math.ceil(parseFloat(match[1])); // Round up for ranges (3-7 becomes 7, then ceil)
  }
  // For ranges like "1.5-3", take the minimum
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return Math.ceil(parseFloat(rangeMatch[1])); // Take minimum and round up
  }
  return 0;
}

function parseIntake(text) {
  // Parse "Mar & Oct", "Jan & July", "Mar, July & Oct", etc.
  const months = [];
  const parts = text.split(/[&,]/);

  for (const part of parts) {
    const cleaned = part.trim().toLowerCase();
    if (monthMap[cleaned]) {
      if (!months.includes(monthMap[cleaned])) {
        months.push(monthMap[cleaned]);
      }
    }
  }

  // Sort by calendar order
  const calendarOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
  return months.sort((a, b) => calendarOrder.indexOf(a) - calendarOrder.indexOf(b));
}

function calculateNextIntakeDate(intakeMonths) {
  if (!intakeMonths || intakeMonths.length === 0) {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const monthIndexMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  // Find next intake month
  for (const month of intakeMonths) {
    const monthIndex = monthIndexMap[month];
    if (monthIndex > currentMonth) {
      return new Date(currentYear, monthIndex, 1).toISOString().split('T')[0];
    }
  }

  // If no future month this year, use first month next year
  const firstMonth = intakeMonths[0];
  const monthIndex = monthIndexMap[firstMonth];
  return new Date(currentYear + 1, monthIndex, 1).toISOString().split('T')[0];
}

function parseFee(text) {
  // Extract numeric fee from "RM 19,500/year" or "RM 5,000/year"
  const match = text.match(/RM\s*([\d,]+)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
}

// ============================================
// MATCH TO FIRESTORE OFFERINGS
// ============================================

async function findMatchingOfferings(importedCourse) {
  // Get UniKL university ID
  const uniSnap = await db.collection('universities')
    .where('name', '==', 'Universiti Kuala Lumpur')
    .limit(1)
    .get();

  if (uniSnap.empty) {
    console.error('❌ Universiti Kuala Lumpur not found in database');
    return [];
  }

  const universityId = uniSnap.docs[0].id;

  // Find INCOMPLETE courseOfferings for this course name
  const query = await db.collection('courseOfferings')
    .where('universityId', '==', universityId)
    .get();

  const offerings = query.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(offering => {
      // Only match INCOMPLETE offerings (missing key fields)
      const isIncomplete = !offering.tuitionFee || offering.tuitionFee === 0 ||
                          !offering.durationYears || offering.durationYears === 0 ||
                          !offering.intakeMonths || (Array.isArray(offering.intakeMonths) && offering.intakeMonths.length === 0);

      if (!isIncomplete) return false;

      // Simple fuzzy match - course name should contain key parts
      const offeringName = offering.courseName?.toLowerCase() || '';
      const importName = importedCourse.name.toLowerCase();

      return fuzzyMatch(importName, offeringName);
    });

  return offerings;
}

function fuzzyMatch(importName, offeringName) {
  // Extract key terms (words with 3+ chars, not "and", "with", "of", "in", "the")
  const stopwords = ['and', 'with', 'of', 'in', 'the', 'a', 'an'];
  const importTerms = importName.split(/\s+/)
    .filter(t => t.length >= 3 && !stopwords.includes(t));
  const offeringTerms = offeringName.split(/\s+/)
    .filter(t => t.length >= 3 && !stopwords.includes(t));

  // Need at least 2 matching terms
  let matches = 0;
  for (const term of importTerms) {
    if (offeringTerms.some(t => t.includes(term) || term.includes(t))) {
      matches++;
    }
  }

  return matches >= 2;
}

// ============================================
// GENERATE ENRICHMENT
// ============================================

async function generateEnrichment(importedCourses) {
  console.log('🔍 Matching imported courses to Firestore offerings...\n');

  const enrichments = [];
  let matchCount = 0;
  let noMatchCount = 0;

  for (let i = 0; i < importedCourses.length; i++) {
    const importedCourse = importedCourses[i];
    const offerings = await findMatchingOfferings(importedCourse);

    if (offerings.length === 0) {
      console.log(`⏭️  [${i + 1}/${importedCourses.length}] NO MATCH: ${importedCourse.name}`);
      noMatchCount++;
      continue;
    }

    for (const offering of offerings) {
      enrichments.push({
        offeringId: offering.id,
        universityId: offering.universityId,
        courseId: offering.courseId,
        courseName: offering.courseName,
        importedCourseName: importedCourse.name,
        updates: {
          tuitionFee: importedCourse.tuitionFee,
          tuitionCurrency: importedCourse.tuitionCurrency,
          durationText: importedCourse.durationText,
          durationYears: importedCourse.durationYears,
          durationMonths: importedCourse.durationMonths,
          intakeMonths: importedCourse.intakeMonths,
          nextIntakeDate: importedCourse.nextIntakeDate
        },
        sources: [{
          name: 'Original Import Data (unikl-courses.txt)',
          url: 'data/imports/unikl-courses.txt',
          type: 'official_import',
          confidence: 'HIGH'
        }],
        confidence: 'HIGH'
      });

      console.log(`✅ [${i + 1}/${importedCourses.length}] MATCH: ${importedCourse.name}`);
      matchCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Matched and enriched: ${matchCount}`);
  console.log(`   No match found: ${noMatchCount}`);
  console.log(`   Total to enrich: ${enrichments.length}\n`);

  return enrichments;
}

// ============================================
// APPLY ENRICHMENT
// ============================================

async function applyEnrichment(enrichments) {
  console.log('💾 Applying enrichment to Firestore...\n');

  let successCount = 0;
  let skipCount = 0;
  const batch = db.batch();

  for (const item of enrichments) {
    const docRef = db.collection('courseOfferings').doc(item.offeringId);
    const updateData = {
      ...item.updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.update(docRef, updateData);
    console.log(`✅ UPDATE ${item.courseName}`);
    successCount++;
  }

  await batch.commit();
  console.log(`\n✅ Successfully applied ${successCount} enrichments to Firestore\n`);

  return { successCount };
}

// ============================================
// GENERATE REPORT
// ============================================

function generateReport(importedCourses, enrichments) {
  const reportDir = path.join(__dirname, '../data/imports/generated');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = `# UniKL Data Recovery Report

Generated: ${new Date().toISOString()}

## Summary

- **Total courses in import file**: ${importedCourses.length}
- **Successfully matched and enriched**: ${enrichments.length}
- **No match found**: ${importedCourses.length - enrichments.length}

## Data Recovered

| Course Name | Duration | Intake | Fee (RM) |
|---|---|---|---|
${enrichments.map(e => {
  const months = e.updates.intakeMonths.map(m => m.substring(0, 3)).join(', ');
  return `| ${e.importedCourseName} | ${e.updates.durationText} | ${months} | ${e.updates.tuitionFee} |`;
}).join('\n')}

## Enriched Fields

All enrichments marked as **HIGH** confidence (directly from official import file):
- \`tuitionFee\` - Annual tuition in MYR
- \`tuitionCurrency\` - Set to "MYR"
- \`durationText\` - Human-readable duration
- \`durationYears\` - Years (rounded up for ranges)
- \`durationMonths\` - Months (durationYears × 12)
- \`intakeMonths\` - Standardized month names
- \`nextIntakeDate\` - Calculated next intake date

## Source

**File**: data/imports/unikl-courses.txt
**Type**: Official University Import Data
**Confidence**: HIGH (direct from official university content)
`;

  fs.writeFileSync(
    path.join(reportDir, 'unikl-recovery-report.md'),
    report
  );

  console.log('📋 Report generated: data/imports/generated/unikl-recovery-report.md\n');
}

// ============================================
// INITIALIZATION
// ============================================

async function initializeFirebase() {
  try {
    const keyPath = path.join(__dirname, '../serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) {
      throw new Error('serviceAccountKey.json not found');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    console.log('✅ Firebase initialized\n');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 UNIKL DATA RECOVERY FROM ORIGINAL IMPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!isDryRun && !isCommit) {
    console.log('❌ Must specify --dry-run or --commit\n');
    process.exit(1);
  }

  const mode = isDryRun ? 'DRY-RUN' : 'COMMIT';
  console.log(`🔧 Mode: ${mode}\n`);

  await initializeFirebase();

  // Step 1: Parse import file
  console.log('📂 Parsing unikl-courses.txt...\n');
  const importedCourses = parseImportFile();
  console.log(`✅ Parsed ${importedCourses.length} courses\n`);

  // Step 2: Match to Firestore
  const enrichments = await generateEnrichment(importedCourses);

  // Step 3: Generate report
  generateReport(importedCourses, enrichments);

  // Step 4: Apply enrichment
  if (isCommit && enrichments.length > 0) {
    await applyEnrichment(enrichments);
  } else if (isDryRun) {
    console.log('✅ DRY-RUN COMPLETE\n');
    console.log('📊 Enrichments ready to apply:\n');
    enrichments.slice(0, 5).forEach(e => {
      console.log(`   - ${e.courseName}`);
    });
    if (enrichments.length > 5) {
      console.log(`   ... and ${enrichments.length - 5} more\n`);
    }
    console.log('Run with --commit to apply all enrichments to Firestore\n');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
