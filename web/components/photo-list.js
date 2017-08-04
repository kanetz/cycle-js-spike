import xs from 'xstream';
import {div, i} from '@cycle/dom';

import '../common';
import styles from './photo-list.css';

import Photo from './photo';

function renderPhotoList([{photos, isLoading}, photoDOMs]) {
    if(isLoading) {
        return (
            div(styles.photoList.as('.ui.icon.message'), [
                i('.notched.circle.loading.icon'),
                'Loading photos...',
            ])
        );
    }

    return photos && photos.length ? (
        div(styles.photoList.as('.ui.four.cards'), photoDOMs)
    ) : (
        div(styles.photoList.as('.ui.icon.message'), [
            i('.comment.outline.icon'),
            'There are no photos to show for the moment.',
        ])
    );
}

function view(state$, photoDOMs$) {
    return xs.combine(state$, photoDOMs$)
        .map(renderPhotoList);
}

export default function PhotoList(sources) {
    const state$ = sources.state$;

    const photoSinks$ = state$.map(state =>
        state.photos.map((photo, index) =>
            Photo({
                DOM: sources.DOM.select(`[data-index="${index}"]`),
                props: {index},
                state$: state$.map(photos => ({index, photo: state.photos[index]})),
            })
        )
    );

    const photoDOMs$ = photoSinks$.map(photoSinks =>
        xs.combine(...photoSinks.map(photoSink => photoSink.DOM))
    ).flatten();
    const photoAction$ = photoSinks$.map(photoSinks =>
        xs.merge(...photoSinks.map(photoSink => photoSink.action$))
    ).flatten();

    return {
        DOM: view(state$, photoDOMs$),
        action$: photoAction$,
    };
}
