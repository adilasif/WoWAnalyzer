import { EventLink } from 'parser/core/EventLinkNormalizer';
import { EventType, AnyEvent } from 'parser/core/Events';

const CAST_BUFFER_MS = 75;

export const EventRelations = {
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
  BARRAGE_CAST: 'BarrageCast',
  REFUND_BUFF: 'RefundBuff',
} as const;

/** Configuration for a single event link */
export interface LinkConfig {
  relation: string;
  reverseRelation?:
    | string
    | ((parentType: EventType | EventType[]) => string | undefined)
    | 'auto'
    | null;
  type: EventType | EventType[];
  id?: number | number[];
  forwardBuffer?: number;
  backwardBuffer?: number;
  maxLinks?: number;
  anyTarget?: boolean;
  anySource?: boolean;
  condition?: (linkingEvent: AnyEvent, referencedEvent: AnyEvent) => boolean;
}

/** Spell link specification - groups all event links for a single spell */
export interface SpellLinkSpec {
  spell: number;
  parentType: EventType | EventType[];
  links: LinkConfig[];
  reverseRelation?:
    | string
    | ((parentType: EventType | EventType[]) => string | undefined)
    | 'auto'
    | null;
}

/** @internal Resolves reverse relation with auto-detection */
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
  if (reverseRelation === null) {
    return undefined;
  }

  if (reverseRelation === undefined || reverseRelation === 'auto') {
    if (Array.isArray(parentType)) return undefined;

    return parentType;
  }

  if (typeof reverseRelation === 'function') {
    return reverseRelation(parentType);
  }

  return reverseRelation;
}

/**
 * Creates EventLink objects from a SpellLinkSpec.
 * @param spec The spell link specification
 * @returns Array of EventLink objects
 */
export function defineSpellLinks(spec: SpellLinkSpec): EventLink[] {
  return spec.links.map((link) => ({
    linkingEventId: spec.spell,
    linkingEventType: spec.parentType,
    linkRelation: link.relation,
    referencedEventId: link.id ?? spec.spell,
    referencedEventType: link.type,
    reverseLinkRelation: resolveReverseRelation(
      link.reverseRelation ?? spec.reverseRelation,
      spec.parentType,
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
 * Link pattern helpers - return LinkConfig objects with common defaults.
 * Override any property via spreading: `LinkPatterns.damage({ forwardBuffer: 2000, maxLinks: 3 })`
 */
export const LinkPatterns = {
  damage: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.DAMAGE,
    type: EventType.Damage,
    ...overrides,
  }),

  /** Links cast to spell(s) cast immediately before (id required) */
  preCast: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.PRECAST,
    type: EventType.Cast,
    ...overrides,
  }),

  applyBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_BUFF,
    type: EventType.ApplyBuff,
    ...overrides,
  }),

  applyDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_DEBUFF,
    type: EventType.ApplyDebuff,
    ...overrides,
  }),

  /** Usually requires forwardBuffer matching buff duration */
  removeBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_BUFF,
    type: [EventType.RemoveBuff, EventType.RemoveBuffStack],
    ...overrides,
  }),

  /** Usually requires forwardBuffer matching debuff duration */
  removeDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_DEBUFF,
    type: EventType.RemoveDebuff,
    ...overrides,
  }),

  /** Links to cast event(s) (id required) */
  cast: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.CAST,
    type: EventType.Cast,
    ...overrides,
  }),

  /** Buff consumption by spell cast - semantic alias for cast() (id required) */
  consumed: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventRelations.CAST,
    type: EventType.Cast,
    ...overrides,
  }),

  energize: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.RESOURCE_CHANGE,
    type: EventType.ResourceChange,
    ...overrides,
  }),

  heal: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.HEAL,
    type: EventType.Heal,
    ...overrides,
  }),

  absorbed: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.ABSORBED,
    type: EventType.Absorbed,
    ...overrides,
  }),

  beginCast: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.BEGIN_CAST,
    type: EventType.BeginCast,
    ...overrides,
  }),

  summon: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.SUMMON,
    type: EventType.Summon,
    ...overrides,
  }),

  interrupt: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.INTERRUPT,
    type: EventType.Interrupt,
    ...overrides,
  }),

  death: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.DEATH,
    type: EventType.Death,
    ...overrides,
  }),

  applyBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_BUFF_STACK,
    type: EventType.ApplyBuffStack,
    ...overrides,
  }),

  applyDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.APPLY_DEBUFF_STACK,
    type: EventType.ApplyDebuffStack,
    ...overrides,
  }),

  removeBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_BUFF_STACK,
    type: EventType.RemoveBuffStack,
    ...overrides,
  }),

  removeDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REMOVE_DEBUFF_STACK,
    type: EventType.RemoveDebuffStack,
    ...overrides,
  }),

  refreshBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REFRESH_BUFF,
    type: EventType.RefreshBuff,
    ...overrides,
  }),

  refreshDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventRelations.REFRESH_DEBUFF,
    type: EventType.RefreshDebuff,
    ...overrides,
  }),
};

/**
 * Creates EventLinks from multiple SpellLinkSpecs.
 * @param specs The spell link specifications to combine
 * @returns Array of EventLink objects from all specs
 */
export function createEventLinks(...specs: SpellLinkSpec[]): EventLink[] {
  return specs.flatMap(defineSpellLinks);
}
