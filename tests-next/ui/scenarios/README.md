# Scénarios no-code E2E

Chaque fichier `.md` de ce dossier décrit un test de l'admin, en français ou en anglais. Quand une
PR ajoute ou modifie un scénario, la CI génère le test Playwright correspondant et le pousse sur la
branche de la PR. Il n'y a pas de code à écrire : relis le test généré et le commentaire laissé
sur la PR, puis merge.

Le fonctionnement complet est décrit dans [`../no-code-e2e/README.md`](../no-code-e2e/README.md).

## Écrire un scénario

Un dossier par domaine (`content-manager/`, `settings/`…), un fichier par scénario.

```markdown
---
id: cm-create-and-publish-article # unique, en kebab-case
feature: content-manager
tier: critical # critical | extended | release
edition: CE # CE (EE pas encore supporté)
---

# Créer et publier un article

## Préconditions

Je suis connecté en tant qu'éditeur.
Il existe 3 articles publiés.

## Étapes

1. Aller dans le Content Manager, collection "Article".
2. Créer une nouvelle entrée avec le titre "Hello world".
3. Publier l'entrée.

## Résultats attendus

- Une notification de succès s'affiche.
- L'entrée apparaît dans la liste avec le statut "Published".
```

- **Préconditions** : en langage libre. Rôle (administrateur, éditeur, auteur, non connecté),
  données (« 3 articles publiés »), content type nécessaire (« un content type Product avec un
  champ price »). Elles sont créées directement en base, sans passer par l'interface.
- **Étapes** : une liste numérotée d'actions qu'un utilisateur fait dans l'admin.
- **Résultats attendus** : une liste à puces. Chaque puce devient au moins une vérification.
  Sois précis : le texte exact d'un message, le statut attendu, le nombre d'éléments. Un résultat
  trop vague est renvoyé avec une question en commentaire de PR plutôt que deviné.
- Les titres de section peuvent aussi être en anglais : `Preconditions`, `Steps`,
  `Expected results`.

## Ce qui n'est pas accepté

L'agent refuse, avec une explication sur la PR :

- les tests d'API (REST, GraphQL, droits d'un API token) : ils relèvent de la suite API ;
- Document Service, data transfer, serveur MCP, CLI ;
- la création ou la modification d'un content type dans le Content-Type Builder (le consulter est
  accepté) ;
- les fonctionnalités IA du produit ;
- l'édition EE, pour l'instant.

## Vérifier un scénario avant de pousser

```bash
node tests-next/ui/no-code-e2e/scripts/scenarios.mjs
```

Affiche les erreurs de format et la liste des scénarios qui seront générés. Aucun appel à l'IA.

## Modifier ou supprimer un scénario

- Modifier un `.md` régénère son test au prochain passage de la CI.
- Supprimer un `.md` supprime son test.
- Ne modifie jamais un test généré à la main : il serait écrasé. Change le scénario.
