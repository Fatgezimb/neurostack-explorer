import NextLink from "next/link";
import type { ComponentProps } from "react";
import { sitePath } from "./paths";

type Props = Omit<ComponentProps<"a">, "href"> & { href: string };

/** Pages uses native document navigation; root/server builds retain Next routing. */
export default function Link({ href, ...props }: Props) {
  if (process.env.NEXT_PUBLIC_NEUROSTACK_BASE_PATH) {
    return <a {...props} href={sitePath(href)} />;
  }
  return <NextLink {...props} href={href} />;
}
