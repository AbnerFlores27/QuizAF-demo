# Express + PostgreSQL starter

A plain HTML, CSS, and JavaScript app served by Express 5 on Node.js 24. Replit supplies the PostgreSQL connection through `DATABASE_URL`; the server uses `pg`.

## Run

```sh
npm install
npm start
```

For development with automatic server restarts:

```sh
npm run dev
```

## Database example

Open the home page and submit text to run a PostgreSQL query. The API uses a bound parameter:

```js
pool.query(
  "SELECT $1::text AS message, CURRENT_TIMESTAMP AS queried_at",
  [text],
);
```

The example does not create or modify database tables. The database health/query endpoint is `GET /api/db/example?text=...`.
