const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const BalanceAdjustment = require("../models/BalanceAdjustment");
const { addMoney, subtractMoney } = require("../utils/moneyUtils");

/**
 * Authoritative financial ledger calculation service.
 * Applies transaction balance adjustments atomically to accounts.
 */
class LedgerService {
  /**
   * Recalculate an account balance from its opening balance and ledger history
   */
  static async recalculateAccountBalance(accountId, session = null) {
    const account = await Account.findById(accountId).session(session);
    if (!account) throw new Error("Account not found");

    // Retrieve all active transactions for this account
    const transactions = await Transaction.find({
      $or: [{ accountId }, { destinationAccountId: accountId }],
      isDeleted: false,
    }).session(session);

    let calculatedBalance = account.openingBalance;

    for (const t of transactions) {
      if (t.type === "income" && t.accountId.toString() === accountId.toString()) {
        calculatedBalance = addMoney(calculatedBalance, t.amount, account.currency);
      } else if (t.type === "expense" && t.accountId.toString() === accountId.toString()) {
        // For credit cards, expenses increase the liability/balance owed
        if (account.type === "credit_card") {
          calculatedBalance = addMoney(calculatedBalance, t.amount, account.currency);
        } else {
          calculatedBalance = subtractMoney(calculatedBalance, t.amount, account.currency);
        }
      } else if (t.type === "refund" && t.accountId.toString() === accountId.toString()) {
        if (account.type === "credit_card") {
          calculatedBalance = subtractMoney(calculatedBalance, t.amount, account.currency);
        } else {
          calculatedBalance = addMoney(calculatedBalance, t.amount, account.currency);
        }
      } else if (t.type === "transfer") {
        if (t.accountId.toString() === accountId.toString()) {
          // Outflow from source account
          if (account.type === "credit_card") {
            calculatedBalance = addMoney(calculatedBalance, t.amount, account.currency);
          } else {
            calculatedBalance = subtractMoney(calculatedBalance, t.amount, account.currency);
          }
        }
        if (t.destinationAccountId && t.destinationAccountId.toString() === accountId.toString()) {
          // Inflow into destination account
          const transferInAmount = t.destinationAmount || t.amount;
          if (account.type === "credit_card") {
            calculatedBalance = subtractMoney(calculatedBalance, transferInAmount, account.currency);
          } else {
            calculatedBalance = addMoney(calculatedBalance, transferInAmount, account.currency);
          }
        }
      }
    }

    // Include balance adjustments
    const adjustments = await BalanceAdjustment.find({ accountId }).session(session);
    for (const adj of adjustments) {
      calculatedBalance = addMoney(calculatedBalance, adj.difference, account.currency);
    }

    account.currentBalance = calculatedBalance;
    account.hasTransactions = transactions.length > 0;
    await account.save({ session });
    return account;
  }

  /**
   * Apply transaction delta to account balance
   */
  static async applyTransactionDelta(transaction, isReversal = false, session = null) {
    const factor = isReversal ? -1 : 1;
    const account = await Account.findById(transaction.accountId).session(session);
    if (!account) throw new Error("Account not found");

    if (transaction.type === "income") {
      const delta = factor * transaction.amount;
      account.currentBalance = addMoney(account.currentBalance, delta, account.currency);
    } else if (transaction.type === "expense") {
      const delta = factor * transaction.amount;
      if (account.type === "credit_card") {
        account.currentBalance = addMoney(account.currentBalance, delta, account.currency);
      } else {
        account.currentBalance = subtractMoney(account.currentBalance, delta, account.currency);
      }
    } else if (transaction.type === "refund") {
      const delta = factor * transaction.amount;
      if (account.type === "credit_card") {
        account.currentBalance = subtractMoney(account.currentBalance, delta, account.currency);
      } else {
        account.currentBalance = addMoney(account.currentBalance, delta, account.currency);
      }
    } else if (transaction.type === "transfer") {
      // Source account outflow
      const sourceDelta = factor * transaction.amount;
      if (account.type === "credit_card") {
        account.currentBalance = addMoney(account.currentBalance, sourceDelta, account.currency);
      } else {
        account.currentBalance = subtractMoney(account.currentBalance, sourceDelta, account.currency);
      }

      // Destination account inflow
      if (transaction.destinationAccountId) {
        const destAccount = await Account.findById(transaction.destinationAccountId).session(session);
        if (destAccount) {
          const destInflow = factor * (transaction.destinationAmount || transaction.amount);
          if (destAccount.type === "credit_card") {
            destAccount.currentBalance = subtractMoney(destAccount.currentBalance, destInflow, destAccount.currency);
          } else {
            destAccount.currentBalance = addMoney(destAccount.currentBalance, destInflow, destAccount.currency);
          }
          destAccount.hasTransactions = true;
          await destAccount.save({ session });
        }
      }
    }

    account.hasTransactions = true;
    await account.save({ session });
    return account;
  }
}

module.exports = LedgerService;

