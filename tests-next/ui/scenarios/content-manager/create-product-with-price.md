---
id: cm-create-product-with-price
feature: content-manager
tier: extended
edition: CE
---

# Create a product with a price

## Preconditions

I am logged in as an administrator.
There is a "Product" content type with a "name" field (text, required) and a "price" field (decimal, required).

## Steps

1. Go to the Content Manager, "Product" collection.
2. Create a new entry with the name "Chair", without a price.
3. Try to save.
4. Fill in the price 49.90.
5. Save.

## Expected results

- At step 3, the save is refused and the "price" field shows a validation error.
- At step 5, a success notification shows.
- The "Chair" entry shows in the list of products.
