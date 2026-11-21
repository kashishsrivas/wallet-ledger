CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    owner VARCHAR(120) NOT NULL,
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE transfers (
    id UUID PRIMARY KEY,
    from_wallet_id UUID NOT NULL REFERENCES wallets(id),
    to_wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_different_wallets CHECK (from_wallet_id <> to_wallet_id)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    reference_id UUID NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_transactions_wallet_created ON transactions (wallet_id, created_at DESC);
CREATE INDEX idx_transfers_idempotency_key ON transfers (idempotency_key);