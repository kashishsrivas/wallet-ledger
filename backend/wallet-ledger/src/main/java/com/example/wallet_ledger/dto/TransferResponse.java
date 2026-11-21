package com.example.wallet_ledger.dto;

import com.example.wallet_ledger.entity.Transfer;
import com.example.wallet_ledger.entity.TransferStatus;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TransferResponse(
        UUID id,
        UUID fromWalletId,
        UUID toWalletId,
        String amount,
        TransferStatus status,
        OffsetDateTime createdAt
) {
    public static TransferResponse from(Transfer transfer) {
        return new TransferResponse(
                transfer.getId(),
                transfer.getFromWalletId(),
                transfer.getToWalletId(),
                transfer.getAmount().setScale(4, RoundingMode.HALF_UP).toPlainString(),
                transfer.getStatus(),
                transfer.getCreatedAt()
        );
    }
}