import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { strapi } from '@/lib/api';

/**
 * What `plugin::end-users.profile` holds in this example: `company` and `newsletter` are the two
 * fields added in `examples/end-users/src/extensions`. The same two are the registration fields the
 * sign-up form sends (see `App.tsx`).
 */
interface Profile {
  documentId: string;
  company: string | null;
  newsletter: boolean;
}

type ProfileResponse = { data: Profile };

const profileKey = (userId: string) => ['profile', userId];

/**
 * The signed-in user's own profile, read with `GET /api/users/me/profile` and saved with
 * `PUT /api/users/me/profile`. Strapi answers for the caller only, whoever the request names, and
 * the Authenticated role holds the permission to do so from its first start.
 *
 * Better Auth's own user (name, avatar) is the card above it: it lives in the authentication
 * tables, while this lives in the profile, where a project's own data goes.
 */
export function ProfileCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const {
    data: profile,
    error,
    isPending,
  } = useQuery({
    queryKey: profileKey(userId),
    queryFn: async () => (await strapi<ProfileResponse>('/api/users/me/profile')).data,
    // A refusal (no profile, no permission) is an answer, not a hiccup to try again
    retry: false,
  });

  const save = useMutation({
    mutationFn: async (input: { company: string | null; newsletter: boolean }) =>
      (
        await strapi<ProfileResponse>('/api/users/me/profile', {
          method: 'PUT',
          body: { data: input },
        })
      ).data,
    onSuccess: (saved) => {
      queryClient.setQueryData(profileKey(userId), saved);
      toast.success('Profile saved');
    },
    onError: (failure) => toast.error(failure.message),
  });

  const [company, setCompany] = useState('');
  const [newsletter, setNewsletter] = useState(false);

  // What Strapi has, whenever it is read or saved
  useEffect(() => {
    if (profile) {
      setCompany(profile.company ?? '');
      setNewsletter(profile.newsletter);
    }
  }, [profile]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ company: company.trim() || null, newsletter });
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Profile</h2>

      <form onSubmit={onSubmit}>
        <Card>
          <CardContent className="flex flex-col gap-6">
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                Could not load your profile: {error.message}
              </p>
            ) : isPending ? (
              <>
                <Skeleton>
                  <Input className="invisible" />
                </Skeleton>
                <Skeleton>
                  <Input className="invisible" />
                </Skeleton>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="profile-company">Company</FieldLabel>
                  <Input
                    id="profile-company"
                    name="company"
                    autoComplete="organization"
                    disabled={save.isPending}
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    id="profile-newsletter"
                    name="newsletter"
                    disabled={save.isPending}
                    checked={newsletter}
                    onCheckedChange={(checked) => setNewsletter(checked === true)}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="profile-newsletter">Send me the newsletter</FieldLabel>
                  </FieldContent>
                </Field>
              </>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" size="sm" disabled={!profile || save.isPending}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
