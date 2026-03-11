export interface PendingApproval {
  skill: string;
  args: string;
}

export interface IApprovalStore {
  get(id: string): PendingApproval | null;
  set(id: string, approval: PendingApproval): void;
  delete(id: string): boolean;
}
