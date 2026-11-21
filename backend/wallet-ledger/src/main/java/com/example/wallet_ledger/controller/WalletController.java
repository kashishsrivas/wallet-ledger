package com.example.wallet_ledger.controller;

import com.example.wallet_ledger.dto.*;
import com.example.wallet_ledger.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
@Tag(name = "Wallets", description = "Wallet management, top-ups, and ledger history")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @PostMapping
    @Operation(summary = "Create a new wallet")
    public ResponseEntity<WalletResponse> createWallet(@Valid @RequestBody CreateWalletRequest request) {
        WalletResponse created = walletService.createWallet(request.owner());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List all wallets")
    public ResponseEntity<List<WalletResponse>> getAllWallets() {
        return ResponseEntity.ok(walletService.getAllWallets());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get wallet details and current balance")
    public ResponseEntity<WalletResponse> getWallet(@PathVariable UUID id) {
        return ResponseEntity.ok(walletService.getWallet(id));
    }

    @PostMapping("/{id}/topup")
    @Operation(summary = "Add funds to a wallet")
    public ResponseEntity<TopUpResponse> topUp(
            @PathVariable UUID id,
            @Valid @RequestBody TopUpRequest request
    ) {
        return ResponseEntity.ok(walletService.topUp(id, request.amount(), request.reference()));
    }

    @GetMapping("/{id}/transactions")
    @Operation(summary = "Get paginated transaction ledger for a wallet")
    public ResponseEntity<PageResponse<TransactionResponse>> getTransactions(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(walletService.getTransactions(id, PageRequest.of(page, size)));
    }
}