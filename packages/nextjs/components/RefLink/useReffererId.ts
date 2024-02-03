import { useEffect } from "react";
import useQueryParamSingle from "../../hooks/liteflow/useQueryParamSingle";
import { useLocalStorage } from "usehooks-ts";

export const refIdKey = "refId";

export const useReferrerId = () => {
  const referrerId = useQueryParamSingle(refIdKey, { parse: v => v?.toString() || null });
  const [id, setId] = useLocalStorage(refIdKey, referrerId);

  useEffect(() => {
    referrerId && setId(referrerId);
  }, [referrerId]);

  return id;
};
