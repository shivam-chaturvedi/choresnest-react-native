## Family Chores React Native Architecture Plan

### Folder Layout
- `src/screens/`: one screen per React JS route (Splash, Onboarding, Auth, Forgot Password, Home, Calendar, Tasks, Lists, Vault, More, Recipes, Recipe Detail, Meal Plan, Nutrition, Documents, Expenses, Family, Notifications, Privacy, Theme, Export, Help). Each file mirrors the web screen (`reactjs/src/pages/...`).
- `src/components/`: shared pieces such as `layout/` (AppLayout, BottomNavigation, AppSidebar), `dashboard/`, `family/`, `grocery/`, `lists/`, `mealplan/`, `mealprep/`, `modals/`, `notifications/`, `recipes/`, `search/`, `tutorial/`, and `ui/` utilities (Button, Input, Sheet, Toast, Tooltip equivalents).
- `src/contexts/`: `FamilyContext.tsx` and `MealPlanContext.tsx` copied from the web versions; expose identical APIs (members/events/groceries, planned meals/week, grocery generation).
- `src/hooks/`: ports of `use-mobile`, `use-toast`, `useFamilySync`, `useMealPrepScheduler`, `useNotifications`, `useRecipeRecommendations`, etc., adapted to RN (e.g., AsyncStorage instead of localStorage, Notification fallback).
- `src/data/`: recipes data from `reactjs/src/data/recipes.ts`.
- `src/integrations/`: Supabase client/types identical to web version but RN-compatible storage (Trsocial?). Ensure `client.ts` uses `import.meta.env` analogs or config for RN (e.g., `process.env` or `.env`).
- `src/theme.ts`: HSL-based colors/spacing/shadow derived from `reactjs/src/index.css` + `tailwind.config.ts`. Provide tokens for background/foreground/primary secondary/muted/border/shadow/radius.
- `src/navigation/`: React Navigation setup (AppNavigator stack for splash/onboarding/auth/main; TabNavigator for home/calendar/tasks/lists/more; Drawer for sidebar links). Equivalent to routes in `reactjs/src/App.tsx`.
- `src/assets/`: copy static assets (icons, fonts) if needed from `public/`.
- `src/App.tsx`: main entry uses `SafeAreaProvider`, status bar theme, and renders `AppNavigator`.

### Navigation Mapping (React Router → RN)
- React Router root (`/`) → Splash screen route in RN stack.
- `/onboarding` → OnboardingStack screen.
- `/auth` → Auth Stack/action.
- `/forgot-password` → ForgotPassword screen.
- `/home`, `/calendar`, `/tasks`, `/lists`, `/more` → TabNavigator tabs (home tab uses `HomeScreen`, other tabs similar). BottomNavigation component mirrors `reactjs/src/components/layout/BottomNavigation.tsx`.
- `/vault`, `/recipes`, `/meal-plan`, `/recipe/:id`, `/nutrition`, `/documents`, `/expenses`, `/family`, `/notifications`, `/privacy`, `/theme`, `/export`, `/help` → Stack screens launched from tabs/drawer actions so lookups match.
- Drawer (AppSidebar) exposes shortcuts to `/documents`, `/expenses`, `/privacy`, `/help`.
- Additional overlays (tutorial, search, notifications) remain modals layered on top of screens akin to React JS.

### Theming & Styling
- Extract CSS variables from `reactjs/src/index.css` (background `hsl(210,55%,95%)`, foreground `hsl(210,70%,15%)`, primary/secondary/muted, shadows, radii). Also reuse tailwind extensions (shadows `card`, `soft`, `elevated`, animations `scale-in`, `fade-in`) by approximating in RN.
- Create `theme.ts` exposing `colors` map, `spacing`, `radius`, `shadows`, `gradients`.
- All screens/components use `StyleSheet.create` plus `theme` tokens to ensure exact spacing/padding; implement gradient backgrounds with `react-native-linear-gradient` if needed, otherwise use RN `View` with background colors.
- For typography, stick to the same font stack (use Inter/Nunito via custom font linking or system fallback) and weights as the web version.

### State & Data Strategy
- Port `FamilyContext` and `MealPlanContext` to RN using React context + hooks, providing identical methods so screens can drop in with minimal changes.
- Keep sample data (members, events, grocery, recipes) in contexts/data modules to match React JS behavior.
- `useNotifications` adapts to RN: use `Notifications` API (if available) or fallback to `useToast`.
- `use-toast` reimplemented with RN `Toast` component (maybe `Portal` from RN but minimal toasts).
- Supabase client: copy `reactjs/src/integrations/supabase/client.ts` but ensure env vars resolved via `react-native-dotenv` or `process.env`.
- For data fetching, while React Query is used on web, RN can either reuse `@tanstack/react-query` (if installed) or just fetch via contexts; plan to keep the same query client + provider for parity.

### Output Location
- Save this plan in `architecture.md`. Subsequent prompts will use these paths when porting files.
