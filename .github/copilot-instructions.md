# WoWAnalyzer Development Guidelines

WoWAnalyzer is a World of Warcraft combat log analyzer built with React and TypeScript. This guide covers the tech stack, design patterns, and best practices for contributing to the project.

## Documentation Index

- **[Tech Stack](instructions/tech-stack.md)** - Core technologies, dependencies, and project structure
- **[Analyzer Patterns](instructions/analyzer-patterns.md)** - How to create analyzers that process combat log events
- **[Event Listeners](instructions/event-listeners.md)** - Event-driven architecture and listener patterns
- **[Normalizers](instructions/normalizers.md)** - Pre-processing events and linking related events
- **[Verification](instructions/verification.md)** - How to verify code and avoid assumptions
- **[Build Instructions](instructions/build.instructions.md)** - Building and testing
- **[Follow-up questions](instructions/follow-up-questions.instructions.md)** - Always ask for clarification until you have 97% confidence that you know what to build

## Quick Start

### Project Overview

- **Language**: TypeScript (strict mode)
- **Framework**: React 19 with Hooks
- **Build Tool**: Vite
- **Package Manager**: pnpm

### Common Commands

```bash
pnpm start      # Start development server
pnpm typecheck  # Run TypeScript type checking
pnpm lint       # Run linting
pnpm build      # Build for production
```

## Core Principles

### 1. Never Assume - Always Verify

**Do not assume** that a spell, talent, module, or event type exists. Always:
- Search the codebase first using `grep` or `find`
- Check `src/common/SPELLS/` and `src/common/TALENTS/`
- Ask follow-up questions if uncertain
- Verify with `pnpm typecheck`

See [Verification Guide](instructions/verification.md) for details.

### 2. Use Clean Code Examples

When implementing new features or fixing bugs, refer to these clean, well-structured examples:

**Primary Examples**
- `src/analysis/retail/monk/brewmaster/` - Brewmaster Monk
- `src/analysis/retail/shaman/enhancement/` - Enhancement Shaman

**Structure Example**:
```
src/analysis/retail/{class}/{spec}/
├── CombatLogParser.tsx        # Register all modules
├── CONFIG.tsx                 # Spec configuration
├── Guide.tsx                  # Guide component
├── modules/
│   ├── talents/               # Talent-specific analyzers
│   ├── spells/                # Spell analyzers
│   ├── core/                  # Core mechanics
│   ├── features/              # General features
│   └── normalizers/           # Event normalizers
```

### 3. Follow Type Safety

- Use proper TypeScript types
- Specify event types in handlers: `onCast(event: CastEvent)`
- Handle optional properties: `event.absorb || 0`

### 4. Use Path Aliases

```typescript
// ✅ Good - use path aliases
import SPELLS from 'common/SPELLS';
import Analyzer from 'parser/core/Analyzer';
import { TALENTS_SHAMAN } from 'common/TALENTS';

// ❌ Bad - don't use relative paths
import SPELLS from '../../../../common/SPELLS';
```

## Module Design Patterns

### Analyzer Basic Structure

```typescript
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent } from 'parser/core/Events';
import { TALENTS_SHAMAN } from 'common/TALENTS';

class MyAnalyzer extends Analyzer {
  static dependencies = {
    // Declare dependencies here
  };

  constructor(options: Options) {
    super(options);
    
    // Check if analyzer should be active
    this.active = this.selectedCombatant.hasTalent(TALENTS_SHAMAN.MY_TALENT);
    if (!this.active) {
      return;
    }

    // Register event listeners
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.MY_SPELL),
      this.onCast,
    );
  }

  onCast(event: CastEvent) {
    // Handle event
  }

  statistic() {
    // Return UI component
    return <Statistic>{/* ... */}</Statistic>;
  }
}
```

### Event Listeners

```typescript
// Listen for specific events
this.addEventListener(
  Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FLAME_SHOCK),
  this.onFlameShockCast,
);

// Handler receives one parameter: the event
onFlameShockCast(event: CastEvent) {
  // Process event
}
```

See [Event Listeners Guide](instructions/event-listeners.md) for complete patterns.

### Normalizers

Use normalizers to link related events:

```typescript
import BaseEventLinkNormalizer, { EventLink } from 'parser/core/EventLinkNormalizer';

const links: EventLink[] = [{
  linkRelation: 'cast-to-damage',
  linkingEventId: SPELLS.LIGHTNING_BOLT.id,
  linkingEventType: EventType.Cast,
  referencedEventId: SPELLS.LIGHTNING_BOLT.id,
  referencedEventType: EventType.Damage,
  forwardBufferMs: 500,
  anyTarget: true,
}];

class EventLinkNormalizer extends BaseEventLinkNormalizer {
  constructor(options: Options) {
    super(options, links);
  }
}
```

See [Normalizers Guide](instructions/normalizers.md) for complete patterns.

## Common Patterns

### Check Combatant State

```typescript
// Check for buff
this.selectedCombatant.hasBuff(SPELLS.ASCENDANCE_ELEMENTAL_BUFF.id)

// Check talent
this.selectedCombatant.hasTalent(TALENTS_SHAMAN.STORMKEEPER_TALENT)

// Get talent rank
this.selectedCombatant.getTalentRank(TALENTS_SHAMAN.STORMKEEPER_TALENT)
```

### Access Linked Events

```typescript
import { GetRelatedEvent, GetRelatedEvents } from 'parser/core/Events';

// Get single linked event
const damage = GetRelatedEvent<DamageEvent>(event, 'cast-to-damage');

// Get all linked events
const damages = GetRelatedEvents<DamageEvent>(event, 'cast-to-damage');
```

### Track Resources

```typescript
class MyResourceTracker extends ResourceTracker {
  constructor(options: Options) {
    super(options);
    this.resource = RESOURCE_TYPES.MAELSTROM;
    this.maxResource = 100;
  }
}

// Use in analyzer
this.maelstromTracker.current  // Current amount
this.maelstromTracker.spent    // Total spent
this.maelstromTracker.wasted   // Total wasted
```

## File Organization

### Where to Put Files

- Talent analyzers: `modules/talents/TalentName.tsx`
- Spell analyzers: `modules/spells/SpellName.tsx`
- Normalizers: `modules/normalizers/NormalizerName.tsx`
- Core mechanics: `modules/core/MechanicName.tsx`
- Features: `modules/features/FeatureName.tsx`
- Guide sections: `guide/SectionName.tsx`

### Naming Conventions

- Files: PascalCase (`Stormflurry.tsx`)
- Classes: PascalCase (`class Stormflurry`)
- Functions: camelCase (`onCast()`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_CHARGES`)

## Getting Help

If you're unsure about:
- Whether a spell/talent exists → Search the codebase or ask
- Which pattern to follow → Check Brewmaster Monk/Enhancement Shaman examples
- How to implement something → See documentation links above or ask
- Event types or APIs → Check `src/parser/core/` files or ask

**When in doubt, ask! It's better to clarify than to assume.**
