package com.example.wallet_ledger.service;

import com.example.wallet_ledger.dto.TransferResponse;
import com.example.wallet_ledger.entity.*;
import com.example.wallet_ledger.exception.ApiException;
import com.example.wallet_ledger.repository.TransactionRepository;
import com.example.wallet_ledger.repository.TransferRepository;
import com.example.wallet_ledger.repository.WalletRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferService {

    private final WalletRepository walletRepository;
    private final TransferRepository transferRepository;
    private final TransactionRepository transactionRepository;

    public TransferService(WalletRepository walletRepository,
                           TransferRepository transferRepository,
                           TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transferRepository = transferRepository;
        this.transactionRepository = transactionRepository;
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public record TransferExecutionResult(TransferResponse response, boolean created) {}

    @Transactional
    public TransferExecutionResult transfer(UUID fromWalletId, UUID toWalletId, BigDecimal rawAmount, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required.");
        }
        if (rawAmount == null || rawAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Transfer amount must be greater than zero.");
        }
        if (fromWalletId.equals(toWalletId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_WALLET_TRANSFER", "Sender and receiver wallets must be different.");
        }

        User currentUser = getCurrentUser();
        BigDecimal amount = rawAmount.setScale(4, RoundingMode.HALF_UP);
        String trimmedKey = idempotencyKey.trim();

        // 1. Check existing idempotency record
        Optional<Transfer> existing = transferRepository.findByIdempotencyKey(trimmedKey);
        if (existing.isPresent()) {
            Transfer prev = existing.get();
            boolean samePayload = prev.getFromWalletId().equals(fromWalletId)
                    && prev.getToWalletId().equals(toWalletId)
                    && prev.getAmount().compareTo(amount) == 0;

            if (!samePayload) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "IDEMPOTENCY_KEY_CONFLICT",
                        "Idempotency-Key was already used with different transfer parameters."
                );
            }
            return new TransferExecutionResult(TransferResponse.from(prev), false);
        }

        // 2. Lock wallets in deterministic ascending UUID order to prevent deadlocks
        UUID firstLockId = fromWalletId.compareTo(toWalletId) < 0 ? fromWalletId : toWalletId;
        UUID secondLockId = fromWalletId.compareTo(toWalletId) < 0 ? toWalletId : fromWalletId;

        Wallet firstLocked = walletRepository.findByIdForUpdate(firstLockId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", "Wallet not found: " + firstLockId));
        Wallet secondLocked = walletRepository.findByIdForUpdate(secondLockId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", "Wallet not found: " + secondLockId));

        Wallet sender = fromWalletId.equals(firstLocked.getId()) ? firstLocked : secondLocked;
        Wallet receiver = toWalletId.equals(firstLocked.getId()) ? firstLocked : secondLocked;

        // 3. Verify the authenticated user owns the sender wallet
        if (!sender.getUser().getId().equals(currentUser.getId())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN_WALLET_ACCESS",
                    "You do not have permission to transfer funds from wallet: " + fromWalletId
            );
        }

        // 4. Verify sufficient balance
        if (sender.getBalance().compareTo(amount) < 0) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "INSUFFICIENT_BALANCE",
                    "Wallet does not have enough available balance."
            );
        }

        // 5. Update balances
        sender.setBalance(sender.getBalance().subtract(amount));
        receiver.setBalance(receiver.getBalance().add(amount));
        walletRepository.saveAll(List.of(sender, receiver));

        // 6. Record transfer
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID transferId = UUID.randomUUID();

        Transfer transfer = new Transfer(
                transferId,
                sender.getId(),
                receiver.getId(),
                amount,
                TransferStatus.COMPLETED,
                trimmedKey,
                now
        );
        transferRepository.save(transfer);

        // 7. Record double-entry ledger transactions (DEBIT sender, CREDIT receiver)
        Transaction debitTx = new Transaction(
                UUID.randomUUID(),
                sender.getId(),
                TransactionType.DEBIT,
                amount,
                transferId,
                "Transfer to " + receiver.getOwner(),
                now
        );
        Transaction creditTx = new Transaction(
                UUID.randomUUID(),
                receiver.getId(),
                TransactionType.CREDIT,
                amount,
                transferId,
                "Transfer from " + sender.getOwner(),
                now
        );
        transactionRepository.saveAll(List.of(debitTx, creditTx));

        return new TransferExecutionResult(TransferResponse.from(transfer), true);
    }
}