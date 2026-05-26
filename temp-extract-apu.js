const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const isDryRun = process.argv.includes('--dry-run');
const isCommit = process.argv.includes('--commit');

let db;

function extractAPU(content) {
  const courses = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(\d{4,6})$/);
    if (match && match[1] && !match[1].includes('PROGRAMME') && !match[1].includes('FACULTY')) {
      const name = match[1].trim();
      const totalFee = parseInt(match[2], 10);

      // Estimate annual fee (foundation: 1Y, diploma: 2.5Y, bachelor: 3Y, master: 1.5Y)
      let duration = 3;
      if (name.toLowerCase().includes('foundation') || name.toLowerCase().includes('cert')) duration = 1;
      if (name.toLowerCase().includes('diploma')) duration = 2.5;
      if (name.toLowerCase().includes('master')) duration = 1.5;

      const annualFee = Math.round(totalFee / duration);

      courses.push({
        name: name,
        tuitionFee: annualFee,
        durationYears: duration,
        durationMonths: Math.round(duration * 12),
        intakeMonths: ['March', 'July', 'October'],
        nextIntakeDate: '2026-07-01'
      });
    }
  }
  return courses;
}

async function main() {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();

  console.log('🔄 Processing APU...\n');

  const content = fs.readFileSync('data/imports/raw-apu-university-content.txt', 'utf8');
  const courses = extractAPU(content);

  const uniSnap = await db.collection('universities').where('name', '==', 'Asia Pacific University of Technology and Innovation').limit(1).get();
  if (uniSnap.empty) { console.error('University not found'); process.exit(1); }
  const universityId = uniSnap.docs[0].id;

  const query = await db.collection('courseOfferings').where('universityId', '==', universityId).get();
  const offerings = query.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let matched = 0;
  const batch = db.batch();

  for (const course of courses) {
    const offering = offerings.find(o => {
      const offeringName = (o.courseName || '').toLowerCase();
      const courseName = course.name.toLowerCase();
      return offeringName.includes(courseName) || courseName.includes(offeringName);
    });

    if (!offering) continue;

    // Only update incomplete offerings
    if (!offering.tuitionFee || offering.tuitionFee === 0 ||
        !offering.durationYears || offering.durationYears === 0 ||
        !offering.intakeMonths || offering.intakeMonths.length === 0) {

      const updates = {
        tuitionFee: course.tuitionFee,
        tuitionCurrency: 'MYR',
        durationText: `${Math.round(course.durationYears * 10) / 10} Years`,
        durationYears: Math.ceil(course.durationYears),
        durationMonths: course.durationMonths,
        intakeMonths: course.intakeMonths,
        nextIntakeDate: course.nextIntakeDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (isCommit) batch.update(db.collection('courseOfferings').doc(offering.id), updates);
      matched++;

      if (matched <= 2) {
        console.log(`✅ ${offering.courseName}: RM${course.tuitionFee}/year (${course.durationYears}Y)`);
      }
    }
  }

  if (matched > 2) console.log(`... and ${matched - 2} more courses`);
  console.log(`\n📊 APU: ${matched} offerings enriched\n`);

  if (isCommit && matched > 0) await batch.commit();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
