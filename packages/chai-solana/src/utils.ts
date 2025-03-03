import "chai-as-promised";

import type { Idl } from "@project-serum/anchor";
import type {
  TransactionEnvelope,
  TransactionReceipt,
} from "@saberhq/solana-contrib";
import { PendingTransaction } from "@saberhq/solana-contrib";
import { SendTransactionError } from "@solana/web3.js";
import { assert, expect } from "chai";

import { printSendTransactionError } from "./printInstructionLogs";

export const expectTX = (
  tx:
    | TransactionEnvelope
    | null
    | Promise<TransactionEnvelope | null>
    | PendingTransaction
    | Promise<PendingTransaction>,
  msg?: string,
  cb?: (receipt: TransactionReceipt) => Promise<void>
): Chai.PromisedAssertion => {
  const handleReceipt = async (receipt: TransactionReceipt) => {
    await cb?.(receipt);
    return receipt;
  };

  if (tx && "then" in tx) {
    return expect(
      tx
        .then((tx) => {
          if (tx instanceof PendingTransaction) {
            return tx.wait();
          } else if (tx) {
            return tx.confirm();
          } else {
            throw new Error("tx is null");
          }
        })
        .then(handleReceipt),
      msg
    ).eventually;
  }
  if (tx instanceof PendingTransaction) {
    return expect(tx.wait().then(handleReceipt), msg).eventually;
  } else {
    return expect(
      tx
        ?.send({ printLogs: false })
        .catch((err) => {
          if (err instanceof SendTransactionError) {
            printSendTransactionError(err);
          }
          throw err;
        })
        .then((res) => res.wait())
        .then(handleReceipt),
      msg
    ).eventually;
  }
};

export type IDLError = NonNullable<Idl["errors"]>[number];

export const assertError = (error: IDLError, other: IDLError): void => {
  assert.strictEqual(error.code, other.code);
  assert.strictEqual(error.msg, other.msg);
};
