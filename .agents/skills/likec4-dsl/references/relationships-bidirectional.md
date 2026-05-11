# Bidirectional vs. Unidirectional Relationships

## Key distinction: → vs →↔

LikeC4 distinguishes between **directed relationships** (`->`) and **bidirectional relationships** (`<->`).

### When to use `->` (unidirectional)

```likec4
model {
  frontend -> backend
  backend -> database
}
```

**Use `->` when:**

- One element sends a request or message to another _without_ an explicit return path.
- Example: frontend **calls** API (backend responds, but the call is primarily one-way from frontend's perspective).
- Example: worker **processes** job from queue (job flows in one direction).
- Example: service **publishes** event to event bus (unidirectional publish).

### When to use `<->` (bidirectional)

```likec4
model {
  frontend <-> backend
  microservice1 <-> microservice2 "RPC sync"
}
```

**Use `<->` when:**

- Both elements actively communicate with each other _in both directions_ as part of the same logical interaction.
- Example: client <-> server API (client sends request; server sends response; both are significant).
- Example: service A <-> service B (service A calls B _and_ B calls A, not just a request-response pair).
- Example: two databases synchronized (bidirectional replication).

### When a request-response is one-way

In most REST APIs, even though the server responds, we still model it as `->` because:

```likec4
frontend -> api "REST call"
```

The **relationship itself** is directional: frontend initiates. The response is implicit in the interaction model.

**Exception:** If the prompt explicitly asks for bidirectionality or if the system model emphasizes that _both elements drive interaction_, use `<->`.

## Include predicates: `->` vs. `<->`

In scoped views, relationship inclusion predicates use the same distinction:

```likec4
views {
  view backend-detail of cloud.backend {
    include *
    include -> cloud.backend   // Incoming relationships (sources pointing TO this scope)
    include <-> cloud.backend  // Bidirectional relationships involving this scope
  }
}
```

- `-> scope` — _inbound_ relationships from outside the scope pointing into it.
- `<-> scope` — relationships that are bidirectional with the scope.
- `scope ->` — _outbound_ relationships from the scope pointing out.

## Summary

| Syntax            | Meaning                                                     | Use case                                             |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `A -> B`          | Unidirectional: A initiates/calls/sends to B                | REST API call, event publish, job dispatch           |
| `A <-> B`         | Bidirectional: both actively communicate                    | Sync RPC, synchronized replication, mutual messaging |
| `-> X` (in view)  | Inbound: relationships from outside pointing to X           | Show external callers of a component                 |
| `<-> X` (in view) | Bidirectional: relationships where X participates both ways | Show symmetric dependencies                          |

**When in doubt:** use `->` for request-response patterns (REST, async jobs, events). Reserve `<->` for explicitly symmetric interactions documented in requirements.
