import useQueryParamSingle from "./useQueryParamSingle";
import invariant from "ts-invariant";

export default function useOrderByQuery<T>(defaultValue: T): T {
  const orderBy = useQueryParamSingle<T>("orderBy", {
    defaultValue: defaultValue,
  });
  invariant(orderBy, "orderBy is falsy");
  return orderBy;
}
