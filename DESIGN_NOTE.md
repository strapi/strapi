# Design Summary: Automated Audit Logging Feature

## 1. Approach

The automated audit logging feature is implemented as a custom Strapi plugin named `audit-log`. This approach ensures modularity, reusability, and adherence to Strapi's plugin architecture. The core logic for capturing content changes leverages Strapi's lifecycle hooks, which provide a robust mechanism to intercept data modifications at the database level.

## 2. Architecture

The audit logging system integrates with Strapi's core in the following manner:

### Read Path Flow
![Read Path Flow](./readpath.png)

### Write Path Flow
![Write Path Flow](./writepath.png)

*   **`audit-log` Plugin:**
    *   **Content Type (`audit_log`):** A new collection type `audit_log` is defined within the plugin. This content type stores all audit log entries, including `action` (create, update, delete), `contentType`, `recordId`, `userId`, and a `payload` containing the change details.
    *   **Lifecycle Hooks (`register.ts`):** The plugin subscribes to `afterCreate`, `afterUpdate`, and `afterDelete` lifecycle events for all content types. These hooks are responsible for:
        *   Detecting content modifications.
        *   Constructing the audit log entry based on the action type (full payload for create/delete, before/after state for update).
        *   **Sending the audit log entry as a message to a Kafka topic via the `kafka.ts` service.**
    *   **Kafka Integration:**
        *   **Kafka Producer (`kafka.ts` service):** Handles connecting to Kafka brokers and sending audit log messages to a configured topic.
        *   **Kafka Consumer (`kafka-consumer.ts` service):** Runs as a background process, consumes messages from the Kafka topic, and then persists these audit log entries to the `audit_logs` collection via `strapi.entityService.create()`. This decouples the logging process from the main request flow, preventing backpressure and ensuring event durability.
    *   **REST API (`/audit-logs`):** The plugin exposes a custom REST API endpoint `/audit-logs` to retrieve, filter, and paginate audit log entries.
        *   **Route (`routes/index.ts`):** Defines the `GET /audit-logs` endpoint.
        *   **Controller (`controllers/audit-log.ts`):** Handles incoming requests to `/audit-logs`, extracts query parameters, and delegates to the service layer.
        *   **Service (`services/audit-log.ts`):** Contains the business logic for querying the `audit_logs` collection, applying filters (content type, user ID, action type, date range), pagination, and sorting using `strapi.entityService.findPage()`.
    *   **Access Control:** A custom permission `plugin::audit-log.read` is registered, allowing administrators to control access to the `/audit-logs` endpoint via Strapi's role-based access control system.
    *   **Configuration:** The plugin provides configuration options (`auditLog.enabled`, `auditLog.excludeContentTypes`) to globally enable/disable logging and specify content types to exclude.

*   **Strapi Core:**
    *   **Database Layer:** The `audit_logs` content type is automatically mapped to a database table. `strapi.entityService` provides a database-agnostic interface for interacting with this table.
    *   **Lifecycle Event System:** Strapi's built-in lifecycle event system is leveraged to trigger the audit logging logic.
    *   **Authentication/Authorization:** Strapi's authentication system is used to identify the user performing the action (though injecting the user into the lifecycle hook requires careful consideration, potentially via middleware).

## 3. Tradeoffs and Considerations

*   **User Context in Lifecycle Hooks:** Obtaining the authenticated user within a lifecycle hook can be challenging as the `event` object doesn't directly expose the request context. A common solution involves using a global middleware to store the user information (e.g., `ctx.state.user`) in a request-scoped manner that the lifecycle hook can then access. This adds a dependency on a global state or a custom context propagation mechanism.
*   **`afterUpdate` "Before" State:** To accurately capture the "before" state for `update` operations, the lifecycle hook needs to perform an additional database query *before* the update occurs (e.g., in a `beforeUpdate` hook, store the current state, then use it in `afterUpdate`). This introduces an extra database read for every update operation, which is a performance consideration for high-volume applications. For simplicity in the initial implementation, the `afterUpdate` payload might only contain the `after` state, with a note on how to enhance it.
*   **Kafka Integration Benefits:**
    *   **Backpressure Handling:** Decoupling the logging process from the main request flow via Kafka prevents backpressure on the Strapi application, ensuring that API requests remain responsive even under heavy load.
    *   **Event Loss Prevention:** Kafka acts as a durable message queue, significantly reducing the risk of audit log event loss if the database is temporarily unavailable or slow.
    *   **Scalability:** Kafka provides a highly scalable and fault-tolerant platform for handling high volumes of audit log events.
*   **Kafka Integration Complexities:**
    *   **Infrastructure Overhead:** Introducing Kafka adds an external dependency, requiring setup, maintenance, and monitoring of Kafka brokers.
    *   **Consumer Reliability:** The Kafka consumer (`kafka-consumer.ts`) needs robust error handling, including retry mechanisms and potentially a dead-letter queue, to ensure all messages are eventually processed and persisted to the database.
    *   **Message Ordering:** While Kafka guarantees order within a partition, ensuring global message ordering across multiple partitions or consumers requires careful design if strict global ordering is a requirement.
    *   **Monitoring:** Additional monitoring for Kafka topics, consumer lag, and producer/consumer health is necessary.
*   **Performance Impact:** Logging every `create`, `update`, and `delete` operation can generate a significant volume of data, especially for active content types. Proper database indexing (as included in the `audit_log` schema) is crucial for maintaining query performance. The `excludeContentTypes` configuration option helps mitigate this by allowing developers to opt out of logging for less critical content types.
*   **Payload Size:** Storing the full `payload` (especially for rich text or large objects) can lead to large audit log entries. While `JSON` type is flexible, it's important to consider the storage implications.
*   **Scalability of Audit Log Storage:** For very high-traffic applications, the `audit_logs` table could grow very large. Strategies like archiving old logs, using a dedicated logging service, or implementing time-based partitioning might be necessary in a production environment.

## 4. Future Enhancements

*   **Date Range Filtering:** Enhance the `auditLog` service to properly parse and apply date range filters to the `createdAt` timestamp of the audit log entries.
*   **User Injection:** Implement a middleware to reliably inject the authenticated user's ID into the lifecycle hook context.
*   **Detailed Diffing for Updates:** Implement a more sophisticated diffing mechanism for `update` operations to only store the actual changes, rather than the full "before" and "after" objects, to reduce payload size.
*   **Admin UI Integration:** Develop a simple UI in the Strapi admin panel to view and manage audit logs.
*   **Export Functionality:** Add an option to export audit logs in various formats (CSV, JSON).