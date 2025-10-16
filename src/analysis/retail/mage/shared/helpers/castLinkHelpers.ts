import { EventLink } from 'parser/core/EventLinkNormalizer';
import { EventType, AnyEvent } from 'parser/core/Events';

const CAST_BUFFER_MS = 75;

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
    relation: EventType.Damage,
    type: EventType.Damage,
    ...overrides,
  }),
  custom: (relation: string, overrides: Partial<LinkConfig>): LinkConfig => ({
    relation,
    type: overrides.type ?? EventType.Cast,
    ...overrides,
  }),
  applyBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.ApplyBuff,
    type: EventType.ApplyBuff,
    ...overrides,
  }),
  applyDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.ApplyDebuff,
    type: EventType.ApplyDebuff,
    ...overrides,
  }),
  removeBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RemoveBuff,
    type: [EventType.RemoveBuff, EventType.RemoveBuffStack],
    ...overrides,
  }),
  removeDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RemoveDebuff,
    type: EventType.RemoveDebuff,
    ...overrides,
  }),
  cast: (overrides: Partial<LinkConfig> & { id: number | number[] }): LinkConfig => ({
    relation: EventType.Cast,
    type: EventType.Cast,
    ...overrides,
  }),
  energize: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.ResourceChange,
    type: EventType.ResourceChange,
    ...overrides,
  }),

  heal: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.Heal,
    type: EventType.Heal,
    ...overrides,
  }),

  absorbed: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.Absorbed,
    type: EventType.Absorbed,
    ...overrides,
  }),

  beginCast: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.BeginCast,
    type: EventType.BeginCast,
    ...overrides,
  }),

  summon: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.Summon,
    type: EventType.Summon,
    ...overrides,
  }),
  interrupt: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.Interrupt,
    type: EventType.Interrupt,
    ...overrides,
  }),
  death: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.Death,
    type: EventType.Death,
    ...overrides,
  }),
  applyBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.ApplyBuffStack,
    type: EventType.ApplyBuffStack,
    ...overrides,
  }),
  applyDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.ApplyDebuffStack,
    type: EventType.ApplyDebuffStack,
    ...overrides,
  }),
  removeBuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RemoveBuffStack,
    type: EventType.RemoveBuffStack,
    ...overrides,
  }),
  removeDebuffStack: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RemoveDebuffStack,
    type: EventType.RemoveDebuffStack,
    ...overrides,
  }),
  refreshBuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RefreshBuff,
    type: EventType.RefreshBuff,
    ...overrides,
  }),
  refreshDebuff: (overrides?: Partial<LinkConfig>): LinkConfig => ({
    relation: EventType.RefreshDebuff,
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
