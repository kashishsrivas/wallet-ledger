package com.example.wallet_ledger.dto;

import com.example.wallet_ledger.entity.Transaction;
import com.example.wallet_ledger.entity.TransactionType;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        TransactionType type,
        String amount,
        UUID referenceId,
        String description,
        OffsetDateTime createdAt
) {
    public static TransactionResponse from(Transaction tx) {
        return new TransactionResponse(
                tx.getId(),
                tx.getType(),
                tx.getAmount().setScale(4, RoundingMode.HALF_UP).toPlainString(),
                tx.getReferenceId(),
                tx.getDescription(),
                tx.getCreatedAt()
        );
    }
}