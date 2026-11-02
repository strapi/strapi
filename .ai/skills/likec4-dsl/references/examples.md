# Examples

Compact, real-world patterns. Each example demonstrates multiple features.

## Extend Element & Metadata Merge

```likec4
// base.c4
model {
  cloud = system "Cloud" {
    api = service "API" {
      metadata { owner "team-a"; port "8080" }
    }
  }
}

// ops.c4 — extend adds nested elements, merges metadata (duplicate keys become arrays)
model {
  extend cloud.api {
    #monitored
    metadata { port "9090"; region "us-east-1" }
    // Result: port becomes ["8080", "9090"]

    health = component "Health Check" { technology "HTTP" }
  }
}
```

## Extend Relationship

```likec4
specification {
  relationship async { color amber; line dotted }
}
model {
  frontend -> api "requests"
  frontend -[async]-> api "streams"   // different relation (kind distinguishes)

  // Extend adds metadata/tags to existing relation (must match source, target, title, kind)
  extend frontend -> api "requests" {
    metadata { latency_p95 "150ms" }
  }
}
```

## View Extends (Inheritance)

```likec4
views {
  view overview {
    include *
    style * { color muted }
  }
  view detail extends overview {
    title "More detail"
    include cloud.backend.*          // adds to parent's includes
    style cloud.backend.* { color primary }
  }
  view deep extends detail {         // cascade inheritance
    include cloud.backend.api.*
  }
}
```

## Scoped View

```likec4
views {
  // "of" scopes the view — `*` means the scoped element + direct children
  view backend of cloud.backend {
    include *
    include -> cloud.backend ->      // incoming/outgoing relations

    style cloud.backend { color primary }
    style cloud.backend.* { color secondary }
  }
}
```

## Groups in Views

```likec4
views {
  view grouped {
    group "Internal" {
      color primary
      opacity 20%
      include cloud.*
    }
    group "External" {
      color amber
      include customer, partner
    }
    // Unnamed group
    group {
      include monitoring.*
    }
  }
}
```

## Global Style & Predicate Groups

```likec4
global {
  styleGroup theme {
    style element.tag = #deprecated { color muted; opacity 20% }
    style element.tag = #critical { color red }
  }
  predicateGroup core_services {
    include cloud.* where kind is service
    exclude * where tag is #deprecated
  }
}
views {
  global style theme             // apply to all views in block

  view services {
    global predicate core_services
    include * -> cloud.*         // add relations to included elements
  }
}
```

## Dynamic View — Parallel, Notes, NavigateTo

```likec4
dynamic view checkout {
  title "Checkout Flow"

  customer -> frontend "places order" {
    notes '''
      **Entry point**: customer submits cart
    '''
  }
  frontend
    -> api "POST /checkout"
    -> validator "validate cart"     // chained syntax

  parallel {
    api -> payments "charge card"
    api -> inventory "reserve items"
    api -> notifications "send confirmation"
  }

  payments <- api "payment result" {
    navigateTo payment-detail        // link to another view
  }

  include cloud with { opacity 10%; color gray }
  style customer { color green }
  autoLayout TopBottom
}
```

## Deployment — Multi-Environment, InstanceOf

```likec4
specification {
  deploymentNode environment { style { color gray } }
  deploymentNode region
  deploymentNode vm
}
deployment {
  environment prod "Production" {
    technology "OpenTofu"

    region eu {
      vm server1 {
        app = instanceOf cloud.api       // named instance
        instanceOf cloud.ui              // anonymous instance
      }
      vm server2 {
        db = instanceOf cloud.db {
          title "Primary DB"
          technology "PostgreSQL 16"
        }
      }
    }
    region us {
      vm server3 {
        db = instanceOf cloud.db "Replica DB"
      }
      // Deployment-specific relation (replication)
      server3.db -> eu.server2.db "replicates" {
        metadata { lag "100ms"; mode "async" }
      }
    }
  }
}
views {
  deployment view prod_deploy {
    title "Production"
    include prod.**
    style eu._ { color primary }
    style us._ { color secondary }
  }
}
```

## Rank — Layout Control

```likec4
views {
  view ranked {
    include A, B, C, D, E, F

    rank same { A, B }       // same vertical level
    rank source { C, D }     // force to top
    rank max { F }           // force to bottom
  }
}
```

## Where Predicates — Filtering

```likec4
views {
  view filtered {
    // By tag
    include cloud.* where tag is #production

    // By kind + negated tag
    include cloud.* where kind is service and tag is not #deprecated

    // By metadata
    include cloud.* where metadata.region is "eu"

    // Relationship filtering
    include cloud.* -> amazon.* where source.tag is #critical

    // Wildcard with expansion
    include cloud._                  // direct children only
    include cloud.**                 // all descendants
  }
}
```

## Relationship Kinds & Styling

```likec4
specification {
  relationship async { color amber; line dotted; head diamond; tail vee }
  relationship sync  { color primary; line solid }
}
model {
  api -[async]-> queue "publishes" {
    technology "Kafka"
    metadata { format "CloudEvents" }
  }
  api .sync -> cache "reads"          // alternative syntax: .KIND ->

  // Inline style override
  api -> db "writes" {
    style { color red; line dashed; head odiamond }
  }
}
```

## Complete Mini-Project

```likec4
specification {
  element actor   { style { shape person } }
  element system  { style { shape rectangle } }
  element service { style { shape component } }
  element webapp  { style { shape browser } }
  element db      { style { shape storage } }

  tag deprecated
  tag critical

  relationship async { color amber; line dotted }
  deploymentNode env
  deploymentNode vm
}

model {
  customer = actor "Customer"

  cloud = system "Cloud" {
    ui = webapp "Frontend" { icon tech:react }
    api = service "API" {
      #critical
      technology "Node.js"
      icon tech:nodejs
    }
    db = db "Database" {
      icon tech:postgresql
      description '''
        Primary PostgreSQL database.
        Handles all transactional data.
      '''
    }
    api -> db "reads/writes"
    ui -> api "calls" { technology "HTTPS" }
  }

  customer -> cloud.ui "browses" {
    navigateTo user-flow
    metadata { protocol "HTTPS" }
  }
}

deployment {
  env prod {
    vm web { instanceOf cloud.ui; instanceOf cloud.api }
    vm data { instanceOf cloud.db }
    web -> data "internal network"
  }
}

views {
  view index {
    include *
    style cloud { color primary }
    style customer { color green }
  }

  view backend of cloud {
    include *
    autoLayout LeftRight
  }

  dynamic view user-flow {
    customer -> cloud.ui "opens app"
    cloud.ui -> cloud.api "fetches data"
    cloud.api -> cloud.db "queries"
    cloud.api -> cloud.ui "returns"

    style cloud { opacity 20% }
  }

  deployment view prod-deploy {
    include prod.**
  }
}
```
