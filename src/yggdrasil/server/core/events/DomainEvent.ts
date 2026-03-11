export interface DomainEvent<TPayload extends object = Record<string, unknown>> {
  type: string;
  timestamp: number;
  payload: TPayload;
}
