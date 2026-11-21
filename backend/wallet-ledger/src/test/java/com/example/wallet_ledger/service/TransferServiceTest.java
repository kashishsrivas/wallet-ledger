package com.example.wallet_ledger.service;

import com.example.wallet_ledger.entity.Transfer;
import com.example.wallet_ledger.entity.TransferStatus;
import com.example.wallet_ledger.entity.Wallet;
import com.example.wallet_ledger.exception.ApiException;
import com.example.wallet_ledger.repository.TransactionRepository;
import com.example.wallet_ledger.repository.TransferRepository;
import com.example.wallet_ledger.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransferRepository transferRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransferService transferService;

    private UUID walletAId;
    private UUID walletBId;

    @BeforeEach
    void setUp() {
        walletAId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        walletBId = UUID.fromString("22222222-2222-2222-2222-222222222222");
    }

    @Test
    void rejectsZeroOrNegativeAmount() {
        ApiException zeroEx = assertThrows(ApiException.class, () ->
                transferService.transfer(walletAId, walletBId, BigDecimal.ZERO, "key-1"));
        assertEquals("INVALID_AMOUNT", zeroEx.getCode());

        ApiException negEx = assertThrows(ApiException.class, () ->
                transferService.transfer(walletAId, walletBId, new BigDecimal("-10.00"), "key-2"));
        assertEquals("INVALID_AMOUNT", negEx.getCode());
    }

    @Test
    void rejectsSameWalletTransfer() {
        ApiException ex = assertThrows(ApiException.class, () ->
                transferService.transfer(walletAId, walletAId, new BigDecimal("50.00"), "key-same"));
        assertEquals("SAME_WALLET_TRANSFER", ex.getCode());
    }

    @Test
    void rejectsInsufficientFunds() {
        Wallet sender = new Wallet(walletAId, "Ava", new BigDecimal("40.0000"), OffsetDateTime.now(ZoneOffset.UTC));
        Wallet receiver = new Wallet(walletBId, "Liam", new BigDecimal("100.0000"), OffsetDateTime.now(ZoneOffset.UTC));

        when(transferRepository.findByIdempotencyKey("key-insuff")).thenReturn(Optional.empty());
        when(walletRepository.findByIdForUpdate(walletAId)).thenReturn(Optional.of(sender));
        when(walletRepository.findByIdForUpdate(walletBId)).thenReturn(Optional.of(receiver));

        ApiException ex = assertThrows(ApiException.class, () ->
                transferService.transfer(walletAId, walletBId, new BigDecimal("50.0000"), "key-insuff"));

        assertEquals("INSUFFICIENT_BALANCE", ex.getCode());
        verify(transactionRepository, never()).saveAll(any());
    }

    @Test
    void returnsOriginalTransferOnIdempotentRetry() {
        UUID transferId = UUID.randomUUID();
        Transfer existing = new Transfer(
                transferId, walletAId, walletBId, new BigDecimal("100.0000"),
                TransferStatus.COMPLETED, "key-retry", OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(transferRepository.findByIdempotencyKey("key-retry")).thenReturn(Optional.of(existing));

        var result = transferService.transfer(walletAId, walletBId, new BigDecimal("100.0000"), "key-retry");

        assertFalse(result.created());
        assertEquals(transferId, result.response().id());
        assertEquals("100.0000", result.response().amount());
        verify(walletRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void throwsConflictWhenSameIdempotencyKeyUsedWithDifferentData() {
        Transfer existing = new Transfer(
                UUID.randomUUID(), walletAId, walletBId, new BigDecimal("100.0000"),
                TransferStatus.COMPLETED, "key-conflict", OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(transferRepository.findByIdempotencyKey("key-conflict")).thenReturn(Optional.of(existing));

        ApiException ex = assertThrows(ApiException.class, () ->
                transferService.transfer(walletAId, walletBId, new BigDecimal("250.0000"), "key-conflict"));

        assertEquals("IDEMPOTENCY_KEY_CONFLICT", ex.getCode());
    }
}