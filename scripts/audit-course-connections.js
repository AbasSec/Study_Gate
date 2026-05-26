#!/usr/bin/env node

/**
 * Course Connection Audit
 *
 * Scans existing courses in Firestore to identify duplicates and near-duplicates.
 * Generates a report of courses that should probably be merged or connected.
 *
 * Usage:
 *   node scripts/audit-course-connections.js              # Run audit, no changes
 *   node scripts/audit-course-connections.js --verbose     # Show all matches
 *   node scripts/audit-course-connections.js --plan-merges # Generate merge plan
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { matchCourse, generateCanonicalKey, calculateSimilarity, normalizeCourseName } = require('./lib/course-matching');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const planMerges = args.includes('--plan-merges');

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
    console.log('✅ Firebase initialized');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

// ============================================
// AUDIT FUNCTIONS
// ============================================

async function auditCourses() {
  console.log('\n🔍 Scanning existing courses...\n');

  try {
    const snapshot = await db.collection('courses').get();
    const allCourses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Total courses found: ${allCourses.length}\n`);

    if (allCourses.length === 0) {
      console.log('No courses to audit.\n');
      return;
    }

    // Group by level
    const coursesByLevel = {};
    for (const course of allCourses) {
      const level = course.level || 'Unknown';
      if (!coursesByLevel[level]) {
        coursesByLevel[level] = [];
      }
      coursesByLevel[level].push(course);
    }

    const report = {
      totalCourses: allCourses.length,
      exactDuplicates: [],
      canonicalDuplicates: [],
      highConfidenceMatches: [],
      mediumConfidenceMatches: [],
      potentialMergeGroups: [],
      summary: {}
    };

    // Check for duplicates within each level
    for (const [level, courses] of Object.entries(coursesByLevel)) {
      console.log(`\n📚 ${level} courses (${courses.length}):`);

      // Find exact duplicates
      const seen = {};
      for (const course of courses) {
        const normName = normalizeCourseName(course.name);
        if (seen[normName]) {
          report.exactDuplicates.push({
            courseIds: [course.id, seen[normName].id],
            name: course.name,
            level: course.level
          });
          console.log(`  ⚠️  EXACT DUPLICATE: "${course.name}"`);
        } else {
          seen[normName] = course;
        }
      }

      // Find canonical duplicates
      const canonicalMap = {};
      for (const course of courses) {
        const canonical = generateCanonicalKey(course.name, course.level);
        if (!canonicalMap[canonical]) {
          canonicalMap[canonical] = [];
        }
        canonicalMap[canonical].push(course);
      }

      for (const [canonical, group] of Object.entries(canonicalMap)) {
        if (group.length > 1) {
          report.canonicalDuplicates.push({
            canonical: canonical,
            courseIds: group.map(c => c.id),
            names: group.map(c => c.name),
            level: level
          });

          if (verbose) {
            console.log(`  🔗 CANONICAL GROUP (${canonical}):`);
            for (const course of group) {
              console.log(`     • ${course.name} (${course.id})`);
            }
          }
        }
      }

      // Find high-confidence fuzzy matches
      for (let i = 0; i < courses.length; i++) {
        for (let j = i + 1; j < courses.length; j++) {
          const c1 = courses[i];
          const c2 = courses[j];

          const similarity = calculateSimilarity(c1.name, c2.name);

          if (similarity >= 0.85) {
            report.highConfidenceMatches.push({
              course1: { id: c1.id, name: c1.name },
              course2: { id: c2.id, name: c2.name },
              similarity: similarity,
              level: level
            });

            if (verbose) {
              console.log(`  ✨ HIGH CONFIDENCE MATCH (${(similarity * 100).toFixed(1)}%):`);
              console.log(`     • "${c1.name}" (${c1.id})`);
              console.log(`     • "${c2.name}" (${c2.id})`);
            }
          } else if (similarity >= 0.70) {
            report.mediumConfidenceMatches.push({
              course1: { id: c1.id, name: c1.name },
              course2: { id: c2.id, name: c2.name },
              similarity: similarity,
              level: level
            });

            if (verbose) {
              console.log(`  🤔 MEDIUM CONFIDENCE MATCH (${(similarity * 100).toFixed(1)}%):`);
              console.log(`     • "${c1.name}" (${c1.id})`);
              console.log(`     • "${c2.name}" (${c2.id})`);
            }
          }
        }
      }
    }

    // Summary
    report.summary = {
      exactDuplicateGroups: report.exactDuplicates.length,
      canonicalDuplicateGroups: report.canonicalDuplicates.length,
      highConfidenceMatches: report.highConfidenceMatches.length,
      mediumConfidenceMatches: report.mediumConfidenceMatches.length
    };

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Exact Duplicates: ${report.exactDuplicates.length}`);
    console.log(`Canonical Duplicates: ${report.canonicalDuplicates.length}`);
    console.log(`High Confidence Matches: ${report.highConfidenceMatches.length}`);
    console.log(`Medium Confidence Matches: ${report.mediumConfidenceMatches.length}`);

    // Generate report file
    const reportPath = path.join(__dirname, '../data/imports/generated/course-connection-audit.md');
    generateAuditReport(report, reportPath);

    if (planMerges) {
      generateMergePlan(report, allCourses, db);
    }

    console.log('\n✅ Audit complete');

  } catch (error) {
    console.error('\n❌ Audit failed:', error.message);
    process.exit(1);
  }
}

function generateAuditReport(report, filepath) {
  let content = '# Course Connection Audit Report\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;

  content += '## Summary\n\n';
  content += `- **Exact Duplicates**: ${report.exactDuplicates.length}\n`;
  content += `- **Canonical Duplicates**: ${report.canonicalDuplicates.length}\n`;
  content += `- **High Confidence Matches**: ${report.highConfidenceMatches.length}\n`;
  content += `- **Medium Confidence Matches**: ${report.mediumConfidenceMatches.length}\n\n`;

  if (report.exactDuplicates.length > 0) {
    content += '## Exact Duplicates\n\n';
    content += '| Name | Course IDs |\n';
    content += '|---|---|\n';
    for (const dup of report.exactDuplicates) {
      content += `| ${dup.name} | ${dup.courseIds.join(', ')} |\n`;
    }
    content += '\n';
  }

  if (report.canonicalDuplicates.length > 0) {
    content += '## Canonical Duplicates\n\n';
    content += '| Canonical Key | Names | Course IDs |\n';
    content += '|---|---|---|\n';
    for (const dup of report.canonicalDuplicates) {
      const names = dup.names.join(' | ');
      const ids = dup.courseIds.join(', ');
      content += `| ${dup.canonical} | ${names} | ${ids} |\n`;
    }
    content += '\n';
  }

  if (report.highConfidenceMatches.length > 0) {
    content += '## High Confidence Matches (≥85%)\n\n';
    content += '| Similarity | Course 1 | Course 2 | Level |\n';
    content += '|---|---|---|---|\n';
    for (const match of report.highConfidenceMatches) {
      const sim = (match.similarity * 100).toFixed(1);
      content += `| ${sim}% | ${match.course1.name} (${match.course1.id}) | ${match.course2.name} (${match.course2.id}) | ${match.level} |\n`;
    }
    content += '\n';
  }

  if (report.mediumConfidenceMatches.length > 0) {
    content += '## Medium Confidence Matches (70-84%)\n\n';
    content += '| Similarity | Course 1 | Course 2 | Level |\n';
    content += '|---|---|---|---|\n';
    for (const match of report.mediumConfidenceMatches) {
      const sim = (match.similarity * 100).toFixed(1);
      content += `| ${sim}% | ${match.course1.name} (${match.course1.id}) | ${match.course2.name} (${match.course2.id}) | ${match.level} |\n`;
    }
    content += '\n';
  }

  content += '## Recommendations\n\n';
  content += '- **Exact Duplicates**: Merge immediately - these are clearly the same course\n';
  content += '- **Canonical Duplicates**: Merge - these differ only in non-identity modifiers like (Hons)\n';
  content += '- **High Confidence Matches**: Review and merge if they are the same course\n';
  content += '- **Medium Confidence Matches**: Review carefully - may be different specializations\n\n';

  content += '## Notes\n\n';
  content += '- This audit is read-only and does not make any changes\n';
  content += '- To generate a merge plan, run: `node scripts/audit-course-connections.js --plan-merges`\n';
  content += '- Merges must be approved and executed through a separate merge tool\n';

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`\n📄 Audit report saved to: ${filepath}`);
}

function generateMergePlan(report, allCourses, firestore) {
  // This is a placeholder for now
  // In production, would generate a detailed merge plan with safety checks
  console.log('\n⚠️  Merge plan generation not yet implemented');
  console.log('Merges must be reviewed and approved manually first');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🔧 Course Connection Audit\n');

  await initializeFirebase();
  await auditCourses();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
