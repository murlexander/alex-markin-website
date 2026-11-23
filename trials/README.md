# Trials

The public collection lives at `/trials/`. `index.html` follows the main site design
system; one folder holds each immersive experiment.

Shared experiment controls and panel components live in `_shared`. Keep rendering logic
inside its experiment, and add to `_shared` only when more than one trial uses the same
component. The experiment layer is kept separate from the homepage's
`styles.css` and `site.js`.
