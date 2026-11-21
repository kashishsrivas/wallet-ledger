package com.example.wallet_ledger.dto;

import com.example.wallet_ledger.entity.Wallet;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WalletResponse(
        UUID id,
        String owner,
        String balance,
        OffsetDateTime createdAt
) {
    public static WalletResponse from(Wallet wallet) {
        return new WalletResponse(
                wallet.getId(),
                wallet.getOwner(),
                wallet.getBalance().setScale(4, RoundingMode.HALF_UP).toPlainString(),
                wallet.getCreatedAt()
        );
    }
}