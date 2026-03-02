import { InteractionManager } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Returns true after interactions settle (and optional delay) so screens can render
 * an initial placeholder before heavy data subscriptions fire.
 */
export const useDeferredRender = (delay = 0): boolean => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        const task = InteractionManager.runAfterInteractions(() => {
            if (delay > 0) {
                timeout = setTimeout(() => setReady(true), delay);
            } else {
                setReady(true);
            }
        });

        return () => {
            task.cancel();
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [delay]);

    return ready;
};
