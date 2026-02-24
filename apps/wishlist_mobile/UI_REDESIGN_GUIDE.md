# Wishlist Mobile UI/UX Redesign - Implementation Guide

## Overview
Complete UI/UX overhaul with new design system, splash screen, landing page, deadline feature with countdown, and swipe-to-delete functionality.

## New Dependencies

### Required Packages
```json
"@react-native-community/datetimepicker": "^8.2.0"
"react-native-gesture-handler": "^2.20.2"
```

### Installation Commands
```bash
cd apps/wishlist_mobile
npm install
cd ios && pod install && cd ..
```

## Files Created

### 1. Design System (Theme)
- `src/theme/colors.js` - Color palette (primary purple #6C63FF, white base, grays)
- `src/theme/spacing.js` - Spacing scale (xs to huge)
- `src/theme/typography.js` - Typography system (h1-h5, body, small, caption)
- `src/theme/shadows.js` - Shadow presets (sm, md, lg, xl)
- `src/theme/borderRadius.js` - Border radius scale
- `src/theme/index.js` - Theme exports

### 2. Utilities
- `src/utils/countdown.js` - Countdown timer functions for deadline display

### 3. New Screens
- `src/screens/SplashScreen.js` - 1-second splash with logo and loader
- `src/screens/LandingScreen.js` - Pre-auth landing with hero and CTAs

## Files Modified

### 1. App.tsx
- Added splash screen state
- Shows splash for 1 second before routing to Landing or Main

### 2. Navigation
- `src/navigation/types.ts` - Added Landing screen type
- `src/navigation/RootNavigator.tsx` - Added Landing as initial route for unauthenticated users

### 3. WishlistListScreen.tsx
**Major Changes:**
- New design with theme integration
- Welcome header showing user's name
- Beautiful empty state with CTA button
- Swipe-to-delete with confirmation dialog (Russian text: "Вы уверены?")
- Countdown timer for deadlines (updates every minute)
- Card redesign with rounded corners, shadows, deadline display
- Progress tracking for time remaining

**Features:**
- Swipe left on any wishlist card to reveal delete button
- Countdown shows "X days left" or "X hours left"
- Expired deadlines show in red
- Empty state: "Add your first wishlist 🎁" with primary button

### 4. package.json
- Added datetimepicker dependency
- Added gesture-handler dependency

## Design System Usage

### Colors
```javascript
import {colors} from '../theme';

// Primary purple
colors.primary // '#6C63FF'

// Text colors
colors.text.primary // '#1A1A1A'
colors.text.secondary // '#6B7280'
colors.text.tertiary // '#9CA3AF'

// Backgrounds
colors.background.primary // '#FFFFFF'
colors.background.secondary // '#F9FAFB'

// Status colors
colors.status.success // '#10B981'
colors.status.error // '#EF4444'
```

### Typography
```javascript
import {typography} from '../theme';

// Usage in StyleSheet
{
  ...typography.h3, // fontSize: 24, fontWeight: '600', lineHeight: 32
  color: colors.text.primary,
}
```

### Spacing
```javascript
import {spacing} from '../theme';

padding: spacing.lg // 16
marginBottom: spacing.xl // 20
```

### Shadows
```javascript
import {shadows} from '../theme';

...shadows.md // Soft shadow for cards
```

## Key Features Implemented

### 1. Splash Screen
- White background with purple branding
- Gift emoji icon
- "Wishlist" title in purple
- Small loading indicator
- 1-second duration before routing

### 2. Landing Screen
- Hero section: "Share your wishes, **surprise** your friends"
- Primary CTA: "Get started free" → Register
- Secondary CTA: "Log in" → Login
- Feature highlights with emojis
- Fully responsive layout

### 3. Swipe-to-Delete
- Swipe left on wishlist cards
- Red delete background appears
- Trash icon button
- Confirmation dialog in Russian:
  - Title: "Вы уверены?"
  - Message: "Удалить вишлист "{title}"?"
  - Buttons: "Отмена" (Cancel) / "Да" (Yes, destructive)

### 4. Deadline & Countdown
- Backend already supports `deadline` field in Wishlist
- Countdown updates every 60 seconds
- Display format:
  - "X days left" (if > 24 hours)
  - "X hours left" (if < 24 hours, > 1 hour)
  - "X minutes left" (if < 1 hour)
  - "Expired" (if past deadline, shown in red)
- Date format: "Due Jan 15, 2025"

### 5. Empty States
- Home screen when no wishlists:
  - Large gift emoji
  - "Add your first wishlist" title
  - Descriptive subtitle
  - Primary action button

## Next Steps (TODO)

### 1. Add Deadline Picker to CreateWishlistScreen
```javascript
import DateTimePicker from '@react-native-community/datetimepicker';

// Add state
const [deadline, setDeadline] = useState(null);
const [showDatePicker, setShowDatePicker] = useState(false);

// Add to createWishlist call
await createWishlist({
  title: title.trim(),
  description: description.trim(),
  is_public: isPublic,
  deadline: deadline ? deadline.toISOString() : null,
});
```

### 2. Update Other Screens with New Theme
Apply theme to:
- LoginScreen.tsx
- RegisterScreen.tsx
- WishlistDetailScreen.tsx
- ItemDetailScreen.tsx
- CreateItemScreen.tsx
- EditItemScreen.tsx

### 3. iOS Configuration
Add to `ios/wishlist_mobile/Info.plist`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Allow access to select images for wishlist items</string>
```

### 4. Android Configuration
Gesture handler is auto-configured via autolinking.

## Testing Steps

1. **Install dependencies:**
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

2. **Run the app:**
   ```bash
   npm run ios
   # or
   npm run android
   ```

3. **Test flow:**
   - App starts → Splash screen (1s)
   - Not logged in → Landing screen
   - Tap "Get started free" → Register
   - After login → Welcome screen with user name
   - No wishlists → Empty state with CTA
   - Create wishlist → See it in list
   - Swipe left on card → Delete button appears
   - Tap delete → Confirmation dialog
   - Confirm → Wishlist deleted

4. **Test countdown:**
   - Create wishlist with deadline via backend/web
   - Open mobile app
   - See "Due {date}" and "{time} left"
   - Wait 1 minute → Countdown updates

## Design Reference

### Color Palette
- **Primary:** #6C63FF (Purple)
- **White:** #FFFFFF
- **Black:** #000000
- **Text Primary:** #1A1A1A
- **Text Secondary:** #6B7280
- **Background:** #F9FAFB (Light gray)

### Card Style
- Background: White
- Border radius: 20px
- Shadow: Soft, 8px blur, 0.08 opacity
- Padding: 16px

### Typography Scale
- H1: 32px / 700
- H2: 28px / 700
- H3: 24px / 600
- H4: 20px / 600
- H5: 18px / 600
- Body: 16px / 400
- Small: 14px / 400
- Caption: 12px / 400

## Known Issues

### TypeScript Warnings
The theme files use `.js` extension with string fontWeight values, which causes TypeScript strict type checking warnings in `.tsx` files. These are cosmetic and don't affect runtime. To fix:
- Convert theme files to `.ts`
- Use proper type definitions
- Or add `// @ts-ignore` above spread operators

### Gesture Handler
If swipe-to-delete doesn't work:
1. Ensure gesture-handler is installed
2. Add to `index.js` (top of file):
   ```javascript
   import 'react-native-gesture-handler';
   ```

## Architecture Notes

- **Theme:** Centralized design tokens in `src/theme/`
- **Countdown:** Client-side calculation, updates every 60s
- **Swipe:** Native PanResponder (no external library needed)
- **Deadline Storage:** Backend field `deadline` (ISO string)
- **Empty States:** Conditional rendering based on data length

## Performance Optimizations

- Countdown interval cleared on unmount
- useCallback for all handlers
- Memoized keyExtractor
- Animated values with native driver
- Minimal re-renders with proper state management
