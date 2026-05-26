/**
 * Official Source Searcher
 *
 * Searches for course data from official university sources only.
 * Extracts evidence with confidence scoring.
 *
 * Official sources:
 * - University official websites
 * - Official fee schedules
 * - Official programme pages
 * - Official PDF brochures hosted by the university
 *
 * Rejected sources:
 * - Agency websites
 * - Blogs
 * - Third-party portals
 * - Cached/outdated pages
 */

const UNIVERSITY_DOMAINS = {
  'Universiti Kuala Lumpur': 'unikl.edu.my',
  'UniKL': 'unikl.edu.my',
  'INTI International University': 'newinti.edu.my',
  'INTI': 'newinti.edu.my',
  "Taylor's University": 'taylors.edu.my',
  'Taylors': 'taylors.edu.my',
  'Asia Pacific University': 'apu.edu.my',
  'APU': 'apu.edu.my',
  'Multimedia University': 'mmu.edu.my',
  'MMU': 'mmu.edu.my',
  'International Islamic University': 'iium.edu.my',
  'IIUM': 'iium.edu.my'
};

// Patterns that indicate non-course rows (institutes, campuses, faculties)
const NON_COURSE_PATTERNS = [
  /^UniKL\s+[A-Z]/,
  /Royal\s+College\s+of/,
  /Faculty\s+of/,
  /School\s+of/,
  /Institute\s+of/,
  /Department\s+of/,
  /College\s+of/,
  /Centre\s+for/,
  /Center\s+for/,
  /^Business\s+School/,
  /^Medical\s+School/,
  /^Law\s+School/,
  /^Engineering\s+[A-Z]/,
  /^Science\s+[A-Z]/
];

class EnrichmentSearcher {
  constructor() {
    this.sources = [];
    this.evidence = [];
  }

  /**
   * Check if offering is a non-course row (institute/campus/faculty name)
   */
  isNonCourseRow(courseName) {
    for (const pattern of NON_COURSE_PATTERNS) {
      if (pattern.test(courseName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Search for and extract course data from official sources
   */
  async searchAndExtract(offering) {
    const updates = {};
    const sources = [];
    const blockers = [];

    // Check if this is a non-course row (institute/campus/faculty)
    if (this.isNonCourseRow(offering.courseName)) {
      return {
        found: false,
        updates: {},
        sources: [],
        confidence: 'NON_COURSE_ROW',
        blockers: ['non_course_institute_row'],
        isNonCourse: true
      };
    }

    // Search strategy based on missing fields
    const searchQueries = this.buildSearchQueries(offering);

    console.log(`     Searching ${searchQueries.length} official sources...`);

    // NOTE: In production, this would use WebSearch or WebFetch
    // For now, this is a framework showing how the system would work
    // Real implementation would call: WebSearch, WebFetch, PDF extraction

    // Mark as requiring manual review since we can't access the web directly
    blockers.push('requires_manual_review_no_web_access');

    return {
      found: false,
      updates: {},
      sources: [],
      confidence: 'NO_SOURCE',
      blockers: blockers
    };
  }

  /**
   * Build search queries for the offering
   */
  buildSearchQueries(offering) {
    const queries = [];

    const domain = UNIVERSITY_DOMAINS[offering.universityName];
    const baseQuery = `${offering.universityName} ${offering.courseName} ${offering.courseLevel}`;

    // Fee queries
    if (!offering.tuitionFee || offering.tuitionFee === 0) {
      if (domain) {
        queries.push(`site:${domain} tuition fees international students 2026`);
        queries.push(`site:${domain} "${offering.courseName}" fees`);
        queries.push(`site:${domain} fee schedule undergraduate postgraduate`);
      }
      queries.push(`${baseQuery} international tuition fee 2026`);
      queries.push(`${baseQuery} fees official`);
    }

    // Duration queries
    if (!offering.durationYears || offering.durationYears === 0) {
      if (domain) {
        queries.push(`site:${domain} "${offering.courseName}" duration years`);
      }
      queries.push(`${baseQuery} duration years intake`);
      queries.push(`${baseQuery} study period semesters`);
    }

    // Intake queries
    if (!offering.intakeMonths || offering.intakeMonths.length === 0) {
      if (domain) {
        queries.push(`site:${domain} "${offering.courseName}" intake`);
        queries.push(`site:${domain} admission intake months`);
      }
      queries.push(`${baseQuery} intake dates months`);
    }

    return queries;
  }

  /**
   * Normalize fee (extract number from string)
   */
  normalizeFee(feeStr) {
    if (!feeStr) return null;
    const cleaned = String(feeStr).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isFinite(parsed) ? Math.round(parsed) : null;
  }

  /**
   * Normalize duration (extract years and months)
   */
  normalizeDuration(durationStr) {
    if (!durationStr) return { years: 0, months: 0, text: '' };

    const text = String(durationStr).trim();
    const yearsMatch = text.match(/(\d+(?:\.\d+)?)\s*years?/i);
    const monthsMatch = text.match(/(\d+)\s*months?/i);
    const weeksMatch = text.match(/(\d+)\s*weeks?/i);

    let years = 0;
    let months = 0;

    if (yearsMatch) {
      years = parseFloat(yearsMatch[1]);
      months = Math.round(years * 12);
    }
    if (monthsMatch) {
      months = parseInt(monthsMatch[1], 10);
      if (years === 0) years = Math.round(months / 12);
    }
    if (weeksMatch && !monthsMatch) {
      months = Math.round(parseInt(weeksMatch[1], 10) / 4.33);
      years = Math.round(months / 12);
    }

    return { years, months, text };
  }

  /**
   * Normalize intake months
   */
  normalizeIntakeMonths(intakeStr) {
    if (!intakeStr) return [];

    const MONTH_MAP = {
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

    const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

    const months = String(intakeStr)
      .split(/[,|/&]/)
      .map(m => {
        const normalized = m.trim().toLowerCase();
        return MONTH_MAP[normalized] || null;
      })
      .filter(m => m !== null);

    const unique = [...new Set(months)];
    return unique.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
  }

  /**
   * Calculate next intake date
   */
  calculateNextIntakeDate(intakeMonths) {
    if (!intakeMonths || intakeMonths.length === 0) return null;

    const MONTH_NUMBER = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Find next intake month
    let nextMonth = intakeMonths.find(m => MONTH_NUMBER[m] >= currentMonth);
    if (!nextMonth) {
      // No more intakes this year, use first month next year
      nextMonth = intakeMonths[0];
      return new Date(currentYear + 1, MONTH_NUMBER[nextMonth] - 1, 1)
        .toISOString().split('T')[0];
    }

    return new Date(currentYear, MONTH_NUMBER[nextMonth] - 1, 1)
      .toISOString().split('T')[0];
  }
}

module.exports = { EnrichmentSearcher };
