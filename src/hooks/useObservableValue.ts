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
        let active = true;
        const subscription: Subscription = createObservable().subscribe({
            next: (nextValue) => {
                if (!active) return;
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
            active = false;
            subscription.unsubscribe();
        };
    }, [createObservable, ...dependencies]);

    return value;
};
