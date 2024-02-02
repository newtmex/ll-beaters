import { useSearchParams } from "next/navigation";

export function singleQueryParam<T = string>(
  key: string,
  options: {
    defaultValue?: T;
    parse?: (value?: string) => T;
  } = {},
): T | null {
  const query = useSearchParams();

  const value = query?.get(key);
  if (!value) return options.defaultValue || null;
  const result = Array.isArray(value) ? value[0] : value;
  return options.parse ? options.parse(result) : (result as unknown as T);
}

export default function useQueryParamSingle<T = string>(
  key: string,
  options: {
    defaultValue?: T;
    parse?: (value?: string) => T;
  } = {},
): T | null {
  return singleQueryParam<T>(key, options);
}
