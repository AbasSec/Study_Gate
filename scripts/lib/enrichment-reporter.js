/**
 * Enrichment Reporter
 *
 * Generates review reports:
 * - enrichment-report.md (human-readable overview)
 * - enrichment-updates.generated.json (structured updates)
 * - enrichment-sources.generated.json (evidence tracking)
 * - enrichment-warnings.md (issues requiring attention)
 */

class EnrichmentReporter {
  generate(incompleteOfferings, enrichedData, validation) {
    return {
      markdown: this.generateMarkdownReport(incompleteOfferings, enrichedData, validation),
      updates: this.generateUpdatesJSON(enrichedData),
      sources: this.generateSourcesJSON(enrichedData),
      warnings: this.generateWarningsMarkdown(validation)
    };
  }

  /**
   * Generate human-readable markdown report
   */
  generateMarkdownReport(incompleteOfferings, enrichedData, validation) {
    let md = '# Course Offering Enrichment Report\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    md += '## Summary\n\n';
    md += `- **Total offerings scanned**: ${incompleteOfferings.length}\n`;
    md += `- **Offerings with data found**: ${enrichedData.filter(e => e.sources.length > 0).length}\n`;
    md += `- **HIGH confidence updates**: ${enrichedData.filter(e => e.overallConfidence === 'HIGH').length}\n`;
    md += `- **MEDIUM confidence updates**: ${enrichedData.filter(e => e.overallConfidence === 'MEDIUM' || e.overallConfidence === 'MIXED_MEDIUM').length}\n`;
    md += `- **LOW confidence (skipped)**: ${enrichedData.filter(e => e.overallConfidence === 'LOW').length}\n`;
    md += `- **No source found**: ${enrichedData.filter(e => e.overallConfidence === 'NO_SOURCE').length}\n`;
    md += `- **Blockers**: ${validation.blockers.length}\n`;
    md += `- **Warnings**: ${validation.warnings.length}\n\n`;

    // Blocker List
    if (validation.blockers.length > 0) {
      md += '## 🚫 Blockers (Commit will be refused)\n\n';
      validation.blockers.forEach(blocker => {
        md += `- ${blocker}\n`;
      });
      md += '\n';
    }

    // Warning List
    if (validation.warnings.length > 0) {
      md += '## ⚠️ Warnings (Review required)\n\n';
      validation.warnings.forEach(warning => {
        md += `- ${warning}\n`;
      });
      md += '\n';
    }

    // Detailed Records Table
    md += '## Detailed Records\n\n';
    md += '| University | Course | Missing Fields | Sources Found | Confidence | Action |\n';
    md += '|---|---|---|---|---|---|\n';

    for (const item of enrichedData) {
      const action = this.getAction(item, validation);
      const missing = item.missingFields.join(', ');
      const sourceCount = item.sources.length;

      md += `| ${item.universityName} | ${item.courseName} | ${missing} | ${sourceCount} | ${item.overallConfidence} | ${action} |\n`;
    }
    md += '\n';

    // High Confidence Records
    const highConf = enrichedData.filter(e => e.overallConfidence === 'HIGH');
    if (highConf.length > 0) {
      md += '## ✅ HIGH Confidence (Ready to commit)\n\n';
      highConf.forEach(item => {
        md += this.formatItemDetail(item);
      });
      md += '\n';
    }

    // Medium Confidence Records
    const mediumConf = enrichedData.filter(e => e.overallConfidence === 'MEDIUM' || e.overallConfidence === 'MIXED_MEDIUM');
    if (mediumConf.length > 0) {
      md += '## ⚡ MEDIUM Confidence (Requires review or --allow-medium-confidence)\n\n';
      mediumConf.forEach(item => {
        md += this.formatItemDetail(item);
      });
      md += '\n';
    }

    // Records with no source
    const noSource = enrichedData.filter(e => e.overallConfidence === 'NO_SOURCE');
    if (noSource.length > 0) {
      md += '## ❌ No Official Source Found\n\n';
      noSource.forEach(item => {
        md += `**${item.universityName} - ${item.courseName}**\n`;
        md += `- Missing: ${item.missingFields.join(', ')}\n\n`;
      });
      md += '\n';
    }

    // Instructions
    md += '## Next Steps\n\n';
    md += '### If dry-run:\n';
    md += '1. Review this report\n';
    md += '2. Check enrichment-sources.generated.json for evidence\n';
    md += '3. Review enrichment-warnings.md for issues\n';
    md += '4. Run: `node scripts/enrich-course-offerings.js --commit`\n\n';

    md += '### If issues found:\n';
    md += '1. Fix issues in enrichment-sources.generated.json manually\n';
    md += '2. Add missing official sources\n';
    md += '3. Rerun with --allow-medium-confidence if appropriate\n';
    md += '4. Or run: `node scripts/enrich-course-offerings.js --commit --allow-medium-confidence`\n';

    return md;
  }

