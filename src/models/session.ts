export interface SessionBootstrapState {
  attempt: number;
  status: "loading" | "ready" | "error";
}
