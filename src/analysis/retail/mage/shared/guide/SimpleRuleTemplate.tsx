import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { BoxRowEntry } from 'interface/guide/components/PerformanceBoxRow';
import { PerformanceUtils } from './PerformanceUtils';

/**
 * Basic type for cast objects used in rules
 * This is intentionally minimal to allow different cast types
 */
export type CastLike = Record<string, unknown>;

/**
 * Basic interface for guide objects that can generate tooltips
 */
export interface GuideLike {
  generateGuideTooltip: (
    performance: QualitativePerformance,
    tooltipItems: Array<{ perf: QualitativePerformance; detail: string }>,
    timestamp: number,
  ) => JSX.Element;
}

/**
 * Represents an individual rule that can be evaluated.
 */
export interface GuideRule {
  id: string;
  check: () => boolean;
  failureText?: string; // Optional text shown when rule fails
  successText?: string; // Optional text shown when rule passes
  failurePerformance?: QualitativePerformance; // What performance level a failed rule gets (default: Fail)
  successPerformance?: QualitativePerformance; // What performance level a passed rule gets (default: Good)
  active?: boolean; // Only add rule if active is true (default: true)
  label?: JSX.Element; // Optional label for checklist display
}

/**
 * Represents performance criteria - which rules must pass for each performance level.
 */
export interface PerformanceCriteria {
  perfect?: string[][]; // Array of rule combinations - any combination can trigger Perfect
  good?: string[][]; // Array of rule combinations - any combination can trigger Good
  ok?: string[][]; // Array of rule combinations - any combination can trigger Ok
  // If none of the above pass, result is Fail
}

/**
 * Simple template for creating individual rules in guide files.
 */
export class SimpleRuleTemplate<T = CastLike> {
  private guide: GuideLike;
  private rules: GuideRule[] = [];
  private performanceCriteria: PerformanceCriteria = {};
  private cast: T;

  constructor(cast: T, guide: GuideLike) {
    this.cast = cast;
    this.guide = guide;
  }

  /**
   * Get the cast data associated with this ruleset
   */
  getCast(): T {
    return this.cast;
  }

  // ===== INDIVIDUAL RULE DEFINITIONS =====

  /**
   * Add an individual rule to be evaluated.
   */
  addRule(rule: GuideRule): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * Create a rule quickly and add it to the template using named parameters.
   */
  createRule(params: {
    id: string;
    check: () => boolean;
    failureText?: string;
    successText?: string;
    failurePerformance?: QualitativePerformance;
    successPerformance?: QualitativePerformance;
    active?: boolean | (() => boolean);
    label?: JSX.Element;
  }): this {
    // Handle active as boolean or function
    let isActive = true;

    if (typeof params.active === 'boolean') {
      isActive = params.active;
    } else if (typeof params.active === 'function') {
      isActive = params.active();
    }

    // Only add the rule if active is true (defaults to true)
    if (!isActive) {
      return this;
    }

    const rule: GuideRule = {
      id: params.id,
      check: params.check,
      failureText: params.failureText,
      successText: params.successText,
      failurePerformance: params.failurePerformance ?? QualitativePerformance.Fail,
      successPerformance: params.successPerformance ?? QualitativePerformance.Good,
      active: isActive,
      label: params.label,
    };
    return this.addRule(rule);
  }

  // ===== PERFORMANCE CRITERIA =====

  /**
   * Define rule combinations for Perfect performance.
   * Each call adds a new combination (OR logic between combinations).
   * @param ruleIds - Rule IDs that must ALL pass for this Perfect condition
   */
  perfectIf(ruleIds: string[]): this {
    if (!this.performanceCriteria.perfect) {
      this.performanceCriteria.perfect = [];
    }
    this.performanceCriteria.perfect.push(ruleIds);
    return this;
  }

  /**
   * Define rule combinations for Good performance.
   * Each call adds a new combination (OR logic between combinations).
   * @param ruleIds - Rule IDs that must ALL pass for this Good condition
   */
  goodIf(ruleIds: string[]): this {
    if (!this.performanceCriteria.good) {
      this.performanceCriteria.good = [];
    }
    this.performanceCriteria.good.push(ruleIds);
    return this;
  }

  /**
   * Define rule combinations for Ok performance.
   * Each call adds a new combination (OR logic between combinations).
   * @param ruleIds - Rule IDs that must ALL pass for this Ok condition
   */
  okIf(ruleIds: string[]): this {
    if (!this.performanceCriteria.ok) {
      this.performanceCriteria.ok = [];
    }
    this.performanceCriteria.ok.push(ruleIds);
    return this;
  }

  // ===== EVALUATION =====

