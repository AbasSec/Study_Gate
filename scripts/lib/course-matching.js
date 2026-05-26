/**
 * Canonical Course Matching System
 *
 * Handles intelligent matching of course names across different universities
 * to identify courses that should share a common global course record.
 *
 * Matching tiers:
 * 1. Exact courseId match
 * 2. Exact normalized name + level
 * 3. Canonical key match (ignoring non-identity modifiers)
 * 4. Alias dictionary match
 * 5. Fuzzy similarity match (confidence-based)
 */

const fs = require('fs');
const path = require('path');

// ============================================
// NORMALIZATION & MATCHING UTILITIES
// ============================================

/**
 * Normalize course name for matching
 * Handles punctuation, spacing, common abbreviations
 */
function normalizeCourseName(name) {
  if (!name) return '';

  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')               // Normalize spaces
    .replace(/[.,;:!?'"]+/g, '')        // Remove punctuation
    .replace(/\(|\)/g, '')              // Remove parens
    .replace(/–|−|—/g, '-')             // Normalize dashes
    .trim();
}

/**
 * Extract canonical name: remove delivery mode and degree type modifiers
 * Preserves meaningful specialization tokens
 */
function extractCanonicalName(originalName) {
  let name = normalizeCourseName(originalName);

  // Remove degree type modifiers that are non-identity
  name = name
    .replace(/\bhons?\b/g, '')           // (Hons), Hons
    .replace(/\bhonours?\b/g, '')        // Honours, Honour
    .replace(/\bwith honours?\b/g, '')   // with Honours
    .replace(/\b3\+0\b/g, '')            // 3+0, 4+0, etc.
    .replace(/\b4\+0\b/g, '')
    .replace(/\bdual award\b/g, '')      // Dual Award
    .replace(/\bonline learning\b/g, '') // Online Learning
    .replace(/\bfull time\b/g, '')       // Full Time
    .replace(/\bpart time\b/g, '')       // Part Time
    .replace(/\bft\b/g, '')              // FT, PT
    .replace(/\bpt\b/g, '')
    .replace(/\bby coursework\b/g, '')   // by Coursework
    .replace(/\bby research\b/g, '')     // by Research
    .replace(/\bodl\b/g, '')             // ODL (Open Distance Learning)
    .replace(/\bonline\b/g, '')          // Online mode
    .replace(/\bin collaboration with.*?\b/g, '') // Partner suffixes
    .replace(/\s+/g, ' ')                // Clean up spaces again
    .trim();

  return name;
}

/**
 * Generate a canonical key for matching
 * Combines level + canonical name tokens for fuzzy matching
 */
function generateCanonicalKey(name, level) {
  const canonical = extractCanonicalName(name);
  const levelNorm = (level || '').toLowerCase();

  // Create a token-based key
  const tokens = canonical.split(/\s+/).filter(t => t.length > 0);

  // Remove very generic tokens
  const filtered = tokens.filter(t => !['in', 'of', 'a', 'the', 'and', 'or', 'with'].includes(t));

  // Sort for consistency
  const key = `${levelNorm}|${filtered.join('|')}`;
  return key;
}

/**
 * Load course aliases from config file
 * Returns empty object if file doesn't exist (optional dependency)
 */
function loadCourseAliases() {
  const aliasPath = path.join(__dirname, '../../data/imports/course-aliases.json');

  try {
    if (fs.existsSync(aliasPath)) {
      const content = fs.readFileSync(aliasPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not load course aliases: ${error.message}`);
  }

  return {};
}

/**
 * Check if a course name matches an alias group
 */
function findAliasMatch(courseName, level, aliases = {}) {
  const normalized = normalizeCourseName(courseName);
  const levelNorm = (level || '').toLowerCase();
  const key = `${levelNorm}|*`; // Simplified key for alias lookup

  for (const [aliasKey, aliasNames] of Object.entries(aliases)) {
    // Parse alias key: "Level|canonical-name"
    const [aliasLevel] = aliasKey.split('|');

    // Check level match
    if (aliasLevel.toLowerCase() !== levelNorm) {
      continue;
    }

    // Check if course name matches any variant in the alias group
    for (const aliasName of aliasNames) {
      const aliasNorm = normalizeCourseName(aliasName);
      if (aliasNorm === normalized) {
        // Found an alias match - return the canonical key (first alias as canonical)
        return aliasKey;
      }
    }
  }

  return null;
}

/**
 * Calculate string similarity using Jaccard/token similarity
 * Returns value between 0 and 1 (1 = identical)
 */
function calculateSimilarity(name1, name2) {
  const tokens1 = new Set(normalizeCourseName(name1).split(/\s+/).filter(t => t.length > 2));
  const tokens2 = new Set(normalizeCourseName(name2).split(/\s+/).filter(t => t.length > 2));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  // Jaccard similarity: |intersection| / |union|
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Check if specializations conflict
 * Returns true if specializations appear incompatible
 */
function hasConflictingSpecializations(name1, name2) {
  const specializations = [
    'finance', 'accounting', 'marketing', 'human resource',
    'data science', 'cyber security', 'software engineering',
    'artificial intelligence', 'information technology', 'information systems',
    'computer science', 'computer engineering',
    'mechanical', 'civil', 'electrical', 'electronic', 'chemical',
    'business', 'management', 'economics',
    'nursing', 'physiotherapy', 'pharmacy', 'medical',
    'hotel', 'hospitality', 'culinary',
    'graphic', 'design', 'fashion', 'animation'
  ];

  const norm1 = normalizeCourseName(name1);
  const norm2 = normalizeCourseName(name2);

  // Extract specializations from each name
  const specs1 = specializations.filter(s => norm1.includes(s));
  const specs2 = specializations.filter(s => norm2.includes(s));

  // Check for conflicting specializations
  // Two courses with different specializations should not merge
  // (e.g., Finance vs Marketing should stay separate)
  if (specs1.length > 0 && specs2.length > 0) {
    const intersection = specs1.filter(s => specs2.includes(s));
    // If they don't share any specialization, they likely conflict
    if (intersection.length === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Main course matching function
 * Applies tiers of matching logic and returns result with confidence/reasoning
 */
function matchCourse(importedCourse, existingCourses, options = {}) {
  const {
    allowAliases = true,
    allowFuzzy = true,
    fuzzyThreshold = 0.85,
    reviewThreshold = 0.75
  } = options;

  if (!existingCourses || existingCourses.length === 0) {
    return {
      decision: 'CREATE_NEW',
      confidence: 1.0,
      reason: 'No existing courses to match against',
      matchedCourse: null
    };
  }

  const importName = importedCourse.name;
  const importLevel = importedCourse.level;

  // Tier 1: Exact courseId match (should not occur in import, but check anyway)
  if (importedCourse.courseId) {
    const exactIdMatch = existingCourses.find(c => c.courseId === importedCourse.courseId);
    if (exactIdMatch) {
      return {
        decision: 'AUTO_REUSE',
        confidence: 1.0,
        reason: 'Exact courseId match',
        matchedCourse: exactIdMatch
      };
    }
  }

  // Tier 2: Exact normalized name + level match
  const normImportName = normalizeCourseName(importName);
  const normImportLevel = (importLevel || '').toLowerCase();

  const exactMatch = existingCourses.find(c => {
    const normExistName = normalizeCourseName(c.name || '');
    const normExistLevel = (c.level || '').toLowerCase();
    return normExistName === normImportName && normExistLevel === normImportLevel;
  });

  if (exactMatch) {
    return {
      decision: 'AUTO_REUSE',
      confidence: 1.0,
      reason: 'Exact normalized name + level match',
      matchedCourse: exactMatch
    };
  }

  // Tier 3: Canonical key match (ignoring non-identity modifiers)
  const importCanonical = generateCanonicalKey(importName, importLevel);

  const canonicalMatches = existingCourses.filter(c => {
    const existCanonical = generateCanonicalKey(c.name || '', c.level || '');
    return existCanonical === importCanonical && (c.level || '').toLowerCase() === normImportLevel;
  });

  if (canonicalMatches.length > 0) {
    const matched = canonicalMatches[0];
    return {
      decision: 'AUTO_REUSE',
      confidence: 0.97,
      reason: 'Canonical name match (e.g., Hons variant)',
      matchedCourse: matched
    };
  }

  // Tier 4: Alias dictionary match
  if (allowAliases) {
    const aliases = loadCourseAliases();
    const importAliasKey = findAliasMatch(importName, importLevel, aliases);

    if (importAliasKey) {
      const aliasMatches = existingCourses.filter(c => {
        const existAliasKey = findAliasMatch(c.name || '', c.level || '', aliases);
        return existAliasKey === importAliasKey;
      });

      if (aliasMatches.length > 0) {
        const matched = aliasMatches[0];
        return {
          decision: 'AUTO_REUSE',
          confidence: 0.96,
          reason: 'Alias dictionary match',
          matchedCourse: matched
        };
      }
    }
  }

  // Tier 5: Fuzzy similarity match
  if (allowFuzzy) {
    const candidates = existingCourses
      .filter(c => {
        // Must have same level
        if ((c.level || '').toLowerCase() !== normImportLevel) {
          return false;
        }

        // Must not have conflicting specializations
        if (hasConflictingSpecializations(importName, c.name || '')) {
          return false;
        }

        return true;
      })
      .map(c => {
        const similarity = calculateSimilarity(importName, c.name || '');
        return { ...c, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity);

    if (candidates.length > 0) {
      const bestMatch = candidates[0];

      if (bestMatch.similarity >= fuzzyThreshold) {
        return {
          decision: 'AUTO_REUSE',
          confidence: bestMatch.similarity,
          reason: `Fuzzy match (${(bestMatch.similarity * 100).toFixed(1)}% token similarity)`,
          matchedCourse: bestMatch
        };
      } else if (bestMatch.similarity >= reviewThreshold) {
        return {
          decision: 'REVIEW_REQUIRED',
          confidence: bestMatch.similarity,
          reason: `Medium confidence fuzzy match (${(bestMatch.similarity * 100).toFixed(1)}% similarity) - requires review`,
          matchedCourse: bestMatch
        };
      }
    }
  }

  // No match found
  return {
    decision: 'CREATE_NEW',
    confidence: 0.0,
    reason: 'No matching existing course found',
    matchedCourse: null
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  normalizeCourseName,
  extractCanonicalName,
  generateCanonicalKey,
  loadCourseAliases,
  findAliasMatch,
  calculateSimilarity,
  hasConflictingSpecializations,
  matchCourse
};
