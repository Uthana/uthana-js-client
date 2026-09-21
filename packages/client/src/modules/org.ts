/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { GET_ORG, GET_PRICES, GET_USAGE, GET_USER } from "../graphql";
import type { Org, PaygPrice, User } from "../types";
import { BaseModule } from "./base";

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

  /** Get current PAYG model prices with their billing units. */
  async getPrices(): Promise<PaygPrice[]> {
    return this._client._graphql<PaygPrice[]>(GET_PRICES, {}, { path: "payg_prices", pathDefault: [] });
  }
}
