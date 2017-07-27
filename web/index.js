import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver, div, h1, ul, li, img, i, a, button} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import {makeFakeHTTPDriver} from './fake-http-driver';

import 'reset-css';
import 'jquery';
import 'semantic-ui-css/semantic.min.css';

import styles from './index.css';

function intent(sources) {
    const load$ = sources.DOM.select('.reload').events('click')
        .map(() => null)
        .startWith();

    const loaded$ = sources.HTTP.select('load$').flatten()
        .map(response =>
            response.body.map((photo, index) => ({
                ...photo,
                index,
                likes: Math.floor(100 + Math.random() * 900),
            })),
        );

    const like$ = sources.DOM.select('.like').events('click')
        .map(event => Number(event.currentTarget.dataset.index));

    const liked$ = sources.FAKE_HTTP.select('like$');

    const remove$ = sources.DOM.select('.remove').events('click')
        .map(event => Number(event.currentTarget.dataset.index));

    const removed$ = sources.FAKE_HTTP.select('remove$');

    return Object.entries({
        load$,
        loaded$,
        like$,
        liked$,
        remove$,
        removed$,
    }).reduce((actions, [name, action$]) => ({
        ...actions,
        [name]: action$.debug(name),
    }), {});
}

function model(actions) {
    const likedReducer$ = actions.liked$.map(index => state => ({
        ...state,
        photos: state.photos.map((photo, i) =>
            i === index ? {
                ...photo,
                likes: photo.likes + 1,
            } : photo
        ),
    }));

    const removedReducer$ = actions.removed$.map(index => state => ({
        ...state,
        photos: [
            ...state.photos.slice(0, index),
            ...state.photos.slice(index + 1),
        ],
    }));

    const loadedReducer$ = actions.loaded$.map(photos => state => ({
        ...state,
        photos,

    }));

    const reducer$ = xs.merge(
        likedReducer$,
        removedReducer$,
        loadedReducer$,
    );

    return reducer$.fold((state, reducer) => reducer(state), {photos: []});
}

function view(state$) {
    return state$.map(({photos}) =>
        div('.ui.container', [
            h1('.ui.header', 'Cycle.js Spike'),
            button('.reload', 'Reload'),
            ul('.photo-list.ui.four.cards', photos.map((photo, index) =>
                li('.photo.ui.raised.card', {style: {display: 'inline-block'}}, [
                    div(`.${styles.imageContainer}.ui.container`, [
                        img('.ui.fluid.middle.aligned.rounded.image', {attrs: {src: photo.url}}),
                    ]),
                    div('.content', [
                        div('.header', photo.description),
                    ]),
                    div('.extra.content', [
                        div('.like.ui.labeled.button', {dataset: {index: String(index)}}, [
                            div('.ui.button', [
                                i('.empty.heart.icon'),
                                'Like'
                            ]),
                            a('.ui.basic.label', photo.likes),
                        ]),
                        button('.remove.ui.right.floated.circular.icon.button', {dataset: {index: String(index)}}, [
                            i('.remove.icon'),
                        ]),
                    ]),
                ])
            )),
        ]),
    );
}

function request(actions) {
    return actions.load$.map(() => ({
        category: 'load$',
        method: 'GET',
        url: '/fake-data.json',
    }));
}

function fakeRequest(actions) {
    const likeRequest$ = actions.like$.map(index => ({
        category: 'like$',
        payload: index,
    }));

    const removeRequest$ = actions.remove$.map(index => ({
        category: 'remove$',
        payload: index,
    }));

    return xs.merge(
        likeRequest$,
        removeRequest$,
    );
}

function main(sources) {
    const actions = intent(sources);

    const state$ = model(actions).debug('state$');

    return {
        DOM: view(state$).debug('vdom$'),
        HTTP: request(actions).debug('request$'),
        FAKE_HTTP: fakeRequest(actions).debug('fakeRequest$'),
    };
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
    FAKE_HTTP: makeFakeHTTPDriver(),
};

run(main, drivers);
