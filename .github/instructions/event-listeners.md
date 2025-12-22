---
applyTo: '**'
---

# Event Listeners

## Overview

Event listeners are the primary mechanism for analyzers to respond to combat log events. They are registered in the analyzer's constructor using `addEventListener`.

> **Reference Examples**: See Enhancement and Elemental shaman for clean event listener patterns:
>
> - `src/analysis/retail/shaman/enhancement/modules/talents/Stormflurry.tsx`
> - `src/analysis/retail/shaman/elemental/modules/talents/Ascendance.tsx`

## addEventListener Signature

```typescript
addEventListener<ET extends EventType, E extends AnyEvent<ET>>(
  eventFilter: ET | EventFilter<ET>,
  listener: EventListener<ET, E>,
): void
```

## Basic Event Listener

```typescript
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent } from 'parser/core/Events';
import SPELLS from 'common/SPELLS';

class MyAnalyzer extends Analyzer {
  constructor(options: Options) {
    super(options);

    // Listen for cast events by the player
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FLAME_SHOCK),
      this.onFlameShockCast,
    );
  }

  onFlameShockCast(event: CastEvent) {
    // Handler is called for each matching event
    console.log('Flame Shock cast at', event.timestamp);
  }
}
```

## Event Filters

### Filter by Source

```typescript
// Events by the selected player
Events.cast.by(SELECTED_PLAYER);

// Events by player's pets
Events.cast.by(SELECTED_PLAYER_PET);

// Events by any source (use sparingly)
Events.cast;
```

### Filter by Spell

```typescript
// Single spell
Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FLAME_SHOCK);

// Multiple spells
Events.cast.by(SELECTED_PLAYER).spell([SPELLS.STORMSTRIKE, SPELLS.WINDSTRIKE_CAST]);

// With constant array
const STORMSTRIKE_CAST_SPELLS = [SPELLS.STORMSTRIKE, SPELLS.WINDSTRIKE_CAST];

Events.cast.by(SELECTED_PLAYER).spell(STORMSTRIKE_CAST_SPELLS);
```

### Filter by Target

```typescript
// Events targeting a specific combatant
Events.damage.by(SELECTED_PLAYER).to(targetId);
```

## Event Types

Common event types to listen for:

```typescript
// Casting events
Events.cast; // Spell cast completed
Events.begincast; // Spell cast started
Events.GlobalCooldown; // GCD event

// Damage events
Events.damage; // Damage dealt
Events.absorbed; // Damage absorbed

// Healing events
Events.heal; // Healing done

// Buff/Debuff events
Events.applybuff; // Buff applied
Events.applybuffstack; // Buff stack added
Events.refreshbuff; // Buff refreshed
Events.removebuff; // Buff removed
Events.removebuffstack; // Buff stack removed

Events.applydebuff; // Debuff applied
Events.applydebuffstack; // Debuff stack added
Events.removedebuff; // Debuff removed

// Resource events
Events.resourcechange; // Resource gained/spent

// Other events
Events.summon; // Pet/totem summoned
Events.fightend; // Fight ended
Events.any; // Any event (use sparingly)
```

## Event Listener Patterns

### Multiple Event Types for Same Handler

```typescript
constructor(options: Options) {
  super(options);

  // Same handler for different event types
  this.addEventListener(
    Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ASCENDANCE_ELEMENTAL_BUFF),
    this.onApplyAscendance,
  );
  this.addEventListener(
    Events.refreshbuff.by(SELECTED_PLAYER).spell(TALENTS_SHAMAN.ASCENDANCE_ELEMENTAL_TALENT),
    this.onApplyAscendance,
  );
}

// Handler accepts union type
onApplyAscendance(event: ApplyBuffEvent | RefreshBuffEvent) {
  // Handle both event types
}
```

### Conditional Listeners

Only register listeners if talent/item is active:

```typescript
constructor(options: Options) {
  super(options);

  this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.STORMFLURRY_TALENT);
  if (!this.active) {
    return;
  }

  // Only registered if talent is taken
  this.addEventListener(
    Events.cast.by(SELECTED_PLAYER).spell(STORMSTRIKE_CAST_SPELLS),
    this.onStormstrike,
  );
}
```

### Custom Event Types

Listen for fabricated/custom events:

```typescript
import Events, { EventType } from 'parser/core/Events';

constructor(options: Options) {
  super(options);

  // Listen for global cooldown events
  this.addEventListener(Events.GlobalCooldown, this.onGlobalCooldown);
}

onGlobalCooldown(event: GlobalCooldownEvent) {
  this.globalCooldownEnds = event.duration + event.timestamp;
}
```

### Any Event Listener

Use `Events.any` to process all events (expensive, use sparingly):

```typescript
constructor(options: Options) {
  super(options);

  // Listen for any event by the player
  this.addEventListener(
    Events.any.by(SELECTED_PLAYER),
    this.onCast,
  );
}

onCast(event: AnyEvent) {
  // Type checking often needed
  if (event.type === EventType.Cast) {
    const castEvent = event as CastEvent;
    // Process cast
  }
}
```

## Event Handler Patterns

### Event Handler Signature

```typescript
// Event handler receives exactly one parameter: the event
onCast(event: CastEvent) {
  // Process event
}

// Can use different names
handleDamage(event: DamageEvent) {
  // Process damage
}
```

### Type-Safe Event Handling

