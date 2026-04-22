export class WheelConfigError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WheelConfigError";
    this.code = code;
  }
}
