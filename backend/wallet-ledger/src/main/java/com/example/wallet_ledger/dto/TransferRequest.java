package com.example.wallet_ledger.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
        @NotNull(message = "fromWalletId is required")
        UUID fromWalletId,

        @NotNull(message = "toWalletId is required")
        UUID toWalletId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.0001", message = "Amount must be greater than zero")
        @Digits(integer = 15, fraction = 4, message = "Amount can have at most 4 decimal places")
        BigDecimal amount
) {}