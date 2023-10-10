# V5 breaking changes

## Database

### Shorten identifiers

- Shorten identifier to be 53 chars max
- Add a hashing key when shortening to avoid conflicts (6 1st chars of sha-256)
- Use short suffixes

| Suffix                 | Short version |
| ---------------------- | ------------- |
| `fk`                   | `fk`          |
| `unique`               | `unq`         |
| `primary`              | `pk`          |
| `index`                | `idx`         |
| `component`            | `cmp`         |
| `components`           | `cmps`        |
| `component_type_index` | `cmpix`       |
| `entity_fk`            | `etfk`        |
| `field_index`          | `flix`        |
| `order`                | `ord`         |
| `order_fk`             | `ofk`         |
| `order_inv_fk`         | `oifk`        |
| `order_index`          | `oidx`        |
| `inv_fk`               | `ifk`         |
| `morphs`               | `mph`         |
| `links`                | `lnk`         |
| `id_column_index`      | `idix`        |
