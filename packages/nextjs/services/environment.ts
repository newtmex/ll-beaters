import { createContext } from "react";
import { Environment } from "~~/environment";

export const EnvironmentContext = createContext<Environment>({} as Environment);
