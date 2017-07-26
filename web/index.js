import xs from 'xstream';
import {run} from '@cycle/run';
import {h1, makeDOMDriver} from '@cycle/dom';

function main() {
    const vdom$ = xs.of(h1('Cycle.js Spike'));

    return {
        DOM: vdom$,
    };
}

const drivers = {
    DOM: makeDOMDriver('#app'),
};

run(main, drivers);
