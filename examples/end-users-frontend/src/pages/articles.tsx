import { useAuth, useSession } from '@better-auth-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { strapi } from '@/lib/api';

const ARTICLE_UID = 'api::article.article';
const USER_UID = 'plugin::end-users.user';

interface Article {
  documentId: string;
  title: string;
  body: string | null;
  createdAt: string;
  /** Null for a draft */
  publishedAt: string | null;
  /** Set only when the caller is the author: see `articles` below */
  author?: { documentId: string } | null;
}

type ArticlesResponse = { data: Article[] };

/** What `GET /api/end-users/permissions/me` says about the caller: the rows their roles hold */
interface Permissions {
  subjects: Record<string, Record<string, { conditions: string[] }>>;
}

type ArticleInput = { title: string; body: string | null };

/**
 * The articles of `examples/end-users` (`api::article.article`), which have draft and publish.
 * Anyone can read the published ones: the example's seed gives the Public role `find` and
 * `findOne`. A signed-in user writes drafts, edits them and publishes them, and only the ones they
 * wrote: the seed gives the Authenticated role `create`, `update`, `read-drafts` and `publish`
 * under `is-owner(author)`, and Strapi stamps the caller as the author of what they create. Those
 * are the example's own permissions, and an administrator can take them away: the page then shows
 * what Strapi answers.
 *
 * What the page offers follows the role: it reads `GET /api/end-users/permissions/me`, which lists
 * the rows the roles hold, and leaves out a button the role has no row for. It is a courtesy.
 * Strapi decides: a request the page should not have sent is refused all the same.
 */
export function ArticlesPage() {
  const { authClient } = useAuth();
  const { data: session, isPending: sessionPending } = useSession(authClient);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // In the address, so a reload shows the same list
  const view = searchParams.get('view') === 'drafts' ? 'drafts' : 'published';
  const userId = session?.user.id ?? 'public';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: permissions, isPending: permissionsPending } = useQuery({
    queryKey: ['permissions', userId],
    queryFn: async () =>
      (await strapi<{ data: Permissions }>('/api/end-users/permissions/me')).data,
    enabled: !sessionPending,
    retry: false,
  });

  const holds = (uid: string, action: string) => Boolean(permissions?.subjects[uid]?.[action]);
  const canWrite = (action: string) => holds(ARTICLE_UID, action);

  const {
    data: articles,
    error,
    isPending,
  } = useQuery({
    // Keyed by who is looking and which list: what Public may read and what a signed-in role may
    // read can differ
    queryKey: ['articles', userId, view],
    queryFn: async () => {
      const query: Record<string, string> = {
        sort: 'createdAt:desc',
        'pagination[pageSize]': '50',
      };

      if (view === 'drafts') {
        // The drafts the caller wrote and never published (`read-drafts` decides which)
        query.status = 'draft';
        query.publicationFilter = 'never-published-document';
      }

      // Which articles are the caller's own: the end-user type is readable under `is-self`, so the
      // author comes back for the caller's articles and empty for everyone else's. Public may not
      // read the user type, and asking for a relation it may not read is refused
      if (session && holds(USER_UID, 'find')) {
        query['populate[author][fields][0]'] = 'documentId';
      }

      return (await strapi<ArticlesResponse>('/api/articles', { query })).data;
    },
    enabled: !sessionPending && !permissionsPending,
    retry: false,
  });

  const done = async (message: string, next: 'drafts' | 'published') => {
    toast.success(message);
    setSearchParams(next === 'drafts' ? { view: 'drafts' } : {});
    await queryClient.invalidateQueries({ queryKey: ['articles'] });
  };

  const create = useMutation({
    // No `author` is sent: it would be whatever the browser says. Strapi sets it to the caller
    // (`is-owner` on the `create` row), and refuses a body that names one. `status=draft` makes
    // the article a draft; without it the author's own `publish` would publish it at once
    mutationFn: (input: ArticleInput) =>
      strapi('/api/articles', {
        method: 'POST',
        query: { status: 'draft' },
        body: { data: input },
      }),
    onSuccess: async () => {
      setTitle('');
      setBody('');
      await done('Draft created', 'drafts');
    },
    onError: (failure) => toast.error(failure.message),
  });

  const save = useMutation({
    mutationFn: ({ article, input }: { article: Article; input: ArticleInput }) =>
      strapi(`/api/articles/${article.documentId}`, {
        method: 'PUT',
        // A draft stays a draft; a published article is saved as published (its author may publish)
        query: { status: article.publishedAt ? 'published' : 'draft' },
        body: { data: input },
      }),
    onSuccess: () => done('Article saved', view),
    onError: (failure) => toast.error(failure.message),
  });

  const publish = useMutation({
    mutationFn: (article: Article) =>
      strapi(`/api/articles/${article.documentId}`, {
        method: 'PUT',
        query: { status: 'published' },
        body: { data: { title: article.title, body: article.body } },
      }),
    onSuccess: () => done('Article published', 'published'),
    onError: (failure) => toast.error(failure.message),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ title: title.trim(), body: body.trim() || null });
  };

  const isMine = (article: Article) =>
    session !== undefined && session !== null && article.author?.documentId === session.user.id;

  // A condition a role holds (`is-owner`) narrows the row to the caller's own articles. A row with
  // none is for everyone's. The list a role holds merges its rows, so a role that holds both reads
  // as "own" here
  const mayAct = (action: string, article: Article) => {
    const held = permissions?.subjects[ARTICLE_UID]?.[action];

    return held !== undefined && (held.conditions.length === 0 || isMine(article));
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <p className="text-muted-foreground">
          Anyone can read the published ones. A signed-in user writes drafts, edits and publishes
          their own. Who may do what is decided by the roles seeded in{' '}
          <code>examples/end-users/seed/roles</code>.
        </p>
      </div>

      {session && canWrite('read-drafts') && (
        <div className="flex gap-2" role="group" aria-label="Which articles">
          <Button
            type="button"
            size="sm"
            variant={view === 'published' ? 'default' : 'outline'}
            onClick={() => setSearchParams({})}
          >
            Published
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'drafts' ? 'default' : 'outline'}
            onClick={() => setSearchParams({ view: 'drafts' })}
          >
            My drafts
          </Button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load the articles: {error.message}
        </p>
      ) : isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground">
          {view === 'drafts' ? 'No drafts yet.' : 'No articles yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {articles.map((article) => (
            <li key={article.documentId}>
              <ArticleCard
                article={article}
                canEdit={mayAct('update', article)}
                canPublish={mayAct('publish', article) && !article.publishedAt}
                busy={save.isPending || publish.isPending}
                onSave={(input) => save.mutateAsync({ article, input })}
                onPublish={() => publish.mutate(article)}
              />
            </li>
          ))}
        </ul>
      )}

      {session
        ? canWrite('create') && (
            <form onSubmit={onSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>New article</h2>
                  </CardTitle>
                  <CardDescription>It starts as a draft: publish it from the list.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="article-title">Title</FieldLabel>
                      <Input
                        id="article-title"
                        name="title"
                        required
                        disabled={create.isPending}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="article-body">Body</FieldLabel>
                      <Textarea
                        id="article-body"
                        name="body"
                        disabled={create.isPending}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <Button type="submit" size="sm" disabled={create.isPending}>
                    Create article
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )
        : !sessionPending && (
            <p className="text-sm text-muted-foreground">
              <Link className="underline" to="/sign-in">
                Sign in
              </Link>{' '}
              to write an article.
            </p>
          )}
    </>
  );
}

