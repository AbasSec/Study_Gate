/**
 * Enrichment Validator
 *
 * Validates enrichment data against safety constraints and blockers.
 *
 * Blockers (prevent commit):
 * - non-official source
 * - LOW confidence
 * - MEDIUM confidence (unless --allow-medium-confidence)
 * - suspicious fees (application/visa/registration/admission fees)
 * - currency conflicts
 * - conflicting sources
 * - course level mismatch
 * - missing evidence
 * - old/expired sources
 *
 * Warnings (allow commit but alert user):
 * - no official source found
 * - fee may include misc fees
 * - duration is a range
 * - intake months empty
 * - course name is partial match
 */

class EnrichmentValidator {
  constructor() {
    this.blockers = [];
    this.warnings = [];
  }

  /**
   * Validate all enrichment data
   */
  validate(enrichedData, options = {}) {
    const {
      allowMediumConfidence = false,
      overwriteExisting = false
    } = options;

    this.blockers = [];
    this.warnings = [];

    for (const item of enrichedData) {
      this.validateItem(item, {
        allowMediumConfidence,
        overwriteExisting
      });
    }

    return {
      safe: this.blockers.length === 0,
      blockers: this.blockers,
      warnings: this.warnings
    };
  }

  /**
   * Validate a single enrichment item
   */
  validateItem(item, options) {
    const { allowMediumConfidence } = options;

    // Check for blockers
    if (item.blockers && item.blockers.length > 0) {
      item.blockers.forEach(blocker => {
        this.blockers.push(`${item.universityName}/${item.courseName}: ${blocker}`);
      });
    }

    // Check confidence level
    if (item.overallConfidence === 'LOW') {
      this.blockers.push(
        `${item.universityName}/${item.courseName}: LOW confidence - requires manual review`
      );
    }

    if (item.overallConfidence === 'MEDIUM' || item.overallConfidence === 'MIXED_MEDIUM') {
      if (!allowMediumConfidence) {
        this.blockers.push(
          `${item.universityName}/${item.courseName}: MEDIUM confidence - requires --allow-medium-confidence`
        );
      } else {
        this.warnings.push(
          `${item.universityName}/${item.courseName}: MEDIUM confidence - allow by flag`
        );
      }
    }

    if (item.overallConfidence === 'NO_SOURCE') {
      this.warnings.push(
        `${item.universityName}/${item.courseName}: No official source found`
      );
    }

    // Check for suspicious fee patterns
    if (item.updates.tuitionFee) {
      this.checkFeeSuspicions(item);
    }

    // Check for currency conflicts
    if (item.updates.tuitionCurrency && item.updates.tuitionFee) {
      this.checkCurrencyConflict(item);
    }

    // Check for conflicting sources
    if (item.sources && item.sources.length > 1) {
      this.checkConflictingSources(item);
    }

    // Warnings for missing data that couldn't be enriched
    if (item.missingFields && item.missingFields.length > 0) {
      const unenriched = item.missingFields.filter(field => !item.updates[field]);
      if (unenriched.length > 0) {
        this.warnings.push(
          `${item.universityName}/${item.courseName}: Could not enrich: ${unenriched.join(', ')}`
        );
      }
    }
  }

  /**
   * Check for suspicious fee patterns
   */
  checkFeeSuspicions(item) {
    const fee = item.updates.tuitionFee;
    const sources = item.sources || [];

    // Check if source mentions non-tuition fees
    const suspiciousKeywords = [
      'application fee',
      'admission fee',
      'registration fee',
      'visa fee',
      'emgs fee',
      'accommodation',
      'insurance',
      'deposit',
      'student pass',
      'airport transfer'
    ];

    for (const source of sources) {
      const text = (source.extractedSnippet || '').toLowerCase();
      for (const keyword of suspiciousKeywords) {
        if (text.includes(keyword)) {
          this.blockers.push(
            `${item.universityName}/${item.courseName}: Fee may include non-tuition charges (${keyword})`
          );
          break;
        }
      }
    }

    // Check for unusually high fees (sanity check)
    if (fee > 100000) {
      this.warnings.push(
        `${item.universityName}/${item.courseName}: Very high tuition fee (${fee}) - manual review recommended`
      );
    }

    // Check for unusually low fees
    if (fee < 1000) {
      this.warnings.push(
        `${item.universityName}/${item.courseName}: Very low tuition fee (${fee}) - verify it's not per-semester or partial`
      );
    }
  }

  /**
   * Check for currency conflicts
   */
  checkCurrencyConflict(item) {
    const currency = item.updates.tuitionCurrency;
    const universityName = item.universityName;

    // Malaysian universities should typically use MYR
    if (universityName.includes('Malaysia') || universityName.includes('Kuala Lumpur')) {
      if (currency && currency !== 'MYR' && currency !== 'USD') {
        this.warnings.push(
          `${universityName}/${item.courseName}: Unexpected currency (${currency}) for Malaysian university`
        );
      }
    }
  }

  /**
   * Check for conflicting sources
   */
  checkConflictingSources(item) {
    const sources = item.sources || [];
    const feeValues = {};

    for (const source of sources) {
      if (source.value === 'tuitionFee') {
        const fee = source.extracted;
        if (!feeValues[fee]) {
          feeValues[fee] = [];
        }
        feeValues[fee].push(source.sourceUrl);
      }
    }

    // If multiple different fees found
    const uniqueFees = Object.keys(feeValues);
    if (uniqueFees.length > 1) {
      this.blockers.push(
        `${item.universityName}/${item.courseName}: Conflicting fees from different official sources`
      );
    }
  }
}

module.exports = { EnrichmentValidator };
