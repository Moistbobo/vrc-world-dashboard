'use client';

import NextLink from 'next/link';
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import { useCallback, type ComponentProps, type ReactNode } from 'react';

interface NavigateOptions {
  replace?: boolean;
}

export type Navigate = (to: string | number, options?: NavigateOptions) => void;

export function useNavigate(): Navigate {
  const router = useRouter();
  return useCallback(
    (to, options) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

export function useParams<T extends Record<string, string>>(): T {
  return useNextParams() as T;
}

export type SetSearchParams = (
  next: URLSearchParams,
  options?: NavigateOptions,
) => void;

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const params = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setSearchParams = useCallback<SetSearchParams>(
    (next, options) => {
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [pathname, router],
  );
  return [params as URLSearchParams, setSearchParams];
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string };

export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}

interface NavLinkProps
  extends Omit<ComponentProps<typeof NextLink>, 'href' | 'className' | 'children'> {
  to: string;
  end?: boolean;
  className: (state: { isActive: boolean }) => string;
  children: ReactNode;
}

export function NavLink({ to, end, className, children, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <NextLink href={to} className={className({ isActive })} {...props}>
      {children}
    </NextLink>
  );
}
