import { DependencyList, useEffect, useState } from 'react';
import { Observable, Subscription } from 'rxjs';

export const useObservableValue = <T>(
    createObservable: () => Observable<T>,
    dependencies: DependencyList = [],
    initialValue: T,
    onError?: (error: unknown) => void
): T => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
    const subscription: Subscription = createObservable().subscribe({
            next: (nextValue) => {
                setValue(nextValue);
            },
            error: (error) => {
                console.error('Observable subscription failed', error);
                if (onError) {
                    onError(error);
                }
            },
        });

    return () => {
            subscription.unsubscribe();
        };
    }, dependencies);

    return value;
};
