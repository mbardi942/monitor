import { ValueObject } from "@monitor/shared-kernel";

export interface CheckResultProps {
  statusCode?: number;
  responseTimeMs: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string; // Messaggio di errore se la sonda ha fallito la connessione
}

export class CheckResult extends ValueObject<CheckResultProps> {
  public get statusCode(): number | undefined {
    return this.props.statusCode;
  }

  public get responseTimeMs(): number {
    return this.props.responseTimeMs;
  }

  public get headers(): Record<string, string> | undefined {
    return this.props.headers;
  }

  public get body(): string | undefined {
    return this.props.body;
  }

  public get error(): string | undefined {
    return this.props.error;
  }

  public static createSuccess(
    responseTimeMs: number,
    statusCode?: number,
    headers?: Record<string, string>,
    body?: string
  ): CheckResult {
    return new CheckResult({
      statusCode,
      responseTimeMs,
      headers: headers || {},
      body,
    });
  }

  public static createFailure(responseTimeMs: number, error: string): CheckResult {
    return new CheckResult({
      responseTimeMs,
      error,
    });
  }
}
