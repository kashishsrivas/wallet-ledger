package com.example.wallet_ledger;

import com.example.wallet_ledger.dto.TopUpResponse;
import com.example.wallet_ledger.dto.WalletResponse;
import com.example.wallet_ledger.entity.Transaction;
import com.example.wallet_ledger.entity.TransactionType;
import com.example.wallet_ledger.entity.Wallet;
import com.example.wallet_ledger.exception.ApiException;
import com.example.wallet_ledger.repository.TransactionRepository;
import com.example.wallet_ledger.repository.TransferRepository;
import com.example.wallet_ledger.repository.WalletRepository;
import com.example.wallet_ledger.service.TransferService;
import com.example.wallet_ledger.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers
class WalletLedgerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("wallet_ledger_test")
            .withUsername("test_user")
            .withPassword("test_pass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private WalletService walletService;

    @Autowired
    private TransferService transferService;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @BeforeEach
    void cleanDatabase() {
        transactionRepository.deleteAll();
        transferRepository.deleteAll();
        walletRepository.deleteAll();
    }

    @Test
    void atomicTransferCreatesDoubleEntryLedgerAndPaginatesHistory() {
        WalletResponse ava = walletService.createWallet("Ava Patel");
        WalletResponse liam = walletService.createWallet("Liam Chen");

        TopUpResponse topUp = walletService.topUp(ava.id(), new BigDecimal("500.0000"), "Initial deposit");
        assertEquals("500.0000", topUp.balance());

        var transferResult = transferService.transfer(
                ava.id(), liam.id(), new BigDecimal("125.5000"), UUID.randomUUID().toString()
        );
        assertTrue(transferResult.created());

        assertEquals("374.5000", walletService.getWallet(ava.id()).balance());
        assertEquals("125.5000", walletService.getWallet(liam.id()).balance());

        var avaHistory = walletService.getTransactions(ava.id(), PageRequest.of(0, 10));
        assertEquals(2, avaHistory.totalElements());
        assertEquals(TransactionType.DEBIT, avaHistory.content().get(0).type());
        assertEquals("125.5000", avaHistory.content().get(0).amount());

        var liamHistory = walletService.getTransactions(liam.id(), PageRequest.of(0, 10));
        assertEquals(1, liamHistory.totalElements());
        assertEquals(TransactionType.CREDIT, liamHistory.content().get(0).type());
        assertEquals("125.5000", liamHistory.content().get(0).amount());
    }

    @Test
    void fiftyParallelTransfersPreserveTotalBalanceAndPreventOverdraft() throws InterruptedException {
        // Fund sender with 1,000.0000
        WalletResponse sender = walletService.createWallet("Treasury Wallet");
        walletService.topUp(sender.id(), new BigDecimal("1000.0000"), "Treasury funding");

        // Create 50 destination wallets
        int parallelRequests = 50;
        List<UUID> destinationIds = new ArrayList<>();
        for (int i = 0; i < parallelRequests; i++) {
            destinationIds.add(walletService.createWallet("Receiver " + i).id());
        }

        // Each of the 50 parallel threads attempts to transfer 100.0000 (total attempted = 5,000.0000)
        // Only 10 transfers should succeed; 40 must fail with INSUFFICIENT_BALANCE.
        BigDecimal transferAmount = new BigDecimal("100.0000");
        ExecutorService executor = Executors.newFixedThreadPool(25);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(parallelRequests);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = new CopyOnWriteArrayList<>();

        for (int i = 0; i < parallelRequests; i++) {
            final UUID toWalletId = destinationIds.get(i);
            final String idempotencyKey = "concurrent-tx-" + i;

            executor.submit(() -> {
                try {
                    startGate.await();
                    transferService.transfer(sender.id(), toWalletId, transferAmount, idempotencyKey);
                    successCount.incrementAndGet();
                } catch (ApiException ex) {
                    if ("INSUFFICIENT_BALANCE".equals(ex.getCode())) {
                        insufficientCount.incrementAndGet();
                    } else {
                        unexpectedErrors.add(ex);
                    }
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneGate.countDown();
                }
            });
        }

        startGate.countDown();
        assertTrue(doneGate.await(30, TimeUnit.SECONDS), "Timed out waiting for parallel transfers");
        executor.shutdown();

        // Assertions
        assertTrue(unexpectedErrors.isEmpty(), "Unexpected errors occurred: " + unexpectedErrors);
        assertEquals(10, successCount.get(), "Exactly 10 transfers should succeed");
        assertEquals(40, insufficientCount.get(), "Exactly 40 transfers should fail due to insufficient funds");

        // Sender balance must be exactly 0.0000 (never negative)
        Wallet finalSender = walletRepository.findById(sender.id()).orElseThrow();
        assertEquals(0, finalSender.getBalance().compareTo(BigDecimal.ZERO));

        // Conservation of money: sum of all balances equals initial 1,000.0000
        BigDecimal totalSystemBalance = walletRepository.findAll().stream()
                .map(Wallet::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, totalSystemBalance.compareTo(new BigDecimal("1000.0000")));

        // Every successful transfer produced 1 DEBIT + 1 CREDIT (20 transfer tx + 1 topup tx = 21 total)
        List<Transaction> allTransactions = transactionRepository.findAll();
        assertEquals(21, allTransactions.size());
        long debitCount = allTransactions.stream().filter(t -> t.getType() == TransactionType.DEBIT).count();
        long creditCount = allTransactions.stream().filter(t -> t.getType() == TransactionType.CREDIT).count();
        assertEquals(10, debitCount);
        assertEquals(11, creditCount); // 10 transfer credits + 1 initial top-up credit
    }
}