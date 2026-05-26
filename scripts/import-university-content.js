#!/usr/bin/env node

/**
 * University Content Importer for Horizons
 *
 * Parses pasted university content (fee schedules, course listings, etc.)
 * and imports them into Firestore with intelligent duplicate detection.
 *
 * Usage:
 *   node scripts/import-university-content.js --input data/imports/raw-university-content.txt --dry-run
 *   node scripts/import-university-content.js --input data/imports/raw-university-content.txt --commit
 */

const fs = require('fs');
const path = require('path');

// Course matching module
const { matchCourse, generateCanonicalKey, normalizeCourseName } = require('./lib/course-matching');

// Firebase Admin SDK
let admin;
let db;
try {
  admin = require('firebase-admin');
} catch (e) {
  // Firebase Admin SDK not installed yet
}

// ============================================
// CONFIGURATION
// ============================================

const COURSE_LEVELS = [
  'Foundation',
  'Certificate',
  'Diploma',
  'Bachelor',
  'Master',
  'PhD',
  'English',
  'Pre-University',
  'Professional'
];

const COURSE_CATEGORIES = [
  'Business',
  'Computing & IT',
  'Engineering',
  'Health Sciences',
  'Biotechnology',
  'Mass Communication',
  'Art & Design',
  'Hospitality',
  'Psychology',
  'American Degree Transfer Program',
  'Pre-University',
  'Education',
  'Finance',
  'Data Science',
  'Other'
];

const INTAKE_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const INTAKE_MONTH_ALIASES = {
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

const DEFAULT_CURRENCY = 'MYR';
const DEFAULT_OFFER_LETTER_FREE = false;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function normalizeText(text) {
  if (!text) return '';
  return String(text).trim();
}

function normalizeIntakeMonth(month) {
  const m = normalizeText(month).toLowerCase();
  return INTAKE_MONTH_ALIASES[m] || INTAKE_MONTHS.find(im => im.toLowerCase() === m) || null;
}

function parseIntakeMonths(intakeStr) {
  if (!intakeStr) return [];

  const months = normalizeText(intakeStr)
    .split(/[,|\/]/)
    .map(m => normalizeIntakeMonth(m))
    .filter(m => m !== null);

  // Remove duplicates and sort in calendar order
  const unique = [...new Set(months)];
  return unique.sort((a, b) => INTAKE_MONTHS.indexOf(a) - INTAKE_MONTHS.indexOf(b));
}

function parseIntakeDuration(text) {
  if (!text) return { years: null, months: null, text: '' };

  const text_normalized = normalizeText(text);

  // Match patterns like "3 years", "1.5 years", "2.5 years", etc.
  const yearsMatch = text_normalized.match(/(\d+(?:\.\d+)?)\s*years?/i);
  const monthsMatch = text_normalized.match(/(\d+)\s*months?/i);
  const weeksMatch = text_normalized.match(/(\d+)\s*weeks?/i);

  let years = null;
  let months = null;

  if (yearsMatch) {
    years = parseFloat(yearsMatch[1]);
  }
  if (monthsMatch) {
    months = parseInt(monthsMatch[1], 10);
  }
  if (weeksMatch && !monthsMatch) {
    // Convert weeks to months (rough estimate: 1 month = 4.33 weeks)
    months = Math.round(parseInt(weeksMatch[1], 10) / 4.33);
  }

  return {
    years: years,
    months: months,
    text: text_normalized
  };
}

function normalizeFee(feeStr) {
  if (!feeStr) return null;
  const cleaned = String(feeStr).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isFinite(parsed) ? Math.round(parsed) : null;
}

function inferCourseLevel(courseName) {
  const name = normalizeText(courseName).toLowerCase();

  // Check for explicit level indicators
  if (name.includes('foundation')) return 'Foundation';
  if (name.includes('certificate')) return 'Certificate';
  if (name.includes('diploma')) return 'Diploma';
  if (name.includes('intensive english') || name.includes('english program') || name.includes('english programme') ||
      name.includes('english proficiency') || name.includes('toefl') || name.includes('ielts')) {
    return 'English';
  }
  if (name.includes('a-level') || name.includes('pre-u') || name.includes('pre-university') ||
      name.includes('cambridge a-level') || name.includes('australian degree transfer')) {
    return 'Pre-University';
  }
  if (name.includes('phd') || name.includes('doctor of') || name.includes('doctorate')) return 'PhD';
  if (name.includes('master') || name.includes('msc') || name.includes('mba') || name.includes('ma ')) return 'Master';

  // Bachelor patterns
  if (name.includes('bachelor') || name.includes('bsc') || name.includes('ba ') ||
      name.includes('beng') || name.includes('3+0') || name.includes('4+0')) {
    return 'Bachelor';
  }

  // Professional: used for specific certifications/programmes
  if (name.includes('professional')) return 'Professional';

  // Default to 'Other' instead of empty string
  return 'Other';
}

function inferCourseCategory(courseName, categoryLabel = '') {
  const name = normalizeText(courseName).toLowerCase();
  const label = normalizeText(categoryLabel).toLowerCase();

  // Keyword-based category matching FIRST (takes precedence over section heading)

  // Computing & IT (must be before Business to catch "Financial Informatics", etc.)
  if (/computer|information technology|ict|data science|software|e-commerce|financial informatics|informatics|programmer|coding|web development/.test(name)) {
    return 'Computing & IT';
  }

  // Engineering (mechanical, civil, electrical, etc.)
  if (/engineering|mechanical|civil|electrical|electronic|quantity surveying|construction|manufacturing|digital construction/.test(name)) {
    return 'Engineering';
  }

  // Business
  if (/business|accounting|finance|marketing|management|entrepreneurship|logistics|supply chain|banking|human resource/.test(name)) {
    return 'Business';
  }

  // Mass Communication (before Health Sciences to catch "health communication")
  if (/mass communication|digital media|media|journalism|public relations/.test(name)) {
    return 'Mass Communication';
  }

  // Health Sciences (physiotherapy, nursing, medical, etc.)
  if (/physiotherapy|health|medicine|medical|nursing|chinese medicine|midwifery|dentistry|pharmacy/.test(name)) {
    return 'Health Sciences';
  }

  // Hospitality (must be before Business to catch hotel management)
  if (/hotel|hospitality|culinary|food and beverage|food service|food & beverage/.test(name)) {
    return 'Hospitality';
  }

  // Education
  if (/education|educational|learning design|instructional design|teaching|pedagogy/.test(name)) {
    return 'Education';
  }

  // Biotechnology
  if (/biotechnology|biotech|biology/.test(name)) {
    return 'Biotechnology';
  }

  // Psychology
  if (/psychology/.test(name)) {
    return 'Psychology';
  }

  // Art & Design
  if (/art|design|fashion|interior|graphic|immersive|jewellery|illustration|animation/.test(name)) {
    return 'Art & Design';
  }

  // English / Language
  if (/intensive english|english program|english proficiency|toefl|ielts|english language/.test(name)) {
    return 'English';
  }

  // Foundation / Pre-University
  if (/foundation|a-level|pre-university|pre-u/.test(name)) {
    if (/science/.test(name)) return 'Foundation';
    if (/business/.test(name)) return 'Foundation';
    if (/arts?/.test(name)) return 'Foundation';
    return 'Foundation';
  }

  // Section heading as fallback (lower priority)
  if (label.includes('engineering')) return 'Engineering';
  if (label.includes('computing') || label.includes('it')) return 'Computing & IT';
  if (label.includes('business')) return 'Business';
  if (label.includes('communication')) return 'Mass Communication';
  if (label.includes('hospitality')) return 'Hospitality';
  if (label.includes('psychology')) return 'Psychology';
  if (label.includes('biotechnology')) return 'Biotechnology';
  if (label.includes('health') || label.includes('medical')) return 'Health Sciences';
  if (label.includes('art') || label.includes('design')) return 'Art & Design';

  // Default
  return 'Other';
}

// ============================================
// PARSING FUNCTIONS
// ============================================

function parseMetadata(contentBlock) {
  const lines = contentBlock.split('\n');
  const metadata = {
    UNIVERSITY_NAME: '',
    SHORT_CODE: '',
    LOCATION: '',
    MODE: 'SINGLE_UNIVERSITY_MERGE_CAMPUSES',
    CURRENCY: DEFAULT_CURRENCY,
    OFFER_LETTER_FREE: DEFAULT_OFFER_LETTER_FREE
  };

  let rawContentStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('RAW_CONTENT_START')) {
      rawContentStart = i + 1;
      break;
    }

    if (line.startsWith('UNIVERSITY_NAME:')) {
      metadata.UNIVERSITY_NAME = line.replace('UNIVERSITY_NAME:', '').trim();
    } else if (line.startsWith('SHORT_CODE:')) {
      metadata.SHORT_CODE = line.replace('SHORT_CODE:', '').trim();
    } else if (line.startsWith('LOCATION:')) {
      metadata.LOCATION = line.replace('LOCATION:', '').trim();
    } else if (line.startsWith('MODE:')) {
      metadata.MODE = line.replace('MODE:', '').trim();
    } else if (line.startsWith('CURRENCY:')) {
      metadata.CURRENCY = line.replace('CURRENCY:', '').trim();
    } else if (line.startsWith('OFFER_LETTER_FREE:')) {
      const val = line.replace('OFFER_LETTER_FREE:', '').trim().toLowerCase();
      metadata.OFFER_LETTER_FREE = val === 'true' || val === 'yes' || val === '1';
    }
  }

  let rawContent = '';
  if (rawContentStart > 0) {
    const endIdx = lines.findIndex((line, i) => i >= rawContentStart && line.includes('RAW_CONTENT_END'));
    const endLine = endIdx > rawContentStart ? endIdx : lines.length;
    rawContent = lines.slice(rawContentStart, endLine).join('\n');
  } else {
    // If no markers, treat entire content as raw
    rawContent = contentBlock;
  }

  return { metadata, rawContent };
}

