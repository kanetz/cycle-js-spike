import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver, div, h1, ul, li, img, label, button} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';

import 'reset-css';

function intent(sources) {
    const load$ = sources.HTTP.select('photo-list').flatten()
        .map(response => ({
            type: 'LOAD',
            payload: response.body.map((photo, index) => ({
                ...photo,
                index,
                likes: Math.floor(100 + Math.random() * 900),
            })),
        }));

    const like$ = sources.DOM.select('.like').events('click').debug('like$')
        .map(event => event.target.dataset.index)
        .map(index => ({type: 'LIKE', payload: Number(index)}));

    const remove$ = sources.DOM.select('.remove').events('click')
        .map(event => event.target.dataset.index).debug('remove$')
        .map(index => ({type: 'REMOVE', payload: Number(index)}));

    return xs.merge(
        load$,
        like$,
        remove$,
        ).debug('action$');
}

function model(action$) {
    return action$.fold((state, {type, payload}) => {
        if(type === 'LOAD') {
            return {
                ...state,
                photos: payload,
            };
        }

        if(type === 'LIKE') {
            return {
                ...state,
                photos: state.photos.map((photo, index) =>
                    index === payload ? {
                        ...photo,
                        likes: photo.likes + 1,
                    } : photo
                ),
            };
        }

        if(type === 'REMOVE') {
            return {
                ...state,
                photos: [
                    ...state.photos.slice(0, payload),
                    ...state.photos.slice(payload + 1),
                ],
            };
        }

        return state;
    }, {photos: []}).debug('state$');
}

function view(state$) {
    return state$.map(({photos}) =>
        div([
            h1('Cycle.js Spike'),
            ul('.photo-list', photos.map((photo, index) =>
                li('.photo', [
                    photo.description,
                    img({attrs: {src: photo.url, width: 200, height: 200}}),
                    label(`Likes: ${photo.likes}`),
                    button('.like', {dataset: {index: String(index)}}, 'Like'),
                    button('.remove', {dataset: {index: String(index)}}, 'Remove'),
                ])
            )),
        ]),
    ).debug('vdom$');
}

function main(sources) {
    const action$ = intent(sources);

    const state$ = model(action$);

    const request$ = xs.of({
        category: 'photo-list',
        method: 'GET',
        url: '/fake-data.json',
    });

    return {
        DOM: view(state$),
        HTTP: request$,
    };
}

const drivers = {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver(),
};

run(main, drivers);
