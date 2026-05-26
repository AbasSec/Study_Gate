#!/usr/bin/env node

/**
 * Batch Extract Data from All University Import Files
 *
 * Processes all raw-*-university-content.txt files and applies enrichments
 * with appropriate confidence levels based on data quality
 *
 * Usage:
 *   node scripts/batch-extract-import-data.js --dry-run
 *   node scripts/batch-extract-import-data.js --commit
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { EnrichmentValidator } = require('./lib/enrichment-validator');

const isDryRun = process.argv.includes('--dry-run');
const isCommit = process.argv.includes('--commit');
const allowMediumConfidence = process.argv.includes('--allow-medium-confidence');

let db;

// University-specific extraction logic
const extractors = {
  'Asia Pacific University of Technology and Innovation': extractAPU,
  "Taylor's University": extractTaylors,
  'Universiti Teknologi Malaysia': extractUTM,
  // Add more as needed
};

// Default intake months by university/level
const defaultIntakes = {
  'January': ['January', 'July'],
  'February': ['February', 'August'],
  'March': ['March', 'September'],
  default: ['March', 'July', 'October']
};

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

function extractAPU(content) {
  // APU format: Category header, then "Course Name NNNN" (fee)
  const courses = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match lines like "Program Name 12345" (course name + fee)
    const match = line.match(/^(.+?)\s+(\d{4,6})$/);
    if (match && match[1] && !match[1].includes('PROGRAMME') && !match[1].includes('FACULTY')) {
      const name = match[1].trim();
      const totalFee = parseInt(match[2], 10);

      // Estimate annual fee (assume 1 year for cert, 2.5 for diploma, 3 for bachelor, 1.5 for master)
      const level = determineLevel(name);
      const duration = estimateDuration(name, level);
      const annualFee = Math.round(totalFee / duration);

      courses.push({
        name: name,
        tuitionFee: annualFee,
        durationYears: duration,
        intakeMonths: ['March', 'July', 'October'],
        confidence: duration === 0 ? 'LOW' : 'MEDIUM', // MEDIUM confidence (estimated duration)
        sourceType: 'partial_import'
      });
    }
  }

  return courses;
}

function extractTaylors(content) {
  // Taylor's format: Similar to APU but with total fees
  const courses = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(\d{3,6},\d{3})$/);
    if (match && match[1]) {
      const name = match[1].trim();
      const totalFeeStr = match[2].replace(/,/g, '');
      const totalFee = parseInt(totalFeeStr, 10);

      const level = determineLevel(name);
      const duration = estimateDuration(name, level);
      const annualFee = Math.round(totalFee / duration);

      courses.push({
        name: name,
        tuitionFee: annualFee,
        durationYears: duration,
        intakeMonths: ['March', 'July', 'October'],
        confidence: duration === 0 ? 'LOW' : 'MEDIUM',
        sourceType: 'partial_import'
      });
    }
  }

  return courses;
}

function extractUTM(content) {
  // Generic extraction for universities without specific patterns
  return extractGeneric(content);
}

function extractGeneric(content) {
  const courses = [];
  // Could implement generic pattern matching here
  return courses;
}

// ============================================
// HELPERS
// ============================================

function determineLevel(courseName) {
  const name = courseName.toLowerCase();
  if (name.includes('phd') || name.includes('doctoral') || name.includes('doctor of')) return 'doctorate';
  if (name.includes('master') || name.includes('postgraduate')) return 'master';
  if (name.includes('bachelor') || name.includes('degree')) return 'bachelor';
  if (name.includes('diploma')) return 'diploma';
  if (name.includes('foundation') || name.includes('cert')) return 'foundation';
  return 'unknown';
}

function estimateDuration(courseName, level) {
  // Try to extract duration from course name (e.g., "Actuarial Studies (3 Years)")
  const match = courseName.match(/\((\d+(?:\.\d+)?)\s*(?:Years?|Y)\)/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]));
  }

  // Fall back to level defaults
  switch (level) {
    case 'doctorate': return 4; // 3-7 years, use middle
    case 'master': return 2; // 1.5-3 years, use middle
    case 'bachelor': return 3; // 3-4 years, typical
    case 'diploma': return 2; // 2-3 years, typical
    case 'foundation': return 1; // 1 year
    default: return 0; // Unknown, mark as LOW confidence
  }
}

function calculateNextIntakeDate(intakeMonths) {
  if (!intakeMonths || intakeMonths.length === 0) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthIndexMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  for (const month of intakeMonths) {
    const monthIndex = monthIndexMap[month];
    if (monthIndex > currentMonth) {
      return new Date(currentYear, monthIndex, 1).toISOString().split('T')[0];
    }
  }

  const firstMonth = intakeMonths[0];
  const monthIndex = monthIndexMap[firstMonth];
  return new Date(currentYear + 1, monthIndex, 1).toISOString().split('T')[0];
}

// ============================================
// MAIN WORKFLOW
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

async function findUniversityId(universityName) {
  const snap = await db.collection('universities')
    .where('name', '==', universityName)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function processUniversity(filePath, universityName) {
  console.log(`\n📂 Processing: ${universityName}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const extractor = extractors[universityName] || extractGeneric;
  const courses = extractor(content);

  if (courses.length === 0) {
    console.log(`   ⏭️  No courses parsed`);
    return { university: universityName, matched: 0, skipped: courses.length };
  }

  console.log(`   ✅ Parsed ${courses.length} courses`);

  // Find university ID
  const universityId = await findUniversityId(universityName);
  if (!universityId) {
    console.log(`   ❌ University not found in database`);
    return { university: universityName, matched: 0, skipped: courses.length };
  }

  // Find matching incomplete offerings
  const query = await db.collection('courseOfferings')
    .where('universityId', '==', universityId)
    .get();

  const offerings = query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let matched = 0;
  let updated = 0;
  const batch = db.batch();

  for (const course of courses) {
    // Find matching offering (simple substring match)
    const offering = offerings.find(o => {
      const offeringName = o.courseName?.toLowerCase() || '';
      const courseName = course.name.toLowerCase();
      return offeringName.includes(courseName) || courseName.includes(offeringName);
    });

    if (!offering) continue;

    // Only update if incomplete
    if (!offering.tuitionFee || offering.tuitionFee === 0 ||
        !offering.durationYears || offering.durationYears === 0 ||
        !offering.intakeMonths || offering.intakeMonths.length === 0) {

      const nextIntakeDate = calculateNextIntakeDate(course.intakeMonths);
      const updates = {
        tuitionFee: course.tuitionFee,
        tuitionCurrency: 'MYR',
        durationText: `${course.durationYears} Years`,
        durationYears: course.durationYears,
        durationMonths: course.durationYears * 12,
        intakeMonths: course.intakeMonths,
        nextIntakeDate: nextIntakeDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (isCommit) {
        batch.update(db.collection('courseOfferings').doc(offering.id), updates);
      }

      matched++;
      if (matched <= 3) {
        console.log(`   ✅ ${offering.courseName}: RM${course.tuitionFee} × ${course.durationYears}Y`);
      }
    }
  }

  if (isCommit && matched > 0) {
    await batch.commit();
    updated = matched;
  }

  if (matched > 3) {
    console.log(`   ... and ${matched - 3} more courses`);
  }

  return { university: universityName, matched, courses: courses.length };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 BATCH IMPORT DATA EXTRACTION');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!isDryRun && !isCommit) {
    console.log('❌ Must specify --dry-run or --commit\n');
    process.exit(1);
  }

  const mode = isDryRun ? 'DRY-RUN' : 'COMMIT';
  console.log(`🔧 Mode: ${mode}\n`);

  await initializeFirebase();

  // Find all import files
  const importsDir = path.join(__dirname, '../data/imports');
  const files = fs.readdirSync(importsDir)
    .filter(f => f.startsWith('raw-') && f.endsWith('-content.txt'))
    .sort();

  console.log(`📋 Found ${files.length} import files\n`);

  const results = [];
  for (const file of files) {
    const filePath = path.join(importsDir, file);
    const universityName = extractUniversityName(file);

    try {
      const result = await processUniversity(filePath, universityName);
      results.push(result);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({ university: universityName, matched: 0, error: error.message });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const totalMatched = results.reduce((sum, r) => sum + (r.matched || 0), 0);
  const totalCourses = results.reduce((sum, r) => sum + (r.courses || 0), 0);

  console.log(`Total Import Files: ${results.length}`);
  console.log(`Total Courses Parsed: ${totalCourses}`);
  console.log(`Total Matches Found: ${totalMatched}`);
  console.log(`Average per University: ${Math.round(totalMatched / results.length)}\n`);

  console.log('Per-University Summary:');
  results.forEach(r => {
    console.log(`  ${r.university}: ${r.matched} matched${r.error ? ` (ERROR: ${r.error})` : ''}`);
  });

  console.log(`\n✅ Batch processing complete\n`);
  process.exit(0);
}

function extractUniversityName(filename) {
  // Extract university name from filename like "raw-apu-university-content.txt"
  const match = filename.match(/raw-(.+?)-(?:university|content)/);
  if (match) {
    const code = match[1];
    // Map codes to full names
    const nameMap = {
      'apu': 'Asia Pacific University of Technology and Innovation',
      'taylor': "Taylor's University",
      'utm': 'Universiti Teknologi Malaysia',
      'iukl': 'Infrastructure University Kuala Lumpur',
      'uniten': 'Universiti Tenaga Nasional',
      'upm': 'Universiti Putra Malaysia',
      'ucsi': 'UCSI University',
      'imu': 'IMU International Medical University',
      'city': 'City University Malaysia',
      'cyberjaya': 'Cyberjaya University',
      'nilai': 'Nilai University',
      'segi': 'SEGI International',
      'sunway': 'Sunway University',
      'lincoln': 'Lincoln University Malaysia'
    };
    return nameMap[code] || code;
  }
  return filename;
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