function parseRawContent(rawContent) {
  const lines = rawContent.split('\n');
  const programmes = [];
  const stats = {
    totalLines: 0,
    skippedBlacklist: 0,
    skippedNumbers: 0,
    skippedHeadings: 0,
    skippedPartners: 0,
    skippedInvalid: 0,
    coursesExtracted: 0
  };

  let currentCategory = 'Other';
  let currentIntake = [];

  // Blacklist of known non-course lines (headers, footers, etc.)
  const blacklist = [
    'Program Name', 'Intake', 'Duration', 'Approximate', 'Tuition Fee',
    'INTI INTERNATIONAL', 'INTERNATIONAL STUDENTS',
    'Published', 'Tel:', 'Fax:', 'Email', 'www',
    'Please refer', 'Fee listing', 'Reserve the right', 'The above fees',
    'Payment', 'Bank Details', 'Account No', 'Swift', 'Payable To',
    'Note to', 'Proof of', 'Online payments', 'Change of', 'Application',
    'EMGS', 'Miscellaneous', 'Registration', 'Administration', 'General',
    'Subsequent Year', 'Upon', 'All payments', 'Fees paid', 'The fee',
    'FT:', 'PT:', 'TERMS', 'CONDITIONS', '*Please', '2025 Fee Schedule',
    'Persiaran', 'Jalan', 'Lebuh', 'Malaysia', 'Selangor', 'Negeri',
    'Penang', 'SDN', 'BHD', 'Bank', 'Account', 'Swift', 'Refund',
    'Refund Policy', 'Term', 'Condition', 'Cheque'
  ];

  // Section headings (not courses)
  const sectionHeadings = [
    'Foundation', 'Pre-U & Foundation', 'Business', 'Engineering',
    'Computing IT', 'Computing & IT', 'Communication', 'Mass Communication',
    'Art & Design', 'Psychology', 'Hospitality', 'English',
    'Health Sciences', 'Biotechnology', 'Postgraduate Studies',
    'PHD', 'Intensive English Program', 'American Degree Transfer Program',
    'American Degree Transfer Program (AUP)', 'Postgraduate', 'Professional'
  ];

  // Partner university patterns to reject
  const partnerPatterns = [
    /^Swinburne University/i,
    /^University of Hertfordshire/i,
    /^Sheffield Hallam/i,
    /^Coventry University/i,
    /^SNHU/i,
    /^CY Cergy/i,
    /^Universiti Teknologi Malaysia/i,
    /^,\s*[A-Z]{2,3}$/,  // Standalone country codes like ", AUS"
    /^[A-Z]{2,3}$/  // Just country code
  ];

  function isBlacklisted(text) {
    return blacklist.some(bl => text.includes(bl));
  }

  function isSectionHeading(text) {
    const lower = text.toLowerCase();

    // Exact match against known section headings
    if (sectionHeadings.some(heading => lower === heading.toLowerCase())) {
      return true;
    }

    // Pattern match: Faculty of..., School of... (these DO update currentCategory)
    if (/^(faculty|school|department|institute)\s+(?:of|of\s+)/i.test(text)) {
      return true;
    }

    // Uppercase section headings with commas, ampersands, or multiple capitals
    // Examples: "FOUNDATION STUDIES", "BUSINESS, HOSPITALITY & HUMANITIES", "ENGINEERING, SCIENCE & TECHNOLOGY"
    if (/^[A-Z][A-Z\s,&]+$/.test(text) && text.length > 10) {
      // But exclude pure course names like "Bachelor of Business (Hons)"
      if (!/^[A-Z].*(?:Bachelor|Master|Diploma|Foundation|Certificate|Doctor).*/.test(text)) {
        return true;
      }
    }

    return false;
  }

  function isColumnHeader(text) {
    // Header rows with currency keywords: "Program Total Fees (Ringgit)", etc.
    if (/total\s+fees?\s*\(/i.test(text) && /(ringgit|sgd|usd|gbp|eur|aud|myr|idr)/i.test(text)) {
      return true;
    }

    // Header rows: "Program Total Fees", "Course Fees", "Total Fees", etc.
    if (/^(programme?|course)\s+(total\s+)?fees?/i.test(text)) {
      return true;
    }

    // Column headers: "Programme/Program", "Level", "Intake"
    if (/^(programme?|course|level|intake|duration|fees?|code|credit|semester)s?$/i.test(text)) {
      return true;
    }

    return false;
  }

  function isPartnerFragment(text) {
    return partnerPatterns.some(pattern => pattern.test(text));
  }

  function looksLikeCourse(text) {
    // Should contain actual course keywords, not just section headers
    const courseKeywords = [
      'Foundation', 'Certificate', 'Diploma', 'Bachelor', 'Master',
      'Doctor', 'PhD', 'English', 'A-Level', 'Pre-U', 'Pre-University',
      'Programme', 'Program', 'Engineering', 'Business', 'Science', 'Arts',
      'Medicine', 'Computing', 'Technology', 'Design', 'Management',
      'Communication', 'Studies', 'Information Technology', 'in ', 'of '
    ];

    return courseKeywords.some(kw =>
      text.toLowerCase().includes(kw.toLowerCase())
    );
  }

  for (const line of lines) {
    const trimmed = line.trim();

    stats.totalLines++;

    if (!trimmed || trimmed.length < 5) continue;

    // Skip blacklisted lines
    if (isBlacklisted(trimmed)) {
      stats.skippedBlacklist++;
      continue;
    }

    // Skip pure numbers
    if (trimmed.match(/^[\d.,\s]+$/)) {
      stats.skippedNumbers++;
      continue;
    }

    // Detect section headings (Faculty of..., School of...) - update category and skip
    if (isSectionHeading(trimmed)) {
      currentCategory = trimmed;
      stats.skippedHeadings++;
      continue;
    }

    // Skip column headers without updating category
    if (isColumnHeader(trimmed)) {
      stats.skippedHeadings++;
      continue;
    }

    // Skip partner university fragments
    if (isPartnerFragment(trimmed)) {
      stats.skippedPartners++;
      continue;
    }

    // Look for intake month patterns
    if (trimmed.match(/^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*$/)) {
      const extracted = parseIntakeMonths(trimmed);
      if (extracted.length > 0 && extracted.length < 10) {
        currentIntake = extracted;
        continue;
      }
    }

    // Try to parse as a course row
    if (trimmed.match(/^[A-Z]/) && looksLikeCourse(trimmed)) {
      const programme = extractProgrammeFromLine(trimmed, currentCategory, currentIntake);

      // Only add if we extracted a reasonable course name (no intake fragments, has clear identity)
      if (programme.name && programme.name.length > 8 && !programme.name.match(/^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*$/)) {
        programmes.push(programme);
        stats.coursesExtracted++;
      } else {
        stats.skippedInvalid++;
      }
    } else {
      stats.skippedInvalid++;
    }
  }

  return { programmes, stats };
}

function cleanCourseName(rawName) {
  // Remove intake months and duration fragments from course name
  let cleaned = rawName;

  // Remove leading intake months (Jan, Feb, etc.)
  cleaned = cleaned.replace(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s*/i, '');

  // Remove embedded intake patterns like "Jan, Mar, May, Aug, Oct" (anywhere in line)
  // This regex matches month lists separated by commas
  cleaned = cleaned.replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)(?:,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))*(?:\s|,|$)/gi, ' ');

  // Remove trailing month/intake fragments like "Apr, Aug" at end of line
  cleaned = cleaned.replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)(?:,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December))*\s*$/i, '');

  // Remove FT- PT- patterns
  cleaned = cleaned.replace(/\s+(?:FT|PT)-?\s*/gi, ' ');
  cleaned = cleaned.replace(/\s+(?:FT:|PT:)\s*/gi, ' ');

  // Remove trailing duration patterns like "2 years", "3.5 years", "24 months"
  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s*(?:years?|months?|weeks?|semesters?|level)\s*$/i, '');

  // Remove trailing fee numbers
  cleaned = cleaned.replace(/\s+[\d.,]+\s*$/, '');

  // Preserve "Online Learning" in parentheses
  const hasOnlineLearning = /\(online\s+learning\)/i.test(cleaned);

  // Remove other mode indicators but preserve "Online Learning"
  cleaned = cleaned.replace(/\s*\(online\s+learning\)\s*/i, ' ');
  cleaned = cleaned.replace(/\s*-\s*online\s*learning\s*/i, ' ');
  cleaned = cleaned.replace(/\s+online\s+learning\s*/i, ' ');

  // Remove trailing slashes and dashes that indicate incomplete names
  cleaned = cleaned.replace(/\s*[/\-]\s*$/, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Restore Online Learning indicator if it was present
  if (hasOnlineLearning && !cleaned.includes('Online Learning')) {
    cleaned = cleaned + ' (Online Learning)';
  }

  return cleaned;
}

