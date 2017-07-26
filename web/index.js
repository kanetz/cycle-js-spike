import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver, div, h1, ul, li, img, label, button} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import {makeFakeHTTPDriver} from './fake-http-driver';

import 'reset-css';

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
        .map(event => Number(event.target.dataset.index));

    const liked$ = sources.FAKE_HTTP.select('like$');

    const remove$ = sources.DOM.select('.remove').events('click')
        .map(event => Number(event.target.dataset.index));

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
        div([
            h1('Cycle.js Spike'),
            button('.reload', 'Reload'),
            ul('.photo-list', photos.map((photo, index) =>
                li('.photo', {style: {display: 'inline-block'}}, [
                    div([
                        photo.description,
                        img({attrs: {src: photo.url, width: 200, height: 200}}),
                    ]),
                    div([
                        button('.like', {dataset: {index: String(index)}}, 'Like'),
                        label(photo.likes),
                        button('.remove', {dataset: {index: String(index)}}, 'Remove'),
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
