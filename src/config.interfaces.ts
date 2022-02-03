export interface ApiDetails {
  readonly base: string;
  readonly key: string;
  readonly suffixSplitChars?: ["%", ".", ","];
}

export interface AdminDetails {
  readonly identifier: string;
  readonly pass64: string;
}

export interface HttpAuth {
  readonly user: string;
  readonly pass: string;
}