function extractProgrammeFromLine(line, categoryLabel = '', defaultIntake = []) {
  // Extract course from messy PDF text lines
  // Handles:
  // "Bachelor of Computer Science (Hons)       3 years    78,036"
  // "Diploma in Business           19,948"
  // "Diploma in Business Jan, Mar, May, Aug, Oct FT- 2 years 19,448"
  // "Apr, Aug 42,986 Diploma in Financial Informatics" (intake/fee at start)
  // "Master in Business Administration 40,208" (no duration on same line)

  const programme = {
    name: '',
    level: '',
    category: '',
    duration: '',
    durationYears: null,
    fee: null,
    currency: DEFAULT_CURRENCY,
    intake: defaultIntake.length > 0 ? [...defaultIntake] : [],
    notes: line
  };

  let workingLine = line.trim();

  // Remove leading intake months (may appear at start like "Apr, Aug 42,986 Diploma in...")
  const leadingIntakeMatch = workingLine.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))*\s*,?\s*/i);
  if (leadingIntakeMatch) {
    const extracted = parseIntakeMonths(leadingIntakeMatch[0]);
    if (extracted.length > 0) {
      programme.intake = extracted;
    }
    workingLine = workingLine.substring(leadingIntakeMatch[0].length).trim();
  }

  // Extract leading fee number (may appear after intake like "Apr, Aug 42,986 Diploma...")
  const leadingFeeMatch = workingLine.match(/^([\d.,]+)\s+/);
  if (leadingFeeMatch) {
    programme.fee = normalizeFee(leadingFeeMatch[1]);
    workingLine = workingLine.substring(leadingFeeMatch[0].length).trim();
  }

  // Extract intake months if embedded in line
  const intakeMatch = workingLine.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))*\b/i);
  if (intakeMatch && programme.intake.length === 0) {
    const extracted = parseIntakeMonths(intakeMatch[0]);
    if (extracted.length > 0) {
      programme.intake = extracted;
    }
  }

  // Extract any trailing fee number
  const trailingFeeMatch = workingLine.match(/([\d.,]+)\s*$/);
  if (trailingFeeMatch && !programme.fee) {
    programme.fee = normalizeFee(trailingFeeMatch[1]);
    workingLine = workingLine.substring(0, trailingFeeMatch.index).trim();
  }

  // Extract duration info if it appears at the end
  const durationMatch = workingLine.match(/(\d+(?:\.\d+)?)\s*(?:years?|months?|weeks?|level)\s*$/i);
  if (durationMatch) {
    const durationText = durationMatch[0];
    programme.duration = durationText;
    const parsed = parseIntakeDuration(durationText);
    programme.durationYears = parsed.years;
    workingLine = workingLine.substring(0, durationMatch.index).trim();
  }

  // Clean course name of intake and duration fragments
  programme.name = cleanCourseName(workingLine).trim();

  if (!programme.name || programme.name.length < 3) {
    return programme;
  }

  programme.level = inferCourseLevel(programme.name);
  programme.category = inferCourseCategory(programme.name, categoryLabel);

  return programme;
}

// ============================================
// MAIN IMPORTER CLASS
// ============================================

class UniversityImporter {
  constructor(options = {}) {
    this.dryRun = options.dryRun !== false;
    this.overwriteContent = options.overwriteContent || false;
    this.warnings = [];
    this.errors = [];
    this.summary = {
      universityAction: 'none',
      globalCoursesCreated: 0,
      globalCoursesReused: 0,
      offeringsCreated: 0,
      offeringsUpdated: 0,
      offeringsSkipped: 0
    };
  }

  addWarning(msg) {
    this.warnings.push(msg);
    console.warn('⚠️  WARNING:', msg);
  }

  addError(msg) {
    this.errors.push(msg);
    console.error('❌ ERROR:', msg);
  }

  // Generate next available order number
  getNextUniversityOrder(existingUniversities) {
    if (!existingUniversities || existingUniversities.length === 0) return 1;
    const maxOrder = Math.max(...existingUniversities.map(u => u.order || 0));
    return maxOrder + 1;
  }

