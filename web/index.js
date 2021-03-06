import xs from 'xstream';
import delay from 'xstream/extra/delay';
import {run} from '@cycle/run';
import {button, div, h1, makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import {makeFakeHTTPDriver} from './fake-http-driver';

import 'reset-css';
import 'semantic-ui-css/semantic.min.css';

import './common';
import styles from './index.css';

import PhotoList from './components/photo-list';

function intent(sources) {
    const load$ = sources.DOM.select(styles.reloadButton.toSelector()).events('click')
        .mapTo({type: 'LOAD'});

    const loaded$ = sources.HTTP.select('load$').flatten()
        .map(response => ({
            type: 'LOADED',
            payload: response.body.map(photo => ({
                ...photo,
                likes: Math.floor(100 + Math.random() * 900),
            })),
        }));

    const liked$ = sources.FAKE_HTTP.select('like$')
        .map(payload => ({
            type: 'LIKED',
            payload,
        }));

    const removed$ = sources.FAKE_HTTP.select('remove$')
        .map(payload => ({
            type: 'REMOVED',
            payload,
        }));

    return xs.merge(
        load$,
        loaded$,
        liked$,
        removed$,
    );
}

function model(action$) {
    const loadReducer$ = action$.filter(action => action.type === 'LOAD')
        .map(action => state => ({
            ...state,
            isLoading: true,
        }));

    const loadedReducer$ = action$.filter(action => action.type === 'LOADED')
        .map(action => state => ({
            ...state,
            photos: action.payload,
            isLoading: false,
        }));

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

    const reducer$ = xs.merge(
        loadReducer$,
        loadedReducer$,
        likedReducer$,
        removedReducer$,
    );

    return reducer$.fold((state, reducer) => reducer(state), {photos: []}).remember();
}

function request(action$) {
    return action$.filter(action => action.type === 'LOAD')
        .compose(delay(1500))
        .map(() => ({
            category: 'load$',
            method: 'GET',
            url: '/fake-data.json',
        }));
}

function fakeRequest(action$) {
    const likeRequest$ = action$.filter(action => action.type === 'LIKE')
        .map(action => ({
            category: 'like$',
            payload: action.payload,
        }));

    const removeRequest$ = action$.filter(action => action.type === 'REMOVE')
        .map(action => ({
            category: 'remove$',
            payload: action.payload,
        }));

    return xs.merge(
        likeRequest$,
        removeRequest$,
    );
}

function view(state$, photoListDOM$) {
    return xs.combine(state$, photoListDOM$).map(([{photos, isLoading}, photoListDOM]) =>
        div(styles.photoAlbum.as('.ui.container'), [
            h1(styles.photoAlbumHeader.as('.ui.header'), [
                'Cycle.js Spike',
                button(styles.reloadButton.as('.ui.right.floated.button'), {class: {loading: isLoading}}, 'Reload'),
            ]),
            photoListDOM,
        ]),
    );
}

function main(sources) {
    const actions = xs.create();

    const state$ = model(actions).debug('state$');

    const {DOM: photoListDOM$, action$: photoListAction$} = PhotoList({
        DOM: sources.DOM,
        state$,
    });

    actions.imitate(xs.merge(
        intent(sources),
        photoListAction$,
    ).debug('action$'));

    return {
        DOM: view(state$, photoListDOM$).debug('vdom$'),
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
