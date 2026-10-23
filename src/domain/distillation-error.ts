export class DistillationError extends Error {
  constructor(public readonly code: "unavailable" | "invalid-output" | "configuration", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DistillationError";
  }
}
