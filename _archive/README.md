# _archive/ — retired files, kept not deleted

Nothing here is removed from the repository: it is moved out of the way so the
project root says what actually runs, while every byte of history stays
reachable (and `git log --follow` still finds it).

## `frontend copy/`

An earlier, abandoned copy of the frontend. The application ships
`frontend/` only; this copy was never imported by anything, but it still
looked like a second product sitting in the root.

## `scripts/`

One-off scripts that opened the local SQLite file `rentflow.db` directly —
`check_db.py`, `check_api.py`, `delete_all_posts.py`, `promote_admin.py`,
`seed_cities.py`, and `seed_data.py` (superseded by `app/seed_data.py`, which
the application itself runs). They were written when the database was a file
on a laptop. Each one bypasses the ORM and the migrations, none is referenced
by the app, the tests, the README or `deploy15.sh`, and they are the kind of
file that should never be pointed at production data.

`scripts/migrate_sqlite_to_pg.py` stays where it is: it is the documented,
supported way to move such a file into PostgreSQL (see the README), so unlike
the others it is a tool rather than a leftover.

Nothing imports from this folder, so moving it cannot change behaviour.
