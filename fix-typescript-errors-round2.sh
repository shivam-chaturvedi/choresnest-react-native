#!/bin/bash
# Comprehensive TypeScript error fixes - Round 2

# Fix remaining errors in FamilyOnboarding.tsx
sed -i '' '120s/members\.map(m =>/members\.map((m: any) =>/g' src/components/family/FamilyOnboarding.tsx

# Fix remaining errors in AppSidebar.tsx  
sed -i '' '202s/members\.find(m =>/members\.find((m: any) =>/g' src/components/layout/AppSidebar.tsx
sed -i '' '326s/members\.map(member =>/members\.map((member: any) =>/g' src/components/layout/AppSidebar.tsx
sed -i '' '431s/members\.find(m =>/members\.find((m: any) =>/g' src/components/layout/AppSidebar.tsx

# Fix remaining errors in AddEventModal.tsx
sed -i '' '250s/\.map(e =>/\.map((e: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' '251s/\.map(t =>/\.map((t: any) =>/g' src/components/modals/AddEventModal.tsx
sed -i '' '905s/members\.map(member =>/members\.map((member: any) =>/g' src/components/modals/AddEventModal.tsx

# Fix remaining errors in AddMemberModal.tsx
sed -i '' '29s/members\.find(m =>/members\.find((m: any) =>/g' src/components/modals/AddMemberModal.tsx

# Fix remaining errors in AddShoppingItemModal.tsx
sed -i '' '150s/categories\.map(cat =>/categories\.map((cat: any) =>/g' src/components/modals/AddShoppingItemModal.tsx

# Fix remaining errors in AddTaskModal.tsx
sed -i '' '181s/members\.map(member =>/members\.map((member: any) =>/g' src/components/modals/AddTaskModal.tsx

# Fix TabNavigator.tsx
sed -i '' '68s/(props) =>/((props: any) =>/g' src/navigation/TabNavigator.tsx

echo "Round 2 TypeScript fixes applied!"
