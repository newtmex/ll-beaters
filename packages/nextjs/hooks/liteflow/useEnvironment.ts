import { useContext } from "react";
import { Environment } from "../../environment";
import { EnvironmentContext } from "~~/services/environment";

export default function useEnvironment(): Environment {
  return useContext(EnvironmentContext);
}
