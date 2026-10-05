# _archive/ — retired files, kept not deleted

Nothing here is removed from the repository: it is moved out of the way so the
project root says what actually runs, while every byte of history stays
reachable (and `git log --follow` still finds it).

## `frontend copy/`

An earlier, abandoned copy of the frontend. The application ships
`frontend/` only; this copy was never imported by anything, but it still
looked like a second product sitting in the root.

## `scripts/`

One-off scripts that talked straight to the local SQLite file
(`rentflow.db`) — `check_db.py`, `check_api.py`, `delete_all_posts.py`,
`promote_admin.py`, `seed_cities.py`. They were written while the database
was SQLite on a laptop; the running system uses PostgreSQL, they are not
referenced by the app, the tests, the README or `deploy15.sh`, and they are
the kind of file that should never be pointed at production data.

Nothing imports from this folder, so moving it cannot change behaviour.