```typescript
import Events, {
  CastEvent,
  DamageEvent,
  ApplyBuffEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';

class MyAnalyzer extends Analyzer {
  onCast(event: CastEvent) {
    // TypeScript knows event.ability, event.targetID, etc.
    const spellId = event.ability.guid;
  }

  onDamage(event: DamageEvent) {
    // TypeScript knows event.amount, event.absorb, etc.
    const totalDamage = event.amount + (event.absorb || 0);
  }

  onApplyBuff(event: ApplyBuffEvent) {
    // TypeScript knows buff-specific properties
    const buffId = event.ability.guid;
  }
}
```

### Early Returns

Return early for events that don't match your criteria:

```typescript
onCast(event: CastEvent) {
  // Check for linked events
  if (!event._linkedEvents) {
    return;
  }

  // Check combatant state
  if (!this.selectedCombatant.hasBuff(SPELLS.ASCENDANCE_ELEMENTAL_BUFF.id)) {
    return;
  }

  // Check resource availability
  if (this.maelstromTracker.current < 60) {
    return;
  }

  // Process valid events
  this.processValidCast(event);
}
```

### Accessing Event Data

```typescript
onDamage(event: DamageEvent) {
  // Ability info
  const spellId = event.ability.guid;
  const spellName = event.ability.name;
  const spellIcon = event.ability.abilityIcon;

  // Damage info
  const damage = event.amount;
  const absorbed = event.absorb || 0;
  const overkill = event.overkill || 0;
  const totalDamage = damage + absorbed;

  // Critical hit
  const isCrit = event.hitType === HIT_TYPES.CRIT;

  // Timestamp
  const timestamp = event.timestamp;

  // Source and target
  const sourceId = event.sourceID;
  const targetId = event.targetID;
}

onResourceChange(event: ResourceChangeEvent) {
  // Resource type
  const resourceType = event.resourceChangeType;

  // Amount changed
  const change = event.resourceChange;
  const waste = event.waste || 0;

  // Check specific resource
  if (resourceType === RESOURCE_TYPES.MAELSTROM.id) {
    // Handle maelstrom change
  }
}
```

### Processing Linked Events

```typescript
import { GetRelatedEvent, GetRelatedEvents, EventType } from 'parser/core/Events';

onCast(event: CastEvent) {
  // Get single related event
  const precast = GetRelatedEvent(event, 'precast');
  if (precast) {
    // Process precast
  }

  // Get all related damage events
  const damages = GetRelatedEvents(event, EventType.Damage);
  damages.forEach((damage) => {
    this.totalDamage += damage.amount;
  });

  // Using _linkedEvents directly
  if (event._linkedEvents) {
    const stormstrikeDamages = event._linkedEvents
      .filter((le) => le.relation === EnhancementEventLinks.STORMSTRIKE_LINK)
      .map((le) => le.event as DamageEvent);
  }
}
```

## Complete Example

```typescript
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  ApplyBuffEvent,
  RemoveBuffEvent,
  GlobalCooldownEvent,
  FightEndEvent,
  EventType,
} from 'parser/core/Events';
import SPELLS from 'common/SPELLS/shaman';
import { TALENTS_SHAMAN } from 'common/TALENTS';
import MaelstromTracker from '../resources/MaelstromTracker';

class Ascendance extends Analyzer {
  static dependencies = {
    maelstromTracker: MaelstromTracker,
  };
  protected maelstromTracker!: MaelstromTracker;

  protected currentWindow: AscendanceWindow | null = null;
  protected globalCooldownEnds = 0;

  constructor(options: Options) {
    super(options);

    this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.ASCENDANCE_ELEMENTAL_TALENT);

    if (!this.active) {
      return;
    }

    // Global cooldown tracking
    this.addEventListener(Events.GlobalCooldown, this.onGlobalCooldown);

    // Ascendance cast
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS_SHAMAN.ASCENDANCE_ELEMENTAL_TALENT),
      this.onAscendanceCast,
    );

    // Ascendance buff application (for procs)
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ASCENDANCE_ELEMENTAL_BUFF),
      this.onAscendanceApply,
    );

    // Ascendance ending
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.ASCENDANCE_ELEMENTAL_BUFF),
      this.onAscendanceEnd,
    );

    // Track all casts during window
    this.addEventListener(Events.any.by(SELECTED_PLAYER), this.onCast);

    // Handle fight end
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onGlobalCooldown(event: GlobalCooldownEvent) {
    this.globalCooldownEnds = event.duration + event.timestamp;
  }

  onAscendanceCast(event: CastEvent) {
    this.currentWindow = {
      start: Math.max(event.timestamp, this.globalCooldownEnds),
      events: [],
    };
  }

  onAscendanceApply(event: ApplyBuffEvent) {
    // Handle procs from Deeply Rooted Elements
    if (!this.currentWindow) {
      this.currentWindow = {
        start: event.timestamp,
        events: [],
      };
    }
  }

  onAscendanceEnd(event: RemoveBuffEvent) {
    if (this.currentWindow) {
      this.currentWindow.end = event.timestamp;
      this.analyzeWindow(this.currentWindow);
      this.currentWindow = null;
    }
  }

  onCast(event: AnyEvent) {
    if (this.currentWindow && event.type === EventType.Cast) {
      this.currentWindow.events.push(event);
    }
  }

  onFightEnd(event: FightEndEvent) {
    if (this.currentWindow) {
      this.currentWindow.end = event.timestamp;
      this.analyzeWindow(this.currentWindow);
    }
  }

  analyzeWindow(window: AscendanceWindow) {
    // Analyze ascendance usage
  }
}
```
