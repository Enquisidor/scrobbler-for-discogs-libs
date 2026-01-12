# Scrobbler for Discogs - Shared Library

Shared business logic, utilities, and services for both web and mobile versions of Scrobbler for Discogs.

## What's Included

### ✅ 100% Shared Code
- **Types** (`types.ts`) - All TypeScript interfaces and types
- **Utilities**:
  - `queueUtils` - Track preparation, timestamp calculation
  - `collectionUtils` - Metadata correction logic
  - `collectionSyncUtils` - Collection merging
  - `formattingUtils` - Artist name formatting
  - `fuzzyUtils` - Fuzzy search algorithms (Levenshtein distance)
  - `sortCollection` - Collection sorting with multiple options
  - `credentialsUtils` - Last.fm signature generation
- **Services**:
  - `appleMusic/*` - Apple Music metadata fetching
  - `musicbrainz/*` - MusicBrainz metadata fetching

### 🔌 Platform Adapters (Interfaces Only)
The library defines interfaces that must be implemented by each platform:

- **CryptoAdapter** - HMAC-SHA1 and MD5 hashing
- **StorageAdapter** - Persistent storage (localStorage/AsyncStorage)

## Usage

### In Web App
```typescript
import { queueUtils, fuzzySearch, CryptoAdapter } from 'scrobbler-for-discogs-libs';

// Provide web-specific crypto implementation
const webCrypto: CryptoAdapter = {
  hmacSha1Base64: (msg, key) => CryptoJS.HmacSHA1(msg, key).toString(CryptoJS.enc.Base64),
  md5: (msg) => CryptoJS.MD5(msg).toString(),
  rfc3986encode: (str) => /* ... */
};
```

### In Mobile App
```typescript
import { queueUtils, fuzzySearch, CryptoAdapter } from 'scrobbler-for-discogs-libs';
import CryptoJS from 'crypto-js';

// Provide React Native crypto implementation
const mobileCrypto: CryptoAdapter = {
  hmacSha1Base64: (msg, key) => CryptoJS.HmacSHA1(msg, key).toString(CryptoJS.enc.Base64),
  md5: async (msg) => await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, msg),
  rfc3986encode: (str) => /* ... */
};
```

## Development

```bash
# Build the library
npm run build

# Watch for changes
npm run watch
```

## Code Reusability

- **~85%** of business logic is shared
- **Platform adapters** handle web vs mobile differences
- **Single source of truth** for algorithms and utilities

## Architecture Benefits

1. **Maintainability** - Fix bugs in one place
2. **Consistency** - Same logic on web and mobile
3. **Type Safety** - Shared TypeScript types
4. **Testability** - Test business logic once
5. **Bundle Optimization** - Tree-shakeable exports

## CI/CD

### GitHub Actions

The library uses GitHub Actions for continuous integration:

- **Workflow**: `.github/workflows/build.yml`
- **Triggers**: Push/PR to `main` or `develop` branches
- **Node versions**: Tests on Node 20.x and 22.x
- **Steps**:
  1. Checkout code
  2. Install dependencies with npm ci
  3. Build library with npm run build
  4. Verify build artifacts (dist/index.js, dist/index.d.ts)
  5. Upload artifacts (Node 22.x only)

### Status Badge

```markdown
![Build Status](https://github.com/YOUR_USERNAME/scrobbler-for-discogs-libs/workflows/Build%20and%20Test/badge.svg)
```

### Web and Mobile App CI

Both web and mobile app repositories have their own GitHub Actions workflows that:

1. Check out the app repository
2. Check out the shared library repository
3. Build the shared library
4. Install and link the library locally
5. Build and test the app

This ensures that changes to the shared library don't break dependent applications.