  // Generate short code from university name
  generateShortCode(universityName) {
    if (!universityName) return 'UNI';
    return universityName
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 10);
  }

  // Generate asset paths
  getLogoPath(shortCode) {
    return `assets/logos/${shortCode.toLowerCase()}-logo.png`;
  }

  getUniversityImagePath(shortCode) {
    return `assets/universities/${shortCode.toLowerCase()}-campus.jpg`;
  }

  getCourseImagePath(courseId) {
    return `assets/courses/${courseId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`;
  }

  // Generate university content (intro, aboutContent, faqs)
  generateIntro(universityName, location, categories) {
    const categoryStr = categories.slice(0, 3).join(', ');
    return `${universityName} offers international programmes across ${categoryStr} and more.`;
  }

  generateAboutContent(universityName, location, courses, intakeMonths) {
    const uniqueCategories = [...new Set(courses.map(c => c.category))];
    const levels = [...new Set(courses.map(c => c.level).filter(Boolean))];

    let about = `${universityName} is a higher education institution offering a comprehensive range of programmes for international students.`;

    if (location) {
      about += ` Based in ${location}, the university provides educational pathways`;
    } else {
      about += ` The university provides educational pathways`;
    }

    if (uniqueCategories.length > 0) {
      about += ` across ${uniqueCategories.join(', ')}.`;
    } else {
      about += ` across multiple disciplines.`;
    }

    if (levels.length > 0) {
      about += `\n\nStudents can choose from ${levels.join(', ')} level programmes.`;
    }

    about += ` The university maintains multiple intake periods throughout the year to accommodate diverse student schedules and academic requirements.`;

    return about;
  }

  generateFaqs() {
    return [
      "What programmes are available? The university offers programmes across multiple disciplines and levels, including foundation, diploma, bachelor's, postgraduate, and doctoral programmes.",
      "What are the intake months? Intake months vary by programme and are listed in the university profile.",
      "What is the typical programme duration? Durations vary from 1-5 years depending on the level and programme selected.",
      "Are international students supported? Yes, the university welcomes international students and provides relevant support services.",
      "How do I apply? Contact the university directly through the provided contact information or the agency for guidance on the application process."
    ];
  }

  // Normalize and match university by name and shortCode
  findExistingUniversity(name, shortCode, universities = []) {
    if (!name) return null;

    const normalizedNewName = normalizeCourseName(name);
    const normalizedNewCode = String(shortCode || '').toUpperCase();

    // Try exact code match first
    if (normalizedNewCode) {
      const byCode = universities.find(u =>
        String(u.shortCode || '').toUpperCase() === normalizedNewCode
      );
      if (byCode) return byCode;
    }

    // Try normalized name match
    const byName = universities.find(u =>
      normalizeCourseName(u.name || '') === normalizedNewName
    );

    return byName || null;
  }

  // Find existing course using canonical matching
  findExistingCourse(name, level, courses = []) {
    if (!name || !courses || courses.length === 0) return null;

    // Use canonical matching system
    const importedCourse = { name, level };
    const matchResult = matchCourse(importedCourse, courses, {
      allowAliases: true,
      allowFuzzy: true,
      fuzzyThreshold: 0.90,        // High threshold for auto-reuse
      reviewThreshold: 0.75         // Medium threshold for review-required
    });

    if (matchResult.decision === 'AUTO_REUSE' && matchResult.matchedCourse) {
      return {
        ...matchResult.matchedCourse,
        _matchingMethod: matchResult.reason,
        _confidence: matchResult.confidence
      };
    } else if (matchResult.decision === 'REVIEW_REQUIRED') {
      // Medium confidence match - flag for review but don't reuse
      return null;
    }

    return null;
  }

  // Build university document
  buildUniversityDocument(metadata, courses, existingUniversities = []) {
    const name = normalizeText(metadata.UNIVERSITY_NAME);
    const shortCode = metadata.SHORT_CODE || this.generateShortCode(name);
    const location = normalizeText(metadata.LOCATION) || '';

    const intakeMonths = [...new Set(courses.flatMap(c => c.intake || []))];
    const uniqueCategories = [...new Set(courses.map(c => c.category))];

    // Calculate next intake date
    let nextIntakeDate = '';
    if (intakeMonths.length > 0) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // Find next intake month
      const monthIndices = intakeMonths.map(m => INTAKE_MONTHS.indexOf(m) + 1);
      const nextMonth = monthIndices.find(m => m > currentMonth) || monthIndices[0];
      const intakeYear = nextMonth > currentMonth ? currentYear : currentYear + 1;

      nextIntakeDate = `${intakeYear}-${String(nextMonth).padStart(2, '0')}-01`;
    }

    return {
      name,
      shortCode: String(shortCode).toUpperCase(),
      location,
      intro: this.generateIntro(name, location, uniqueCategories),
      aboutContent: this.generateAboutContent(name, location, courses, intakeMonths),
      logo: this.getUniversityImagePath(shortCode),
      image: this.getUniversityImagePath(shortCode),
      youtubeVideo: '',
      nextIntakeDate,
      intakeMonths: intakeMonths.sort((a, b) => INTAKE_MONTHS.indexOf(a) - INTAKE_MONTHS.indexOf(b)),
      offerLetterFree: metadata.OFFER_LETTER_FREE || false,
      faqs: this.generateFaqs(),
      ranking: '',
      active: true,
      order: this.getNextUniversityOrder(existingUniversities)
    };
  }

  // Generate stable courseId from FULL normalized course name (unique per specialization)
  // Preserves meaningful variants like "(Online Learning)" and specializations
  generateStableCourseId(name, level) {
    if (!name) return 'COURSE-' + Date.now();

    // Start with the course name
    let courseSlug = name;

    // Normalize: lowercase, remove extra spaces, replace parentheses with hyphens
    courseSlug = courseSlug
      .toLowerCase()
      .replace(/\(([^)]+)\)/g, '-$1') // Replace (text) with -text
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except space and dash
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

    // Create slug from level (uppercase)
    const levelSlug = (level || 'unknown')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .toUpperCase();

    // Check if course slug starts with level word to avoid duplication
    const levelFirstWord = levelSlug.split('-')[0];
    const courseFirstWord = courseSlug.split('-')[0];

    let finalSlug = courseSlug;
    if (courseFirstWord === levelFirstWord.toLowerCase()) {
      // Remove first word from course slug to avoid duplication
      finalSlug = courseSlug.split('-').slice(1).join('-');
    }

    // Combine and ensure uppercase
    const courseId = (levelSlug + '-' + finalSlug)
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();

    return courseId;
  }

  // Build course document
  buildCourseDocument(programme, courseIndex) {
    const name = normalizeText(programme.name);
    const level = programme.level || '';
    const category = programme.category || 'Other';

    // Generate stable courseId
    const courseId = this.generateStableCourseId(name, level);

    // Generate better description
    let description = `${level} level programme`;
    if (category && category !== 'Other') {
      description += ` in ${category}`;
    }
    if (programme.duration) {
      description += `. Duration: ${programme.duration}`;
    }
    description += '.';

    return {
      name,
      courseId,
      level,
      category,
      basePrice: programme.fee || 0,
      baseCurrency: programme.currency || DEFAULT_CURRENCY,
      baseDurationYears: programme.durationYears || 0,
      duration: programme.duration || '',
      totalSemesters: 0,
      credits: 0,
      image: this.getCourseImagePath(courseId),
      description: description,
      active: true
    };
  }

  // Build courseOffering document
  buildCourseOfferingDocument(universityId, universityName, courseId, course, programme) {
    const durationYears = programme.durationYears || 0;
    const durationMonths = durationYears ? Math.round(durationYears * 12) : 0;

    return {
      universityId,
      universityName,
      courseId,
      courseName: course.name,
      courseLevel: course.level || '',
      courseCategory: course.category || '',
      tuitionFee: programme.fee || 0,
      tuitionCurrency: programme.currency || DEFAULT_CURRENCY,
      durationYears: durationYears,
      durationMonths: durationMonths,
      durationText: programme.duration || '',
      intakeMonths: programme.intake && programme.intake.length > 0 ? programme.intake : [],
      nextIntakeDate: '',
      semesters: '',
      active: true
    };
  }

  // Main import function
  async importUniversity(rawContentBlock, existingUniversities = [], existingCourses = []) {
    console.log('\n🔍 Parsing university content...\n');

    const { metadata, rawContent } = parseMetadata(rawContentBlock);

    console.log('📋 Metadata detected:');
    console.log('  University Name:', metadata.UNIVERSITY_NAME || '(not provided)');
    console.log('  Short Code:', metadata.SHORT_CODE || '(will be generated)');
    console.log('  Location:', metadata.LOCATION || '(not provided)');
    console.log('  Mode:', metadata.MODE);
    console.log('  Currency:', metadata.CURRENCY);

    // Parse raw content to extract programmes
    const parseResult = parseRawContent(rawContent);
    const programmes = parseResult.programmes;
    const parseStats = parseResult.stats;

    if (programmes.length === 0) {
      this.addError('No programmes could be parsed from the raw content.');
      return null;
    }

    console.log(`\n✅ Found ${programmes.length} programme rows`);
    console.log(`   Skipped: ${parseStats.skippedHeadings} headings, ${parseStats.skippedPartners} partner fragments, ${parseStats.skippedBlacklist} blacklist, ${parseStats.skippedInvalid} invalid\n`);

    // Validate university name
    if (!metadata.UNIVERSITY_NAME) {
      this.addError('UNIVERSITY_NAME is required. Add it to the content header or provide --university-name flag.');
      return null;
    }

    // Build university document
    const universityDoc = this.buildUniversityDocument(metadata, programmes, existingUniversities);

    // Check if university already exists
    const existingUni = this.findExistingUniversity(
      universityDoc.name,
      universityDoc.shortCode,
      existingUniversities
    );

    if (existingUni) {
      this.summary.universityAction = 'update';
      console.log(`📝 Will UPDATE existing university: ${existingUni.name}`);
    } else {
      this.summary.universityAction = 'create';
      console.log(`🆕 Will CREATE new university: ${universityDoc.name}`);
    }

    // Deduplicate programmes by normalized name + level within this import
    const deduplicatedProgrammes = [];
    const seenCourses = new Map(); // key: normalized name + level

    for (const programme of programmes) {
      const courseKey = normalizeCourseName(programme.name) + '|' + (programme.level || 'Unknown').toLowerCase();

      if (!seenCourses.has(courseKey)) {
        seenCourses.set(courseKey, programme);
        deduplicatedProgrammes.push(programme);
      }
      // Skip duplicate within this import (but track it for statistics)
    }

    const duplicatesCount = programmes.length - deduplicatedProgrammes.length;
    if (duplicatesCount > 0) {
      console.log(`⚠️  Deduplicated ${duplicatesCount} duplicate courses within this import\n`);
    }

    // Process courses and offerings
    const coursesToCreate = [];
    const coursesToReuse = [];
    const offerings = [];

    for (let i = 0; i < deduplicatedProgrammes.length; i++) {
      const programme = deduplicatedProgrammes[i];

      // Find or create course
      const existingCourse = this.findExistingCourse(
        programme.name,
        programme.level,
        existingCourses
      );

      let courseDoc;
      if (existingCourse) {
        courseDoc = existingCourse;
        coursesToReuse.push(existingCourse);
        this.summary.globalCoursesReused++;
      } else {
        courseDoc = this.buildCourseDocument(programme, i + 1);
        coursesToCreate.push(courseDoc);
        this.summary.globalCoursesCreated++;
      }

      // Create offering
      const offering = this.buildCourseOfferingDocument(
        existingUni ? existingUni.id : 'NEW_UNIVERSITY_ID',
        universityDoc.name,
        courseDoc.courseId || courseDoc.id,
        courseDoc,
        programme
      );

      offerings.push({
        programme,
        course: courseDoc,
        offering,
        isNewCourse: !existingCourse
      });

      this.summary.offeringsCreated++;
    }

    return {
      universityDoc,
      existingUni,
      coursesToCreate,
      coursesToReuse,
      offerings,
      programmes,
      metadata
    };
  }

  // Validate generated courses for critical data quality issues
  validateGeneratedCourses(courses) {
    const issues = [];
    const badRows = [];
    const commitBlockers = {
      duplicateCourseIds: [],
      emptyLevels: [],
      trailingIntakeFrag: [],
      incompleteName: [],
      dupLevelPrefix: [],
      unknownPartner: [],
      sectionHeadingRow: []
    };

    // Check for duplicate courseIds (different courses with same ID)
    const courseIdMap = {};
    for (const course of courses) {
      const id = course.courseId || '';
      if (!courseIdMap[id]) {
        courseIdMap[id] = [];
      }
      courseIdMap[id].push(course.name);
    }

    for (const [id, names] of Object.entries(courseIdMap)) {
      if (names.length > 1) {
        commitBlockers.duplicateCourseIds.push({
          courseId: id,
          courses: names,
          issue: `Multiple different courses share courseId: ${names.join(', ')}`
        });
      }
    }

    for (const course of courses) {
      const name = course.name || '';
      const level = course.level || '';
      const id = course.courseId || '';

      // Check for section headings that became courses
      const sectionHeadings = ['Foundation', 'Business', 'Engineering', 'Computing IT', 'Computing & IT',
        'Communication', 'Mass Communication', 'Art & Design', 'Psychology', 'Hospitality', 'English',
        'Health Sciences', 'Biotechnology', 'Postgraduate Studies', 'PHD', 'Intensive English Program',
        'American Degree Transfer Program'];

      if (sectionHeadings.some(heading => name.toLowerCase() === heading.toLowerCase())) {
        badRows.push({ course: name, reason: 'is section heading, not course' });
        commitBlockers.sectionHeadingRow.push(name);
      }

      // Check for empty level
      if (!level || level.length === 0 || level === '') {
        commitBlockers.emptyLevels.push(name);
        issues.push(`Course "${name}" has EMPTY level`);
      }

      // Check for trailing intake month fragments
      if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s*$/i.test(name)) {
        commitBlockers.trailingIntakeFrag.push(name);
        badRows.push({ course: name, reason: 'ends with intake month fragment' });
      }

      // Check for incomplete names ending with slash or dash
      if (/[/\-]\s*$/.test(name)) {
        commitBlockers.incompleteName.push(name);
        badRows.push({ course: name, reason: 'ends with incomplete slash/dash' });
      }

      // Check for duplicate level prefix in courseId (e.g., "foundation-foundation")
      const levelStr = level.toLowerCase().replace(/\s+/g, '-');
      const firstWord = id.split('-')[1];
      if (firstWord && firstWord === levelStr.split('-')[0]) {
        commitBlockers.dupLevelPrefix.push({ courseId: id, name });
        issues.push(`courseId has duplicate level prefix: ${id}`);
      }

      // Check for partner university fragments
      if (/^(Swinburne|University of|Sheffield|Coventry|SNHU|CY Cergy)/i.test(name)) {
        badRows.push({ course: name, reason: 'is partner university fragment' });
        commitBlockers.unknownPartner.push(name);
      }

      // Check for pure country codes
      if (/^[A-Z]{2,3}$/.test(name)) {
        badRows.push({ course: name, reason: 'is country code' });
      }

      // Check for courses starting with intake months
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(name)) {
        badRows.push({ course: name, reason: 'starts with intake month' });
      }

      // Check for suspicious keywords in name
      if (/bank|payment|refund|account|swift|terms|condition|admin|application fee/i.test(name)) {
        badRows.push({ course: name, reason: 'contains non-course keywords' });
      }
    }

    return { badRows, issues, commitBlockers };
  }

  // Generate report
  generateReport(importResult) {
    if (!importResult) {
      return {
        universities: [],
        courses: [],
        offerings: [],
        warnings: this.warnings,
        errors: this.errors
      };
    }

    const validation = this.validateGeneratedCourses(importResult.coursesToCreate);

    return {
      universityAction: this.summary.universityAction,
      university: {
        action: this.summary.universityAction,
        doc: importResult.universityDoc,
        existing: importResult.existingUni
      },
      courses: {
        created: importResult.coursesToCreate,
        reused: importResult.coursesToReuse,
        total: importResult.coursesToCreate.length + importResult.coursesToReuse.length
      },
      offerings: {
        total: importResult.offerings.length,
        created: this.summary.offeringsCreated,
        updated: this.summary.offeringsUpdated,
        skipped: this.summary.offeringsSkipped
      },
      programmes: importResult.programmes.length,
      validation: validation,
      summary: this.summary,
      warnings: this.warnings,
      errors: this.errors
    };
  }
}

