# Sync / Push Test Suite

Run all sync tests:

```bash
yarn test:sync
# or
yarn test --testPathPattern=__tests__/sync/.*\\.test\\.ts$
```

## Coverage

| File                             | What it checks                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `tableRegistry.test.ts`          | Notes, lists, expenses, tasks, vault, events are registered + profile-scoped        |
| `expensesSync.test.ts`           | **Required** finance create/update/delete push contracts for transactions + budgets |
| `domainSync.test.ts`             | Notes, lists, tasks, calendar events, vault documents                               |
| `transformPayload.test.ts`       | Field mapping + guest skip for each domain table                                    |
| `pushSoftDelete.test.ts`         | Soft-delete must include `profile_id`; skip missing remote IDs                      |
| `errorClassification.test.ts`    | Sync summary text must not be mislabeled as RLS                                     |
| `src/test-utils/syncFixtures.ts` | Shared auth UUID + domain sample records                                            |

## Must-pass (expenses)

`expensesSync.test.ts` asserts:

1. `transactions` / `budgets` have `hasProfileId` + `addProfileId`
2. Create payloads always set `profile_id` to the auth user UUID
3. Soft-delete payloads include `profile_id` (RLS WITH CHECK)
4. Guest records are never pushed
5. Deletes for IDs missing on the server are skipped (project-switch safety)
