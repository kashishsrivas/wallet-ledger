# wallet-ledger — Digital Wallet & Double-Entry Ledger API

A full-stack digital wallet and double-entry ledger system built with **Java, Spring Boot, PostgreSQL, and React (TypeScript)**. Engineered to guarantee monetary accuracy, zero overdrafts, and idempotent retries under high concurrency.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                 React + TypeScript (Vite)                │
│  (TanStack Query, React Hook Form + Zod, Tailwind CSS)   │
└────────────────────────────┬─────────────────────────────┘
                             │ REST / JSON (Idempotency-Key)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Spring Boot 3 REST API                 │
│  ├── Controller Layer (Validation, OpenAPI / Swagger)    │
│  ├── Service Layer (@Transactional, Lock Ordering)       │
│  └── Spring Data JPA (PESSIMISTIC_WRITE Row Locks)       │
└────────────────────────────┬─────────────────────────────┘
                             │ JDBC / Flyway Migrations
                             ▼
┌──────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                       │
│  ├── wallets      (NUMERIC(19,4), balance >= 0, version) │
│  ├── transfers    (UNIQUE idempotency_key)               │
│  └── transactions (Immutable CREDIT / DEBIT ledger)      │
└──────────────────────────────────────────────────────────┘

---

## Key Engineering Guarantees

### 1. Exact Monetary Arithmetic
* All monetary calculations use `BigDecimal` in Java and `NUMERIC(19, 4)` in PostgreSQL—floating-point types (`double`/`float`) are never used.
* Database `CHECK` constraints enforce `balance >= 0` on wallets and `amount > 0` on transfers and transactions.

### 2. Concurrency & Deadlock Prevention
* **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: During transfers, both wallet rows are locked via `LockModeType.PESSIMISTIC_WRITE` so concurrent requests cannot read stale balances or cause lost updates.
* **Deterministic Lock Ordering**: Wallets are always locked in ascending UUID order (`smaller UUID first, larger UUID second`). Even if Wallet A transfers to Wallet B at the exact same millisecond Wallet B transfers to Wallet A, locks are acquired in a consistent global order, preventing deadlocks.
* *(The `version` column is retained on `wallets` as a future-ready optimistic concurrency safeguard, while pessimistic locking serves as the primary MVP mechanism.)*

### 3. Idempotent Transfers
* Every `POST /api/v1/transfers` request requires an `Idempotency-Key` header.
* **Safe Retry**: Re-sending a transfer with the same `Idempotency-Key` and identical payload returns the original transfer (`200 OK`) without debiting or crediting any balance a second time.
* **Conflict Detection**: Reusing an existing `Idempotency-Key` with different wallet IDs or amounts returns `409 Conflict` (`IDEMPOTENCY_KEY_CONFLICT`).

### 4. Double-Entry Ledger
* Every top-up creates **1** `CREDIT` entry in `transactions`.
* Every completed transfer atomically creates **2** ledger entries in `transactions` within the same database transaction:
  * Sender wallet: `DEBIT`
  * Receiver wallet: `CREDIT`

---

## Verification & 50-Parallel-Transfer Stress Test

The test suite (`./mvnw test`) uses **JUnit 5**, **Mockito**, and **Testcontainers (PostgreSQL 16)** to verify:
* **50-Parallel-Transfer Concurrency Test**: Fires 50 concurrent threads attempting to transfer `₹100.0000` each (`₹5,000.0000` total) out of a wallet funded with `₹1,000.0000`. Asserts that:
  * Exactly **10** transfers succeed and **40** fail with `INSUFFICIENT_BALANCE`.
  * Sender balance reaches `₹0.0000` and never becomes negative.
  * Total money across all wallets remains strictly conserved at `₹1,000.0000`.
  * Every successful transfer produces matching `DEBIT` and `CREDIT` ledger records.
* **Idempotency Replay & Conflict Tests**: Verifies duplicate keys never double-spend and mismatched payloads trigger `409 Conflict`.

---

## Local Setup

### Prerequisites
* Java 17 or 21
* Node.js 20+
* Docker Desktop

```

### 1. Start PostgreSQL
```bash
docker compose up -d

```

### 2. Run the Spring Boot Backend
cd backend/wallet-ledger
./mvnw spring-boot:run

* API Base URL: http://localhost:8080/api/v1
* Swagger UI: http://localhost:8080/swagger-ui/index.html


### 3. Run the React Frontend
```bash
cd frontend
npm install
npm run dev

* Dashboard UI: http://localhost:5173

```

### 4. Run Unit, Integration & Concurrency Tests

```bash
cd backend/wallet-ledger
./mvnw test

```

---

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/wallets` | Create a new wallet (`201 Created`) |
| `GET` | `/api/v1/wallets` | List all wallets |
| `GET` | `/api/v1/wallets/{id}` | Get wallet details and current balance |
| `POST` | `/api/v1/wallets/{id}/topup` | Credit funds to a wallet (`200 OK`) |
| `GET` | `/api/v1/wallets/{id}/transactions` | Paginated transaction history (`?page=0&size=20`) |
| `POST` | `/api/v1/transfers` | Atomic transfer with `Idempotency-Key` header (`201 Created` / `200 OK` on retry) |

```
---

## Author

**Kashish Srivastava**