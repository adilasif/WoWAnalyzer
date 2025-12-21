---
applyTo: '**'
---

# Tech Stack

## Core Technologies

### TypeScript & React
- **Language**: TypeScript 5.9.3 (strict mode enabled)
- **UI Framework**: React 19.2.0 with React Hooks
- **JSX Transform**: `react-jsx` (automatic runtime)
- **Styling**: Emotion (`@emotion/react`, `@emotion/styled`)

```typescript
// Example component with Emotion styling
import styled from '@emotion/styled';
import { Trans } from '@lingui/macro';

const Container = styled.div`
  padding: 20px;
  background: #222;
`;

function MyComponent() {
  return (
    <Container>
      <Trans>Hello World</Trans>
    </Container>
  );
}
```

### Build System
- **Build Tool**: Vite 7.1.12
- **Package Manager**: pnpm 9.5.0
- **Module Resolution**: Bundler mode with path aliases

```typescript
// Path aliases available in tsconfig.json
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/mage';
import Analyzer from 'parser/core/Analyzer';
import { SpellIcon } from 'interface';
```

### State Management
- **Redux**: Redux Toolkit 2.9.2 with Redux Thunk
- **React Redux**: 9.2.0

### Internationalization
- **Library**: @lingui/core 5.5.1 with @lingui/macro
- **Format**: JSON format with lingui extract

```typescript
// Using lingui macros for translations
import { Trans, t } from '@lingui/macro';

// In JSX
<Trans>Cast efficiency</Trans>

// In code
const message = t`Not enough mana`;
```

### Testing
- **Test Runner**: Vitest 3.2.4
- **Testing Library**: @testing-library/react 16.3.0
- **E2E Testing**: Playwright 1.54

### Linting & Formatting
- **ESLint**: 9.38.0 with typescript-eslint 8.46.2
- **Prettier**: 3.6.2
- **Pre-commit**: Husky with lint-staged

## Project Structure

```
src/
├── analysis/retail/          # Spec-specific analyzers
│   ├── shaman/
│   │   ├── enhancement/
│   │   │   ├── CombatLogParser.tsx    # Registers all modules
│   │   │   ├── CONFIG.tsx             # Spec configuration
│   │   │   ├── modules/
│   │   │   │   ├── talents/           # Talent analyzers
│   │   │   │   ├── spells/            # Spell analyzers
│   │   │   │   ├── normalizers/       # Event normalizers
│   │   │   │   ├── core/              # Core modules
│   │   │   │   └── features/          # Feature modules
│   │   │   └── Guide.tsx              # Guide component
│   │   ├── elemental/
│   │   └── shared/                    # Shared shaman code
│   └── [other classes]/
├── common/
│   ├── SPELLS/              # Spell definitions
│   └── TALENTS/             # Talent definitions (generated)
├── game/                    # Game constants (RESOURCE_TYPES, etc)
├── interface/               # UI components
├── parser/
│   ├── core/                # Core parser framework
│   ├── shared/              # Shared parser modules
│   └── retail/              # Retail-specific modules
└── localization/            # Translation files
```

## Key Conventions

### Module Resolution
Use path aliases instead of relative imports:
```typescript
// ✅ Correct
import SPELLS from 'common/SPELLS';
import Analyzer from 'parser/core/Analyzer';

// ❌ Incorrect
import SPELLS from '../../../../common/SPELLS';
```

### File Organization
- Talent analyzers: `src/analysis/retail/{class}/{spec}/modules/talents/`
- Spell analyzers: `src/analysis/retail/{class}/{spec}/modules/spells/`
- Normalizers: `src/analysis/retail/{class}/{spec}/modules/normalizers/`
- Core modules: `src/analysis/retail/{class}/{spec}/modules/core/`
- Feature modules: `src/analysis/retail/{class}/{spec}/modules/features/`
- Guide components: `src/analysis/retail/{class}/{spec}/guide/`

> Note: Some older specs use different structures (e.g., `analyzers/` instead of `modules/talents/`). 
> Prefer the Enhancement/Elemental shaman structure for new code.

### Naming Conventions
- Classes: PascalCase (`ArcaneBarrage`, `SpellUsable`)
- Files: PascalCase for components/classes (`ArcaneBarrage.tsx`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_ARCANE_CHARGES`)

## Dependencies to Know

### Parser Core
- `parser/core/Analyzer` - Base class for all analyzers
- `parser/core/Events` - Event types and utilities
- `parser/core/EventFilter` - Event filtering for listeners
- `parser/core/EventLinkNormalizer` - Links related events
- `parser/core/EventOrderNormalizer` - Reorders events

### Parser Shared Modules
- `parser/shared/modules/SpellUsable` - Track spell cooldowns
- `parser/shared/modules/Combatants` - Access to combatant info
- `parser/shared/modules/StatTracker` - Track stat changes
- `parser/shared/modules/resources/resourcetracker/ResourceTracker` - Track resources

### Common Data
- `common/SPELLS` - Spell definitions (manually maintained)
- `common/TALENTS/{class}` - Talent definitions (auto-generated)
- `game/RESOURCE_TYPES` - Resource type constants

### UI Components
- `interface` - Reusable UI components (SpellIcon, SpellLink, etc)
- `parser/ui` - Parser-specific UI components

## Build Commands

```bash
# Development server
pnpm start

# Type checking
pnpm typecheck

# Build production
pnpm build

# Linting
pnpm lint
pnpm lint:fix

# Extract translations
pnpm extract

# Generate talents (from Blizzard API)
pnpm generate-talents
```
