import { InteractionManager } from 'react-native';
import { useEffect, useRef, useState } from 'react';

/**
 * Returns true after interactions settle (and optional delay) so screens can render
 * an initial placeholder before heavy data subscriptions fire.
 */
export const useDeferredRender = (delay = 0): boolean => {
    const [ready, setReady] = useState(false);
    const readyRef = useRef(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let fallback: ReturnType<typeof setTimeout> | null = null;

        const markReady = () => {
            if (readyRef.current) return;
            readyRef.current = true;
            setReady(true);
        };

        const task = InteractionManager.runAfterInteractions(() => {
            if (delay > 0) {
                timeout = setTimeout(markReady, delay);
            } else {
                markReady();
            }
        });

        fallback = setTimeout(() => {
            markReady();
        }, Math.max(delay, 800));

        return () => {

            task.cancel();
            if (timeout) {
                clearTimeout(timeout);
            }
            if (fallback) {
                clearTimeout(fallback);
            }
        };
    }, [delay]);

    return ready;
};
