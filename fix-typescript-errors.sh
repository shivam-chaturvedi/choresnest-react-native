#!/bin/bash
# Script to fix all TypeScript implicit 'any' type errors

# Fix FamilyDashboard.tsx
sed -i '' 's/\.filter(t =>/\.filter((t: any) =>/g' src/components/dashboard/FamilyDashboard.tsx
sed -i '' 's/\.filter(i =>/\.filter((i: any) =>/g' src/components/dashboard/FamilyDashboard.tsx

# Fix FamilyOnboarding.tsx
sed -i '' 's/\.map(m =>/\.map((m: any) =>/g' src/components/family/FamilyOnboarding.tsx

# Fix AppSidebar.tsx
sed -i '' 's/\.map(m =>/\.map((m: any) =>/g' src/components/layout/AppSidebar.tsx
sed -i '' 's/\.find(m =>/\.find((m: any) =>/g' src/components/layout/AppSidebar.tsx
sed -i '' 's/members\.map(member =>/members\.map((member: any) =>/g' src/components/layout/AppSidebar.tsx

# Fix AddEventModal.tsx
sed -i '' 's/\.map(m =>/\.map((m: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' 's/\.filter(e =>/\.filter((e: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' 's/\.filter(t =>/\.filter((t: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' 's/\.find(m =>/\.find((m: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' 's/members\.map(member =>/members\.map((member: any) =>/g' src/components/modals/AddEventModal.tsx

# Fix AddMemberModal.tsx
sed -i '' 's/\.find(m =>/\.find((m: any) =>/g' src/components/modals/AddMemberModal.tsx

# Fix AddShoppingItemModal.tsx
sed -i '' 's/\.map(cat =>/\.map((cat: any) =>/g' src/components/modals/AddShoppingItemModal.tsx

# Fix AddTaskModal.tsx
sed -i '' 's/members\.map(member =>/members\.map((member: any) =>/g' src/components/modals/AddTaskModal.tsx

# Fix CalendarScreen.tsx
sed -i '' 's/\.find(m =>/\.find((m: any) =>/g' src/screens/CalendarScreen.tsx
sed -i '' 's/\.find(c =>/\.find((c: any) =>/g' src/screens/CalendarScreen.tsx

# Fix ListsScreen.tsx
sed -i '' 's/members\.find(m =>/members\.find((m: any) =>/g' src/screens/ListsScreen.tsx
sed -i '' 's/categories\.find(c =>/categories\.find((c: any) =>/g' src/screens/ListsScreen.tsx
sed -i '' 's/categories\.map(cat =>/categories\.map((cat: any) =>/g' src/screens/ListsScreen.tsx

# Fix TasksScreen.tsx
sed -i '' 's/members\.find(m =>/members\.find((m: any) =>/g' src/screens/TasksScreen.tsx

# Fix FamilyScreen.tsx
sed -i '' 's/members\.map(member =>/members\.map((member: any) =>/g' src/screens/FamilyScreen.tsx

# Fix MoreScreen.tsx
sed -i '' 's/members\.map(member =>/members\.map((member: any) =>/g' src/screens/MoreScreen.tsx

echo "TypeScript fixes applied!"
