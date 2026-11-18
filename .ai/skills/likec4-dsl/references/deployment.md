# Deployment (LikeC4 DSL)

The `deployment` block maps logical model elements to physical infrastructure nodes using `instanceOf`. It uses `deploymentNode` kinds from the specification.

**Key rules:**

- Deployment inherits ALL relationships from the logical model automatically.
- Additional deployment-level relationships can be defined inline (same syntax as in model).
- Use named instances (`id = instanceOf ELEMENT`) when multiple instances of the same element exist within the same deployment node.
- Anonymous `instanceOf ELEMENT` (no name) is fine when there is only one instance per node.

## Syntax

```likec4
deployment {
  IDENTIFIER = DEPLOYMENT_KIND {
    TAGS
    PROPERTIES

    // Anonymous instance — fine when there is only one instance per node
    instanceOf ELEMENT_ID

    // Named instance — required when same element appears multiple times in the same node
    IDENTIFIER = instanceOf ELEMENT_ID {
      TAGS
      PROPERTIES
    }
  }
}
```

## Basic Example

```likec4
specification {
  element webapp
  deploymentNode vm
}
model {
  webapp myapp
}
deployment {
  vm vm1 {
    instanceOf myapp           // anonymous: single instance
  }
  vm vm2 {
    // Named: two replicas of the same logical element in one node
    instance1 = instanceOf myapp
    instance2 = instanceOf myapp
  }
}
```

## Multi-Environment Pattern

```likec4
specification {
  deploymentNode environment { notation "Environment"; style { color gray } }
  deploymentNode zone         { notation "Network Zone" }
  deploymentNode vm
}

deployment {
  environment prod {
    zone AppTier {
      vm appVm {
        primary   = instanceOf cloud.api
        secondary = instanceOf cloud.api  // named: two replicas
      }
    }
    zone DataTier {
      vm dbVm { instanceOf cloud.db }
    }
  }
  environment staging {
    vm stagingApp { instanceOf cloud.api }
    vm stagingDb  { instanceOf cloud.db }
  }
}
```

## Deployment Relationships

Additional relationships can be defined between deployment nodes or named instances:

```likec4
deployment {
  environment prod {
    zone AppTier {
      vm appVm {
        primary = instanceOf cloud.api
      }
    }
    zone DataTier {
      vm dbVm { instanceOf cloud.db }
    }
    // Deployment-level relationship not in the logical model
    AppTier -> DataTier "internal traffic" { technology "TCP/5432" }
  }
}
```

## Named vs. Anonymous: When It Matters

| Scenario                                        | Use                                           |
| ----------------------------------------------- | --------------------------------------------- |
| Single instance of element in node              | Anonymous: `instanceOf cloud.api`             |
| Multiple instances of same element in same node | Named: `primary = instanceOf cloud.api`       |
| Strict eval requires named instance identifier  | Named: `IDENTIFIER = instanceOf ELEMENT`      |
| Deployment view needs to distinguish replicas   | Named: each gets a unique node in the diagram |
