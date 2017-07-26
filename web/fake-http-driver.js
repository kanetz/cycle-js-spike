import xs from 'xstream';
import delay from 'xstream/extra/delay';

export function makeFakeHTTPDriver() {
    const listenersMap = {};
    const fakeHttpSource = {
        select: category => xs.create({
            start: listener => {
                const listeners = listenersMap[category] || [];
                listenersMap[category] = [...listeners, listener];
            },
            stop: () => {},
        }),
    };

    return function fakeHttpDriver(fakeRequest$) {
        fakeRequest$.compose(delay(1))
            .addListener({
                next: ({category, payload}) => {
                    const listeners = (listenersMap[category] || []);
                    listeners.forEach(listener => listener.next(payload));
                },
            });

        return fakeHttpSource;
    };
}
