export class UnauthorizedError extends Error {
  action: string;

  constructor(action: string) {
    super(`unauthorized: ${action}`);
    this.name = "UnauthorizedError";
    this.action = action;
  }
}

export class InvalidActionError extends Error {
  action: string;
  reason: string;

  constructor(action: string, reason: string) {
    super(`invalid_action: ${action} (${reason})`);
    this.name = "InvalidActionError";
    this.action = action;
    this.reason = reason;
  }
}

export class RateLimitedError extends Error {
  action: string;

  constructor(action: string) {
    super(`rate_limited: ${action}`);
    this.name = "RateLimitedError";
    this.action = action;
  }
}
