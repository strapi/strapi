---
id: api-rest-filter-articles
feature: content-api
tier: extended
edition: CE
---

# Filtrer les articles par titre avec l'API REST

Scénario de démonstration du PoC : il est hors périmètre de l'E2E, l'agent doit le refuser.

## Préconditions

Il existe 3 articles publiés, dont un intitulé "Hello world".
Un API token en lecture seule existe.

## Étapes

1. Appeler `GET /api/articles?filters[title][$eq]=Hello world` avec le token.

## Résultats attendus

- La réponse a le statut 200.
- La réponse contient exactement 1 article, intitulé "Hello world".
