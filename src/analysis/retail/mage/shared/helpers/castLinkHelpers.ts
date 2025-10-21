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
 * Creates a link configuration for the specified relation.
 * The relation determines both the link relation and the event type to link to.
 *
 * @param relation The event type to link to (also used as the relation name)
 * @param overrides Optional overrides for any LinkConfig property
 * @returns A LinkConfig object
 *
 */
export function link(relation: EventType, overrides?: Partial<LinkConfig>): LinkConfig;
export function link(
  relation: string,
  overrides: Partial<LinkConfig> & { type: EventType | EventType[] },
): LinkConfig;
export function link(relation: EventType | string, overrides?: Partial<LinkConfig>): LinkConfig {
  const isEventType = Object.values(EventType).includes(relation as EventType);

  if (!isEventType && !overrides?.type) {
    throw new Error(`Custom relation '${relation}' requires a type in overrides.`);
  }

  return {
    relation,
    type: isEventType ? (relation as EventType) : overrides!.type!,
    ...overrides,
  };
}

/**
 * Creates EventLinks from multiple SpellLinkSpecs.
 * @param specs The spell link specifications to combine
 * @returns Array of EventLink objects from all specs
 */
export function createEventLinks(...specs: SpellLinkSpec[]): EventLink[] {
  return specs.flatMap(defineSpellLinks);
}
