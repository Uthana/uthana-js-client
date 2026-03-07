/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { GET_USER, GET_ORG } from "../graphql.js";
import type { UthanaClient } from "../client.js";
import type { Org, User } from "../types.js";
import { BaseModule } from "./base.js";

/** Organization and user info. */
export class OrgModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** Get current user information. */
  async get_user(): Promise<User> {
    return this._client._graphql<User>(GET_USER, {}, {
      path: "user",
      pathDefault: {},
    });
  }

  /** Get current organization information including quota. */
  async get_org(): Promise<Org> {
    return this._client._graphql<Org>(GET_ORG, {}, {
      path: "org",
      pathDefault: {},
    });
  }
}
