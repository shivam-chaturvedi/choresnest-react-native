import { NotificationScheduler } from '../src/services/NotificationScheduler';

describe('NotificationScheduler queue', () => {
  test('executes jobs sequentially without blocking', async () => {
    const order: string[] = [];
    NotificationScheduler.enqueueJob(async () => {
      order.push('job1-start');
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push('job1-end');
    });
    NotificationScheduler.enqueueJob(async () => {
      order.push('job2-start');
      order.push('job2-end');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(order).toEqual(['job1-start', 'job1-end', 'job2-start', 'job2-end']);
  });
});
