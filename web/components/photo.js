import xs from 'xstream';
import {a, button, div, i, img} from '@cycle/dom';

import '../common';
import styles from './photo.css';

function intent({DOM: domSource}) {
    const like$ = domSource.select(styles.likeButton.toSelector()).events('click')
        .map(event => ({
            type: 'LIKE',
            payload: Number(event.currentTarget.closest(styles.photo.toSelector()).dataset.index),
        }));

    const remove$ = domSource.select(styles.removeButton.toSelector()).events('click')
        .map(event => ({
            type: 'REMOVE',
            payload: Number(event.currentTarget.closest(styles.photo.toSelector()).dataset.index),
        }));

    return xs.merge(
        like$,
        remove$,
    );
}

function renderPhoto({photo, index}) {
    return (
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
    );
}

function view(state$) {
    return state$.map(renderPhoto);
}

export default function Photo(sources) {
    const action$ = intent(sources);

    const state$ = sources.state$;

    return {
        DOM: view(state$),
        action$,
    };
}
