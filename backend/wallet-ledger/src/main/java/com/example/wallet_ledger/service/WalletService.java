package com.example.wallet_ledger.service;

import com.example.wallet_ledger.dto.PageResponse;
import com.example.wallet_ledger.dto.TopUpResponse;
import com.example.wallet_ledger.dto.TransactionResponse;
import com.example.wallet_ledger.dto.WalletResponse;
import com.example.wallet_ledger.entity.Transaction;
import com.example.wallet_ledger.entity.TransactionType;
import com.example.wallet_ledger.entity.Wallet;
import com.example.wallet_ledger.exception.ApiException;
import com.example.wallet_ledger.repository.TransactionRepository;
import com.example.wallet_ledger.repository.WalletRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public WalletService(WalletRepository walletRepository, TransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public WalletResponse createWallet(String owner) {
        Wallet wallet = new Wallet(
                UUID.randomUUID(),
                owner.trim(),
                BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP),
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        return WalletResponse.from(walletRepository.save(wallet));
    }

    @Transactional(readOnly = true)
    public List<WalletResponse> getAllWallets() {
        return walletRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(WalletResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", "Wallet not found: " + walletId));
        return WalletResponse.from(wallet);
    }

    @Transactional
    public TopUpResponse topUp(UUID walletId, BigDecimal rawAmount, String reference) {
        if (rawAmount == null || rawAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Top-up amount must be greater than zero.");
        }

        BigDecimal amount = rawAmount.setScale(4, RoundingMode.HALF_UP);

        Wallet wallet = walletRepository.findByIdForUpdate(walletId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", "Wallet not found: " + walletId));

        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);

        UUID txId = UUID.randomUUID();
        String description = (reference == null || reference.isBlank()) ? "Wallet top-up" : reference.trim();

        Transaction creditTx = new Transaction(
                txId,
                wallet.getId(),
                TransactionType.CREDIT,
                amount,
                txId,
                description,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        transactionRepository.save(creditTx);

        return TopUpResponse.of(wallet.getId(), wallet.getBalance(), txId);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> getTransactions(UUID walletId, Pageable pageable) {
        if (!walletRepository.existsById(walletId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", "Wallet not found: " + walletId);
        }
        Page<TransactionResponse> page = transactionRepository
                .findByWalletIdOrderByCreatedAtDesc(walletId, pageable)
                .map(TransactionResponse::from);
        return PageResponse.from(page);
    }
}