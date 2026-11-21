package com.example.wallet_ledger.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

public record TopUpResponse(
        UUID walletId,
        String balance,
        UUID transactionId
) {
    public static TopUpResponse of(UUID walletId, BigDecimal balance, UUID transactionId) {
        return new TopUpResponse(
                walletId,
                balance.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                transactionId
        );
    }
}