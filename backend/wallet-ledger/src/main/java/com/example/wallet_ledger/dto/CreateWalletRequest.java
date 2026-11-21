package com.example.wallet_ledger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWalletRequest(
        @NotBlank(message = "Owner name is required")
        @Size(max = 120, message = "Owner name must be at most 120 characters")
        String owner
) {}