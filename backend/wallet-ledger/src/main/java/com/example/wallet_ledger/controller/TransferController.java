package com.example.wallet_ledger.controller;

import com.example.wallet_ledger.dto.TransferRequest;
import com.example.wallet_ledger.dto.TransferResponse;
import com.example.wallet_ledger.service.TransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
@Tag(name = "Transfers", description = "Atomic, idempotent wallet-to-wallet transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @Operation(summary = "Transfer funds between two wallets")
    public ResponseEntity<TransferResponse> transfer(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody TransferRequest request
    ) {
        TransferService.TransferExecutionResult result = transferService.transfer(
                request.fromWalletId(),
                request.toWalletId(),
                request.amount(),
                idempotencyKey
        );
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.response());
    }
}