  /**
   * Evaluate all rules and determine final performance.
   */
  evaluate(timestamp: number): BoxRowEntry {
    // Evaluate all rules
    const ruleResults = new Map<string, { rule: GuideRule; passed: boolean }>();

    for (const rule of this.rules) {
      const passed = rule.check();
      ruleResults.set(rule.id, { rule, passed });
    }

    // Helper to check if any combination of rules passes
    const checkCriteria = (criteriaGroups: string[][]): boolean => {
      return criteriaGroups.some((ruleGroup) =>
        ruleGroup.every((ruleId) => ruleResults.get(ruleId)?.passed === true),
      );
    };

    // Determine overall performance based on criteria
    let overallPerformance = QualitativePerformance.Fail;

    // Check Perfect criteria
    if (this.performanceCriteria.perfect && this.performanceCriteria.perfect.length > 0) {
      if (checkCriteria(this.performanceCriteria.perfect)) {
        overallPerformance = QualitativePerformance.Perfect;
      }
    }

    // Check Good criteria (only if not already Perfect)
    if (
      overallPerformance !== QualitativePerformance.Perfect &&
      this.performanceCriteria.good &&
      this.performanceCriteria.good.length > 0
    ) {
      if (checkCriteria(this.performanceCriteria.good)) {
        overallPerformance = QualitativePerformance.Good;
      }
    }

    // Check Ok criteria (only if not already Perfect/Good)
    if (
      overallPerformance === QualitativePerformance.Fail &&
      this.performanceCriteria.ok &&
      this.performanceCriteria.ok.length > 0
    ) {
      if (checkCriteria(this.performanceCriteria.ok)) {
        overallPerformance = QualitativePerformance.Ok;
      }
    }

    // Build tooltip items
    const tooltipItems: Array<{ perf: QualitativePerformance; detail: string }> = [];

    for (const [, result] of ruleResults) {
      const { rule, passed } = result;

      if (passed && rule.successText) {
        // Add success tooltip
        tooltipItems.push({
          perf: rule.successPerformance || QualitativePerformance.Good,
          detail: rule.successText,
        });
      } else if (!passed && rule.failureText) {
        // Add failure tooltip only if failureText is provided
        tooltipItems.push({
          perf: rule.failurePerformance || QualitativePerformance.Fail,
          detail: rule.failureText,
        });
      }
    }

    const tooltip = this.guide.generateGuideTooltip(overallPerformance, tooltipItems, timestamp);
    return PerformanceUtils.createBoxRowEntry(overallPerformance, tooltip);
  }

  /**
   * Get raw rule evaluation results without creating BoxRowEntry.
   * Useful for custom rendering like checklists.
   */
  getRuleResults(): Map<string, { rule: GuideRule; passed: boolean }> {
    const ruleResults = new Map<string, { rule: GuideRule; passed: boolean }>();

    for (const rule of this.rules) {
      const passed = rule.check();
      ruleResults.set(rule.id, { rule, passed });
    }

    return ruleResults;
  }

  /**
   * Get the calculated overall performance level based on criteria.
   */
  getPerformance(): QualitativePerformance {
    // Evaluate all rules
    const ruleResults = new Map<string, { rule: GuideRule; passed: boolean }>();

    for (const rule of this.rules) {
      const passed = rule.check();
      ruleResults.set(rule.id, { rule, passed });
    }

    // Helper to check if any combination of rules passes
    const checkCriteria = (criteriaGroups: string[][]): boolean => {
      return criteriaGroups.some((ruleGroup) =>
        ruleGroup.every((ruleId) => ruleResults.get(ruleId)?.passed === true),
      );
    };

    // Determine overall performance based on criteria
    let overallPerformance = QualitativePerformance.Fail;

    // Check Perfect criteria
    if (this.performanceCriteria.perfect && this.performanceCriteria.perfect.length > 0) {
      if (checkCriteria(this.performanceCriteria.perfect)) {
        overallPerformance = QualitativePerformance.Perfect;
      }
    }

    // Check Good criteria (only if not already Perfect)
    if (
      overallPerformance !== QualitativePerformance.Perfect &&
      this.performanceCriteria.good &&
      this.performanceCriteria.good.length > 0
    ) {
      if (checkCriteria(this.performanceCriteria.good)) {
        overallPerformance = QualitativePerformance.Good;
      }
    }

    // Check Ok criteria (only if not already Perfect/Good)
    if (
      overallPerformance === QualitativePerformance.Fail &&
      this.performanceCriteria.ok &&
      this.performanceCriteria.ok.length > 0
    ) {
      if (checkCriteria(this.performanceCriteria.ok)) {
        overallPerformance = QualitativePerformance.Ok;
      }
    }

    return overallPerformance;
  }
}

/**
 * Factory function to create a ruleset template.
 */
export function createRuleset<T = CastLike>(cast: T, guide: GuideLike): SimpleRuleTemplate<T> {
  return new SimpleRuleTemplate<T>(cast, guide);
}
