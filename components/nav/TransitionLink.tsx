"use client";

import { useRouter } from "next/navigation";
import Link, { LinkProps } from "next/link";
import React from "react";

interface TransitionLinkProps extends React.PropsWithChildren<LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>> {
  href: string;
}

export function TransitionLink({ href, children, ...props }: TransitionLinkProps) {
  const router = useRouter();

  const handleTransition = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();

    // Check if the browser supports view transitions
    if (!document.startViewTransition) {
      router.push(href);
      return;
    }

    document.startViewTransition(() => {
      // We must flush the route transition synchronously here
      // But router.push returns void in Next.js App Router and handles state asynchronously.
      // With App Router, just calling push triggers a transition.
      router.push(href);
    });
  };

  return (
    <Link href={href} onClick={handleTransition} {...props}>
      {children}
    </Link>
  );
}
