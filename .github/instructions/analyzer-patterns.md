---
applyTo: '**'
---

# Analyzer Patterns

## Overview

Analyzers are modules that process combat log events and generate statistics, suggestions, and guide content. They extend the `Analyzer` base class and use an event-driven architecture.

> **Clean Code Examples**: Refer to Enhancement and Elemental shaman specs for well-structured examples:
> - `src/analysis/retail/shaman/enhancement/`
> - `src/analysis/retail/shaman/elemental/`

## Basic Analyzer Structure

```typescript
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, DamageEvent } from 'parser/core/Events';
import SPELLS from 'common/SPELLS';
import { TALENTS_SHAMAN } from 'common/TALENTS';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';

class Stormflurry extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };
  protected abilityTracker!: AbilityTracker;

  protected extraHits = 0;
  protected extraDamage = 0;

  constructor(options: Options) {
    super(options);
    
    // Conditionally activate based on talents
    this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.STORMFLURRY_TALENT);
    if (!this.active) {
      return;
    }

    // Register event listeners
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.STORMSTRIKE),
      this.onStormstrike,
    );
  }

  onStormstrike(event: CastEvent) {
    // Process event
    if (!event._linkedEvents) {
      return;
    }
    // ... analyzer logic
  }

  statistic() {
    // Return UI component
    return (
      <Statistic>
        {/* Display results */}
      </Statistic>
    );
  }
}

export default Stormflurry;
```

## Key Patterns

### 1. Conditional Activation

Always check if the analyzer should be active based on talents, items, or spec:

```typescript
constructor(options: Options) {
  super(options);
  
  // Deactivate if talent not selected
  this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.ASCENDANCE_ELEMENTAL_TALENT) ||
    this.selectedCombatant.hasTalent(TALENTS_SHAMAN.DEEPLY_ROOTED_ELEMENTS_TALENT);
  
  if (!this.active) {
    return;
  }
  
  // ... rest of constructor
}
```

### 2. Dependencies

Use `static dependencies` to inject other modules:

```typescript
class Ascendance extends Analyzer {
  static dependencies = {
    abilities: Abilities,
    enemies: Enemies,
    spellUsable: SpellUsable,
    maelstromTracker: MaelstromTracker,
  };

  protected abilities!: Abilities;
  protected enemies!: Enemies;
  protected spellUsable!: SpellUsable;
  protected maelstromTracker!: MaelstromTracker;

  constructor(options: Options) {
    super(options);
    // Dependencies are automatically injected
    // Access via this.maelstromTracker.current
  }
}
```

### 3. State Tracking

Track state across events using instance properties:

```typescript
class FlameShock extends Analyzer {
  protected uptimeHistory: Array<{ start: number; end?: number }> = [];
  protected badLavaBursts = 0;
  protected currentDebuffStacks = 0;

  onApplyDebuff(event: ApplyDebuffEvent) {
    this.uptimeHistory.push({ start: event.timestamp });
    this.currentDebuffStacks += 1;
  }

  onRemoveDebuff(event: RemoveDebuffEvent) {
    const lastEntry = this.uptimeHistory[this.uptimeHistory.length - 1];
    if (lastEntry) {
      lastEntry.end = event.timestamp;
    }
    this.currentDebuffStacks -= 1;
  }
}
```

### 4. Accessing Combatant Info

Use `this.selectedCombatant` to check player state:

```typescript
onCast(event: CastEvent) {
  // Check if player has a buff
  const hasBuff = this.selectedCombatant.hasBuff(SPELLS.ASCENDANCE_ELEMENTAL_BUFF.id);
  
  // Check talent rank (for multi-rank talents)
  const rank = this.selectedCombatant.getTalentRank(TALENTS_SHAMAN.STORMKEEPER_TALENT);
  
  // Check if player has talent
  if (this.selectedCombatant.hasTalent(TALENTS_SHAMAN.ELEMENTAL_BLAST_TALENT)) {
    // Do something
  }
}
```

### 5. Using Linked Events

Access related events that were linked by normalizers:

```typescript
onStormstrike(event: CastEvent) {
  if (!event._linkedEvents) {
    return;
  }
  
  // Get all linked damage events
  const damageEvents = event._linkedEvents
    .filter((le) => le.relation === EnhancementEventLinks.STORMSTRIKE_LINK)
    .map((le) => le.event as DamageEvent);
  
  // Process damage events
  damageEvents.forEach((damageEvent) => {
    this.extraDamage += damageEvent.amount + (damageEvent.absorb || 0);
  });
}
```

Or use helper functions:

```typescript
import { GetRelatedEvent, GetRelatedEvents } from 'parser/core/Events';

onCast(event: CastEvent) {
  // Get single related event
  const precast = GetRelatedEvent(event, 'precast');
  
  // Get multiple related events
  const damages = GetRelatedEvents<DamageEvent>(event, 'damage');
}
```

## Output Methods

### statistic()

Returns a UI component displayed in the statistics tab:

```typescript
statistic() {
  return (
    <Statistic
      position={STATISTIC_ORDER.OPTIONAL()}
      category={STATISTIC_CATEGORY.TALENTS}
      size="flexible"
      tooltip={<>Detailed tooltip content</>}
    >
      <TalentSpellText talent={TALENTS_SHAMAN.STORMFLURRY_TALENT}>
        <ItemDamageDone amount={this.extraDamage} />
      </TalentSpellText>
    </Statistic>
  );
}
```

### guideSubsection()

Returns a guide component for the analysis guide:

```typescript
get guideSubsection() {
  return (
    <SubSection title={<><SpellLink spell={SPELLS.FLAME_SHOCK} /></>}>
      <ExplanationAndDataSubSection
        explanation={<p>Keep Flame Shock active on your target.</p>}
        data={<div>{formatPercentage(this.uptime)}% uptime</div>}
      />
    </SubSection>
  );
}
```

## Common Helpers

### Owner Methods

```typescript
// Get total healing/damage done
this.owner.getPercentageOfTotalHealingDone(amount);
this.owner.getPercentageOfTotalDamageDone(amount);

// Fight duration
this.owner.fightDuration; // in milliseconds

// Fight info
this.owner.info.fightStart;
this.owner.info.fightEnd;
```

### Calculation Helpers

```typescript
import { calculateEffectiveHealing, calculateEffectiveDamage } from 'parser/core/EventCalculateLib';

// Calculate effective increase from a multiplier
const effectiveHealing = calculateEffectiveHealing(event, 0.25); // 25% increase
```

## Module Types

### Talent Analyzers

Location: `modules/talents/`

Analyze specific talent usage and provide recommendations:

```typescript
// src/analysis/retail/shaman/enhancement/modules/talents/Stormflurry.tsx
class Stormflurry extends Analyzer {
  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.STORMFLURRY_TALENT);
    // ...
  }
}
```

### Core Modules

Location: `modules/core/`

Handle core spec mechanics:

```typescript
// src/analysis/retail/shaman/elemental/modules/core/FlameShock.tsx
class FlameShock extends BaseFlameShock {
  // Track flame shock uptime, bad lava burst usage, etc.
}
```

### Feature Modules

Location: `modules/features/`

General purpose analyzers (ABC, cooldown tracking, etc.):

```typescript
// src/analysis/retail/shaman/enhancement/modules/features/AlwaysBeCasting.tsx
class AlwaysBeCasting extends CoreAlwaysBeCasting {
  // Customized ABC for the spec
}
```
