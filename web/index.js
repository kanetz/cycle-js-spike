import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver, div, h1, img, i, a, button} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import {makeFakeHTTPDriver} from './fake-http-driver';

import 'reset-css';
import 'semantic-ui-css/semantic.min.css';

import './common';
import styles from './index.css';

function intent(sources) {
    const load$ = sources.DOM.select(styles.reloadButton.toSelector()).events('click')
        .mapTo({type: 'LOAD'});

    const loaded$ = sources.HTTP.select('load$').flatten()
        .map(response => ({
            type: 'LOADED',
            payload: response.body.map((photo, index) => ({
                ...photo,
                index,
                likes: Math.floor(100 + Math.random() * 900),
            })),
        }));

    const like$ = sources.DOM.select(styles.likeButton.toSelector())
        .events('click')
        .map(event => ({
            type: 'LIKE',
            payload: Number(event.currentTarget.closest(styles.photo.toSelector()).dataset.index),
        }));

    const liked$ = sources.FAKE_HTTP.select('like$')
        .map(payload => ({
            type: 'LIKED',
            payload,
        }));

    const remove$ = sources.DOM.select(styles.removeButton.toSelector())
        .events('click')
        .map(event => ({
            type: 'REMOVE',
            payload: Number(event.currentTarget.closest(styles.photo.toSelector()).dataset.index),
        }));

    const removed$ = sources.FAKE_HTTP.select('remove$')
        .map(payload => ({
            type: 'REMOVED',
            payload,
        }));

    return xs.merge(
        load$,
        loaded$,
        like$,
        liked$,
        remove$,
        removed$,
    );
}

function model(action$) {
    const likedReducer$ = action$.filter(action => action.type === 'LIKED')
        .map(action => state => ({
            ...state,
            photos: state.photos.map((photo, i) =>
                i === action.payload ? {
                    ...photo,
                    likes: photo.likes + 1,
                } : photo
            ),
        }));

    const removedReducer$ = action$.filter(action => action.type === 'REMOVED')
        .map(action => state => ({
            ...state,
            photos: [
                ...state.photos.slice(0, action.payload),
                ...state.photos.slice(action.payload + 1),
            ],
        }));

    const loadedReducer$ = action$.filter(action => action.type === 'LOADED')
        .map(action => state => ({
            ...state,
            photos: action.payload,
        }));

    const reducer$ = xs.merge(
        likedReducer$,
        removedReducer$,
        loadedReducer$,
    );

    return reducer$.fold((state, reducer) => reducer(state), {photos: []}).remember();
}

function view(state$) {
    return state$.map(({photos}) =>
        div(styles.photoAlbum.as('.ui.container'), [
            h1(styles.photoAlbumHeader.as('.ui.header'), [
                'Cycle.js Spike',
                button(styles.reloadButton.as('.ui.right.floated.button'), 'Reload'),
            ]),
            div(styles.photoList.as('.ui.four.cards'), photos.map((photo, index) =>
                div(styles.photo.as('.ui.raised.card'), {dataset: {index: String(index)}}, [
                    div(styles.imageContainer.as('.ui.container'), [
                        img('.ui.fluid.middle.aligned.rounded.image', {attrs: {src: photo.url}}),
                    ]),
                    div('.content', [
                        div('.header', photo.description),
                    ]),
                    div('.extra.content', [
                        div(styles.likeButton.as('.ui.labeled.button'), [
                            div('.ui.button', [
                                i('.empty.heart.icon'),
                                'Like'
                            ]),
                            a('.ui.basic.label', photo.likes),
                        ]),
                        button(styles.removeButton.as('.ui.right.floated.circular.icon.button'), [
                            i('.remove.icon'),
                        ]),
                    ]),
                ])
            )),
        ]),
    );
}

function request(actions) {
    return actions.filter(action => action.type === 'LOAD')
        .map(() => ({
            category: 'load$',
            method: 'GET',
            url: '/fake-data.json',
        }));
}

function fakeRequest(actions) {
    const likeRequest$ = actions.filter(action => action.type === 'LIKE')
        .map(action => ({
            category: 'like$',
            payload: action.payload,
        }));

    const removeRequest$ = actions.filter(action => action.type === 'REMOVE')
        .map(action => ({
            category: 'remove$',
            payload: action.payload,
        }));

    return xs.merge(
        likeRequest$,
        removeRequest$,
    );
}

function main(sources) {
    const actions = intent(sources).debug('action$');

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
