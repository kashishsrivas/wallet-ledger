package com.example.wallet_ledger.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record TopUpRequest(
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.0001", message = "Amount must be greater than zero")
        @Digits(integer = 15, fraction = 4, message = "Amount can have at most 4 decimal places")
        BigDecimal amount,

        @Size(max = 255, message = "Reference must be at most 255 characters")
        String reference
) {}