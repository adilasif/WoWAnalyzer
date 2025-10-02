/**
 * Cast Link Helpers
 *
 * Simplifies creation of EventLink definitions by providing a fluent API
 * to define all relationships for a spell in one place.
 */

import { EventLink } from 'parser/core/EventLinkNormalizer';
import { EventType, AnyEvent } from 'parser/core/Events';

const CAST_BUFFER_MS = 75;

/**
 * Event relation constants for linking events
 * Uses EventType values directly for automatic reverse relation matching
 */
export const EventRelations = {
  // All standard EventTypes for automatic matching
  DESTROY: EventType.Destroy,
  HEAL: EventType.Heal,
  HEAL_ABSORBED: EventType.HealAbsorbed,
  ABSORBED: EventType.Absorbed,
  DAMAGE: EventType.Damage,
  BEGIN_CAST: EventType.BeginCast,
  CAST: EventType.Cast,
  DRAIN: EventType.Drain,
  APPLY_BUFF: EventType.ApplyBuff,
  APPLY_DEBUFF: EventType.ApplyDebuff,
  APPLY_BUFF_STACK: EventType.ApplyBuffStack,
  APPLY_DEBUFF_STACK: EventType.ApplyDebuffStack,
  REMOVE_BUFF_STACK: EventType.RemoveBuffStack,
  REMOVE_DEBUFF_STACK: EventType.RemoveDebuffStack,
  CHANGE_BUFF_STACK: EventType.ChangeBuffStack,
  CHANGE_DEBUFF_STACK: EventType.ChangeDebuffStack,
  REFRESH_BUFF: EventType.RefreshBuff,
  REFRESH_DEBUFF: EventType.RefreshDebuff,
  REMOVE_BUFF: EventType.RemoveBuff,
  REMOVE_DEBUFF: EventType.RemoveDebuff,
  SUMMON: EventType.Summon,
  RESOURCE_CHANGE: EventType.ResourceChange,
  INTERRUPT: EventType.Interrupt,
  DEATH: EventType.Death,
  RESURRECT: EventType.Resurrect,

  // Custom semantic relations that don't map to EventTypes
  PRECAST: 'precast',
  CONSUME: 'consume',
  TICK: 'tick',
} as const;

/**
 * Configuration for a single event link
 */
interface LinkConfig {
  /** The relation name for this link */
  relation: string;
  /**
   * Reverse relation (makes link bidirectional)
   * - undefined or 'auto': automatically determines based on parent event type (default)
   * - string: explicit reverse relation name
   * - function: dynamic resolution based on parent type
   * - null: no reverse relation (unidirectional link only)
   */
  reverseRelation?:
    | string
    | ((parentType: EventType | EventType[]) => string | undefined)
    | 'auto'
    | null;
  /** Event type(s) to link to */
  type: EventType | EventType[];
  /** Spell ID(s) to link to (defaults to source spell ID) */
  id?: number | number[];
  /** Forward buffer in milliseconds */
  forwardBuffer?: number;
  /** Backward buffer in milliseconds */
  backwardBuffer?: number;
  /** Maximum number of links to create */
  maxLinks?: number;
  /** Allow linking to different targets */
  anyTarget?: boolean;
  /** Allow linking to different sources */
  anySource?: boolean;
  /** Additional condition for linking */
  condition?: (linkingEvent: AnyEvent, referencedEvent: AnyEvent) => boolean;
}

/**
 * Complete specification for a spell's event links
 */
interface SpellLinkSpec {
  /** The source spell/buff ID */
  id: number;
  /** The source event type */
  type: EventType | EventType[];
  /**
   * Default reverse relation for all links in this spec
   * Individual links can override this by specifying their own reverseRelation
   * - undefined or 'auto': automatically determines based on parent event type (default)
   * - string: explicit reverse relation name
   * - null: no reverse relation (unidirectional links only)
   */
  reverseRelation?: string | 'auto' | null;
  /** Array of link configurations */
  links: LinkConfig[];
}

/**
 * Helper to resolve reverse relation based on parent type
 * Defaults to 'auto' detection if reverseRelation is undefined
 */
function resolveReverseRelation(
  reverseRelation:
    | string
    | ((parentType: EventType | EventType[]) => string | undefined)
    | 'auto'
    | null
    | undefined,
  parentType: EventType | EventType[],
  relation: string,
): string | undefined {
  // Explicit null means no reverse relation
  if (reverseRelation === null) {
    return undefined;
  }

  // Default to 'auto' if not specified
  if (reverseRelation === undefined || reverseRelation === 'auto') {
    // Can't auto-detect for multi-type specs - user must specify explicitly
    if (Array.isArray(parentType)) return undefined;

    // Use the parent EventType directly as the reverse relation
    // This automatically matches any event type
    return parentType;
  }

  if (typeof reverseRelation === 'function') {
    return reverseRelation(parentType);
  }

  return reverseRelation;
}

