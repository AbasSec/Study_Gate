#!/usr/bin/env node

/**
 * Course Offering Data Quality Audit & Cleanup
 *
 * Detects:
 * - Non-course institute/campus/faculty names
 * - Offerings with no real course-level data
 * - Suspicious patterns indicating data quality issues
 *
 * Usage:
 *   node scripts/audit-course-offerings.js --university "Universiti Kuala Lumpur"
 *   node scripts/audit-course-offerings.js --university "Universiti Kuala Lumpur" --plan-cleanup
 *   node scripts/audit-course-offerings.js --execute-cleanup-plan --from-plan <path> [--yes]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const planCleanup = args.includes('--plan-cleanup');
const executeCleanup = args.includes('--execute-cleanup-plan');

let universityFilter = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--university' && i + 1 < args.length && !args[i + 1].startsWith('--')) {
    universityFilter = args[i + 1];
    break;
  }
}

let db;

// Patterns that indicate a row is an institute/campus/faculty name, not a course
const nonCoursePatterns = [
  // Institute/Campus names
  /^UniKL\s+[A-Z]/, // UniKL RCMP, UniKL MIIT, etc.
  /Royal\s+College\s+of/, // Royal College of Medicine Perak
  /Faculty\s+of/, // Faculty of Health
  /School\s+of/, // School of Business
  /Institute\s+of/, // Institute of Technology
  /Department\s+of/, // Department of
  /College\s+of/, // College of Education
  /Centre\s+for/, // Centre for Research
  /Center\s+for/, // Center for Excellence
  /^Business\s+School/, // Business School
  /^Medical\s+School/, // Medical School
  /^Law\s+School/, // Law School
  /^Engineering\s+[A-Z]/, // Engineering Faculty
  /^Science\s+[A-Z]/, // Science Faculty
];

// Course level detection
function detectCourseLevel(courseName) {
  const name = courseName.toLowerCase();

  // Real course levels
  if (name.includes('phd') || name.includes('doctoral') || name.includes('doctor of')) return 'doctorate';
  if (name.includes('master') || name.includes('postgraduate') || name.includes('m.sc') || name.includes('mba')) return 'master';
  if (name.includes('bachelor') || name.includes('b.sc') || name.includes('b.eng') || name.includes('ba ') || name.includes('bcom')) return 'bachelor';
  if (name.includes('diploma')) return 'diploma';
  if (name.includes('certificate') || name.includes('cert ')) return 'certificate';
  if (name.includes('foundation')) return 'foundation';
  if (name.includes('intensive') || name.includes('english')) return 'language_course';

  return null;
}

// Check if name is a non-course institute/campus row
function isNonCourseRow(courseName) {
  for (const pattern of nonCoursePatterns) {
    if (pattern.test(courseName)) {
      return true;
    }
  }
  return false;
}

// Check if offering has any course-relevant data
function hasCourseData(offering) {
  const hasLevel = detectCourseLevel(offering.courseName);
  const hasFee = offering.tuitionFee && offering.tuitionFee > 0;
  const hasDuration = offering.durationYears && offering.durationYears > 0;
  const hasIntake = offering.intakeMonths && Array.isArray(offering.intakeMonths) && offering.intakeMonths.length > 0;

  return hasLevel || hasFee || hasDuration || hasIntake;
}

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

async function auditOfferings() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 COURSE OFFERING DATA QUALITY AUDIT');
  console.log('═══════════════════════════════════════════════════════════\n');

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
      console.log(`📍 Auditing: ${universityFilter} (${universityId})\n`);
      query = query.where('universityId', '==', universityId);
    }

    const snapshot = await query.get();
    const offerings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Total offerings scanned: ${offerings.length}\n`);

    // Categorize offerings
    const categories = {
      nonCourseRows: [],
      incompleteCourses: [],
      completeCourses: [],
      questionableOfferings: []
    };

    for (const offering of offerings) {
      const isNonCourse = isNonCourseRow(offering.courseName || '');
      const level = detectCourseLevel(offering.courseName || '');
      const hasData = hasCourseData(offering);
      const isComplete = offering.tuitionFee && offering.tuitionFee > 0 &&
                        offering.durationYears && offering.durationYears > 0 &&
                        offering.intakeMonths && offering.intakeMonths.length > 0;

      if (isNonCourse && !hasData) {
        categories.nonCourseRows.push({
          id: offering.id,
          name: offering.courseName,
          reason: 'Institute/campus/faculty name, not a course'
        });
      } else if (isComplete) {
        categories.completeCourses.push(offering);
      } else if (level && !isComplete) {
        categories.incompleteCourses.push({
          id: offering.id,
          name: offering.courseName,
          level: level,
          hasFee: offering.tuitionFee && offering.tuitionFee > 0,
          hasDuration: offering.durationYears && offering.durationYears > 0,
          hasIntake: offering.intakeMonths && offering.intakeMonths.length > 0
        });
      } else {
        categories.questionableOfferings.push({
          id: offering.id,
          name: offering.courseName,
          detectedLevel: level,
          hasData: hasData
        });
      }
    }

    // Print summary
    console.log('📋 AUDIT RESULTS\n');
    console.log(`✅ Complete courses: ${categories.completeCourses.length}`);
    console.log(`⚠️  Incomplete courses: ${categories.incompleteCourses.length}`);
    console.log(`🚨 Non-course rows: ${categories.nonCourseRows.length}`);
    console.log(`❓ Questionable offerings: ${categories.questionableOfferings.length}\n`);

    // Print non-course rows
    if (categories.nonCourseRows.length > 0) {
      console.log('🚨 NON-COURSE ROWS DETECTED:');
      console.log('These should NOT be enriched or treated as courses:\n');
      categories.nonCourseRows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Reason: ${row.reason}\n`);
      });
    }

    // Print incomplete courses
    if (categories.incompleteCourses.length > 0 && categories.incompleteCourses.length <= 5) {
      console.log('⚠️  INCOMPLETE REAL COURSES:');
      categories.incompleteCourses.forEach(course => {
        const missing = [];
        if (!course.hasFee) missing.push('fee');
        if (!course.hasDuration) missing.push('duration');
        if (!course.hasIntake) missing.push('intake');
        console.log(`- ${course.name} (${course.level})`);
        console.log(`  Missing: ${missing.join(', ')}`);
      });
      console.log();
    }

    // Generate cleanup plan if requested
    if (planCleanup || executeCleanup) {
      await generateCleanupPlan(categories.nonCourseRows);
    }

    // Summary for enrichment status
    console.log('📊 ENRICHMENT STATUS:');
    console.log(`- Real courses (should enrich): ${categories.completeCourses.length + categories.incompleteCourses.length}`);
    console.log(`- Complete courses (no enrichment needed): ${categories.completeCourses.length}`);
    console.log(`- Incomplete courses (enrichment needed): ${categories.incompleteCourses.length}`);
    console.log(`- Non-course rows (skip in enrichment): ${categories.nonCourseRows.length}\n`);

    if (categories.nonCourseRows.length > 0 && !planCleanup) {
      console.log('💡 Run with --plan-cleanup to generate cleanup plan\n');
    }

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
}

async function generateCleanupPlan(nonCourseRows) {
  console.log('📋 GENERATING CLEANUP PLAN\n');

  const cleanupPlan = {
    generatedAt: new Date().toISOString(),
    totalNonCourseRows: nonCourseRows.length,
    recommendations: nonCourseRows.map(row => ({
      offeringId: row.id,
      courseName: row.name,
      reason: row.reason,
      recommendedAction: 'MARK_INACTIVE',
      severity: 'MEDIUM',
      notes: 'Non-course rows should be marked inactive, not deleted, in case they have dependencies'
    }))
  };

  // Write cleanup plan
  const outputDir = path.join(__dirname, '../data/imports/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const planPath = path.join(outputDir, 'course-offering-cleanup-plan.json');
  fs.writeFileSync(planPath, JSON.stringify(cleanupPlan, null, 2));
  console.log(`✅ Cleanup plan: ${planPath}\n`);

  // Generate markdown report
  const markdownPlan = `# Course Offering Cleanup Plan

**Generated**: ${new Date().toISOString()}

## Summary
- **Non-course rows found**: ${nonCourseRows.length}
- **Recommended action**: MARK_INACTIVE (safe, preserves references)

## Non-Course Rows to Clean Up

${nonCourseRows.map((row, idx) => `
### ${idx + 1}. ${row.name}

- **Offering ID**: \`${row.id}\`
- **Reason**: ${row.reason}
- **Recommended Action**: MARK_INACTIVE
- **Risk Level**: LOW (no course-related data to preserve)

`).join('\n')}

## Implementation

To mark these rows as inactive:

\`\`\`bash
node scripts/audit-course-offerings.js --execute-cleanup-plan --from-plan data/imports/generated/course-offering-cleanup-plan.json --yes
\`\`\`

## Why MARK_INACTIVE Instead of DELETE?

1. **Preserves references**: Applications may reference these offering IDs
2. **Audit trail**: Keeps history of what was cleaned up
3. **Reversible**: Can reactivate if needed
4. **Database integrity**: Avoids foreign key issues

## Verification

After cleanup, run enrichment again:

\`\`\`bash
node scripts/enrich-course-offerings.js --dry-run --university "Universiti Kuala Lumpur"
\`\`\`

Expected result: 0 non-course blockers
`;

  const mdPath = path.join(outputDir, 'course-offering-cleanup-plan.md');
  fs.writeFileSync(mdPath, markdownPlan);
  console.log(`✅ Cleanup report: ${mdPath}\n`);
}

async function executeFromCleanupPlan(planPath, autoConfirm = false) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧹 EXECUTING CLEANUP FROM PLAN');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if plan file exists
  if (!fs.existsSync(planPath)) {
    console.error(`❌ Cleanup plan not found: ${planPath}\n`);
    process.exit(1);
  }

  // Read and parse cleanup plan
  let cleanupPlan;
  try {
    const planContent = fs.readFileSync(planPath, 'utf8');
    cleanupPlan = JSON.parse(planContent);
    console.log(`📂 Plan loaded: ${path.basename(planPath)}`);
    console.log(`📊 Total offerings to update: ${cleanupPlan.recommendations.length}\n`);
  } catch (error) {
    console.error(`❌ Failed to parse cleanup plan: ${error.message}\n`);
    process.exit(1);
  }

  // Display what will be updated
  console.log('📋 OFFERINGS TO MARK INACTIVE:\n');
  cleanupPlan.recommendations.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.courseName}`);
    console.log(`   ID: ${item.offeringId}`);
    console.log(`   Reason: ${item.reason}\n`);
  });

  // Request confirmation unless --yes flag provided
  if (!autoConfirm) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`This will mark ${cleanupPlan.recommendations.length} courseOffering(s) inactive. Continue? (yes/no): `, async (answer) => {
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
          console.log('\n❌ Cleanup cancelled.\n');
          process.exit(0);
        }

        await performCleanup(cleanupPlan);
        resolve();
      });
    });
  } else {
    console.log(`⏭️  AUTO-CONFIRM: Proceeding with cleanup\n`);
    await performCleanup(cleanupPlan);
  }
}

async function performCleanup(cleanupPlan) {
  console.log('💾 APPLYING CLEANUP TO FIRESTORE\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  const batch = db.batch();

  for (const item of cleanupPlan.recommendations) {
    try {
      const docRef = db.collection('courseOfferings').doc(item.offeringId);

      batch.update(docRef, {
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ MARK_INACTIVE: ${item.courseName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ERROR: ${item.courseName} - ${error.message}`);
      errors.push({
        offeringId: item.offeringId,
        error: error.message
      });
      errorCount++;
    }
  }

  // Try to commit batch
  try {
    await batch.commit();
    console.log(`\n✅ CLEANUP COMPLETED\n`);
    console.log(`📊 Results:`);
    console.log(`   Updated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount}`);
      errors.forEach(e => {
        console.log(`   - ${e.offeringId}: ${e.error}`);
      });
    }
    console.log();
  } catch (error) {
    if (error.code === 8 || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.error('\n❌ Quota exceeded. Wait for quota reset, then rerun the same --from-plan command.\n');
      console.log('Command to retry:');
      console.log(`node scripts/audit-course-offerings.js --execute-cleanup-plan --from-plan ${process.argv[4]} --yes\n`);
      process.exit(1);
    } else {
      console.error(`\n❌ Batch commit failed: ${error.message}\n`);
      process.exit(1);
    }
  }
}

async function main() {
  // Check if executing from cleanup plan (direct execution mode)
  const executeFromPlan = args.includes('--execute-cleanup-plan');
  const fromPlanIndex = args.indexOf('--from-plan');
  const autoConfirm = args.includes('--yes');

  if (executeFromPlan && fromPlanIndex >= 0 && fromPlanIndex + 1 < args.length) {
    const planPath = args[fromPlanIndex + 1];
    await initializeFirebase();
    await executeFromCleanupPlan(planPath, autoConfirm);
    process.exit(0);
  }

  // Regular audit mode
  if (!universityFilter) {
    console.log('❌ Usage:\n');
    console.log('Audit mode:');
    console.log('  node scripts/audit-course-offerings.js --university "Name"\n');
    console.log('Cleanup from plan mode:');
    console.log('  node scripts/audit-course-offerings.js --execute-cleanup-plan --from-plan <plan.json> [--yes]\n');
    process.exit(1);
  }

  await initializeFirebase();
  await auditOfferings();
  process.exit(0);
}

main().catch(error => {
  if (error.code === 8 || error.message.includes('RESOURCE_EXHAUSTED')) {
    console.error('\n❌ Quota exceeded. Wait for quota reset, then retry.\n');
  } else {
    console.error('Fatal error:', error.message);
  }
  process.exit(1);
});
