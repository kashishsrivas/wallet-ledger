package com.example.wallet_ledger.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "reference_id", nullable = false)
    private UUID referenceId;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Transaction() {}

    public Transaction(UUID id, UUID walletId, TransactionType type, BigDecimal amount,
                       UUID referenceId, String description, OffsetDateTime createdAt) {
        this.id = id;
        this.walletId = walletId;
        this.type = type;
        this.amount = amount;
        this.referenceId = referenceId;
        this.description = description;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getWalletId() { return walletId; }
    public TransactionType getType() { return type; }
    public BigDecimal getAmount() { return amount; }
    public UUID getReferenceId() { return referenceId; }
    public String getDescription() { return description; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}