/**
 * Creates EventLink objects from a SpellLinkSpec
 *
 * @example
 * ```typescript
 * // Define all links for Arcane Barrage in one place
 * defineSpellLinks({
 *   id: SPELLS.ARCANE_BARRAGE.id,
 *   type: EventType.Cast,
 *   links: [
 *     LinkPatterns.damage({ forwardBuffer: 2000 }),
 *     LinkPatterns.preCast({ id: [ARCANE_BLAST, ARCANE_SURGE] }),
 *   ]
 * })
 *
 * // Override reverseRelation for all links in this spec
 * defineSpellLinks({
 *   id: SPELLS.NETHER_PRECISION_BUFF.id,
 *   type: EventType.ApplyBuff,
 *   reverseRelation: null, // No reverse links for any link in this spec
 *   links: [
 *     LinkPatterns.damage({ id: ARCANE_BLAST }),
 *     LinkPatterns.removeBuff(),
 *   ]
 * })
 * ```
 */
export function defineSpellLinks(spec: SpellLinkSpec): EventLink[] {
  return spec.links.map((link) => ({
    linkingEventId: spec.id,
    linkingEventType: spec.type,
    linkRelation: link.relation,
    referencedEventId: link.id ?? spec.id,
    referencedEventType: link.type,
    // Use link-level reverseRelation, fallback to spec-level, then auto-detect
    reverseLinkRelation: resolveReverseRelation(
      link.reverseRelation ?? spec.reverseRelation,
      spec.type,
      link.relation,
    ),
    forwardBufferMs: link.forwardBuffer ?? CAST_BUFFER_MS,
    backwardBufferMs: link.backwardBuffer ?? CAST_BUFFER_MS,
    maximumLinks: link.maxLinks,
    anyTarget: link.anyTarget ?? false,
    anySource: link.anySource ?? false,
    additionalCondition: link.condition,
  }));
}

/**
 * Common link patterns as helper functions
 *
 * These functions return LinkConfig objects with sensible defaults,
 * but you can override any property by spreading additional options.
 *
 * **Global Defaults (applied to all patterns):**
 * - forwardBuffer: 75ms (CAST_BUFFER_MS)
 * - backwardBuffer: 75ms (CAST_BUFFER_MS)
 *
 * **Auto-Detection of Reverse Relations:**
 * All patterns automatically create bidirectional links by detecting the appropriate
 * reverse relation from the parent event type (Cast → CAST, ApplyBuff → BUFF_APPLY, etc.)
 * To prevent bidirectional linking, explicitly set `reverseRelation: null`.
 *
 * @example
 * ```typescript
 * // Use with defaults (auto-detects reverse relation, 75ms buffers)
 * LinkPatterns.damage()
 *
 * // Override specific properties
 * LinkPatterns.damage({ forwardBuffer: 2000, maxLinks: 3 })
 *
 * // Prevent reverse link
 * LinkPatterns.damage({ reverseRelation: null })
 * ```
 */
