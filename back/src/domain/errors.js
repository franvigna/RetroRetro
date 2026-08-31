export class UnauthorizedError extends Error {
  constructor(action) {
    super(`unauthorized: ${action}`);
    this.name = "UnauthorizedError";
    this.action = action;
  }
}

export class InvalidActionError extends Error {
  constructor(action, reason) {
    super(`invalid_action: ${action} (${reason})`);
    this.name = "InvalidActionError";
    this.action = action;
    this.reason = reason;
  }
}

export class RateLimitedError extends Error {
  constructor(action) {
    super(`rate_limited: ${action}`);
    this.name = "RateLimitedError";
    this.action = action;
  }
}
