---
applyTo: '**'
---

# Verification and Validation

## Never Assume - Always Verify

**Critical Rule**: Never assume a spell, talent, buff, event type, or module exists in the codebase. Always verify by searching for it or asking follow-up questions.

## Search Before Coding

### Finding Spells

```bash
# Search for a spell by name
grep -r "Flame Shock" src/common/SPELLS/

# Search for a spell by ID
grep -r "188389" src/common/SPELLS/

# Search in specific class
grep -r "Ascendance" src/common/SPELLS/shaman.ts
```

Or use the file search:

- Check `src/common/SPELLS/` for manually-defined spells
- Check class-specific SPELLS files like `src/analysis/retail/shaman/enhancement/SPELLS.ts`

### Finding Talents

```bash
# Search for a talent
grep -r "STORMKEEPER_TALENT" src/common/TALENTS/

# Search in specific class
grep -r "Stormkeeper" src/common/TALENTS/shaman.ts
```

Talents are auto-generated in `src/common/TALENTS/{class}.ts`

### Finding Modules

```bash
# Search for an analyzer
find src/analysis/retail -name "Stormflurry.tsx"

# Search for similar implementations
grep -r "class.*extends Analyzer" src/analysis/retail/shaman/
```

### Finding Event Types

```bash
# Check Events.ts for available event types
grep "export enum EventType" src/parser/core/Events.ts -A 50

# Search for event usage
grep -r "EventType.Cast" src/analysis/retail/shaman/
```

## Verification Checklist

Before writing code, verify:

### ✅ Spell/Talent Exists

```typescript
// ❌ Don't assume
import SPELLS from 'common/SPELLS';
const spell = SPELLS.NONEXISTENT_SPELL; // Might not exist!

// ✅ Search first
// grep -r "LAVA_BURST" src/common/
// Found in TALENTS
import { TALENTS_SHAMAN } from 'common/TALENTS';
const spell = TALENTS_SHAMAN.LAVA_BURST_TALENT;
```

### ✅ Event Type Exists

```typescript
// ❌ Don't assume
Events.customEventType; // Might not exist

// ✅ Check Events.ts first
import Events, { EventType } from 'parser/core/Events';
// Available: Cast, Damage, Heal, ApplyBuff, etc.
```

### ✅ Module/Dependency Exists

```typescript
// ❌ Don't assume
import NonexistentTracker from 'parser/shared/modules/NonexistentTracker';

// ✅ Search for similar modules
// find src/parser/shared/modules -name "*Tracker*"
import MaelstromTracker from './modules/resources/MaelstromTracker';
```

### ✅ Property Exists on Event

```typescript
// ❌ Don't assume
onCast(event: CastEvent) {
  const damage = event.damage; // CastEvent doesn't have damage!
}

// ✅ Check event type definition
onDamage(event: DamageEvent) {
  const damage = event.amount; // DamageEvent has amount
}
```

## When to Ask Questions

Ask follow-up questions when:

1. **Spell/Talent Not Found**: "I can't find SPELL_X in the codebase. Can you verify the spell ID or name?"

2. **Unclear Module Structure**: "I see two different patterns for organizing analyzers. Which should I use for {class}/{spec}?"

3. **Missing Implementation**: "I don't see a tracker for {resource}. Should I create one or does it exist elsewhere?"

4. **Event Type Unclear**: "What event type should I listen for when {specific game mechanic happens}?"

5. **Ambiguous Requirements**: "Should this analyzer track {mechanic A} or {mechanic B}?"

## Code Verification

### Type Checking

Always run type checking after making changes:

```bash
pnpm typecheck
```

Fix all type errors before committing.

### Common Type Errors

```typescript
// ❌ Wrong event type
Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FLAME_SHOCK),
this.onDamage, // Handler expects DamageEvent, gets CastEvent

// ✅ Correct event type
Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FLAME_SHOCK),
this.onCast, // Handler expects CastEvent

// ❌ Optional property not handled
const damage = event.absorb + 100; // absorb might be undefined

// ✅ Handle optional property
const damage = (event.absorb || 0) + 100;

// ❌ Wrong import path
import SPELLS from 'common/SPELLS'; // Generic
const spell = SPELLS.FLAME_SHOCK; // Might not be there

// ✅ Specific import
import SPELLS from 'common/SPELLS/shaman'; // Class-specific
```

### Testing Changes

1. **Build the Code**:

```bash
pnpm typecheck
```

2. **Check for Lint Errors**:

```bash
pnpm lint
```

3. **Manual Verification**:

- Start dev server: `pnpm start`
- Load a relevant combat log
- Verify analyzer appears in statistics/guide
- Check for console errors

### Common Mistakes

#### 1. Spell and Talent Objects

```typescript
// ✅ Using a talent object where Spell | Talent is expected
import { TALENTS_SHAMAN } from 'common/TALENTS';
Events.cast.by(SELECTED_PLAYER).spell(TALENTS_SHAMAN.ASCENDANCE_ELEMENTAL_TALENT);
```

#### 2. Missing Dependencies

```typescript
// ❌ Using dependency without declaring it
class MyAnalyzer extends Analyzer {
  onCast(event: CastEvent) {
    this.spellUsable.isAvailable(spellId); // spellUsable is undefined!
  }
}

// ✅ Declare dependency
class MyAnalyzer extends Analyzer.withDependencies({
  spellUsable: SpellUsable,
}) {
  onCast(event: CastEvent) {
    if (this.deps.spellUsable.chargesAvailable(event.ability.guid)) {
    }
  }
}

// ✅ Declare dependency alternative
class MyAnalyzer extends MajorCooldown<BigCooldown> {
  static dependencies = {
    spellUsable: SpellUsable,
  };
  protected spellUsable!: SpellUsable;
}
```

#### 3. Wrong Event Handler Signature

```typescript
// ❌ Handler with no parameters or wrong parameters
onCast() { } // Missing event parameter
onCast(event: CastEvent, index: number) { } // Extra parameter

// ✅ Correct handler signature
onCast(event: CastEvent) { }
```

#### 4. Accessing Properties on Wrong Event Type

```typescript
// ❌ Damage properties on cast event
onCast(event: CastEvent) {
  const damage = event.amount; // CastEvent doesn't have amount
}

// ✅ Use correct event type
onDamage(event: DamageEvent) {
  const damage = event.amount;
}
```
