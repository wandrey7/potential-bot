export class InvalidParameterError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidParameterError";
  }
}

export class WarningError extends Error {
  constructor(message) {
    super(message);
    this.name = "WarningError";
  }
}

export class DangerError extends Error {
  constructor(message) {
    super(message);
    this.name = "DangerError";
  }
}