  /**
   * Format item detail for markdown
   */
  formatItemDetail(item) {
    let md = `### ${item.universityName} - ${item.courseName}\n`;
    md += `- **Offering ID**: ${item.offeringId}\n`;
    md += `- **Course ID**: ${item.courseId}\n`;
    md += `- **Missing Fields**: ${item.missingFields.join(', ')}\n`;

    if (Object.keys(item.updates).length > 0) {
      md += '- **Updates Found**:\n';
      for (const [field, value] of Object.entries(item.updates)) {
        md += `  - ${field}: ${value}\n`;
      }
    }

    if (item.sources.length > 0) {
      md += '- **Sources**:\n';
      item.sources.forEach((source, i) => {
        md += `  ${i + 1}. [${source.sourceTitle}](${source.sourceUrl})\n`;
        md += `     - Type: ${source.sourceType}\n`;
        md += `     - Confidence: ${source.confidence}\n`;
        if (source.extractedSnippet) {
          md += `     - Evidence: "${source.extractedSnippet.substring(0, 100)}..."\n`;
        }
      });
    }

    if (item.blockers && item.blockers.length > 0) {
      md += `- **Blockers**: ${item.blockers.join(', ')}\n`;
    }

    md += '\n';
    return md;
  }

  /**
   * Determine action for an item
   */
  getAction(item, validation) {
    if (item.blockers && item.blockers.length > 0) {
      return '🚫 BLOCKED';
    }
    if (item.overallConfidence === 'HIGH') {
      return '✅ WILL UPDATE';
    }
    if (item.overallConfidence === 'MEDIUM') {
      return '⚡ REVIEW';
    }
    if (item.overallConfidence === 'NO_SOURCE') {
      return '❌ SKIP';
    }
    return '?';
  }

  /**
   * Generate structured updates JSON
   */
  generateUpdatesJSON(enrichedData) {
    const updates = [];

    for (const item of enrichedData) {
      if (Object.keys(item.updates).length === 0) continue;

      updates.push({
        offeringId: item.offeringId,
        universityName: item.universityName,
        courseName: item.courseName,
        courseId: item.courseId,
        missingFields: item.missingFields,
        confidence: item.overallConfidence,
        blockers: item.blockers || [],
        updates: item.updates,
        sources: item.sources.map(s => ({
          url: s.sourceUrl,
          title: s.sourceTitle,
          type: s.sourceType,
          confidence: s.confidence
        }))
      });
    }

    return updates;
  }

  /**
   * Generate sources JSON (for audit trail)
   */
  generateSourcesJSON(enrichedData) {
    const sources = {};
    const usedUrls = new Set();

    for (const item of enrichedData) {
      for (const source of item.sources) {
        if (!usedUrls.has(source.sourceUrl)) {
          usedUrls.add(source.sourceUrl);

          sources[source.sourceUrl] = {
            title: source.sourceTitle,
            type: source.sourceType,
            fetchedAt: source.fetchedAt || new Date().toISOString(),
            extractedValues: source.extractedValues || {},
            fieldsSupported: source.fieldsSupported || [],
            notes: source.notes || ''
          };
        }
      }
    }

    return sources;
  }

  /**
   * Generate warnings markdown
   */
  generateWarningsMarkdown(validation) {
    let md = '# Enrichment Warnings & Blockers\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;

    if (validation.blockers.length === 0 && validation.warnings.length === 0) {
      md += '✅ No blockers or warnings.\n';
      return md;
    }

    if (validation.blockers.length > 0) {
      md += '## 🚫 Blockers (Must resolve before commit)\n\n';
      validation.blockers.forEach((blocker, i) => {
        md += `${i + 1}. ${blocker}\n`;
      });
      md += '\n';
    }

    if (validation.warnings.length > 0) {
      md += '## ⚠️  Warnings (Review carefully)\n\n';
      validation.warnings.forEach((warning, i) => {
        md += `${i + 1}. ${warning}\n`;
      });
      md += '\n';
    }

    md += '## Resolution Steps\n\n';
    md += '1. Review data/imports/generated/enrichment-sources.generated.json\n';
    md += '2. For blockers: Either fix the issue or find better official sources\n';
    md += '3. For warnings: Decide if acceptable or if manual correction needed\n';
    md += '4. Rerun with appropriate flags:\n';
    md += '   - `--allow-medium-confidence` if MEDIUM confidence is acceptable\n';
    md += '   - `--overwrite-existing` if overwriting is needed (rarely)\n';

    return md;
  }
}

module.exports = { EnrichmentReporter };