export const LinkPatterns = {
  /**
   * Links to damage event(s)
   *
   * @param overrides Optional property overrides
   * @example
   * ```typescript
   * LinkPatterns.damage() // Standard instant cast
   * LinkPatterns.damage({ forwardBuffer: 2000 }) // With travel time
   * LinkPatterns.damage({ id: MISSILES_DAMAGE, forwardBuffer: 2600, maxLinks: 8 }) // Channel ticks
   * LinkPatterns.damage({ id: ARCANE_ECHO, reverseRelation: null }) // Proc damage (no reverse link)
   * ```
   */
  damage: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.DAMAGE,
    type: EventType.Damage,
    ...overrides,
  }),

  /**
   * Pre-cast relationship - links this cast to spell(s) cast immediately before
   *
   * @param overrides Property overrides (**id: REQUIRED**)
   * @example
   * ```typescript
   * LinkPatterns.preCast({ id: SPELLS.ARCANE_BLAST.id })
   * LinkPatterns.preCast({ id: [SPELL_1.id, SPELL_2.id] })
   * ```
   */
  preCast: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.PRECAST,
    type: EventType.Cast,
    ...overrides,
  }),

  /**
   * Cast to buff application
   *
   * @param overrides Optional property overrides
   */
  applyBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_BUFF,
    type: EventType.ApplyBuff,
    ...overrides,
  }),

  /**
   * Cast to debuff application
   *
   * @param overrides Optional property overrides
   */
  applyDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_DEBUFF,
    type: EventType.ApplyDebuff,
    ...overrides,
  }),

  /**
   * Buff application → removal
   *
   * Note: Usually requires `forwardBuffer` override for buff duration
   *
   * @param overrides Property overrides
   * @example
   * ```typescript
   * LinkPatterns.removeBuff({ forwardBuffer: 12500 }) // 12s buff duration
   * LinkPatterns.removeBuff({ type: [EventType.RemoveBuff, EventType.RefreshBuff], forwardBuffer: 11000 })
   * ```
   */
  removeBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_BUFF,
    type: [EventType.RemoveBuff, EventType.RemoveBuffStack],
    ...overrides,
  }),

  /**
   * Debuff application → removal
   *
   * Note: Usually requires `forwardBuffer` override for debuff duration
   *
   * @param overrides Property overrides
   * @example
   * ```typescript
   * LinkPatterns.removeDebuff({ forwardBuffer: 10500 }) // 10s debuff duration
   * ```
   */
  removeDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_DEBUFF,
    type: EventType.RemoveDebuff,
    ...overrides,
  }),

  /**
   * Links to cast event(s)
   *
   * @param overrides Property overrides (**id: REQUIRED**)
   * @example
   * ```typescript
   * LinkPatterns.cast({ id: SPELLS.ARCANE_BLAST.id, forwardBuffer: 5000 })
   * LinkPatterns.cast({ id: [SPELL_1.id, SPELL_2.id], maxLinks: 2, forwardBuffer: 15000 })
   * ```
   */
  cast: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.CAST,
    type: EventType.Cast,
    ...overrides,
  }),

  /**
   * Buff consumption by spell cast (semantic alias for cast)
   *
   * @param overrides Property overrides (**id: REQUIRED**)
   * @example
   * ```typescript
   * LinkPatterns.consumed({ id: SPELLS.ARCANE_BLAST.id, forwardBuffer: 15000 })
   * LinkPatterns.consumed({ id: [SPELL_1.id, SPELL_2.id], maxLinks: 2, forwardBuffer: 21000 })
   * ```
   */
  consumed: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.CAST,
    type: EventType.Cast,
    ...overrides,
  }),

  /**
   * Resource gain (energize)
   *
   * @param overrides Optional property overrides
   */
  energize: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.RESOURCE_CHANGE,
    type: EventType.ResourceChange,
    ...overrides,
  }),

  /**
   * Links to heal event(s)
   *
   * @param overrides Optional property overrides
   */
  heal: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.HEAL,
    type: EventType.Heal,
    ...overrides,
  }),

  /**
   * Links to absorbed damage event(s)
   *
   * @param overrides Optional property overrides
   */
  absorbed: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.ABSORBED,
    type: EventType.Absorbed,
    ...overrides,
  }),

  /**
   * Links to begin cast event(s)
   *
   * @param overrides Optional property overrides
   */
  beginCast: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.BEGIN_CAST,
    type: EventType.BeginCast,
    ...overrides,
  }),

  /**
   * Links to summon event(s)
   *
   * @param overrides Optional property overrides
   */
  summon: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.SUMMON,
    type: EventType.Summon,
    ...overrides,
  }),

  /**
   * Links to interrupt event(s)
   *
   * @param overrides Optional property overrides
   */
  interrupt: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.INTERRUPT,
    type: EventType.Interrupt,
    ...overrides,
  }),

  /**
   * Links to death event(s)
   *
   * @param overrides Optional property overrides
   */
  death: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.DEATH,
    type: EventType.Death,
    ...overrides,
  }),

  /**
   * Buff stack application
   *
   * @param overrides Optional property overrides
   */
  applyBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_BUFF_STACK,
    type: EventType.ApplyBuffStack,
    ...overrides,
  }),

  /**
   * Debuff stack application
   *
   * @param overrides Optional property overrides
   */
  applyDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_DEBUFF_STACK,
    type: EventType.ApplyDebuffStack,
    ...overrides,
  }),

  /**
   * Buff stack removal
   *
   * @param overrides Optional property overrides
   */
  removeBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_BUFF_STACK,
    type: EventType.RemoveBuffStack,
    ...overrides,
  }),

  /**
   * Debuff stack removal
   *
   * @param overrides Optional property overrides
   */
  removeDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_DEBUFF_STACK,
    type: EventType.RemoveDebuffStack,
    ...overrides,
  }),

  /**
   * Buff refresh
   *
   * @param overrides Optional property overrides
   */
  refreshBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REFRESH_BUFF,
    type: EventType.RefreshBuff,
    ...overrides,
  }),

  /**
   * Debuff refresh
   *
   * @param overrides Optional property overrides
   */
  refreshDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REFRESH_DEBUFF,
    type: EventType.RefreshDebuff,
    ...overrides,
  }),
};

/**
 * Creates multiple SpellLinkSpecs and flattens to EventLink array
 */
export function createEventLinks(...specs: SpellLinkSpec[]): EventLink[] {
  return specs.flatMap(defineSpellLinks);
}
