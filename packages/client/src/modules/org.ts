/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { UthanaError } from "../errors";
import type { UthanaClient } from "../client";
import { GET_ORG, GET_PRICES, GET_USAGE, GET_USER } from "../graphql";
import type { LedgerEntry, LedgerOptions, Org, PaygPrice, User } from "../types";
import { BaseModule } from "./base";

const LEDGER_MAX_LIMIT = 500;
const LEDGER_HISTORY_MS = 7 * 24 * 60 * 60 * 1000;

const USD_DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const USD_FIELDS = new Set(["total_usd", "balance_before", "balance_after", "unit_price"]);

function ledgerEntries(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) {
    throw new UthanaError(502, "Uthana returned an invalid ledger list", "invalid_response");
  }
  return value.map((row: unknown, index): LedgerEntry => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new UthanaError(
        502,
        `Uthana returned an invalid ledger entry at index ${index}`,
        "invalid_response",
      );
    }
    const record: Record<string, unknown> = { ...row };
    if (typeof record.id !== "string" || !record.id.trim()) {
      throw new UthanaError(502, `Ledger entry ${index} has no valid ID`, "invalid_response");
    }
    const entry: LedgerEntry = { id: record.id };
    for (const field of ["created", "type", "total_usd"] as const) {
      if (field in record) {
        const item = record[field];
        if (
          typeof item !== "string" ||
          (USD_FIELDS.has(field) && !USD_DECIMAL_PATTERN.test(item))
        ) {
          throw new UthanaError(
            502,
            `Ledger entry ${index} has an invalid ${field}`,
            "invalid_response",
          );
        }
        entry[field] = item;
      }
    }
    for (const field of [
      "balance_before",
      "balance_after",
      "job_id",
      "task_id",
      "model",
      "model_version",
      "billing_unit",
      "unit_price",
      "ref",
      "status",
    ] as const) {
      if (field in record) {
        const item = record[field];
        if (
          item !== null &&
          (typeof item !== "string" || (USD_FIELDS.has(field) && !USD_DECIMAL_PATTERN.test(item)))
        ) {
          throw new UthanaError(
            502,
            `Ledger entry ${index} has an invalid ${field}`,
            "invalid_response",
          );
        }
        entry[field] = item;
      }
    }
    if ("quantity" in record) {
      const quantity = record.quantity;
      if (quantity !== null && (typeof quantity !== "number" || !Number.isFinite(quantity))) {
        throw new UthanaError(
          502,
          `Ledger entry ${index} has an invalid quantity`,
          "invalid_response",
        );
      }
      entry.quantity = quantity;
    }
    return entry;
  });
}

function ledgerTime(name: string, value: Date | string): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new Error(`${name} must be a valid Date or ISO 8601 timestamp`);
    }
    return value.toISOString();
  }
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${name} must be a valid Date or ISO 8601 timestamp`);
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (
    year < 1 ||
    Number(value.slice(11, 13)) > 23 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  ) {
    throw new Error(`${name} must be a valid Date or ISO 8601 timestamp`);
  }
  return value;
}

/** Organization and user info. */
export class OrgModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** Get current user information. */
  async getUser(): Promise<User> {
    return this._client._graphql<User>(GET_USER, {}, { path: "user", pathDefault: {} });
  }

  /** Get current organization information including quota. */
  async getOrg(): Promise<Org> {
    return this._client._graphql<Org>(GET_ORG, {}, { path: "org", pathDefault: {} });
  }

  /** Get account quotas, subscription state, PAYG balance, and current prices. */
  async getUsage(): Promise<Record<string, unknown>> {
    return this._client._graphql<Record<string, unknown>>(GET_USAGE);
  }

  /** Read PAYG charges, payments and credits from the last seven days, newest first. */
  async getLedger(options: LedgerOptions = {}): Promise<LedgerEntry[]> {
    const limit = options.limit === undefined ? 50 : options.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > LEDGER_MAX_LIMIT) {
      throw new Error(`limit must be an integer from 1 to ${LEDGER_MAX_LIMIT}`);
    }
    const declared = ["$limit: Int"];
    const args = ["limit: $limit"];
    const variables: Record<string, unknown> = { limit };
    if (options.beforeId != null) {
      if (typeof options.beforeId !== "string" || !options.beforeId) {
        throw new Error("beforeId must be a ledger entry ID from a previous page");
      }
      declared.push("$before_id: ID");
      args.push("before_id: $before_id");
      variables.before_id = options.beforeId;
    }
    const now = Date.now();
    const cutoff = now - LEDGER_HISTORY_MS;
    const times = { since: new Date(cutoff).toISOString(), until: new Date(now).toISOString() };
    for (const name of ["since", "until"] as const) {
      const value = options[name];
      if (value != null) {
        times[name] = ledgerTime(name, value);
        const timestamp = Date.parse(times[name]);
        if (name === "since" && timestamp < cutoff) {
          times.since = new Date(cutoff).toISOString();
        } else if (timestamp < cutoff || timestamp > now) {
          throw new Error(
            `${name} must be within the last 7 days. Use the API or web for older history.`,
          );
        }
      }
    }
    if (Date.parse(times.since) >= Date.parse(times.until)) {
      throw new Error("since must be earlier than until");
    }
    for (const name of ["since", "until"] as const) {
      declared.push(`$${name}: DateTime`);
      args.push(`${name}: $${name}`);
      variables[name] = times[name];
    }
    if (options.types != null) {
      if (
        !Array.isArray(options.types) ||
        !options.types.every((type) => typeof type === "string" && type.length > 0)
      ) {
        throw new Error("types must be a list of entry type names, such as ['debit']");
      }
      declared.push("$types: [String!]");
      args.push("types: $types");
      variables.types = [...options.types];
    }
    const query = `query Ledger(${declared.join(", ")}) {
      payg_ledger(${args.join(", ")}) {
        id created type total_usd balance_before balance_after
        job_id task_id model model_version billing_unit quantity unit_price ref status
      }
    }`;
    const rows = await this._client._graphql<unknown>(query, variables, { path: "payg_ledger" });
    return ledgerEntries(rows);
  }

  /** Get current PAYG model prices with their billing units. */
  async getPrices(): Promise<PaygPrice[]> {
    return this._client._graphql<PaygPrice[]>(
      GET_PRICES,
      {},
      { path: "payg_prices", pathDefault: [] },
    );
  }
}
