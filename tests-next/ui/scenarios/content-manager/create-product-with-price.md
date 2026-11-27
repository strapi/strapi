---
id: cm-create-product-with-price
feature: content-manager
tier: extended
edition: CE
---

# Créer un produit avec un prix

## Préconditions

Je suis connecté en tant qu'administrateur.
Il existe un content type "Product" avec un champ "name" (texte, requis) et un champ "price" (décimal, requis).

## Étapes

1. Aller dans le Content Manager, collection "Product".
2. Créer une nouvelle entrée avec le nom "Chaise" sans renseigner de prix.
3. Essayer d'enregistrer.
4. Renseigner le prix 49.90.
5. Enregistrer.

## Résultats attendus

- À l'étape 3, l'enregistrement est refusé et le champ "price" affiche une erreur de validation.
- À l'étape 5, une notification de succès s'affiche.
- L'entrée "Chaise" apparaît dans la liste des produits.