interface ArticleCardProps {
  article: Article;
  canEdit: boolean;
  canPublish: boolean;
  busy: boolean;
  onSave: (input: ArticleInput) => Promise<unknown>;
  onPublish: () => void;
}

function ArticleCard({ article, canEdit, canPublish, busy, onSave, onPublish }: ArticleCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await onSave({ title: title.trim(), body: body.trim() || null });
      setEditing(false);
    } catch {
      // The mutation has said why; the form stays for another try
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <h3>{article.title}</h3>
          <Badge
            variant={article.publishedAt ? 'default' : 'secondary'}
            data-testid="article-status"
          >
            {article.publishedAt ? 'Published' : 'Draft'}
          </Badge>
        </CardTitle>
        <CardDescription>{new Date(article.createdAt).toLocaleString()}</CardDescription>
      </CardHeader>
      {editing ? (
        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`title-${article.documentId}`}>Edit title</FieldLabel>
                <Input
                  id={`title-${article.documentId}`}
                  required
                  disabled={busy}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`body-${article.documentId}`}>Edit body</FieldLabel>
                <Textarea
                  id={`body-${article.documentId}`}
                  disabled={busy}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      ) : (
        <>
          {article.body && (
            <CardContent className="text-sm whitespace-pre-wrap">{article.body}</CardContent>
          )}
          {(canEdit || canPublish) && (
            <CardFooter className="gap-2">
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTitle(article.title);
                    setBody(article.body ?? '');
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
              {canPublish && (
                <Button type="button" size="sm" disabled={busy} onClick={onPublish}>
                  Publish
                </Button>
              )}
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