// ============================================
// FIREBASE INTEGRATION
// ============================================

async function initializeFirebase() {
  if (!admin) {
    console.error('❌ Firebase Admin SDK not installed.');
    console.error('Install with: npm install firebase-admin');
    process.exit(1);
  }

  try {
    // Check if Firebase Admin is already initialized
    if (admin.apps.length === 0) {
      // Try to load service account from environment or file
      let serviceAccount;

      // Try multiple paths for service account key
      const possiblePaths = [
        path.join(process.cwd(), 'serviceAccountKey.json'),
        path.join(process.cwd(), '.firebase', 'serviceAccountKey.json'),
        path.join(process.cwd(), 'firebase', 'serviceAccountKey.json'),
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
      ].filter(Boolean);

      for (const tryPath of possiblePaths) {
        if (tryPath && fs.existsSync(tryPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(tryPath, 'utf8'));
          console.log(`✅ Loaded service account from: ${tryPath}`);
          break;
        }
      }

      if (!serviceAccount) {
        // Try to use GOOGLE_APPLICATION_CREDENTIALS environment variable
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
          if (fs.existsSync(envPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(envPath, 'utf8'));
            console.log(`✅ Loaded service account from GOOGLE_APPLICATION_CREDENTIALS`);
          }
        }
      }

      if (!serviceAccount) {
        throw new Error(
          'Firebase service account key not found.\n\n' +
          'To fix:\n' +
          '1. Download your service account key from Firebase Console:\n' +
          '   Project Settings → Service Accounts → Generate New Private Key\n' +
          '2. Save it as: serviceAccountKey.json (in project root)\n' +
          '3. OR set GOOGLE_APPLICATION_CREDENTIALS environment variable\n'
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      console.log(`✅ Firebase initialized for project: ${serviceAccount.project_id}\n`);
    }

    db = admin.firestore();
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

async function findExistingUniversity(name, shortCode) {
  if (!name) return null;

  const normalizedName = normalizeCourseName(name);
  const normalizedCode = String(shortCode || '').toUpperCase();

  try {
    // Try code match first
    if (normalizedCode) {
      const codeSnapshot = await db.collection('universities')
        .where('shortCode', '==', normalizedCode)
        .limit(1)
        .get();

      if (!codeSnapshot.empty) {
        return { id: codeSnapshot.docs[0].id, data: codeSnapshot.docs[0].data() };
      }
    }

    // Try name match
    const nameSnapshot = await db.collection('universities').get();
    for (const doc of nameSnapshot.docs) {
      const docData = doc.data();
      if (normalizeCourseName(docData.name || '') === normalizedName) {
        return { id: doc.id, data: docData };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding existing university:', error.message);
    return null;
  }
}

async function findExistingCourse(name, level) {
  if (!name) return null;

  try {
    const snapshot = await db.collection('courses').get();
    const existingCourses = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      level: doc.data().level,
      category: doc.data().category,
      ...doc.data()
    }));

    // Use canonical matching system
    const importedCourse = { name, level };
    const matchResult = matchCourse(importedCourse, existingCourses, {
      allowAliases: true,
      allowFuzzy: true,
      fuzzyThreshold: 0.90,        // High threshold for auto-reuse
      reviewThreshold: 0.75         // Medium threshold for review-required
    });

    if (matchResult.decision === 'AUTO_REUSE' && matchResult.matchedCourse) {
      return {
        id: matchResult.matchedCourse.id,
        data: matchResult.matchedCourse,
        matchingMethod: matchResult.reason,
        confidence: matchResult.confidence
      };
    } else if (matchResult.decision === 'REVIEW_REQUIRED') {
      // Medium confidence match - flag for review
      return {
        id: null,
        data: null,
        matchingMethod: 'REVIEW_REQUIRED',
        reason: matchResult.reason,
        confidence: matchResult.confidence,
        candidate: matchResult.matchedCourse
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding existing course:', error.message);
    return null;
  }
}

async function findExistingOffering(universityId, courseId) {
  try {
    const snapshot = await db.collection('courseOfferings')
      .where('universityId', '==', universityId)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, data: snapshot.docs[0].data() };
    }

    return null;
  } catch (error) {
    console.error('Error finding existing offering:', error.message);
    return null;
  }
}

async function createOrUpdateUniversity(universityDoc, existingUni) {
  try {
    const docData = {
      ...universityDoc,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (existingUni) {
      // Update: preserve createdAt
      await db.collection('universities').doc(existingUni.id).update(docData);
      console.log(`  ✏️  Updated university: ${existingUni.id}`);
      return existingUni.id;
    } else {
      // Create: add createdAt
      docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('universities').add(docData);
      console.log(`  ✨ Created university: ${docRef.id}`);
      return docRef.id;
    }
  } catch (error) {
    throw new Error(`Failed to save university: ${error.message}`);
  }
}

async function createOrUpdateCourse(courseDoc, existingCourse) {
  try {
    const docData = {
      ...courseDoc,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (existingCourse) {
      // Update: preserve createdAt
      await db.collection('courses').doc(existingCourse.id).update(docData);
      return { id: existingCourse.id, isNew: false };
    } else {
      // Create: add createdAt
      docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('courses').add(docData);
      return { id: docRef.id, isNew: true };
    }
  } catch (error) {
    throw new Error(`Failed to save course: ${error.message}`);
  }
}

async function createOrUpdateOffering(offeringDoc, existingOffering) {
  try {
    const docData = {
      ...offeringDoc,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (existingOffering) {
      // Update: preserve createdAt
      await db.collection('courseOfferings').doc(existingOffering.id).update(docData);
      return { id: existingOffering.id, isNew: false };
    } else {
      // Create: add createdAt
      docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('courseOfferings').add(docData);
      return { id: docRef.id, isNew: true };
    }
  } catch (error) {
    throw new Error(`Failed to save offering: ${error.message}`);
  }
}

async function commitImport(importResult) {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  console.log('\n📤 Writing to Firestore...\n');

  const stats = {
    universityCreated: false,
    universityId: null,
    coursesCreated: 0,
    coursesReused: 0,
    offeringsCreated: 0,
    offeringsUpdated: 0,
    offeringsSkipped: 0,
    errors: []
  };

  try {
    // 1. Create or update university
    console.log('📍 University:');
    const universityId = await createOrUpdateUniversity(
      importResult.universityDoc,
      importResult.existingUni
    );
    stats.universityId = universityId;
    stats.universityCreated = !importResult.existingUni;

    // 2. Process courses and offerings
    console.log('\n📚 Courses & Offerings:');

    const courseMap = new Map(); // courseId -> courseDocId

    // First pass: create/update all courses
    console.log(`Creating ${importResult.coursesToCreate.length} new courses...`);
    for (let i = 0; i < importResult.coursesToCreate.length; i++) {
      const courseDoc = importResult.coursesToCreate[i];
      try {
        const result = await createOrUpdateCourse(courseDoc, null);
        courseMap.set(courseDoc.courseId, result.id);
        stats.coursesCreated++;
        if ((i + 1) % 25 === 0) {
          console.log(`  ✓ ${i + 1}/${importResult.coursesToCreate.length} courses created`);
        }
      } catch (error) {
        stats.errors.push(`Course ${courseDoc.name}: ${error.message}`);
        console.error(`  ❌ ${courseDoc.name}: ${error.message}`);
      }
    }
    console.log(`  ✓ All ${stats.coursesCreated} courses created`);

    // Reused courses
    console.log(`\nReusing ${importResult.coursesToReuse.length} existing courses...`);
    for (const courseDoc of importResult.coursesToReuse) {
      courseMap.set(courseDoc.courseId, courseDoc.id);
      stats.coursesReused++;
    }
    console.log(`  ✓ Reused ${stats.coursesReused} courses`);

    // Second pass: create/update offerings
    console.log(`\nCreating ${importResult.offerings.length} course offerings...`);
    for (let i = 0; i < importResult.offerings.length; i++) {
      const item = importResult.offerings[i];
      try {
        const courseId = courseMap.get(item.course.courseId || item.course.id);
        if (!courseId) {
          stats.errors.push(`Offering for ${item.programme.name}: No course ID found`);
          stats.offeringsSkipped++;
          continue;
        }

        // Update offering with correct course and university IDs
        item.offering.courseId = courseId;
        item.offering.universityId = universityId;

        const existingOffering = await findExistingOffering(universityId, courseId);

        const result = await createOrUpdateOffering(item.offering, existingOffering);

        if (result.isNew) {
          stats.offeringsCreated++;
        } else {
          stats.offeringsUpdated++;
        }

        if ((i + 1) % 25 === 0) {
          console.log(`  ✓ ${i + 1}/${importResult.offerings.length} offerings processed`);
        }
      } catch (error) {
        stats.errors.push(`Offering for ${item.programme.name}: ${error.message}`);
        console.error(`  ❌ ${item.programme.name}: ${error.message}`);
        stats.offeringsSkipped++;
      }
    }
    console.log(`  ✓ Offerings complete: ${stats.offeringsCreated} created, ${stats.offeringsUpdated} updated`);

    console.log('\n✅ Import completed successfully!\n');

    return stats;
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    throw error;
  }
}

// ============================================
// CLI & FILE I/O
// ============================================

async function main() {
  const args = process.argv.slice(2);

  let inputFile = null;
  let dryRun = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--commit') {
      dryRun = false;
    }
  }

  if (!inputFile) {
    console.error('❌ Usage: node scripts/import-university-content.js --input <file> [--dry-run|--commit]');
    process.exit(1);
  }

  try {
    // Read input file
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }

    const rawContent = fs.readFileSync(inputFile, 'utf8');

    // Create importer
    const importer = new UniversityImporter({ dryRun });

    // Run import (note: this is the dry-run parsing, not actual Firebase writes)
    const result = await importer.importUniversity(rawContent, [], []);

    if (!result) {
      console.error('\n❌ Import failed. See errors above.');
      process.exit(1);
    }

    // Generate output directory
    const outputDir = path.join(path.dirname(inputFile), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write generated files
    const report = importer.generateReport(result);

    fs.writeFileSync(
      path.join(outputDir, 'university.generated.json'),
      JSON.stringify(result.universityDoc, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'courses.generated.json'),
      JSON.stringify(result.coursesToCreate, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'offerings.generated.json'),
      JSON.stringify(result.offerings.map(o => o.offering), null, 2)
    );

    // Generate markdown report
    let reportMd = `# Import Report\n\n`;
    reportMd += `**Mode:** ${dryRun ? 'DRY-RUN' : 'COMMIT'}\n`;
    reportMd += `**Generated:** ${new Date().toISOString()}\n\n`;

    reportMd += `## University\n`;
    reportMd += `- **Action:** ${report.university.action.toUpperCase()}\n`;
    reportMd += `- **Name:** ${result.universityDoc.name}\n`;
    reportMd += `- **Code:** ${result.universityDoc.shortCode}\n`;
    reportMd += `- **Location:** ${result.universityDoc.location || '(not provided)'}\n`;
    reportMd += `- **Intro:** ${result.universityDoc.intro.substring(0, 80)}...\n`;
    reportMd += `- **Intake Months:** ${result.universityDoc.intakeMonths.join(', ')}\n\n`;

    reportMd += `## Parsing Results\n`;
    reportMd += `- **Total Lines:** ${report.programmes}\n`;
    reportMd += `- **Valid Courses Extracted:** ${result.coursesToCreate.length + result.coursesToReuse.length}\n`;
    reportMd += `- **Duplicates Merged:** ${report.programmes - (result.coursesToCreate.length + result.coursesToReuse.length)}\n\n`;

    reportMd += `## Courses\n`;
    reportMd += `- **New Courses Created:** ${result.coursesToCreate.length}\n`;
    reportMd += `- **Existing Courses Reused:** ${result.coursesToReuse.length}\n`;
    reportMd += `- **Total Unique Courses:** ${report.courses.total}\n\n`;

    reportMd += `### Sample New Courses\n`;
    reportMd += `| # | Course Name | Level | Category | Base Price | Duration |\n`;
    reportMd += `|---|---|---|---|---|---|\n`;
    result.coursesToCreate.slice(0, 15).forEach((c, i) => {
      reportMd += `| ${i+1} | ${c.name} | ${c.level} | ${c.category} | ${c.basePrice} ${c.baseCurrency} | ${c.duration} |\n`;
    });
    if (result.coursesToCreate.length > 15) {
      reportMd += `| ... | (${result.coursesToCreate.length - 15} more courses) | | | | |\n`;
    }
    reportMd += '\n';

    reportMd += `## Offerings\n`;
    reportMd += `- **Total Offerings:** ${report.offerings.total}\n`;
    reportMd += `- **New Offerings:** ${report.offerings.created}\n\n`;

    // Add Commit Blockers section
    const blockers = report.validation?.commitBlockers || {};
    const hasAnyBlockers = Object.values(blockers).some(arr => arr.length > 0);

    reportMd += `## ✓ Commit Blockers\n\n`;
    reportMd += `| Check | Status | Count |\n`;
    reportMd += `|---|---|---|\n`;
    reportMd += `| Unique courseIds | ${blockers.duplicateCourseIds?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.duplicateCourseIds?.length || 0} duplicates |\n`;
    reportMd += `| No empty levels | ${blockers.emptyLevels?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.emptyLevels?.length || 0} empty |\n`;
    reportMd += `| No trailing intake | ${blockers.trailingIntakeFrag?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.trailingIntakeFrag?.length || 0} found |\n`;
    reportMd += `| No incomplete names | ${blockers.incompleteName?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.incompleteName?.length || 0} found |\n`;
    reportMd += `| No dup level prefix | ${blockers.dupLevelPrefix?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.dupLevelPrefix?.length || 0} found |\n`;
    reportMd += `| No partner fragments | ${blockers.unknownPartner?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.unknownPartner?.length || 0} found |\n`;
    reportMd += `| No section headings | ${blockers.sectionHeadingRow?.length ? '❌ FAIL' : '✅ PASS'} | ${blockers.sectionHeadingRow?.length || 0} found |\n\n`;

    if (hasAnyBlockers) {
      reportMd += `### ❌ COMMIT BLOCKED - Fix these issues:\n\n`;

      if (blockers.duplicateCourseIds?.length) {
        reportMd += `**Duplicate courseIds** (${blockers.duplicateCourseIds.length}):\n`;
        blockers.duplicateCourseIds.slice(0, 10).forEach(item => {
          reportMd += `- courseId: ${item.courseId}\n`;
          reportMd += `  Courses: ${item.courses.join(', ')}\n`;
        });
        reportMd += '\n';
      }

      if (blockers.emptyLevels?.length) {
        reportMd += `**Empty levels** (${blockers.emptyLevels.length}):\n`;
        blockers.emptyLevels.slice(0, 10).forEach(name => {
          reportMd += `- ${name}\n`;
        });
        reportMd += '\n';
      }

      if (blockers.trailingIntakeFrag?.length) {
        reportMd += `**Trailing intake fragments** (${blockers.trailingIntakeFrag.length}):\n`;
        blockers.trailingIntakeFrag.slice(0, 10).forEach(name => {
          reportMd += `- ${name}\n`;
        });
        reportMd += '\n';
      }

      if (blockers.incompleteName?.length) {
        reportMd += `**Incomplete names (ending with /)** (${blockers.incompleteName.length}):\n`;
        blockers.incompleteName.slice(0, 10).forEach(name => {
          reportMd += `- ${name}\n`;
        });
        reportMd += '\n';
      }
    }

    if (report.validation && report.validation.badRows && report.validation.badRows.length > 0) {
      reportMd += `## ⚠️  Suspicious Rows\n`;
      reportMd += `**Count:** ${report.validation.badRows.length} suspicious courses detected\n\n`;
      reportMd += `| Course | Issue |\n`;
      reportMd += `|---|---|\n`;
      report.validation.badRows.slice(0, 20).forEach(row => {
        reportMd += `| ${row.course} | ${row.reason} |\n`;
      });
      if (report.validation.badRows.length > 20) {
        reportMd += `| ... | (${report.validation.badRows.length - 20} more) |\n`;
      }
      reportMd += '\n';
    }

    if (importer.warnings.length > 0) {
      reportMd += `## Warnings\n`;
      importer.warnings.forEach(w => reportMd += `- ⚠️  ${w}\n`);
      reportMd += '\n';
    }

    if (importer.errors.length > 0) {
      reportMd += `## Errors\n`;
      importer.errors.forEach(e => reportMd += `- ❌ ${e}\n`);
      reportMd += '\n';
    }

    fs.writeFileSync(
      path.join(outputDir, 'import-report.md'),
      reportMd
    );

    console.log(`\n✅ Generated files in: ${outputDir}`);
    console.log(`  - university.generated.json`);
    console.log(`  - courses.generated.json`);
    console.log(`  - offerings.generated.json`);
    console.log(`  - import-report.md`);

    if (dryRun) {
      // Check for suspicious data in dry-run
      if (report.validation && report.validation.badRows && report.validation.badRows.length > 0) {
        console.log(`\n⚠️  WARNING: Generated data contains suspicious course rows:`);
        report.validation.badRows.slice(0, 10).forEach(row => {
          console.log(`   - "${row.course}" (${row.reason})`);
        });
        if (report.validation.badRows.length > 10) {
          console.log(`   ... and ${report.validation.badRows.length - 10} more`);
        }
      }

      console.log(`\n🔍 DRY-RUN COMPLETE. Review generated files and run with --commit to import.`);
    } else {
      // COMMIT MODE: Write to Firebase
      console.log(`\n📤 COMMIT MODE: Validating generated data...\n`);

      // Check for critical commit blockers
      const blockers = report.validation?.commitBlockers || {};
      const hasBlockers = Object.values(blockers).some(arr => arr.length > 0);

      if (hasBlockers) {
        console.error(`\n❌ COMMIT BLOCKED: Critical data quality issues detected:\n`);

        if (blockers.duplicateCourseIds?.length) {
          console.error(`   Duplicate courseIds (${blockers.duplicateCourseIds.length}):`);
          blockers.duplicateCourseIds.forEach(item => {
            console.error(`     - ${item.courseId}: ${item.courses.join(', ')}`);
          });
        }

        if (blockers.emptyLevels?.length) {
          console.error(`   Empty levels (${blockers.emptyLevels.length}): ${blockers.emptyLevels.slice(0,3).join(', ')}${blockers.emptyLevels.length > 3 ? '...' : ''}`);
        }

        if (blockers.trailingIntakeFrag?.length) {
          console.error(`   Trailing intake fragments (${blockers.trailingIntakeFrag.length}): ${blockers.trailingIntakeFrag.slice(0,3).join(', ')}${blockers.trailingIntakeFrag.length > 3 ? '...' : ''}`);
        }

        if (blockers.incompleteName?.length) {
          console.error(`   Incomplete names (${blockers.incompleteName.length}): ${blockers.incompleteName.slice(0,3).join(', ')}${blockers.incompleteName.length > 3 ? '...' : ''}`);
        }

        if (blockers.dupLevelPrefix?.length) {
          console.error(`   Duplicate level prefixes (${blockers.dupLevelPrefix.length})`);
        }

        if (blockers.unknownPartner?.length) {
          console.error(`   Partner fragments (${blockers.unknownPartner.length}): ${blockers.unknownPartner.slice(0,3).join(', ')}${blockers.unknownPartner.length > 3 ? '...' : ''}`);
        }

        if (blockers.sectionHeadingRow?.length) {
          console.error(`   Section headings as courses (${blockers.sectionHeadingRow.length}): ${blockers.sectionHeadingRow.slice(0,3).join(', ')}${blockers.sectionHeadingRow.length > 3 ? '...' : ''}`);
        }

        console.error(`\nRun with --dry-run and review import-report.md to see Commit Blockers section.`);
        console.error(`Fix all issues before retrying commit.\n`);
        process.exit(1);
      }

      // Also block on suspicious rows (non-critical but should be reviewed)
      if (report.validation && report.validation.badRows && report.validation.badRows.length > 0) {
        console.warn(`\n⚠️  WARNING: ${report.validation.badRows.length} suspicious courses found (not blocking commit)\n`);
      }

      console.log(`✅ Data validation PASSED. Writing to Firestore...\n`);

      // Initialize Firebase
      await initializeFirebase();

      // Get existing universities and courses for duplicate detection
      let existingUniversities = [];
      let existingCourses = [];

      try {
        const uniSnapshot = await db.collection('universities').get();
        existingUniversities = uniSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const courseSnapshot = await db.collection('courses').get();
        existingCourses = courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('❌ Failed to fetch existing data from Firestore:', error.message);
        process.exit(1);
      }

      // Re-run import with existing data for proper duplicate detection
      const importer2 = new UniversityImporter({ dryRun: false });
      const result2 = await importer2.importUniversity(rawContent, existingUniversities, existingCourses);

      if (!result2) {
        console.error('\n❌ Import preparation failed.');
        process.exit(1);
      }

      // Commit to Firebase
      try {
        const commitStats = await commitImport(result2);

        // Print final summary
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 IMPORT SUMMARY');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log(`✨ University:`);
        console.log(`   ${commitStats.universityCreated ? '🆕 Created' : '✏️  Updated'}: ${commitStats.universityId}`);

        console.log(`\n📚 Courses:`);
        console.log(`   Created: ${commitStats.coursesCreated}`);
        console.log(`   Reused/Updated: ${commitStats.coursesReused}`);

        console.log(`\n🔗 Offerings:`);
        console.log(`   Created: ${commitStats.offeringsCreated}`);
        console.log(`   Updated: ${commitStats.offeringsUpdated}`);

        if (commitStats.errors.length > 0) {
          console.log(`\n⚠️  Errors (${commitStats.errors.length}):`);
          commitStats.errors.forEach(err => console.log(`   - ${err}`));
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ IMPORT COMPLETE\n');

        process.exit(0);
      } catch (error) {
        console.error('\n❌ Commit failed:', error.message);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
