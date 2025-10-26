## 🎯 Objective
Design a scalable, configurable, and maintainable audit logging system for Strapi that automatically records all content changes and exposes them via a secure REST API.

---

## 🏗️ Design Approach

### 1. Non-Intrusive Integration
The system leverages **Strapi lifecycle events** rather than modifying core services — making it upgrade-safe and modular. 

Lifecycle hooks were selected over an EventHub-based implementation to ensure tighter coupling with Strapi’s internal data persistence layer and reduce architectural overhead. This approach allows the audit plugin to intercept core CRUD operations directly at the ORM level, ensuring deterministic and synchronous logging of state changes. While an EventHub would enable more scalable, asynchronous event handling across distributed systems, lifecycle hooks provide stronger data consistency guarantees and simplify deployment by eliminating the need for additional message brokers or event infrastructure. This trade-off favors integrity and maintainability within a single-instance Strapi deployment.

### 2. Centralized Service Layer
All logging logic resides in the `audit-log` service, allowing:
- Unified creation, filtering, and pagination
- Easy testing and extension

### 3. Data Model
Each `audit_log` record stores:
- Content type name  
- Record ID  
- Action  
- Timestamp  
- Diff or payload  
- Relational link to user

This ensures query flexibility and performance (index-friendly fields).

### 4. Access Control
Middleware checks for `read_audit_logs` permission, isolating log access from other users and preserving security boundaries.

### 5. Configurability
Admins can globally disable audit logging or exclude sensitive content types (`user`, `admin::role`, etc.) via `config/default.ts`.

---

## 🧠 Trade-offs and Reasoning

| Decision | Trade-off |
|-----------|------------|
| Store diffs as JSON | Simpler to implement; may grow storage over time |
| Use lifecycle hooks | Minimal intrusion but slightly harder to trace in debugging |
| REST endpoint only | Simpler to evaluate; GraphQL could be added later |
| One-to-one user relation | Keeps queries efficient; avoids denormalization |

---

## 🧩 Extensibility
- Could easily emit events to message queues (e.g., Kafka, AWS SNS)
- Ready for future admin dashboard UI for audit review
- Schema can evolve with additional metadata (e.g., IP, User-Agent)

---

## ✅ Summary
This design ensures:
- **Seamless integration** into Strapi
- **Configurable and secure** audit data collection
- **Scalable structure** for future reporting and analytics

By centralizing logic in a dedicated plugin and leveraging Strapi’s event hooks, the system remains robust, modular, and easy to maintain.