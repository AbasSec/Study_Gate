#!/usr/bin/env node

/**
 * Course Offering Enrichment Workflow
 *
 * Safely fills missing courseOffering data (fees, duration, intake, semesters)
 * using OFFICIAL UNIVERSITY SOURCES ONLY.
 *
 * Requires:
 * - Dry-run mode first (no Firestore writes)
 * - Official evidence for every value
 * - Confidence scoring (HIGH/MEDIUM/LOW)
 * - Review reports before commit
 * - Strict blockers for unsafe updates
 *
 * Usage:
 *   node scripts/enrich-course-offerings.js --dry-run
 *   node scripts/enrich-course-offerings.js --dry-run --university "Universiti Kuala Lumpur"
 *   node scripts/enrich-course-offerings.js --commit --university "Universiti Kuala Lumpur"
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { EnrichmentSearcher } = require('./lib/enrichment-searcher');
const { EnrichmentReporter } = require('./lib/enrichment-reporter');
const { EnrichmentValidator } = require('./lib/enrichment-validator');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isCommit = args.includes('--commit');
const allowMediumConfidence = args.includes('--allow-medium-confidence');
const overwriteExisting = args.includes('--overwrite-existing');

let universityFilter = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--university' && i + 1 < args.length && !args[i + 1].startsWith('--')) {
    universityFilter = args[i + 1];
    break;
  } else if (args[i].startsWith('--university=')) {
    universityFilter = args[i].split('=')[1];
    break;
  }
}

let db;

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
// SCAN FIRESTORE FOR INCOMPLETE RECORDS
// ============================================

async function scanIncompleteOfferings() {
  console.log('🔍 Scanning Firestore for incomplete courseOfferings...\n');

  try {
    let query = db.collection('courseOfferings');

    // If university filter provided, find university ID first
    if (universityFilter) {
      const uniSnap = await db.collection('universities')
        .where('name', '==', universityFilter)
        .limit(1)
        .get();

      if (uniSnap.empty) {
        console.error(`❌ University not found: ${universityFilter}`);
        process.exit(1);
      }

      const universityId = uniSnap.docs[0].id;
      console.log(`📍 Filtering by university: ${universityFilter} (${universityId})\n`);
      query = query.where('universityId', '==', universityId);
    }

    const snapshot = await query.get();
    const allOfferings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Total courseOfferings found: ${allOfferings.length}`);

    // Find incomplete offerings
    const incomplete = allOfferings.filter(offering => {
      return !offering.tuitionFee || offering.tuitionFee === 0 ||
             !offering.tuitionCurrency ||
             !offering.durationText ||
             !offering.durationYears || offering.durationYears === 0 ||
             !offering.intakeMonths || (Array.isArray(offering.intakeMonths) && offering.intakeMonths.length === 0) ||
             !offering.nextIntakeDate;
    });

    console.log(`⚠️  Incomplete offerings: ${incomplete.length}\n`);

    if (incomplete.length === 0) {
      console.log('✅ All course offerings have complete data.\n');
      return [];
    }

    // Get university names
    const universityIds = [...new Set(incomplete.map(o => o.universityId))];
    const universities = {};

    for (const uniId of universityIds) {
      const uniDoc = await db.collection('universities').doc(uniId).get();
      if (uniDoc.exists) {
        universities[uniId] = uniDoc.data();
      }
    }

    // Get course details
    const courseIds = [...new Set(incomplete.map(o => o.courseId))];
    const courses = {};

    for (const courseId of courseIds) {
      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (courseDoc.exists) {
        courses[courseId] = courseDoc.data();
      }
    }

    // Enrich incomplete records with course and university info
    const enrichedIncomplete = incomplete.map(offering => ({
      ...offering,
      universityName: universities[offering.universityId]?.name || 'Unknown',
      universityDomain: universities[offering.universityId]?.domain || null,
      courseName: courses[offering.courseId]?.name || 'Unknown',
      courseLevel: courses[offering.courseId]?.level || 'Unknown',
      courseCategory: courses[offering.courseId]?.category || 'Unknown',
      missingFields: getMissingFields(offering)
    }));

    return enrichedIncomplete;

  } catch (error) {
    console.error('❌ Scan failed:', error.message);
    process.exit(1);
  }
}

function getMissingFields(offering) {
  const missing = [];
  if (!offering.tuitionFee || offering.tuitionFee === 0) missing.push('tuitionFee');
  if (!offering.tuitionCurrency) missing.push('tuitionCurrency');
  if (!offering.durationText) missing.push('durationText');
  if (!offering.durationYears || offering.durationYears === 0) missing.push('durationYears');
  if (!offering.durationMonths || offering.durationMonths === 0) missing.push('durationMonths');
  if (!offering.semesters || offering.semesters.length === 0) missing.push('semesters');
  if (!offering.intakeMonths || (Array.isArray(offering.intakeMonths) && offering.intakeMonths.length === 0)) missing.push('intakeMonths');
  if (!offering.nextIntakeDate) missing.push('nextIntakeDate');
  return missing;
}

// ============================================
// ENRICH OFFERINGS WITH OFFICIAL SOURCES
// ============================================

async function enrichOfferings(incompleteOfferings) {
  console.log('🔎 Searching for official sources and extracting data...\n');

  const searcher = new EnrichmentSearcher();
  const enrichedData = [];
  let successCount = 0;
  let partialCount = 0;
  let skipCount = 0;
  let nonCourseCount = 0;

  for (let i = 0; i < incompleteOfferings.length; i++) {
    const offering = incompleteOfferings[i];
    console.log(`[${i + 1}/${incompleteOfferings.length}] ${offering.universityName} - ${offering.courseName}`);

    const updates = await searcher.searchAndExtract(offering);

    // Handle non-course rows separately
    if (updates.isNonCourse) {
      nonCourseCount++;
      enrichedData.push({
        offeringId: offering.id,
        universityName: offering.universityName,
        courseName: offering.courseName,
        courseId: offering.courseId,
        missingFields: offering.missingFields,
        updates: {},
        sources: [],
        overallConfidence: 'NON_COURSE_ROW',
        blockers: ['non_course_institute_row'],
        isNonCourse: true
      });
      continue;
    }

    if (updates.found) {
      if (updates.confidence === 'HIGH' || updates.confidence === 'MIXED_HIGH') {
        successCount++;
      } else {
        partialCount++;
      }
      enrichedData.push({
        offeringId: offering.id,
        universityName: offering.universityName,
        courseName: offering.courseName,
        courseId: offering.courseId,
        missingFields: offering.missingFields,
        updates: updates.updates,
        sources: updates.sources,
        overallConfidence: updates.confidence,
        blockers: updates.blockers
      });
    } else {
      skipCount++;
      enrichedData.push({
        offeringId: offering.id,
        universityName: offering.universityName,
        courseName: offering.courseName,
        courseId: offering.courseId,
        missingFields: offering.missingFields,
        updates: {},
        sources: [],
        overallConfidence: 'NO_SOURCE',
        blockers: ['no_official_source_found']
      });
    }
  }

  console.log(`\n✅ Search completed`);
  console.log(`   High confidence: ${successCount}`);
  console.log(`   Partial/Medium: ${partialCount}`);
  console.log(`   No source found: ${skipCount}`);
  console.log(`   Non-course rows: ${nonCourseCount}\n`);

  return enrichedData;
}

// ============================================
// VALIDATE BEFORE COMMIT
// ============================================

async function validateEnrichment(enrichedData) {
  console.log('🔐 Validating enrichment data...\n');

  // Filter out non-course rows from validation
  const realCourses = enrichedData.filter(item => !item.isNonCourse);
  const nonCourseRows = enrichedData.filter(item => item.isNonCourse);

  if (nonCourseRows.length > 0) {
    console.log(`⚠️  Non-course rows excluded from validation:\n`);
    nonCourseRows.forEach(row => {
      console.log(`   - ${row.courseName} (institute/campus row)\n`);
    });
  }

  const validator = new EnrichmentValidator();
  const validation = validator.validate(realCourses, {
    allowMediumConfidence,
    overwriteExisting
  });

  if (!validation.safe) {
    console.log(`⚠️  Validation warnings:\n`);
    validation.warnings.forEach(w => {
      console.log(`   - ${w}`);
    });
    console.log();
  }

  // Add info about non-course rows to validation result
  validation.nonCourseCount = nonCourseRows.length;

  return validation;
}

// ============================================
// GENERATE REPORTS
// ============================================

async function generateReports(incompleteOfferings, enrichedData, validation) {
  console.log('📋 Generating enrichment reports...\n');

  const reporter = new EnrichmentReporter();
  const reports = reporter.generate(incompleteOfferings, enrichedData, validation);

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../data/imports/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write enrichment report
  fs.writeFileSync(
    path.join(outputDir, 'enrichment-report.md'),
    reports.markdown
  );
  console.log(`   ✅ enrichment-report.md`);

  // Write updates JSON
  fs.writeFileSync(
    path.join(outputDir, 'enrichment-updates.generated.json'),
    JSON.stringify(reports.updates, null, 2)
  );
  console.log(`   ✅ enrichment-updates.generated.json`);

  // Write sources JSON
  fs.writeFileSync(
    path.join(outputDir, 'enrichment-sources.generated.json'),
    JSON.stringify(reports.sources, null, 2)
  );
  console.log(`   ✅ enrichment-sources.generated.json`);

  // Write warnings
  fs.writeFileSync(
    path.join(outputDir, 'enrichment-warnings.md'),
    reports.warnings
  );
  console.log(`   ✅ enrichment-warnings.md\n`);

  return reports;
}

// ============================================
// COMMIT TO FIRESTORE
// ============================================

async function commitEnrichment(enrichedData) {
  console.log('💾 Writing updates to Firestore...\n');

  let updateCount = 0;
  let skipCount = 0;
  let nonCourseCount = 0;
  const batch = db.batch();

  for (const item of enrichedData) {
    // Skip non-course rows
    if (item.isNonCourse) {
      console.log(`⏭️  SKIP (non-course) ${item.universityName} - ${item.courseName}`);
      nonCourseCount++;
      continue;
    }

    // Skip if it has blockers
    if (item.blockers && item.blockers.length > 0) {
      console.log(`⏭️  SKIP ${item.universityName} - ${item.courseName} (blockers: ${item.blockers.join(', ')})`);
      skipCount++;
      continue;
    }

    // Skip if confidence is not HIGH
    if (item.overallConfidence !== 'HIGH' && item.overallConfidence !== 'MIXED_HIGH') {
      console.log(`⏭️  SKIP ${item.universityName} - ${item.courseName} (confidence: ${item.overallConfidence})`);
      skipCount++;
      continue;
    }

    // Apply updates
    const docRef = db.collection('courseOfferings').doc(item.offeringId);
    const updateData = {
      ...item.updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.update(docRef, updateData);
    console.log(`✅ UPDATE ${item.universityName} - ${item.courseName}`);
    updateCount++;
  }

  // Commit batch
  await batch.commit();
  console.log(`\n✅ Committed ${updateCount} updates`);
  if (nonCourseCount > 0) {
    console.log(`⏭️  Skipped non-course rows: ${nonCourseCount}`);
  }
  console.log(`⏭️  Skipped (blockers): ${skipCount}\n`);

  return { updateCount, skipCount, nonCourseCount };
}

// ============================================
// MAIN WORKFLOW
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📚 COURSE OFFERING ENRICHMENT WORKFLOW');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!isDryRun && !isCommit) {
    console.log('❌ Must specify --dry-run or --commit\n');
    process.exit(1);
  }

  const mode = isDryRun ? 'DRY-RUN' : 'COMMIT';
  console.log(`🔧 Mode: ${mode}\n`);

  await initializeFirebase();

  // Step 1: Scan
  const incompleteOfferings = await scanIncompleteOfferings();

  if (incompleteOfferings.length === 0) {
    console.log('✅ No enrichment needed.\n');
    process.exit(0);
  }

  // Step 2: Enrich
  const enrichedData = await enrichOfferings(incompleteOfferings);

  // Step 3: Validate
  const validation = await validateEnrichment(enrichedData);

  // Step 4: Generate Reports
  const reports = await generateReports(incompleteOfferings, enrichedData, validation);

  // Step 5: Commit (if not dry-run)
  if (isCommit) {
    if (!validation.safe && !allowMediumConfidence) {
      console.log('❌ Commit blocked: Unsafe enrichment detected.');
      console.log('   Review data/imports/generated/enrichment-warnings.md\n');
      process.exit(1);
    }

    const result = await commitEnrichment(enrichedData);
    console.log(`📊 Summary: ${result.updateCount} updated, ${result.skipCount} skipped\n`);
  } else {
    console.log('✅ DRY-RUN COMPLETE');
    console.log('   Review data/imports/generated/enrichment-report.md');
    console.log('   Then run: node scripts/enrich-course-offerings.js --commit\n');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
