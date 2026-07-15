export class WalletNotFoundError extends Error {
  constructor(walletName: string) {
    super(`${walletName} isn't installed or isn't available in this browser.`);
    this.name = "WalletNotFoundError";
  }
}

export class UserRejectedError extends Error {
  constructor() {
    super("The transaction was rejected in the wallet.");
    this.name = "UserRejectedError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor(available: string, required: string) {
    super(
      `This account doesn't hold enough XLM to cover the network fee. ` +
        `Available: ${available} XLM, needed: at least ${required} XLM.`
    );
    this.name = "InsufficientBalanceError";
  }
}

export class InvalidMetadataError extends Error {
  constructor() {
    super("Title and medium must both be filled in (title up to 80 characters, medium up to 40).");
    this.name = "InvalidMetadataError";
  }
}

export class ItemNotFoundError extends Error {
  constructor() {
    super("That piece isn't in the gallery's registry.");
    this.name = "ItemNotFoundError";
  }
}

export class ContractCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractCallError";
  }
}

export function classifyError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("not installed") || lower.includes("not detected") || lower.includes("no wallet")) {
    return new WalletNotFoundError("The selected wallet");
  }
  if (
    lower.includes("rejected") ||
    lower.includes("declined") ||
    lower.includes("user denied") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return new UserRejectedError();
  }
  if (lower.includes("insufficient") || lower.includes("underfunded")) {
    return new InsufficientBalanceError("?", "?");
  }
  if (lower.includes("must be 1-80") || lower.includes("must be 1-40")) {
    return new InvalidMetadataError();
  }
  if (lower.includes("item not found")) {
    return new ItemNotFoundError();
  }
  return new ContractCallError(message);
}
