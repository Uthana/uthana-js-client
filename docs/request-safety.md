# Request deadlines and uncertain outcomes

`UthanaClient` applies its `timeout` (seconds) to GraphQL requests. Methods offering `timeoutSeconds`, such as motion sharing, override it for that call. Values must be positive and no greater than 2147483.647 seconds; submillisecond values round up to one millisecond. Each request gets its own deadline.

Mutation timeouts, lost connections and invalid response JSON can leave the operation outcome unknown. They raise `UthanaError` with `kind: "uncertain"`; inspect existing work before submitting a charged operation again. Definitive GraphQL errors retain their original error category. Queries preserve transport failures and do not use the uncertain mutation category. No request is automatically retried by the SDK.

Configured decoded GraphQL response limits count UTF-8 bytes, including non-ASCII text. Graffle parses the response before this decoded-result check; it is not a streaming memory limit. `motions.rate` validates a numeric 0 or 1 before sending the request.
