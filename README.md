# memocards

Monorepo for the Memocards frontend and backend services.

## Apps

- `frontend`: React app powered by Vite.
- `memocards-backend`: Fastify API using TypeDI and PostgreSQL.

## Local Development

Start PostgreSQL:

```sh
docker compose up -d
```

Install dependencies:

```sh
npm install
```

Create backend env:

```sh
cp memocards-backend/.env.example memocards-backend/.env
```

Run database migrations:

```sh
npm run db:migrate --workspace memocards-backend
```

Start the frontend:

```sh
npm run dev:frontend
```

Start the backend:

```sh
npm run dev:backend
```

The frontend is available at `http://localhost:3000`.

The backend healthcheck is available at `GET http://localhost:8000/healthcheck`.

Initial backend API endpoints:

- `GET http://localhost:8000/api/decks/:deckId/cards`
  - Query params: `search`, `tagIds`, `statuses`, `reviewTypeId`, `groups`, `sideFilled`, `sideEmpty`, `sortField`, `sortDir`, `page`, `pageSize`
- `GET http://localhost:8000/api/review-types/:reviewTypeId/due-cards`
  - Query params: `groups`, `page`, `pageSize`
