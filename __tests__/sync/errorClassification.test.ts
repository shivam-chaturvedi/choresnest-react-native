/**
 * Sync error classification checks — ensure our own error text is not
 * mislabeled as an RLS failure.
 */
describe('Sync error classification heuristics', () => {
  const classify = (error: any) => {
    const message = (error?.message ?? '').toString().toLowerCase();
    const status = error?.status;
    const code = error?.code;

    const isRlsError =
      status === 403 ||
      code === '42501' ||
      message.includes('row level security') ||
      message.includes('row-level security') ||
      (message.includes('violates') && message.includes('policy'));

    return { isRlsError };
  };

  test('does not treat orchestrator summary text as RLS', () => {
    const result = classify({
      message:
        'Sync push failed for 6ed7f511-abca-4ad8-8612-e24c62bbd408. Total errors: 1. See prior Failed to upsert/delete logs for PostgREST details.',
    });
    expect(result.isRlsError).toBe(false);
  });

  test('detects real Postgres RLS policy violations', () => {
    expect(
      classify({
        code: '42501',
        message:
          'new row violates row-level security policy for table "transactions"',
      }).isRlsError,
    ).toBe(true);
  });

  test('detects 403 forbidden as RLS-like', () => {
    expect(classify({ status: 403, message: 'Forbidden' }).isRlsError).toBe(
      true,
    );
  });
});
